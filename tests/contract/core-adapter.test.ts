import { describe, expect, it } from "vitest";
import { JobFitCoreAdapter } from "../../src/core/job-fit-core-adapter.js";

const corePackageName: string = "@job-fit/core";
const coreAvailable = await import(corePackageName).then(
  () => true,
  () => false,
);

const profile = { id: "profile", version: 1, experiences: [], skills: [] };
const requirement = { id: "req-redis", skillId: "redis", kind: "REQUIRED_SKILL" as const, text: "Redis caching", locator: "line 1", explicit: true, confidence: 1, importance: 1 };
const analysis = { id: "analysis-job", jobId: "job", requirements: [requirement], matches: [{ requirementId: requirement.id, state: "INSUFFICIENT_EVIDENCE" as const, evidenceIds: [], confidence: 0.5, explanation: "No evidence" }], hardGates: [], categoryScores: { CORE_RESPONSIBILITY: 0, REQUIRED_SKILL: 0, EVIDENCE: 0, PREFERRED_GROWTH: 0 }, totalScore: 0, recommendation: "APPLY_WITH_RISKS" as const };

describe.skipIf(!coreAvailable)("real Core 0.1.0 adapter contract", () => {
  it("passes parsed evidence and native Set/Map collections at the Core boundary", async () => {
    const calls: Record<string, unknown>[] = [];
    const service = {
      version: "0.1.0", schemaVersion: "2.0.0",
      async buildProfile(input: Record<string, unknown>) { calls.push({ op: "profile", input }); return profile; },
      async analyzeJob(input: Record<string, unknown>) { calls.push({ op: "job", input }); return analysis; },
      aggregateJobs(input: unknown[]) { calls.push({ op: "aggregate", input }); return [{ skillId: "redis" }]; },
      async buildLearningPlan(input: Record<string, unknown>) { calls.push({ op: "learning", input }); return { gapRequirementId: "req-redis", targetSkillId: "redis", jdQuote: "Redis caching", searchedEvidenceIds: [], resources: [], tracks: [] }; },
      async tailorResume() { throw new Error("unused"); }, verifyResume() { throw new Error("unused"); }, async renderResume() { throw new Error("unused"); },
    };
    const adapter = new JobFitCoreAdapter(service as never);
    const result = await adapter.analyze({ materials: [{ path: "cv.txt", sourceType: "RESUME", mediaType: "text/plain", bytes: Buffer.from("Built Node.js project") }], jobs: [{ id: "job", text: "Redis caching is required for this backend engineering role.", transferableSkillIds: ["postgres"], explicitMissingSkillIds: ["redis"], hardGateAnswers: { "req-gate": "RISK" } }], repositories: [], confirmedFacts: [], locale: "en" });
    const profileInput = calls.find((call) => call.op === "profile")!.input as { evidence: unknown[]; material: string };
    const jobInput = calls.find((call) => call.op === "job")!.input as { evidenceIds: unknown; explicitMissingSkillIds: unknown; hardGateAnswers: unknown };
    expect(profileInput.material).toContain("Built Node.js project"); expect(profileInput.evidence.length).toBeGreaterThan(0);
    expect(jobInput.evidenceIds).toBeInstanceOf(Set); expect(jobInput.explicitMissingSkillIds).toBeInstanceOf(Set); expect(jobInput.hardGateAnswers).toBeInstanceOf(Map);
    expect(jobInput.explicitMissingSkillIds).toEqual(new Set(["redis"])); expect(jobInput.hardGateAnswers).toEqual(new Map([["req-gate", "RISK"]]));
    expect(result.analyses[0]?.matches[0]?.state).toBe("INSUFFICIENT_EVIDENCE"); expect(result.learningPaths).toHaveLength(1);
  });
  it("rejects an incompatible Core version", () => { expect(() => new JobFitCoreAdapter({ version: "0.2.0", schemaVersion: "2.0.0" } as never)).toThrow("compatible"); });
  it("rejects incomplete trusted runtime dependencies before creating Core", async () => { await expect(JobFitCoreAdapter.create({})).rejects.toMatchObject({ kind: "DEPENDENCY_UNAVAILABLE" }); });
  it("preserves safe Core error code and recoverability", async () => {
    const service = { version: "0.1.0", schemaVersion: "2.0.0", async buildProfile() { throw { detail: { code: "MODEL_SCHEMA_INVALID", recoverability: "SYSTEM_RETRYABLE", safeMessage: "Chen Pengwen 北京市朝阳区建国路88号 110105199001011234" } }; } };
    const adapter = new JobFitCoreAdapter(service as never);
    try { await adapter.analyze({ materials: [{ path: "cv.txt", sourceType: "RESUME", mediaType: "text/plain", bytes: Buffer.from("Built Node.js project") }], jobs: [{ id: "job", text: "Redis caching is required for this backend engineering role.", transferableSkillIds: [], explicitMissingSkillIds: [], hardGateAnswers: {} }], repositories: [], confirmedFacts: [], locale: "en" }); throw new Error("expected rejection"); }
    catch (error) { expect(error).toMatchObject({ kind: "CORE_REJECTED", retryable: true, coreCode: "MODEL_SCHEMA_INVALID", recoverability: "SYSTEM_RETRYABLE" }); expect(String((error as Error).message)).not.toMatch(/Chen Pengwen|北京市朝阳区|110105199001011234/u); }
  });
  it("rejects a malformed saved analysis as user input", async () => {
    const adapter = new JobFitCoreAdapter({ version: "0.1.0", schemaVersion: "2.0.0" } as never);
    await expect(adapter.optimizeResume({ analysis: {} as never, selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: [], rejectedChangeIds: [], templateId: "ats-classic" })).rejects.toMatchObject({ kind: "INVALID_INPUT" });
  });
  it("strictly rejects unknown nested analysis fields and malformed copied hard gates", async () => {
    const adapter = new JobFitCoreAdapter({ version: "0.1.0", schemaVersion: "2.0.0" } as never); const saved = { profile: { ...profile, injected: "secret" }, evidence: [], analyses: [{ ...analysis, matchedSkills: [], transferableSkills: [], skillGaps: [], evidenceGaps: [] }], learningPaths: [], hardGates: [{ requirementId: "not-a-gate", status: "PASS", evidenceIds: [], explanation: "wrong" }] };
    await expect(adapter.validateAnalysis(saved)).rejects.toMatchObject({ kind: "INVALID_INPUT" });
  });
  it("strictly rejects unknown nested resume-model fields", async () => {
    const packageName: string = "@job-fit/core"; const loaded = await import(packageName); const store = new loaded.EvidenceStore(); const evidence = store.add({ sourceType: "RESUME", sourceId: "resume", locator: "line 1", summary: "Built project", confidence: 1, sensitive: true, raw: "Built project" });
    const adapter = new JobFitCoreAdapter({ version: "0.1.0", schemaVersion: "2.0.0" } as never); const resumeModel = { id: "draft", jobId: "job", template: "CLASSIC", sections: [{ heading: "Projects", bullets: [{ id: "bullet", text: "Built project", evidenceIds: [evidence.id], highRisk: false, confirmed: true, injected: "secret" }] }] };
    await expect(adapter.validateStoredResume({ resumeModel, evidence: [evidence] })).rejects.toMatchObject({ kind: "INVALID_INPUT" });
  });
  it("requires a trusted fetcher and turns fetched repository files into evidence", async () => {
    const packageName: string = "@job-fit/core"; const loaded = await import(packageName); const captured: { evidence?: Array<{ summary: string }> } = {};
    const service = { version: "0.1.0", schemaVersion: "2.0.0", async buildProfile(input: { evidence: Array<{ summary: string }> }) { captured.evidence = input.evidence; return profile; }, async analyzeJob() { return analysis; }, aggregateJobs() { return []; }, async buildLearningPlan() { return { gapRequirementId: "req-redis", targetSkillId: "redis", jdQuote: "Redis caching", searchedEvidenceIds: [], resources: [], tracks: [] }; } };
    const input = { materials: [{ path: "cv.txt", sourceType: "RESUME" as const, mediaType: "text/plain" as const, bytes: Buffer.from("Built Node.js project") }], jobs: [{ id: "job", text: "Redis caching is required for this backend engineering role.", transferableSkillIds: [], explicitMissingSkillIds: [], hardGateAnswers: {} }], repositories: [{ provider: "github" as const, url: "https://github.com/example/repo" }], confirmedFacts: [], locale: "en" as const };
    await expect(new JobFitCoreAdapter(service as never, { MaterialParser: loaded.MaterialParser, EvidenceStore: loaded.EvidenceStore }).analyze(input)).rejects.toMatchObject({ coreCode: "REPOSITORY_UNAVAILABLE" });
    const adapter = new JobFitCoreAdapter(service as never, { MaterialParser: loaded.MaterialParser, EvidenceStore: loaded.EvidenceStore }, { async fetch() { return [{ path: "README.md", bytes: Buffer.from("Built a Redis cache project") }]; } }); await adapter.analyze(input);
    expect(captured.evidence?.some(({ summary }) => summary.includes("Redis cache"))).toBe(true); expect(captured.evidence?.some(({ summary }) => summary.includes("github.com/example"))).toBe(false);
  });
  it("proposes high-risk changes before rerunning Core with explicit confirmations", async () => {
    const packageName: string = "@job-fit/core"; const loaded = await import(packageName); const store = new loaded.EvidenceStore();
    const evidence = store.add({ sourceType: "RESUME", sourceId: "resume", locator: "line 1", summary: "Built Node.js project", confidence: 1, sensitive: true, raw: "Built Node.js project" });
    const draft = (confirmed: boolean) => ({ id: "draft-job", jobId: "job", template: "CLASSIC" as const, sections: [{ heading: "Projects", bullets: [{ id: "risk-1", text: "Owned Node.js project", evidenceIds: [evidence.id], highRisk: true, confirmed }, { id: "safe-1", text: "Built Node.js project", evidenceIds: [evidence.id], highRisk: false, confirmed: true }] }] });
    const calls: Array<{ proposalOnly?: boolean; confirmedBulletIds?: string[]; proposalDraft?: ReturnType<typeof draft> }> = [];
    const service = {
      version: "0.1.0", schemaVersion: "2.0.0",
      async tailorResume(input: { proposalOnly?: boolean; confirmedBulletIds?: string[]; proposalDraft?: ReturnType<typeof draft> }) { calls.push(input); const source = input.proposalDraft ?? draft(false); return { ...source, sections: source.sections.map((section) => ({ ...section, bullets: section.bullets.filter((bullet) => !input.proposalDraft || !bullet.highRisk || input.confirmedBulletIds?.includes(bullet.id)).map((bullet) => ({ ...bullet, confirmed: bullet.highRisk ? !input.proposalOnly && input.confirmedBulletIds?.includes(bullet.id) === true : true })) })).filter(({ bullets }) => bullets.length > 0) }; },
      verifyResume(value: ReturnType<typeof draft>) { return { passed: value.sections[0]!.bullets[0]!.confirmed, issues: value.sections[0]!.bullets[0]!.confirmed ? [] : [{ code: "UNCONFIRMED_HIGH_RISK", path: "sections.0.bullets.0", message: "confirmation required" }] }; },
    };
    const saved = { profile, evidence: [evidence], analyses: [{ ...analysis, matchedSkills: [], transferableSkills: [], skillGaps: [], evidenceGaps: ["redis"] }], learningPaths: [], hardGates: [] };
    const adapter = new JobFitCoreAdapter(service as never, { MaterialParser: loaded.MaterialParser, EvidenceStore: loaded.EvidenceStore });
    const proposal = await adapter.optimizeResume({ analysis: saved, selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: [], rejectedChangeIds: [], templateId: "ats-classic" });
    expect(proposal).toMatchObject({ status: "NEEDS_CONFIRMATION", requiredConfirmationIds: ["risk-1"], factualVerification: { passed: false } });
    expect(calls).toHaveLength(1); expect(calls[0]).toMatchObject({ proposalOnly: true, confirmedBulletIds: [] });
    const confirmed = await adapter.optimizeResume({ analysis: saved, selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: ["risk-1"], rejectedChangeIds: [], templateId: "ats-classic", proposalDraft: proposal.resumeModel });
    expect(confirmed).toMatchObject({ status: "CONFIRMED", requiredConfirmationIds: [], factualVerification: { passed: true } });
    expect(calls).toHaveLength(2); expect(calls[1]).toMatchObject({ confirmedBulletIds: ["risk-1"], proposalDraft: proposal.resumeModel }); expect(calls[1]!.proposalOnly).toBeUndefined();
    const rejected = await adapter.optimizeResume({ analysis: saved, selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: [], rejectedChangeIds: ["risk-1"], templateId: "ats-classic", proposalDraft: proposal.resumeModel }); expect(rejected).toMatchObject({ status: "CONFIRMED", changes: [{ id: "safe-1" }] }); expect(calls[2]!.proposalDraft).toEqual(proposal.resumeModel);
  });
  it("rejects unknown or duplicate confirmation IDs without producing a final draft", async () => {
    const packageName: string = "@job-fit/core"; const loaded = await import(packageName); const store = new loaded.EvidenceStore();
    const evidence = store.add({ sourceType: "RESUME", sourceId: "resume", locator: "line 1", summary: "Built Node.js project", confidence: 1, sensitive: true, raw: "Built Node.js project" }); let calls = 0;
    const service = { version: "0.1.0", schemaVersion: "2.0.0", async tailorResume() { calls += 1; return { id: "draft-job", jobId: "job", template: "CLASSIC", sections: [{ heading: "Projects", bullets: [{ id: "risk-1", text: "Built Node.js project", evidenceIds: [evidence.id], highRisk: true, confirmed: false }] }] }; }, verifyResume() { throw new Error("must not verify invalid confirmation"); } };
    const saved = { profile, evidence: [evidence], analyses: [{ ...analysis, matchedSkills: [], transferableSkills: [], skillGaps: [], evidenceGaps: ["redis"] }], learningPaths: [], hardGates: [] };
    const adapter = new JobFitCoreAdapter(service as never, { MaterialParser: loaded.MaterialParser, EvidenceStore: loaded.EvidenceStore });
    const proposalDraft = await service.tailorResume(); calls = 0;
    await expect(adapter.optimizeResume({ analysis: saved, selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: ["stale"], rejectedChangeIds: [], templateId: "ats-classic", proposalDraft } as never)).rejects.toMatchObject({ kind: "INVALID_INPUT" });
    await expect(adapter.optimizeResume({ analysis: saved, selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: ["risk-1", "risk-1"], rejectedChangeIds: [], templateId: "ats-classic", proposalDraft } as never)).rejects.toMatchObject({ kind: "INVALID_INPUT" });
    await expect(adapter.optimizeResume({ analysis: saved, selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: [], rejectedChangeIds: [], templateId: "ats-classic", proposalDraft } as never)).rejects.toMatchObject({ kind: "INVALID_INPUT" });
    expect(calls).toBe(0);
  });
});
