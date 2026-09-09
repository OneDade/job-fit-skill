import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { AnalyzeCoreResult, CorePort, Material } from "./core/core-port.js";
import { CliFailure } from "./output/envelope.js";
import { analyzeRequestSchema, deleteLocalDataRequestSchema, optimizeResumeRequestSchema, renderResumeRequestSchema } from "./schemas.js";
import { createSafeDirectory, mediaTypeFor, readSafeFile, resolveWorkspace } from "./io/safe-path.js";
import { atomicWrite, canonicalHash, deleteOwnedState, stateDirectory, writePrivateJson } from "./io/private-store.js";
import { candidateNamesFromText, sanitizePublicValue } from "./output/pii.js";

const markdownReport = (value: unknown): string => `# Job Fit 分析报告 / Analysis Report\n\n> 本报告只包含去标识化分析。学习资源均应保留来源与验证日期。\n\n${JSON.stringify(value, null, 2).split("\n").map((line) => `    ${line}`).join("\n")}\n`;
export type PreparedFiles = ReadonlyMap<string, Uint8Array>;
const fileBytes = async (root: string, path: string, prepared?: PreparedFiles): Promise<Uint8Array> => prepared?.get(path) ?? readSafeFile(root, path);

type PublicAnalysis = Omit<AnalyzeCoreResult, "evidence"> & { schemaVersion: string; contextId: string; contextFile: string; evidence: Array<{ id: string; sourceType: string; locator: string }>; reportFiles: string[] };
export async function analyze(core: CorePort, root: string, raw: unknown, prepared?: PreparedFiles): Promise<PublicAnalysis> {
  const input = analyzeRequestSchema.parse(raw);
  const materials: Material[] = await Promise.all([...input.resumeFiles.map((path) => ({ path, sourceType: "RESUME" as const })), ...input.projectFiles.map((path) => ({ path, sourceType: "PROJECT" as const }))].map(async ({ path, sourceType }) => ({ path, sourceType, mediaType: mediaTypeFor(path), bytes: await fileBytes(root, path, prepared) })));
  const result = await core.analyze({ materials, jobs: input.jobs, repositories: input.repositories, confirmedFacts: input.confirmedFacts, locale: input.locale });
  const state = await stateDirectory(root); const reports = await createSafeDirectory(state, "reports"); const contexts = await createSafeDirectory(state, "contexts");
  const contextId = randomUUID(); const contextFile = `.job-fit/contexts/${contextId}.json`;
  const deniedNames = [...new Set([...materials.filter(({ sourceType, mediaType }) => sourceType === "RESUME" && mediaType === "text/plain").flatMap(({ bytes }) => candidateNamesFromText(Buffer.from(bytes).toString("utf8"))), ...result.evidence.filter(({ sensitive, sourceType }) => sensitive && sourceType === "RESUME").flatMap(({ summary }) => candidateNamesFromText(summary))])];
  await writePrivateJson(join(contexts, `${contextId}.json`), { schemaVersion: "1.0.0", contextId, candidateNames: deniedNames, data: result });
  const publicEvidence = result.evidence.map(({ id, sourceType, locator }) => ({ id, sourceType, locator }));
  const publicProfile = { id: result.profile.id, version: result.profile.version, experiences: (result.profile.experiences ?? []).map(({ id, kind, evidenceIds }) => ({ id, kind, evidenceIds })), skills: (result.profile.skills ?? []).map(({ skillId, label, level, evidenceIds }) => ({ skillId, label, level, evidenceIds })) };
  const publicAnalyses = result.analyses.map((item) => ({ id: item.id, jobId: item.jobId, requirements: (item.requirements ?? []).map(({ id, skillId, kind, text, locator, explicit, confidence, importance }) => ({ id, ...(skillId === undefined ? {} : { skillId }), kind, text, locator, explicit, confidence, importance })), matches: (item.matches ?? []).map(({ requirementId, state, evidenceIds, confidence }) => ({ requirementId, state, evidenceIds, confidence })), hardGates: (item.hardGates ?? []).map(({ requirementId, status, evidenceIds }) => ({ requirementId, status, evidenceIds })), categoryScores: item.categoryScores, totalScore: item.totalScore, recommendation: item.recommendation, matchedSkills: item.matchedSkills, transferableSkills: item.transferableSkills, skillGaps: item.skillGaps, evidenceGaps: item.evidenceGaps }));
  const publicHardGates = result.hardGates.map(({ requirementId, status, evidenceIds }) => ({ requirementId, status, evidenceIds }));
  const publicAggregate = result.aggregate?.map(({ skillId, frequency, averageImportance, priority, jobIds, missingJobs, insufficientEvidenceJobs }) => ({ skillId, frequency, averageImportance, priority, jobIds, missingJobs, insufficientEvidenceJobs }));
  const publicLearningPaths = result.learningPaths.map(({ gapRequirementId, targetSkillId, jdQuote, searchedEvidenceIds, resources, tracks }) => ({ gapRequirementId, targetSkillId, jdQuote, searchedEvidenceIds, resources: resources?.map(({ id, skillId, title, url, publisher, language, cost, estimatedHours, verifiedAt }) => ({ id, skillId, title, url, publisher, language, cost, estimatedHours, verifiedAt })) ?? [], tracks: tracks?.map(({ kind, minDays, maxDays, resourceIds, tasks }) => ({ kind, minDays, maxDays, resourceIds, tasks: tasks?.map(({ id, skillId, source, title, deliverables, acceptanceCriteria, suggestedStack, estimatedDays }) => ({ id, skillId, source, title, deliverables, acceptanceCriteria, suggestedStack, estimatedDays })) ?? [] })) ?? [] }));
  const report = sanitizePublicValue({ schemaVersion: "1.0.0", contextId, contextFile, profile: publicProfile, evidence: publicEvidence, analyses: publicAnalyses, ...(publicAggregate === undefined ? {} : { aggregate: publicAggregate }), learningPaths: publicLearningPaths, hardGates: publicHardGates }, "", deniedNames) as Record<string, unknown>;
  if (input.reportFormats.includes("json")) await writePrivateJson(join(reports, "latest-analysis.json"), report);
  if (input.reportFormats.includes("markdown")) await atomicWrite(join(reports, "latest-analysis.md"), markdownReport(report));
  return { ...report, reportFiles: input.reportFormats.map((x) => `.job-fit/reports/latest-analysis.${x === "markdown" ? "md" : "json"}`) } as PublicAnalysis;
}

export async function optimizeResume(core: CorePort, root: string, raw: unknown, prepared?: PreparedFiles) {
  const input = optimizeResumeRequestSchema.parse(raw);
  await stateDirectory(root);
  if (!/^\.job-fit\/reports\/[A-Za-z0-9._-]+\.json$/u.test(input.analysisFile)) throw new CliFailure("INVALID_INPUT", "analysis report must be an app-owned private report");
  const reference = JSON.parse(Buffer.from(await fileBytes(root, input.analysisFile, prepared)).toString("utf8")) as { contextId?: unknown; contextFile?: unknown };
  if (typeof reference.contextId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(reference.contextId) || reference.contextFile !== `.job-fit/contexts/${reference.contextId}.json`) throw new CliFailure("INVALID_INPUT", "analysis report private context reference is invalid");
  const persisted = JSON.parse(Buffer.from(await fileBytes(root, reference.contextFile, prepared)).toString("utf8")) as { schemaVersion?: unknown; contextId?: unknown; candidateNames?: unknown; data?: unknown };
  if (!exactKeys(persisted, ["schemaVersion", "contextId", "candidateNames", "data"]) || persisted.schemaVersion !== "1.0.0" || persisted.contextId !== reference.contextId || !isCandidateNameList(persisted.candidateNames)) throw new CliFailure("INVALID_INPUT", "private analysis context is invalid");
  const analysis = await core.validateAnalysis(persisted.data);
  const analysisHash = canonicalHash(persisted); const basisHash = proposalBasisHash(input); let proposalDraft;
  if (input.proposalFile) {
    const proposalId = proposalIdFromPath(input.proposalFile); const saved = JSON.parse(Buffer.from(await fileBytes(root, input.proposalFile, prepared)).toString("utf8")) as Record<string, unknown>;
    if (!exactKeys(saved, ["schemaVersion", "proposalId", "analysisContextId", "analysisHash", "selectedJobId", "templateId", "basisHash", "draftHash", "resumeModel"]) || saved.schemaVersion !== "1.0.0" || saved.proposalId !== proposalId || saved.analysisContextId !== reference.contextId || saved.analysisHash !== analysisHash || saved.selectedJobId !== input.selectedJobId || saved.templateId !== input.templateId || saved.basisHash !== basisHash || saved.draftHash !== canonicalHash(saved.resumeModel)) throw new CliFailure("INVALID_INPUT", "saved proposal is invalid or does not match this request");
    proposalDraft = (await core.validateStoredResume({ resumeModel: saved.resumeModel, evidence: analysis.evidence })).resumeModel;
  } else if (input.confirmedChangeIds.length > 0 || input.rejectedChangeIds.length > 0) throw new CliFailure("INVALID_INPUT", "change decisions require proposalFile");
  const result = await core.optimizeResume({ analysis, selectedJobId: input.selectedJobId, confirmedFacts: input.confirmedFacts, confirmedChangeIds: input.confirmedChangeIds, rejectedChangeIds: input.rejectedChangeIds, templateId: input.templateId, ...(proposalDraft ? { proposalDraft } : {}), ...(input.identity ? { identity: input.identity } : {}) });
  const deniedNames = [...new Set([...persisted.candidateNames, ...(input.identity ? [input.identity.name] : [])])];
  if (result.status === "NEEDS_CONFIRMATION") { const proposalId = randomUUID(); const proposals = await createSafeDirectory(await stateDirectory(root), "proposals"); const proposalFile = `.job-fit/proposals/${proposalId}.json`; await writePrivateJson(join(proposals, `${proposalId}.json`), { schemaVersion: "1.0.0", proposalId, analysisContextId: reference.contextId, analysisHash, selectedJobId: input.selectedJobId, templateId: input.templateId, basisHash, draftHash: canonicalHash(result.resumeModel), resumeModel: result.resumeModel }); return sanitizePublicValue({ status: result.status, proposalFile, proposal: { changes: result.changes, riskyChanges: result.riskyChanges, requiredConfirmationIds: result.requiredConfirmationIds }, factualVerification: publicVerification(result.factualVerification) }, "", deniedNames); }
  if (result.factualVerification.passed !== true) throw new CliFailure("CORE_REJECTED", "resume factual verification did not pass; add evidence or remove the claim");
  const state = await stateDirectory(root); const models = await createSafeDirectory(state, "resume-models");
  const filename = `${safeName(input.selectedJobId)}.resume.json`; await writePrivateJson(join(models, filename), { resumeModel: result.resumeModel, evidence: result.evidence });
  return sanitizePublicValue({ status: result.status, changes: result.changes, riskyChanges: result.riskyChanges, factualVerification: publicVerification(result.factualVerification), resumeModelFile: `.job-fit/resume-models/${filename}` }, "", deniedNames);
}

const safeName = (value: string): string => value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "resume";
const proposalBasisHash = (input: { selectedJobId: string; confirmedFacts: unknown; templateId: string; identity?: unknown }): string => canonicalHash({ selectedJobId: input.selectedJobId, confirmedFacts: input.confirmedFacts, templateId: input.templateId, ...(input.identity ? { identity: input.identity } : {}) });
const proposalIdFromPath = (path: string): string => { const match = /^\.job-fit\/proposals\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.json$/iu.exec(path); if (!match?.[1]) throw new CliFailure("INVALID_INPUT", "proposalFile must reference app-owned private state"); return match[1]; };
const exactKeys = (value: unknown, keys: string[]): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) && keys.every((key) => key in value) && Object.keys(value).every((key) => keys.includes(key));
const isCandidateNameList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 128 && value.every((item) => typeof item === "string" && item === item.trim() && item.length >= 2 && item.length <= 120 && !/[\r\n]/u.test(item));
const publicVerification = (verification: { passed: boolean; issues?: Array<{ code?: unknown; path?: unknown }> }) => ({ passed: verification.passed, issues: (verification.issues ?? []).map(({ code, path }) => ({ code, path })) });
export async function renderResume(core: CorePort, rootInput: string, raw: unknown, prepared?: PreparedFiles) {
  const input = renderResumeRequestSchema.parse(raw); const root = await resolveWorkspace(rootInput);
  await stateDirectory(root);
  if (!/^\.job-fit\/resume-models\/[A-Za-z0-9_-]{1,80}\.resume\.json$/u.test(input.resumeModelFile)) throw new CliFailure("INVALID_INPUT", "resume model must be in app-owned private state");
  const model = await core.validateStoredResume(JSON.parse(Buffer.from(await fileBytes(root, input.resumeModelFile, prepared)).toString("utf8")));
  const output = await createSafeDirectory(root, input.outputDirectory);
  const result = await core.renderResume(model, input.formats);
  if (result.verification.passed !== true) throw new CliFailure("CORE_REJECTED", "rendered resume verification did not pass");
  const expected = new Set(input.formats); if (result.artifacts.length !== expected.size || result.artifacts.some((a) => !expected.has(a.format))) throw new CliFailure("CORE_REJECTED", "renderer did not return every requested verified format");
  const files: string[] = [];
  for (const artifact of result.artifacts) {
    if (artifact.filename !== basename(artifact.filename) || artifact.bytes.byteLength === 0) throw new CliFailure("CORE_REJECTED", "renderer returned an unsafe or empty artifact");
    const filename = `resume.${artifact.format}`; await atomicWrite(join(output, filename), artifact.bytes); files.push(`${input.outputDirectory}/${filename}`);
  }
  return sanitizePublicValue({ verification: publicVerification(result.verification), files });
}
export async function deleteLocalData(root: string, raw: unknown) { deleteLocalDataRequestSchema.parse(raw); await deleteOwnedState(root); return { deleted: true, path: ".job-fit" }; }
