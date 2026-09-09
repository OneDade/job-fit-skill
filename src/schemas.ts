import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0" as const;
const localPath = z.string().min(1).max(1024).refine((v) => !v.includes("\0"), "path contains NUL");
const repo = z.object({
  provider: z.enum(["github", "gitee"]),
  url: z.string().url().refine((url) => /^https:\/\/(github\.com|gitee\.com)\//.test(url), "only public GitHub/Gitee URLs are accepted"),
}).strict();
export const analyzeRequestSchema = z.object({
  resumeFiles: z.array(localPath).min(1).max(20),
  jobs: z.array(z.object({ id: z.string().min(1).max(100), text: z.string().min(40).max(200_000), transferableSkillIds: z.array(z.string().min(1).max(128)).max(100).default([]), explicitMissingSkillIds: z.array(z.string().min(1).max(128)).max(100).default([]), hardGateAnswers: z.record(z.string().min(1).max(128), z.enum(["PASS", "RISK", "FAIL"])).default({}) }).strict()).min(1).max(10),
  projectFiles: z.array(localPath).max(50).default([]),
  repositories: z.array(repo).max(20).default([]),
  confirmedFacts: z.array(z.string().min(1).max(1000)).max(100).default([]),
  locale: z.enum(["zh-CN", "en"]).default("zh-CN"),
  reportFormats: z.array(z.enum(["json", "markdown"])).min(1).default(["json", "markdown"]),
}).strict();
export const optimizeResumeRequestSchema = z.object({
  analysisFile: localPath,
  selectedJobId: z.string().min(1).max(100),
  confirmedFacts: z.array(z.object({ id: z.string().min(1), value: z.string().min(1), evidenceIds: z.array(z.string().min(1)).min(1) }).strict()).default([]),
  confirmedChangeIds: z.array(z.string().min(1)).default([]),
  rejectedChangeIds: z.array(z.string().min(1)).default([]),
  proposalFile: localPath.optional(),
  templateId: z.enum(["ats-classic", "ats-compact", "ats-graduate"]).default("ats-classic"),
  identity: z.object({ name: z.string().min(1), email: z.string().email().optional(), phone: z.string().min(5).optional() }).strict().optional(),
}).strict();
export const renderResumeRequestSchema = z.object({
  resumeModelFile: localPath,
  outputDirectory: localPath.default("output"),
  formats: z.array(z.enum(["docx", "pdf"])).min(1).default(["docx", "pdf"]),
}).strict();
export const deleteLocalDataRequestSchema = z.object({ confirm: z.literal(true) }).strict();

export const requestSchemas = {
  analyze: analyzeRequestSchema,
  "optimize-resume": optimizeResumeRequestSchema,
  "render-resume": renderResumeRequestSchema,
  "delete-local-data": deleteLocalDataRequestSchema,
} as const;
export type ActionName = keyof typeof requestSchemas;
export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type OptimizeResumeRequest = z.infer<typeof optimizeResumeRequestSchema>;
export type RenderResumeRequest = z.infer<typeof renderResumeRequestSchema>;

export const successEnvelopeSchema = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), runId: z.string(), action: z.enum(["analyze", "optimize-resume", "render-resume", "delete-local-data"]), status: z.literal("succeeded"), cached: z.boolean(), data: z.unknown() }).strict();
export const errorEnvelopeSchema = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), runId: z.string(), action: z.enum(["analyze", "optimize-resume", "render-resume", "delete-local-data"]), status: z.literal("failed"), error: z.object({ code: z.enum(["INVALID_INPUT", "FILE_ERROR", "IDEMPOTENCY_CONFLICT", "CORE_REJECTED", "DEPENDENCY_UNAVAILABLE", "INTERRUPTED", "INTERNAL_ERROR"]), message: z.string(), retryable: z.boolean(), coreCode: z.enum(["FILE_INVALID", "FILE_TEXT_UNREADABLE", "JD_INSUFFICIENT", "REPOSITORY_UNAVAILABLE", "MODEL_SCHEMA_INVALID", "RESOURCE_UNVERIFIED", "DOCUMENT_GENERATION_FAILED", "FACT_GATE_FAILED", "DELETE_FAILED"]).optional(), recoverability: z.enum(["USER_FIXABLE", "SYSTEM_RETRYABLE", "HUMAN_REVIEW"]).optional() }).strict() }).strict();
