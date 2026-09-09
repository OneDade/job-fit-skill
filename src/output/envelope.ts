import { SCHEMA_VERSION, type ActionName } from "../schemas.js";
export type ErrorKind = "INVALID_INPUT" | "FILE_ERROR" | "IDEMPOTENCY_CONFLICT" | "CORE_REJECTED" | "DEPENDENCY_UNAVAILABLE" | "INTERRUPTED" | "INTERNAL_ERROR";
export type CoreErrorCode = "FILE_INVALID" | "FILE_TEXT_UNREADABLE" | "JD_INSUFFICIENT" | "REPOSITORY_UNAVAILABLE" | "MODEL_SCHEMA_INVALID" | "RESOURCE_UNVERIFIED" | "DOCUMENT_GENERATION_FAILED" | "FACT_GATE_FAILED" | "DELETE_FAILED";
export type Recoverability = "USER_FIXABLE" | "SYSTEM_RETRYABLE" | "HUMAN_REVIEW";
export class CliFailure extends Error {
  constructor(public readonly kind: ErrorKind, message: string, public readonly retryable = false, public readonly coreCode?: CoreErrorCode, public readonly recoverability?: Recoverability) { super(message); this.name = "CliFailure"; }
}
export const exitCode = (kind: ErrorKind): number => ({ INVALID_INPUT: 2, FILE_ERROR: 3, IDEMPOTENCY_CONFLICT: 4, CORE_REJECTED: 4, DEPENDENCY_UNAVAILABLE: 5, INTERRUPTED: 130, INTERNAL_ERROR: 10 })[kind];
export const success = (runId: string, action: ActionName, data: unknown, cached: boolean) => ({ schemaVersion: SCHEMA_VERSION, runId, action, status: "succeeded" as const, cached, data });
export const failure = (runId: string, action: ActionName, error: CliFailure) => ({ schemaVersion: SCHEMA_VERSION, runId, action, status: "failed" as const, error: { code: error.kind, message: error.message, retryable: error.retryable, ...(error.coreCode ? { coreCode: error.coreCode } : {}), ...(error.recoverability ? { recoverability: error.recoverability } : {}) } });
