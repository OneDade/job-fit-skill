import type { AnalyzeCoreInput, AnalyzeCoreResult, CorePort, OptimizeCoreInput, StoredResumeModel } from "../../src/core/core-port.js";

const hash = "a".repeat(64);
const evidence = { id: "ev-node", sourceType: "COURSE" as const, sourceId: "course", locator: "line 1", summary: "Built a Node.js course project", confidence: 1, sensitive: false, contentHash: hash };
const profile = { id: "profile-1", version: 1, experiences: [{ id: "exp", kind: "COURSE" as const, title: "Node.js course project", evidenceIds: [evidence.id] }], skills: [{ skillId: "node", label: "Node.js", level: "PROJECT" as const, evidenceIds: [evidence.id] }] };

export class FakeCore implements CorePort {
  readonly contractVersion = "1.0.0"; calls: string[] = [];
  async validateAnalysis(input: unknown) { return input as AnalyzeCoreResult; }
  async validateStoredResume(input: unknown) { return input as StoredResumeModel; }
  async analyze(input: AnalyzeCoreInput): Promise<AnalyzeCoreResult> {
    this.calls.push(`analyze:${input.jobs.length}`); const redis = input.jobs.some((j) => j.text.includes("Redis"));
    const analyses = input.jobs.map((job) => ({ id: `analysis-${job.id}`, jobId: job.id, requirements: [{ id: "req-redis", skillId: "redis", kind: "REQUIRED_SKILL" as const, text: "Redis caching", locator: "line 1", explicit: true, confidence: 1, importance: 1 }], matches: [{ requirementId: "req-redis", state: "MISSING" as const, evidenceIds: [], confidence: 1, explanation: "Missing" }], hardGates: [], categoryScores: { CORE_RESPONSIBILITY: 0, REQUIRED_SKILL: 0, EVIDENCE: 100, PREFERRED_GROWTH: 0 }, totalScore: 20, recommendation: "APPLY_WITH_RISKS" as const, matchedSkills: ["node"], transferableSkills: [], skillGaps: redis ? ["Redis"] : [], evidenceGaps: [] }));
    const learningPaths: AnalyzeCoreResult["learningPaths"] = redis ? [{ gapRequirementId: "req-redis", targetSkillId: "redis", jdQuote: "Redis caching", searchedEvidenceIds: [evidence.id], resources: [{ id: "redis-docs", skillId: "redis", title: "Redis docs", url: "https://redis.io/docs/latest/", publisher: "Redis", language: "en", cost: "FREE", estimatedHours: 2, verifiedAt: "2026-09-07T00:00:00.000Z" }], tracks: [{ kind: "QUICK", minDays: 3, maxDays: 14, resourceIds: ["redis-docs"], tasks: [{ id: "quick", skillId: "redis", source: "PLATFORM_GENERATED", title: "Redis project", deliverables: ["code"], acceptanceCriteria: ["tests pass"], suggestedStack: ["redis"], estimatedDays: 7 }] }, { kind: "LONG_TERM", minDays: 30, maxDays: 90, resourceIds: ["redis-docs"], tasks: [{ id: "long", skillId: "redis", source: "PLATFORM_GENERATED", title: "Redis system", deliverables: ["code"], acceptanceCriteria: ["tests pass"], suggestedStack: ["redis"], estimatedDays: 60 }] }] }] : [];
    return { profile, evidence: [evidence], analyses, learningPaths, hardGates: [] };
  }
  async optimizeResume(input: OptimizeCoreInput) { this.calls.push(`optimize:${input.selectedJobId}`); const resumeModel = { id: "draft", jobId: input.selectedJobId, template: "CLASSIC" as const, sections: [{ heading: "Projects", bullets: [{ id: "bullet", text: "Built a Node.js course_project", evidenceIds: [evidence.id], highRisk: false, confirmed: true }] }] }; return { status: "CONFIRMED" as const, resumeModel, evidence: [evidence], changes: [], riskyChanges: [], requiredConfirmationIds: [], factualVerification: { passed: true, issues: [] } }; }
  async renderResume(_model: StoredResumeModel, formats: Array<"docx" | "pdf">) { this.calls.push(`render:${formats.join(",")}`); return { verification: { passed: true, issues: [] }, artifacts: formats.map((format) => ({ format, filename: `resume.${format}`, bytes: Buffer.from(format === "pdf" ? "%PDF-fake" : "PK-fake") })) }; }
}
