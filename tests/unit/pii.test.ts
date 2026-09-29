import { describe, expect, it } from "vitest";
import { candidateNamesFromText, sanitizePublicText, sanitizePublicValue } from "../../src/output/pii.js";

describe("public PII sanitizer", () => {
  it("redacts contact headers, Chinese IDs and addresses", () => { const output = sanitizePublicText("Chen Pengwen | chen@example.com | 13800138000 | 北京市朝阳区建国路88号 | 身份证 110105199001011234"); for (const secret of ["Chen Pengwen", "chen@example.com", "13800138000", "北京市朝阳区建国路88号", "110105199001011234"]) expect(output).not.toContain(secret); });
  it("redacts explicit name fields and bounds hostile strings", () => { expect(sanitizePublicValue({ name: "陈鹏文" })).toEqual({ name: "[NAME]" }); expect(sanitizePublicText("x".repeat(100_001)).length).toBeLessThanOrEqual(10_000); });
  it("redacts candidate names embedded in contextual free text", () => { const output = JSON.stringify(sanitizePublicValue({ summary: "Candidate Chen Pengwen delivered the project", note: "候选人陈鹏文交付了项目" })); expect(output).not.toContain("Chen Pengwen"); expect(output).not.toContain("陈鹏文"); });
  it("redacts standalone names before candidate action verbs without masking product names", () => { const output = sanitizePublicValue({ latin: "Alice Smith delivered the migration", chinese: "陈鹏文完成了迁移", product: "Google Cloud completed the rollout" }); expect(output).toEqual({ latin: "[NAME] delivered the migration", chinese: "[NAME]完成了迁移", product: "Google Cloud completed the rollout" }); });
  it("does not guess names inside JD quotes and skill labels", () => {
    const output = sanitizePublicValue({ label: "Looker Studio", requirements: [{ text: "能够独立负责数据分析工作" }], jdQuote: "协助研发上线新功能", matchedSkills: ["Machine Learning"] });
    expect(output).toEqual({ label: "Looker Studio", requirements: [{ text: "能够独立负责数据分析工作" }], jdQuote: "协助研发上线新功能", matchedSkills: ["Machine Learning"] });
    expect(sanitizePublicValue({ requirements: [{ text: "联系 hr@example.com" }] })).toEqual({ requirements: [{ text: "联系 [EMAIL]" }] });
    expect(sanitizePublicValue({ requirements: [{ text: "陈鹏文的简历" }] }, "", ["陈鹏文"])).toEqual({ requirements: [{ text: "[NAME]的简历" }] });
    expect(JSON.stringify(sanitizePublicValue({ changes: [{ text: "陈鹏文完成了迁移" }] }))).not.toContain("陈鹏文");
  });
  it("only treats a bare first line as a name, not later resume headings", () => {
    expect(candidateNamesFromText("张三\n13800000000\n自我评价\n专业技能\n实习经历")).toEqual(["张三"]);
    expect(candidateNamesFromText("# 个人简历\n姓名：李四\n技能")).toEqual(["李四"]);
  });
});
