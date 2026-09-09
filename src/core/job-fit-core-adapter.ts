import { createHash } from "node:crypto";
import { basename } from "node:path";
import type { CoreDependencies, CoreModule, Evidence, EvidenceInput, JobAnalysis, JobFitService, MaterialInput, RepositoryFetcher, ResumeDraft } from "./core-contract.js";
import { CliFailure, type CoreErrorCode, type Recoverability } from "../output/envelope.js";
import type { AnalyzeCoreInput, AnalyzeCoreResult, CorePort, OptimizeCoreInput, OptimizeCoreResult, RenderCoreResult, StoredResumeModel } from "./core-port.js";
import { isStrictAnalysisContext, isStrictStoredResume } from "./persisted-shape.js";

type CoreTools = Pick<CoreModule, "MaterialParser" | "EvidenceStore">;
const REQUIRED_CORE_VERSION = "0.1.0";
const REQUIRED_SCHEMA_VERSION = "2.0.0";

export class JobFitCoreAdapter implements CorePort {
  readonly contractVersion = REQUIRED_SCHEMA_VERSION;
  constructor(private readonly service: JobFitService, private readonly suppliedTools?: CoreTools, private readonly repositoryFetcher?: RepositoryFetcher) {
    if (service.version !== REQUIRED_CORE_VERSION || service.schemaVersion !== REQUIRED_SCHEMA_VERSION) throw new CliFailure("DEPENDENCY_UNAVAILABLE", "installed @job-fit/core is not compatible");
  }

  static async create(dependencies: unknown): Promise<JobFitCoreAdapter> {
    const core = await loadCore();
    if (typeof core.createJobFitService !== "function" || typeof core.MaterialParser !== "function" || typeof core.EvidenceStore !== "function") throw new CliFailure("DEPENDENCY_UNAVAILABLE", "installed @job-fit/core does not expose the required 0.1.0/schema 2.0.0 API");
    if (!isCoreDependencies(dependencies)) throw new CliFailure("DEPENDENCY_UNAVAILABLE", "trusted Core runtime dependencies are incomplete");
    const runtime = dependencies;
    try { const service = core.createJobFitService(runtime); if (!isJobFitService(service)) throw new CliFailure("DEPENDENCY_UNAVAILABLE", "Core service does not expose the required API"); return new JobFitCoreAdapter(service, { MaterialParser: core.MaterialParser, EvidenceStore: core.EvidenceStore }, runtime.repositoryFetcher); }
    catch (error) { throw mapCoreError(error); }
  }

  private async tools(): Promise<CoreTools> { return this.suppliedTools ?? await loadCore(); }

  async validateAnalysis(input: unknown): Promise<AnalyzeCoreResult> { const core = await loadCore(); if (!isStrictAnalysisContext(input)) invalidPersisted("analysis context"); const value = input as AnalyzeCoreResult; if (!core.CandidateProfileSchema.safeParse(value.profile).success || value.evidence.some((item) => !core.StrictEvidenceSchema.safeParse(item).success) || value.analyses.some((item) => !core.JobAnalysisSchema.safeParse(item).success) || value.learningPaths.some((item) => !core.LearningPlanSchema.safeParse(item).success)) invalidPersisted("analysis context"); return value; }
  async validateStoredResume(input: unknown): Promise<StoredResumeModel> { const core = await loadCore(); if (!isStrictStoredResume(input)) invalidPersisted("resume model"); const value = input as StoredResumeModel; if (!core.ResumeDraftSchema.safeParse(value.resumeModel).success || value.evidence.some((item) => !core.StrictEvidenceSchema.safeParse(item).success)) invalidPersisted("resume model"); return value; }

  async analyze(input: AnalyzeCoreInput): Promise<AnalyzeCoreResult> {
    const tools = await this.tools(); const parser = new tools.MaterialParser(); const store = new tools.EvidenceStore(); const texts: string[] = [];
    for (const [index, material] of input.materials.entries()) {
      const parsed = await coreCall(() => parser.parse({ id: stableId("material", `${index}:${material.path}`), filename: coreFilename(material.path, material.mediaType), mime: material.mediaType, bytes: Buffer.from(material.bytes) } satisfies MaterialInput));
      texts.push(`Source ${material.path}\n${parsed.text}`); addTextEvidence(store, material.sourceType, material.path, parsed.text);
    }
    for (const repository of input.repositories) {
      if (!this.repositoryFetcher) throw coreFailure("REPOSITORY_UNAVAILABLE", "USER_FIXABLE", "A trusted repository fetcher is required for repository inputs");
      let files: Array<{ path: string; bytes: Uint8Array }>;
      try { files = await this.repositoryFetcher.fetch({ ...repository, maxBytes: 5 * 1024 * 1024, timeoutMs: 10_000, maxRedirects: 3 }); } catch { throw coreFailure("REPOSITORY_UNAVAILABLE", "SYSTEM_RETRYABLE", "Public repository content could not be fetched safely"); }
      let total = 0; for (const [index, file] of files.entries()) { total += file.bytes.byteLength; if (total > 5 * 1024 * 1024 || file.path.length === 0 || file.bytes.byteLength === 0) throw coreFailure("REPOSITORY_UNAVAILABLE", "USER_FIXABLE", "Repository content exceeded safe limits"); const parsed = await coreCall(() => parser.parse({ id: stableId("repository", `${repository.url}:${index}:${file.path}`), filename: coreFilename(file.path, "text/plain"), mime: "text/plain", bytes: Buffer.from(file.bytes) })); texts.push(`Repository ${file.path}\n${parsed.text}`); addTextEvidence(store, "REPOSITORY", `${repository.url}:${file.path}`, parsed.text); }
    }
    for (const [index, fact] of input.confirmedFacts.entries()) store.add(evidenceInput("USER_CONFIRMED", `fact-${index + 1}`, `confirmed fact ${index + 1}`, fact));
    const evidence = store.all();
    const profile = await coreCall(() => this.service.buildProfile({ profileId: "local-profile", version: 1, material: texts.join("\n\n"), evidence }));
    const evidenceIds = new Set(evidence.map(({ id }) => id));
    const rawAnalyses = await coreCall(() => Promise.all(input.jobs.map((job) => this.service.analyzeJob({ analysisId: stableId("analysis", job.id), jobId: job.id, jdText: job.text, profile, evidenceIds: new Set(evidenceIds), explicitMissingSkillIds: new Set(job.explicitMissingSkillIds), transferableSkillIds: new Set(job.transferableSkillIds), hardGateAnswers: new Map(Object.entries(job.hardGateAnswers)) }))));
    const analyses = rawAnalyses.map(toSkillAnalysis);
    const aggregate = input.jobs.length > 1 ? await coreCall(async () => this.service.aggregateJobs(rawAnalyses)) : undefined;
    const learningPaths = await coreCall(() => Promise.all(rawAnalyses.flatMap((analysis) => gapInputs(analysis).map((gap) => this.service.buildLearningPlan({ ...gap, searchedEvidenceIds: [...evidenceIds] })))));
    return { profile, evidence, analyses, ...(aggregate === undefined ? {} : { aggregate }), learningPaths, hardGates: rawAnalyses.flatMap(({ hardGates }) => hardGates) };
  }

  async optimizeResume(input: OptimizeCoreInput): Promise<OptimizeCoreResult> {
    if (!input.analysis || !Array.isArray(input.analysis.analyses) || !Array.isArray(input.analysis.evidence)) throw new CliFailure("INVALID_INPUT", "analysis report is invalid");
    const selected = input.analysis.analyses.find(({ jobId }) => jobId === input.selectedJobId);
    if (!selected || !Array.isArray(selected.requirements)) throw new CliFailure("INVALID_INPUT", "selected job is not present in the analysis report");
    const knownEvidenceIds = new Set(input.analysis.evidence.map(({ id }) => id));
    if (input.confirmedFacts.some(({ evidenceIds }) => evidenceIds.some((id) => !knownEvidenceIds.has(id)))) throw new CliFailure("INVALID_INPUT", "confirmed fact cites unknown evidence");
    const tools = await this.tools(); const additions = new tools.EvidenceStore();
    for (const fact of input.confirmedFacts) additions.add(evidenceInput("USER_CONFIRMED", fact.id, `confirmed fact ${fact.id}`, fact.value));
    const evidence = dedupeEvidence([...input.analysis.evidence, ...additions.all()]);
    if (evidence.length === 0) throw new CliFailure("CORE_REJECTED", "resume optimization requires supporting evidence");
    const facts = [...evidence.map(({ summary }) => summary), ...input.confirmedFacts.map(({ value }) => value), ...(input.identity ? [JSON.stringify(input.identity)] : [])].join("\n");
    const decisions = [...input.confirmedChangeIds, ...input.rejectedChangeIds];
    if (new Set(decisions).size !== decisions.length) throw new CliFailure("INVALID_INPUT", "change decision IDs must be unique and disjoint");
    if (!input.proposalDraft && decisions.length > 0) throw new CliFailure("INVALID_INPUT", "change decisions require the exact saved proposal");
    if (input.proposalDraft) { await this.validateStoredResume({ resumeModel: input.proposalDraft, evidence }); if (input.proposalDraft.jobId !== input.selectedJobId || input.proposalDraft.template !== template(input.templateId)) throw new CliFailure("INVALID_INPUT", "saved proposal does not match the selected job and template"); }
    const proposal = input.proposalDraft ?? await coreCall(() => this.service.tailorResume({ draftId: stableId("draft", input.selectedJobId), jobId: input.selectedJobId, template: template(input.templateId), facts, evidence, requirements: selected.requirements, confirmedBulletIds: [], proposalOnly: true }));
    const proposedChanges = resumeChanges(proposal); const proposedRiskIds = proposedChanges.filter(({ highRisk }) => highRisk).map(({ id }) => id); const proposedSet = new Set(proposedRiskIds);
    if (decisions.some((id) => !proposedSet.has(id))) throw new CliFailure("INVALID_INPUT", "change decision ID is unknown or no longer proposed");
    const unresolved = proposedRiskIds.filter((id) => !input.confirmedChangeIds.includes(id) && !input.rejectedChangeIds.includes(id));
    if (input.proposalDraft && unresolved.length > 0) throw new CliFailure("INVALID_INPUT", "accepted and rejected IDs must cover every high-risk proposal change");
    if (unresolved.length > 0) { const factualVerification = await coreCall(async () => this.service.verifyResume(proposal, evidence)); return { status: "NEEDS_CONFIRMATION", resumeModel: proposal, evidence, changes: proposedChanges, riskyChanges: proposedChanges.filter(({ highRisk }) => highRisk), requiredConfirmationIds: unresolved, factualVerification }; }
    const draft = !input.proposalDraft && proposedRiskIds.length === 0 ? proposal : await coreCall(() => this.service.tailorResume({ draftId: stableId("draft", input.selectedJobId), jobId: input.selectedJobId, template: template(input.templateId), facts, evidence, requirements: selected.requirements, confirmedBulletIds: input.confirmedChangeIds, proposalDraft: proposal }));
    const factualVerification = await coreCall(async () => this.service.verifyResume(draft, evidence)); const changes = resumeChanges(draft);
    return { status: "CONFIRMED", resumeModel: draft, evidence, changes, riskyChanges: changes.filter(({ highRisk }) => highRisk), requiredConfirmationIds: [], factualVerification };
  }

  async renderResume(model: StoredResumeModel, formats: Array<"docx" | "pdf">): Promise<RenderCoreResult> {
    const verification = await coreCall(async () => this.service.verifyResume(model.resumeModel, model.evidence));
    if (!verification.passed) throw new CliFailure("CORE_REJECTED", "resume factual verification did not pass");
    const rendered = await coreCall(() => this.service.renderResume(model.resumeModel, model.evidence));
    const artifacts = formats.map((format) => ({ format, filename: `resume.${format}`, bytes: format === "docx" ? rendered.docx : rendered.pdf }));
    return { verification: rendered.verification, artifacts };
  }
}

async function loadCore(): Promise<CoreModule> { const packageName = "@job-fit/core"; try { const loaded: unknown = await import(packageName); if (!isCoreModule(loaded)) throw new Error("invalid shape"); return loaded; } catch { throw new CliFailure("DEPENDENCY_UNAVAILABLE", "compatible @job-fit/core 0.1.0 is not installed", true); } }
function stableId(prefix: string, value: string): string { return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16)}`; }
function coreFilename(path: string, mime: MaterialInput["mime"]): string { const name = basename(path); return mime === "text/plain" && !name.toLowerCase().endsWith(".txt") ? `${name}.txt` : name; }
function evidenceInput(sourceType: EvidenceInput["sourceType"], sourceId: string, locator: string, raw: string): EvidenceInput { return { sourceType, sourceId: stableId("source", sourceId), locator: locator.slice(0, 500), summary: raw.slice(0, 2_000), confidence: sourceType === "USER_CONFIRMED" ? 1 : 0.9, sensitive: sourceType === "RESUME" || sourceType === "USER_CONFIRMED", raw }; }
function addTextEvidence(store: InstanceType<CoreModule["EvidenceStore"]>, sourceType: "RESUME" | "PROJECT" | "REPOSITORY", path: string, text: string): void { const chunks = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean); for (const [index, raw] of chunks.entries()) store.add(evidenceInput(sourceType, path, `line ${index + 1}`, raw)); }
function dedupeEvidence(evidence: Evidence[]): Evidence[] { return [...new Map(evidence.map((item) => [item.id, item])).values()]; }
function gapInputs(analysis: JobAnalysis): Array<{ requirementId: string; skillId: string; jdQuote: string }> { const byId = new Map(analysis.requirements.map((requirement) => [requirement.id, requirement])); return analysis.matches.flatMap((match) => { const requirement = byId.get(match.requirementId); return (match.state === "MISSING" || match.state === "INSUFFICIENT_EVIDENCE") && requirement?.skillId ? [{ requirementId: requirement.id, skillId: requirement.skillId, jdQuote: requirement.text }] : []; }); }
function toSkillAnalysis(analysis: JobAnalysis) { const requirements = new Map(analysis.requirements.map((requirement) => [requirement.id, requirement])); const skills = (state: JobAnalysis["matches"][number]["state"]) => analysis.matches.filter((match) => match.state === state).flatMap((match) => requirements.get(match.requirementId)?.skillId ?? []); return { ...analysis, matchedSkills: skills("MATCHED"), transferableSkills: skills("TRANSFERABLE"), skillGaps: skills("MISSING"), evidenceGaps: skills("INSUFFICIENT_EVIDENCE") }; }
function template(templateId: string): ResumeDraft["template"] { const value = { "ats-classic": "CLASSIC", "ats-compact": "COMPACT", "ats-graduate": "GRADUATE" }[templateId]; if (!value) throw new CliFailure("INVALID_INPUT", "resume template is invalid"); return value as ResumeDraft["template"]; }
function resumeChanges(draft: ResumeDraft) { return draft.sections.flatMap(({ bullets }) => bullets.map(({ id, text, highRisk, confirmed, evidenceIds }) => ({ id, text, highRisk, confirmed, evidenceIds }))); }
function mapCoreError(error: unknown): CliFailure { if (error instanceof CliFailure) return error; const detail = typeof error === "object" && error !== null && "detail" in error ? (error as { detail?: { code?: unknown; recoverability?: unknown; safeMessage?: unknown } }).detail : undefined; if (detail && isCoreCode(detail.code) && isRecoverability(detail.recoverability) && typeof detail.safeMessage === "string") { const retryable = detail.recoverability === "SYSTEM_RETRYABLE"; const kind = detail.code === "FILE_INVALID" || detail.code === "FILE_TEXT_UNREADABLE" ? "FILE_ERROR" : detail.code === "JD_INSUFFICIENT" ? "INVALID_INPUT" : "CORE_REJECTED"; return new CliFailure(kind, coreSafeMessage(detail.code), retryable, detail.code, detail.recoverability); } return new CliFailure("CORE_REJECTED", "Core rejected the request without exposing private input", true); }
function isCoreCode(value: unknown): value is CoreErrorCode { return typeof value === "string" && ["FILE_INVALID", "FILE_TEXT_UNREADABLE", "JD_INSUFFICIENT", "REPOSITORY_UNAVAILABLE", "MODEL_SCHEMA_INVALID", "RESOURCE_UNVERIFIED", "DOCUMENT_GENERATION_FAILED", "FACT_GATE_FAILED", "DELETE_FAILED"].includes(value); }
function isRecoverability(value: unknown): value is Recoverability { return value === "USER_FIXABLE" || value === "SYSTEM_RETRYABLE" || value === "HUMAN_REVIEW"; }
function coreSafeMessage(code: CoreErrorCode): string { return ({ FILE_INVALID: "Core rejected invalid file data", FILE_TEXT_UNREADABLE: "Core could not extract readable file text", JD_INSUFFICIENT: "The job description is insufficient for analysis", REPOSITORY_UNAVAILABLE: "Repository content is unavailable", MODEL_SCHEMA_INVALID: "The model response did not match Core's schema", RESOURCE_UNVERIFIED: "A learning resource could not be verified", DOCUMENT_GENERATION_FAILED: "Resume document generation failed", FACT_GATE_FAILED: "Resume factual verification failed", DELETE_FAILED: "Local data deletion failed" })[code]; }
async function coreCall<T>(operation: () => T | Promise<T>): Promise<T> { try { return await operation(); } catch (error) { throw mapCoreError(error); } }
function coreFailure(code: CoreErrorCode, recoverability: Recoverability, safeMessage: string): never { throw new CliFailure("CORE_REJECTED", safeMessage, recoverability === "SYSTEM_RETRYABLE", code, recoverability); }
function isCoreModule(value: unknown): value is CoreModule { if (typeof value !== "object" || value === null) return false; const module = value as Partial<CoreModule>; return typeof module.createJobFitService === "function" && typeof module.MaterialParser === "function" && typeof module.EvidenceStore === "function" && [module.CandidateProfileSchema, module.StrictEvidenceSchema, module.JobAnalysisSchema, module.LearningPlanSchema, module.ResumeDraftSchema].every((schema) => typeof schema?.safeParse === "function"); }
function isCoreDependencies(value: unknown): value is CoreDependencies & { repositoryFetcher?: RepositoryFetcher } { if (!value || typeof value !== "object") return false; const item = value as Record<string, unknown>; const method = (key: string, name: string) => typeof item[key] === "object" && item[key] !== null && typeof (item[key] as Record<string, unknown>)[name] === "function"; return method("model", "generate") && method("catalog", "find") && method("search", "search") && method("probe", "probe") && method("clock", "now") && method("pdfConverter", "convert") && method("pdfInspector", "inspect") && (!("repositoryFetcher" in item) || method("repositoryFetcher", "fetch")); }
function isJobFitService(value: unknown): value is JobFitService { if (!value || typeof value !== "object") return false; const item = value as Record<string, unknown>; return typeof item.version === "string" && typeof item.schemaVersion === "string" && ["buildProfile", "analyzeJob", "aggregateJobs", "buildLearningPlan", "tailorResume", "verifyResume", "renderResume"].every((key) => typeof item[key] === "function"); }
function invalidPersisted(label: string): never { throw new CliFailure("INVALID_INPUT", `${label} is invalid`); }
