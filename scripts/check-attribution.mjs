import { readFile } from "node:fs/promises";
const commit = "e6f6f4e322148cc3558726c4b060486f5388316f"; const upstream = await readFile("UPSTREAM.md", "utf8"); const notices = await readFile("THIRD_PARTY_NOTICES.md", "utf8"); const failures = [];
if (!upstream.includes(commit)) failures.push("audited commit missing"); if (!notices.includes("Copyright (c) 2026 Mads Lorentzen")) failures.push("copyright missing");
for (const [source, target] of [[".claude/commands/setup.md", "references/profile.md"], [".claude/skills/upskill/SKILL.md", "references/analyze.md"], [".claude/commands/apply.md", "references/tailor.md"], ["SECURITY.md", "references/security.md"]]) if (!upstream.includes(source) || !upstream.includes(target)) failures.push(`mapping missing: ${source}`);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); } console.log("attribution: OK");
