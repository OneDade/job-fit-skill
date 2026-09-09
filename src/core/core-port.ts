import type { AggregatedSkillGap, CandidateProfile, Evidence, HardGateStatus, JobAnalysis, LearningPlan, ResumeDraft, VerificationResult } from "./core-contract.js";

export type Material = { path: string; sourceType: "RESUME" | "PROJECT"; mediaType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain"; bytes: Uint8Array };
export type AnalyzeCoreInput = { materials: Material[]; jobs: Array<{ id: string; text: string; transferableSkillIds: string[]; explicitMissingSkillIds: string[]; hardGateAnswers: Record<string, HardGateStatus> }>; repositories: Array<{ provider: "github" | "gitee"; url: string }>; confirmedFacts: string[]; locale: "zh-CN" | "en" };
export type SkillJobAnalysis = JobAnalysis & { matchedSkills: string[]; transferableSkills: string[]; skillGaps: string[]; evidenceGaps: string[] };
export type AnalyzeCoreResult = { profile: CandidateProfile; evidence: Evidence[]; analyses: SkillJobAnalysis[]; aggregate?: AggregatedSkillGap[]; learningPaths: LearningPlan[]; hardGates: JobAnalysis["hardGates"] };
export type AnalyzeReport = AnalyzeCoreResult;
export type OptimizeCoreInput = { analysis: AnalyzeReport; selectedJobId: string; confirmedFacts: Array<{ id: string; value: string; evidenceIds: string[] }>; confirmedChangeIds: string[]; rejectedChangeIds: string[]; templateId: string; proposalDraft?: ResumeDraft; identity?: { name: string; email?: string | undefined; phone?: string | undefined } };
export type ResumeChange = { id: string; text: string; highRisk: boolean; confirmed: boolean; evidenceIds: string[] };
export type OptimizeCoreResult = { status: "NEEDS_CONFIRMATION" | "CONFIRMED"; resumeModel: ResumeDraft; evidence: Evidence[]; changes: ResumeChange[]; riskyChanges: ResumeChange[]; requiredConfirmationIds: string[]; factualVerification: VerificationResult };
export type StoredResumeModel = { resumeModel: ResumeDraft; evidence: Evidence[] };
export type RenderCoreResult = { verification: VerificationResult; artifacts: Array<{ format: "docx" | "pdf"; filename: string; bytes: Uint8Array }> };
export interface CorePort {
  readonly contractVersion: string;
  validateAnalysis(input: unknown): Promise<AnalyzeReport>;
  validateStoredResume(input: unknown): Promise<StoredResumeModel>;
  analyze(input: AnalyzeCoreInput): Promise<AnalyzeCoreResult>;
  optimizeResume(input: OptimizeCoreInput): Promise<OptimizeCoreResult>;
  renderResume(model: StoredResumeModel, formats: Array<"docx" | "pdf">): Promise<RenderCoreResult>;
}
