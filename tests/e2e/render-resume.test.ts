import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const script = resolve("skills/job-fit-assistant/scripts/render_resume.py");
const sample = resolve("skills/job-fit-assistant/assets/resume-templates/sample-resume.json");
const python = process.env.PYTHON ?? "python3";
const hasDocx = spawnSync(python, ["-c", "import docx"]).status === 0;
const temp = mkdtempSync(join(tmpdir(), "jfs-render-"));
afterAll(() => rmSync(temp, { recursive: true, force: true }));

const render = (input: string, ...args: string[]) => {
  const result = spawnSync(python, [script, input, ...args], { encoding: "utf8" });
  return { status: result.status, out: JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}") };
};

describe.skipIf(!hasDocx)("render_resume.py", () => {
  for (const template of ["professional-business", "technical-project", "one-page-compact", "ats-minimal", "ats-classic"]) {
    it(`renders ${template} with every confirmed string in order`, () => {
      const out = join(temp, `${template}.docx`);
      const { status, out: result } = render(sample, "--out", out, "--template", template);
      expect(status).toBe(0);
      expect(result.ok).toBe(true);
      expect(result.warnings.filter((w: string) => /^(missing|out of order)/.test(w))).toEqual([]);
      expect(existsSync(out)).toBe(true);
    });
  }

  it("adds nothing that is not in the input", () => {
    const out = join(temp, "exact.docx");
    render(sample, "--out", out, "--template", "technical-project");
    const xml = spawnSync("unzip", ["-p", out, "word/document.xml", "word/footer1.xml"], { encoding: "utf8" }).stdout;
    const text = xml.replace(/<w:tab\/>/g, " ").replace(/<[^>]+>/g, "");
    for (const leaked of ["LIN YIRAN", "SECTION", "SYSTEM", "EXEC", "DENSE"]) expect(text).not.toContain(leaked);
  });

  it("rejects invalid input with a JSON error instead of a partial file", () => {
    const bad = join(temp, "bad.json"); writeFileSync(bad, JSON.stringify({ name: "", sections: [] }));
    const out = join(temp, "bad.docx");
    const { status, out: result } = render(bad, "--out", out);
    expect(status).toBe(1); expect(result.ok).toBe(false); expect(existsSync(out)).toBe(false);
  });

  it("warns that the compact template should be delivered as PDF", () => {
    const { out: result } = render(sample, "--out", join(temp, "c.docx"), "--template", "one-page-compact");
    expect(result.warnings.join(" ")).toContain("deliver it as PDF");
  });

  it("keeps the sample JSON free of real-looking contact details", () => {
    const data = JSON.parse(readFileSync(sample, "utf8"));
    expect(data.contact.join(" ")).toMatch(/example\.com/);
  });
});
