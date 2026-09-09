import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const temp = mkdtempSync(join(tmpdir(), "jfs-pack-")); const env = { ...process.env, NPM_CONFIG_CACHE: join(temp, "npm-cache") };
const packed = JSON.parse(execFileSync("npm", ["pack", "--json", "--ignore-scripts"], { encoding: "utf8", env }))[0]; const tarball = resolve(packed.filename); const names = packed.files.map((x) => x.path);
for (const required of ["dist/src/bin.js", "dist/src/cli.js", "dist/src/index.js", "skills/job-fit-assistant/SKILL.md", "LICENSE", "THIRD_PARTY_NOTICES.md", "UPSTREAM.md", "README.md"]) if (!names.includes(required)) throw new Error(`package missing ${required}`);
try {
  writeFileSync(join(temp, "package.json"), '{"private":true,"type":"module"}');
  execFileSync("npm", ["install", "--ignore-scripts", "--offline", "--omit=peer", tarball], { cwd: temp, env, stdio: "pipe" });
  const packageRoot = join(temp, "node_modules/@job-fit/skill");
  const installed = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  if (installed.version !== "0.1.0") throw new Error("installed package version mismatch");
  await import(pathToFileURL(join(packageRoot, "dist/src/index.js")).href);
  const schemas = await import(pathToFileURL(join(packageRoot, "dist/src/schemas.js")).href); if (schemas.SCHEMA_VERSION !== "1.0.0") throw new Error("installed schemas export is broken");
  execFileSync(process.execPath, ["--input-type=module", "--eval", "await import('@job-fit/skill'); const schemas = await import('@job-fit/skill/schemas'); if (schemas.SCHEMA_VERSION !== '1.0.0') process.exit(1)"], { cwd: temp, env, stdio: "pipe" });
  const version = spawnSync(join(temp, "node_modules/.bin/job-fit"), ["--version"], { cwd: temp, encoding: "utf8", env });
  if (version.status !== 0 || version.stdout.trim() !== "0.1.0") throw new Error(`installed bin did not execute: ${version.stderr}`);
  const workspace = join(temp, "workspace"); execFileSync("mkdir", ["-p", workspace]);
  writeFileSync(join(workspace, "cv.txt"), "Built Node.js project");
  writeFileSync(join(workspace, "request.json"), JSON.stringify({ resumeFiles: ["cv.txt"], jobs: [{ id: "job", text: "Redis caching is required for this backend engineering role." }] }));
  const runtime = join(temp, "runtime.mjs"); writeFileSync(runtime, "export function createJobFitDependencies(){return {}}\n");
  const missingCore = spawnSync(join(temp, "node_modules/.bin/job-fit"), ["analyze", "--root", workspace, "--input", "request.json", "--idempotency-key", "missing-core"], { cwd: temp, encoding: "utf8", env: { ...env, JOB_FIT_RUNTIME_MODULE: runtime } });
  if (missingCore.status !== 5 || JSON.parse(missingCore.stderr).error.code !== "DEPENDENCY_UNAVAILABLE") throw new Error(`missing optional Core was not mapped safely: ${missingCore.stderr}`);
} finally { rmSync(temp, { recursive: true, force: true }); rmSync(tarball, { force: true }); }
console.log("package smoke: OK");
