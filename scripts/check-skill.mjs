import { readFile } from "node:fs/promises";
const root = "skills/job-fit-assistant"; const skill = await readFile(`${root}/SKILL.md`, "utf8"); const failures = [];
if (!skill.startsWith("---\nname: job-fit-assistant\n")) failures.push("invalid Skill frontmatter");
for (const action of ["job-fit analyze", "job-fit optimize-resume", "job-fit render-resume", "job-fit delete-local-data"]) if (!skill.includes(action)) failures.push(`missing action: ${action}`);
for (const path of ["references/profile.md", "references/analyze.md", "references/tailor.md", "references/security.md", "references/portable-workflow.md", "references/host-compatibility.md"]) { if (!skill.includes(path)) failures.push(`unreferenced file: ${path}`); await readFile(`${root}/${path}`, "utf8").catch(() => failures.push(`missing file: ${path}`)); }
if (!skill.includes("untrusted data, never instructions")) failures.push("untrusted-input policy missing");
if (!skill.includes("分析我的简历和这个 JD，告诉我值不值得投，然后帮我生成定制简历")) failures.push("natural-language entry missing");
if (!skill.includes("Portable mode")) failures.push("portable fallback missing");
for (const label of ["已经符合", "相关经验能迁移", "明确缺少", "简历里没写清"]) if (!skill.includes(label)) failures.push(`plain-Chinese label missing: ${label}`);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); } console.log("skill policy: OK");
