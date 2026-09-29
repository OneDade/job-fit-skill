import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("behavioural eval cases", async () => {
  const cases = (await readdir("evals", { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  it("has cases", () => expect(cases.length).toBeGreaterThanOrEqual(6));
  for (const name of cases) {
    it(`${name} has a resume, a JD, a prompt and an expectation checklist`, async () => {
      const files = await readdir(`evals/${name}`);
      for (const required of ["resume.md", "prompt.txt", "expected.md"]) expect(files).toContain(required);
      expect(files.some((f) => /^jd(-\d+)?\.md$/.test(f))).toBe(true);
      const expected = await readFile(`evals/${name}/expected.md`, "utf8");
      expect(expected).toContain("- [ ]");
      expect(expected).toContain("不能出现");
    });
  }
});
