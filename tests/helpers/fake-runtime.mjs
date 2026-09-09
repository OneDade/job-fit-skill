const core = {
  contractVersion: "2.0.0",
  async validateAnalysis(input) { return input; },
  async validateStoredResume(input) { return input; },
  async analyze(input) {
    const hasRedis = input.jobs.some((job) => job.text.includes("Redis"));
    return { profile: { id: "profile-1", deidentified: true, skills: ["Node.js"] }, evidence: [{ id: "ev-node", category: "course_project" }], analyses: input.jobs.map((job) => ({ jobId: job.id, requirements: [{ quote: "Redis caching", locator: "line:1" }], matchedSkills: ["Node.js"], transferableSkills: [], skillGaps: hasRedis ? ["Redis"] : [] })), learningPaths: hasRedis ? [{ skill: "Redis", source: { url: "https://redis.io/docs/latest/", verifiedAt: "2026-09-07" }, quickDays: 7, longMonths: 2, project: { provenance: "platform-generated", acceptance: ["tests pass"] } }] : [], hardGates: [] };
  },
  async optimizeResume(input) { return { status: "CONFIRMED", resumeModel: { jobId: input.selectedJobId, claims: [{ text: "Node.js course project", evidenceIds: ["ev-node"], category: "course_project" }] }, evidence: [], changes: [], riskyChanges: [], requiredConfirmationIds: [], factualVerification: { passed: true } }; },
  async renderResume(_model, formats) { return { verification: { passed: true }, artifacts: formats.map((format) => ({ format, filename: `resume.${format}`, bytes: Buffer.from(format === "pdf" ? "%PDF-test" : "PK-test") })) }; },
};
export function createJobFitCorePort() { return core; }
