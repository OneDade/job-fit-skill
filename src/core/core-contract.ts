/** Exact structural contract for the optional @job-fit/core 0.1.0/schema 2.0.0 peer. */
export type SourceType = "RESUME" | "WORK" | "INTERNSHIP" | "COURSE" | "COMPETITION" | "PROJECT" | "REPOSITORY" | "USER_CONFIRMED" | "JD";
export type Evidence = { id: string; sourceType: SourceType; sourceId: string; locator: string; summary: string; confidence: number; sensitive: boolean; contentHash: string; origins?: Array<{ sourceType: SourceType; sourceId: string; locator: string }> };
export type EvidenceInput = Omit<Evidence, "id" | "contentHash" | "origins"> & { raw: string };
export type CandidateProfile = { id: string; version: number; experiences: Array<{ id: string; kind: "WORK" | "INTERNSHIP" | "COURSE" | "COMPETITION" | "PROJECT"; title: string; organization?: string; start?: string; end?: string; evidenceIds: string[] }>; skills: Array<{ skillId: string; label: string; level: "LEARNED" | "PRACTICED" | "PROJECT" | "PRODUCTION"; evidenceIds: string[] }> };
export type JobRequirement = { id: string; skillId?: string; kind: "HARD_GATE" | "CORE_RESPONSIBILITY" | "REQUIRED_SKILL" | "PREFERRED_SKILL" | "DOMAIN_CULTURE"; text: string; locator: string; explicit: boolean; confidence: number; importance: number };
export type MatchState = "MATCHED" | "TRANSFERABLE" | "MISSING" | "INSUFFICIENT_EVIDENCE";
export type HardGateStatus = "PASS" | "RISK" | "FAIL";
export type JobAnalysis = { id: string; jobId: string; requirements: JobRequirement[]; matches: Array<{ requirementId: string; state: MatchState; evidenceIds: string[]; confidence: number; explanation: string }>; hardGates: Array<{ requirementId: string; status: HardGateStatus; evidenceIds: string[]; explanation: string }>; categoryScores: Record<"CORE_RESPONSIBILITY" | "REQUIRED_SKILL" | "EVIDENCE" | "PREFERRED_GROWTH", number>; totalScore: number; recommendation: "APPLY" | "APPLY_WITH_RISKS" | "DO_NOT_APPLY" };
export type AggregatedSkillGap = { skillId: string; frequency: number; averageImportance: number; priority: number; jobIds: string[]; missingJobs: number; insufficientEvidenceJobs: number };
export type LearningPlan = { gapRequirementId: string; targetSkillId: string; jdQuote: string; searchedEvidenceIds: string[]; resources: Array<{ id: string; skillId: string; title: string; url: string; publisher: string; language: string; cost: "FREE" | "PAID" | "FREEMIUM"; estimatedHours: number; verifiedAt: string }>; tracks: [{ kind: "QUICK" | "LONG_TERM"; minDays: number; maxDays: number; resourceIds: string[]; tasks: LearningTask[] }, { kind: "QUICK" | "LONG_TERM"; minDays: number; maxDays: number; resourceIds: string[]; tasks: LearningTask[] }] };
export type LearningTask = { id: string; skillId: string; source: "PLATFORM_GENERATED"; title: string; deliverables: string[]; acceptanceCriteria: string[]; suggestedStack: string[]; estimatedDays: number };
export type ResumeDraft = { id: string; jobId: string; template: "COMPACT" | "CLASSIC" | "GRADUATE"; sections: Array<{ heading: string; bullets: Array<{ id: string; text: string; evidenceIds: string[]; highRisk: boolean; confirmed: boolean }> }> };
export type VerificationResult = { passed: boolean; issues: Array<{ code: "MISSING_EVIDENCE" | "UNKNOWN_EVIDENCE" | "UNCONFIRMED_HIGH_RISK" | "TIMELINE_CONFLICT" | "ATS_TEXT_MISSING" | "PRIVACY_LEAK"; path: string; message: string }> };
export type MaterialInput = { id: string; filename: string; mime: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain"; bytes: Buffer };
export interface JobFitService {
  readonly version: string; readonly schemaVersion: string;
  buildProfile(input: { profileId: string; version: number; material: string; evidence: readonly Evidence[] }): Promise<CandidateProfile>;
  analyzeJob(input: { analysisId: string; jobId: string; jdText: string; profile: CandidateProfile; evidenceIds: Set<string>; explicitMissingSkillIds: Set<string>; transferableSkillIds?: Set<string>; hardGateAnswers: Map<string, HardGateStatus> }): Promise<JobAnalysis>;
  aggregateJobs(analyses: JobAnalysis[]): AggregatedSkillGap[];
  buildLearningPlan(input: { requirementId: string; skillId: string; jdQuote: string; searchedEvidenceIds: string[] }): Promise<LearningPlan>;
  tailorResume(input: { draftId: string; jobId: string; template: ResumeDraft["template"]; facts: string; evidence: Evidence[]; requirements: JobRequirement[]; confirmedBulletIds?: string[]; proposalOnly?: boolean; proposalDraft?: ResumeDraft }): Promise<ResumeDraft>;
  verifyResume(draft: ResumeDraft, evidence: readonly Evidence[]): VerificationResult;
  renderResume(draft: ResumeDraft, evidence: readonly Evidence[]): Promise<{ docx: Buffer; pdf: Buffer; verification: VerificationResult }>;
}
export interface CoreDependencies { model: { generate(input: unknown): Promise<unknown> }; catalog: { find(skillId: string): Promise<unknown[]> }; search: { search(skillId: string): Promise<unknown[]> }; probe: { probe(url: URL): Promise<{ ok: boolean; finalUrl: URL }> }; clock: { now(): Date }; pdfConverter: { convert(docx: Buffer): Promise<Buffer> }; pdfInspector: { inspect(pdf: Buffer): Promise<{ pages: number; text: string; hasBlankPage: boolean }> } }
export interface RepositoryFetcher { fetch(input: { provider: "github" | "gitee"; url: string; maxBytes: number; timeoutMs: number; maxRedirects: number }): Promise<Array<{ path: string; bytes: Uint8Array }>> }
export interface CoreModule {
  createJobFitService(dependencies: CoreDependencies): JobFitService;
  MaterialParser: new () => { parse(input: MaterialInput): Promise<{ text: string }> };
  EvidenceStore: new () => { add(input: EvidenceInput): Evidence; all(): Evidence[] };
  CandidateProfileSchema: Validator<CandidateProfile>; StrictEvidenceSchema: Validator<Evidence>; JobAnalysisSchema: Validator<JobAnalysis>; LearningPlanSchema: Validator<LearningPlan>; ResumeDraftSchema: Validator<ResumeDraft>;
}
export interface Validator<T> { safeParse(value: unknown): { success: true; data: T } | { success: false } }
