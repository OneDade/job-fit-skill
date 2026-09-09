import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const skillRoot = resolve("."); const coreRoot = resolve("../job-fit-core"); const temp = mkdtempSync(join(tmpdir(), "jfs-real-core-")); const cache = join(temp, "npm-cache"); const env = { ...process.env, NPM_CONFIG_CACHE: cache };
let ownedCoreTarball; let skillTarball;
function pack(root) { const packed = JSON.parse(execFileSync("npm", ["pack", "--json", "--ignore-scripts"], { cwd: root, encoding: "utf8", env }))[0]; return resolve(root, packed.filename); }
function run(bin, workspace, action, input, key, runtime) { return spawnSync(bin, [action, "--root", workspace, "--input", input, "--idempotency-key", key], { encoding: "utf8", env: { ...env, JOB_FIT_RUNTIME_MODULE: runtime } }); }
try {
  execFileSync("npm", ["run", "build"], { cwd: coreRoot, env, stdio: "pipe" });
  const coreTarball = process.env.CORE_TARBALL ? resolve(process.env.CORE_TARBALL) : (ownedCoreTarball = pack(coreRoot));
  execFileSync("npm", ["run", "build"], { cwd: skillRoot, env, stdio: "pipe" }); skillTarball = pack(skillRoot);
  writeFileSync(join(temp, "package.json"), '{"private":true,"type":"module"}');
  execFileSync("npm", ["install", "--offline", "--ignore-scripts", "--omit=peer", skillTarball], { cwd: temp, env, stdio: "pipe" });
  const installedCore = join(temp, "node_modules/@job-fit/core"); mkdirSync(installedCore, { recursive: true }); execFileSync("tar", ["-xzf", coreTarball, "--strip-components=1", "-C", installedCore]);
  const corePackage = JSON.parse(readFileSync(join(coreRoot, "package.json"), "utf8"));
  for (const dependency of Object.keys(corePackage.dependencies)) { const target = join(temp, "node_modules", dependency); mkdirSync(resolve(target, ".."), { recursive: true }); symlinkSync(join(coreRoot, "node_modules", dependency), target, "junction"); }
  const evidenceId = `ev_${createHash("sha256").update("Built Node.js project").digest("hex").slice(0, 16)}`;
  const runtime = join(temp, "runtime.mjs");
  writeFileSync(runtime, `
const evidenceId = ${JSON.stringify(evidenceId)};
export function createJobFitDependencies() { return {
  model: { async generate(request) {
    if (request.operation === "PROFILE") return { experiences: [{ id: "project", kind: "PROJECT", title: "Node.js project", evidenceIds: [evidenceId] }], skills: [{ skillId: "node", label: "Node.js", level: "PROJECT", evidenceIds: [evidenceId] }] };
    if (request.operation === "JOB") return [
      { id: "req-node", skillId: "node", kind: "REQUIRED_SKILL", text: "Node.js APIs", locator: "line 1", explicit: true, confidence: 1, importance: 1 },
      { id: "req-postgres", skillId: "postgres", kind: "PREFERRED_SKILL", text: "Postgres knowledge", locator: "line 1", explicit: true, confidence: 1, importance: .5 },
      { id: "req-redis", skillId: "redis", kind: "REQUIRED_SKILL", text: "Redis caching", locator: "line 1", explicit: true, confidence: 1, importance: 1 },
      { id: "req-docker", skillId: "docker", kind: "PREFERRED_SKILL", text: "Docker familiarity", locator: "line 1", explicit: true, confidence: 1, importance: .5 },
      { id: "req-degree", kind: "HARD_GATE", text: "Bachelor degree required", locator: "line 1", explicit: true, confidence: 1, importance: 1 },
    ];
    return { sections: [{ heading: "Projects", bullets: [{ id: "node-project", text: "Built Node.js project", evidenceIds: [evidenceId], highRisk: true, confirmed: false }] }] };
  } },
  catalog: { async find(skillId) { return [{ id: "redis-docs", skillId, title: "Redis learning", url: "https://github.com/redis/redis", publisher: "Redis", language: "en", cost: "FREE", estimatedHours: 4, verifiedAt: "2026-01-01T00:00:00.000Z" }]; } },
  search: { async search() { return []; } }, probe: { async probe(url) { return { ok: true, finalUrl: url }; } }, clock: { now() { return new Date("2026-09-07T00:00:00.000Z"); } },
  pdfConverter: { async convert() { return Buffer.from("%PDF-real-core-test"); } }, pdfInspector: { async inspect() { return { pages: 1, text: "Projects Built Node.js project", hasBlankPage: false }; } },
  repositoryFetcher: { async fetch() { return [{ path: "repo.txt", bytes: Buffer.from("Implemented an Express API project") }]; } },
}; }
`);
  const workspace = join(temp, "workspace"); execFileSync("mkdir", ["-p", workspace]); writeFileSync(join(workspace, "cv.txt"), "Built Node.js project");
  writeFileSync(join(workspace, "analyze.json"), JSON.stringify({ resumeFiles: ["cv.txt"], repositories: [{ provider: "github", url: "https://github.com/example/repo" }], jobs: [{ id: "job", text: "Node.js APIs; Postgres knowledge; Redis caching; Docker familiarity; Bachelor degree required for this backend engineering role.", transferableSkillIds: ["postgres"], explicitMissingSkillIds: ["redis"], hardGateAnswers: { "req-degree": "PASS" } }] }));
  const bin = join(temp, "node_modules/.bin/job-fit"); const analyzed = run(bin, workspace, "analyze", "analyze.json", "a", runtime); if (analyzed.status !== 0) throw new Error(`real Core analyze failed: ${analyzed.stderr}`); const analysis = JSON.parse(analyzed.stdout); const states = analysis.data.analyses[0].matches.map((match) => match.state); if (!["MATCHED", "TRANSFERABLE", "MISSING", "INSUFFICIENT_EVIDENCE"].every((state) => states.includes(state)) || analysis.data.hardGates[0].status !== "PASS" || !analysis.data.evidence.some((item) => item.sourceType === "REPOSITORY") || analysis.data.learningPaths.some((plan) => plan.tracks.length !== 2 || !plan.targetSkillId)) throw new Error("real Core analysis shape was not preserved");
  writeFileSync(join(workspace, "optimize.json"), JSON.stringify({ analysisFile: ".job-fit/reports/latest-analysis.json", selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: [], templateId: "ats-classic" }));
  const proposed = run(bin, workspace, "optimize-resume", "optimize.json", "o-proposal", runtime); if (proposed.status !== 0) throw new Error(`real Core proposal failed: ${proposed.stderr}`); const proposal = JSON.parse(proposed.stdout); if (proposal.data.status !== "NEEDS_CONFIRMATION" || proposal.data.proposal.requiredConfirmationIds[0] !== "node-project" || proposal.data.resumeModelFile) throw new Error("real Core did not enforce proposal confirmation");
  writeFileSync(join(workspace, "optimize.json"), JSON.stringify({ analysisFile: ".job-fit/reports/latest-analysis.json", proposalFile: proposal.data.proposalFile, selectedJobId: "job", confirmedFacts: [], confirmedChangeIds: ["node-project"], rejectedChangeIds: [], templateId: "ats-classic" }));
  const optimized = run(bin, workspace, "optimize-resume", "optimize.json", "o-confirmed", runtime); if (optimized.status !== 0) throw new Error(`real Core confirmed optimize failed: ${optimized.stderr}`); if (JSON.parse(optimized.stdout).data.status !== "CONFIRMED") throw new Error("real Core confirmed optimization was not finalized");
  writeFileSync(join(workspace, "render.json"), JSON.stringify({ resumeModelFile: ".job-fit/resume-models/job.resume.json", outputDirectory: "deliverables", formats: ["docx", "pdf"] }));
  const rendered = run(bin, workspace, "render-resume", "render.json", "r", runtime); if (rendered.status !== 0) throw new Error(`real Core render failed: ${rendered.stderr}`); if (!readFileSync(join(workspace, "deliverables/resume.pdf")).subarray(0, 4).equals(Buffer.from("%PDF"))) throw new Error("real Core PDF artifact missing");
} finally { rmSync(temp, { recursive: true, force: true }); if (ownedCoreTarball) rmSync(ownedCoreTarball, { force: true }); if (skillTarball) rmSync(skillTarball, { force: true }); }
console.log("real packed Core integration: OK");
