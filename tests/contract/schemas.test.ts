import { describe, expect, it } from "vitest";
import { errorEnvelopeSchema, requestSchemas, successEnvelopeSchema } from "../../src/schemas.js";
import { toCoreTemplate } from "../../src/template-catalog.js";
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
  it("accepts user-facing and legacy resume template IDs", () => {
    const base = { analysisFile: ".job-fit/reports/latest-analysis.json", selectedJobId: "job" };
    for (const templateId of ["professional-business", "technical-project", "one-page-compact", "ats-minimal", "ats-classic", "ats-compact", "ats-graduate"]) expect(requestSchemas["optimize-resume"].parse({ ...base, templateId }).templateId).toBe(templateId);
    expect(() => requestSchemas["optimize-resume"].parse({ ...base, templateId: "decorative-sidebar" })).toThrow();
    expect([toCoreTemplate("professional-business"), toCoreTemplate("technical-project"), toCoreTemplate("one-page-compact")]).toEqual(["COMPACT", "GRADUATE", "CLASSIC"]);
  });
});
