import { describe, expect, it } from "vitest";
import { sanitizePublicText, sanitizePublicValue } from "../../src/output/pii.js";

describe("public PII sanitizer", () => {
  it("redacts contact headers, Chinese IDs and addresses", () => { const output = sanitizePublicText("Chen Pengwen | chen@example.com | 13800138000 | 北京市朝阳区建国路88号 | 身份证 110105199001011234"); for (const secret of ["Chen Pengwen", "chen@example.com", "13800138000", "北京市朝阳区建国路88号", "110105199001011234"]) expect(output).not.toContain(secret); });
  it("redacts explicit name fields and bounds hostile strings", () => { expect(sanitizePublicValue({ name: "陈鹏文" })).toEqual({ name: "[NAME]" }); expect(sanitizePublicText("x".repeat(100_001)).length).toBeLessThanOrEqual(10_000); });
  it("redacts candidate names embedded in contextual free text", () => { const output = JSON.stringify(sanitizePublicValue({ summary: "Candidate Chen Pengwen delivered the project", note: "候选人陈鹏文交付了项目" })); expect(output).not.toContain("Chen Pengwen"); expect(output).not.toContain("陈鹏文"); });
  it("redacts standalone names before candidate action verbs without masking product names", () => { const output = sanitizePublicValue({ latin: "Alice Smith delivered the migration", chinese: "陈鹏文完成了迁移", product: "Google Cloud completed the rollout" }); expect(output).toEqual({ latin: "[NAME] delivered the migration", chinese: "[NAME]完成了迁移", product: "Google Cloud completed the rollout" }); });
});
