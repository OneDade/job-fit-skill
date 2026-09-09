const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const exact = (value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> => object(value) && required.every((key) => key in value) && Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
const every = (value: unknown, predicate: (entry: unknown) => boolean): boolean => Array.isArray(value) && value.every(predicate);
const strings = (value: unknown): boolean => every(value, (entry) => typeof entry === "string");

const origin = (value: unknown): boolean => exact(value, ["sourceType", "sourceId", "locator"]);
const evidence = (value: unknown): boolean => exact(value, ["id", "sourceType", "sourceId", "locator", "summary", "confidence", "sensitive", "contentHash"], ["origins"]) && (!("origins" in value) || every(value.origins, origin));
const experience = (value: unknown): boolean => exact(value, ["id", "kind", "title", "evidenceIds"], ["organization", "start", "end"]);
const skill = (value: unknown): boolean => exact(value, ["skillId", "label", "level", "evidenceIds"]);
const profile = (value: unknown): boolean => exact(value, ["id", "version", "experiences", "skills"]) && every(value.experiences, experience) && every(value.skills, skill);
const requirement = (value: unknown): boolean => exact(value, ["id", "kind", "text", "locator", "explicit", "confidence", "importance"], ["skillId"]);
const match = (value: unknown): boolean => exact(value, ["requirementId", "state", "evidenceIds", "confidence", "explanation"]);
const hardGate = (value: unknown): boolean => exact(value, ["requirementId", "status", "evidenceIds", "explanation"]);
const scores = (value: unknown): boolean => exact(value, ["CORE_RESPONSIBILITY", "REQUIRED_SKILL", "EVIDENCE", "PREFERRED_GROWTH"]);
const analysis = (value: unknown): boolean => exact(value, ["id", "jobId", "requirements", "matches", "hardGates", "categoryScores", "totalScore", "recommendation", "matchedSkills", "transferableSkills", "skillGaps", "evidenceGaps"]) && every(value.requirements, requirement) && every(value.matches, match) && every(value.hardGates, hardGate) && scores(value.categoryScores) && strings(value.matchedSkills) && strings(value.transferableSkills) && strings(value.skillGaps) && strings(value.evidenceGaps);
const resource = (value: unknown): boolean => exact(value, ["id", "skillId", "title", "url", "publisher", "language", "cost", "estimatedHours", "verifiedAt"]);
const task = (value: unknown): boolean => exact(value, ["id", "skillId", "source", "title", "deliverables", "acceptanceCriteria", "suggestedStack", "estimatedDays"]);
const track = (value: unknown): boolean => exact(value, ["kind", "minDays", "maxDays", "resourceIds", "tasks"]) && every(value.tasks, task);
const learningPlan = (value: unknown): boolean => exact(value, ["gapRequirementId", "targetSkillId", "jdQuote", "searchedEvidenceIds", "resources", "tracks"]) && every(value.resources, resource) && every(value.tracks, track);
const aggregate = (value: unknown): boolean => exact(value, ["skillId", "frequency", "averageImportance", "priority", "jobIds", "missingJobs", "insufficientEvidenceJobs"]);
const bullet = (value: unknown): boolean => exact(value, ["id", "text", "evidenceIds", "highRisk", "confirmed"]);
const section = (value: unknown): boolean => exact(value, ["heading", "bullets"]) && every(value.bullets, bullet);
const resume = (value: unknown): boolean => exact(value, ["id", "jobId", "template", "sections"]) && every(value.sections, section);

export function isStrictAnalysisContext(value: unknown): boolean {
  if (!exact(value, ["profile", "evidence", "analyses", "learningPaths", "hardGates"], ["aggregate"]) || !profile(value.profile) || !every(value.evidence, evidence) || !every(value.analyses, analysis) || !every(value.learningPaths, learningPlan) || !every(value.hardGates, hardGate) || ("aggregate" in value && !every(value.aggregate, aggregate))) return false;
  const copied = (value.analyses as Array<Record<string, unknown>>).flatMap((item) => item.hardGates as unknown[]);
  return JSON.stringify(copied) === JSON.stringify(value.hardGates);
}

export function isStrictStoredResume(value: unknown): boolean {
  return exact(value, ["resumeModel", "evidence"]) && resume(value.resumeModel) && every(value.evidence, evidence);
}
