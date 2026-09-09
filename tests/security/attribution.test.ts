import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
it("preserves upstream attribution", () => { const run = spawnSync(process.execPath, ["scripts/check-attribution.mjs"], { encoding: "utf8" }); expect(run.status).toBe(0); expect(run.stdout).toContain("attribution: OK"); });
