import { describe, expect, it } from "vitest";
import { errorEnvelopeSchema, requestSchemas, successEnvelopeSchema } from "../../src/schemas.js";
describe("wire contract 1.0.0", () => {
  it("exports exactly four strict actions", () => { expect(Object.keys(requestSchemas)).toMatchInlineSnapshot(`
      [
        "analyze",
        "optimize-resume",
        "render-resume",
        "delete-local-data",
      ]
    `); expect(() => requestSchemas["delete-local-data"].parse({ confirm: true, extra: 1 })).toThrow(); });
  it("validates stable envelopes", () => { expect(successEnvelopeSchema.parse({ schemaVersion: "1.0.0", runId: "r", action: "analyze", status: "succeeded", cached: false, data: {} })).toBeTruthy(); expect(errorEnvelopeSchema.parse({ schemaVersion: "1.0.0", runId: "r", action: "analyze", status: "failed", error: { code: "INVALID_INPUT", message: "safe", retryable: false } })).toBeTruthy(); });
});
