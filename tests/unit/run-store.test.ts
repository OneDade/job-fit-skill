import { mkdir, mkdtemp, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RunStore } from "../../src/io/run-store.js";
import { canonicalHash } from "../../src/io/private-store.js";
describe("RunStore", () => {
  it("caches canonical equivalent requests and guards conflicts", async () => { const root = await mkdtemp(join(tmpdir(), "jfs-")); const store = new RunStore(root); const hash = canonicalHash({ b: 2, a: 1 }); await store.put("analyze", "same", hash, { ok: true }); expect(await store.get("analyze", "same", canonicalHash({ a: 1, b: 2 }))).toEqual({ ok: true }); await expect(store.get("analyze", "same", canonicalHash({ a: 2 }))).rejects.toThrow("different request"); expect((await stat(join(root, ".job-fit"))).mode & 0o777).toBe(0o700); });
  it("rejects keys longer than 200", async () => { const store = new RunStore(await mkdtemp(join(tmpdir(), "jfs-"))); await expect(store.get("analyze", "x".repeat(201), "hash")).rejects.toThrow("1–200"); });
  it("rejects a symlinked runs directory", async () => { const root = await mkdtemp(join(tmpdir(), "jfs-")); const outside = await mkdtemp(join(tmpdir(), "jfs-out-")); await symlink(outside, join(root, ".job-fit-runs-link")); await import("../../src/io/private-store.js").then(({ stateDirectory }) => stateDirectory(root)); await symlink(outside, join(root, ".job-fit/runs")); const store = new RunStore(root); await expect(store.get("analyze", "key", "hash")).rejects.toThrow(/unsafe|symbolic/); });
  it("runs concurrent identical requests exactly once", async () => {
    const store = new RunStore(await mkdtemp(join(tmpdir(), "jfs-run-"))); let calls = 0;
    const operation = async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 50)); return { call: calls }; };
    const run = (store as unknown as { run<T>(a: string, k: string, h: string, op: () => Promise<T>): Promise<{ value: T; cached: boolean }> }).run.bind(store);
    const [first, second] = await Promise.all([run("analyze", "same", "hash", operation), run("analyze", "same", "hash", operation)]);
    expect(calls).toBe(1); expect(first.value).toEqual({ call: 1 }); expect(second.value).toEqual({ call: 1 }); expect([first.cached, second.cached].sort()).toEqual([false, true]);
  });
  it("allows either concurrent payload to win while executing exactly one", async () => {
    for (let round = 0; round < 30; round += 1) {
      const store = new RunStore(await mkdtemp(join(tmpdir(), "jfs-run-race-"))); let calls = 0;
      const requests = [{ hash: "hash-a", value: "a" }, { hash: "hash-b", value: "b" }] as const;
      const settled = await Promise.allSettled(requests.map(({ hash, value }) => store.run("analyze", "same", hash, async () => { calls += 1; await new Promise((resolve) => setTimeout(resolve, 2)); return value; })));
      expect(calls).toBe(1); expect(settled.filter(({ status }) => status === "fulfilled")).toHaveLength(1); expect(settled.filter(({ status }) => status === "rejected")).toHaveLength(1);
      expect((settled.find(({ status }) => status === "rejected") as PromiseRejectedResult).reason).toMatchObject({ message: expect.stringContaining("different request") });
      const winner = requests[settled.findIndex(({ status }) => status === "fulfilled")]!; const loser = requests.find(({ hash }) => hash !== winner.hash)!;
      await expect(store.run("analyze", "same", winner.hash, async () => "duplicate")).resolves.toMatchObject({ value: winner.value, cached: true });
      await expect(store.run("analyze", "same", loser.hash, async () => "duplicate")).rejects.toThrow("different request");
    }
  });
  it("recovers a stale claim and rejects a symlinked cached result", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-run-")); const store = new RunStore(root); await import("../../src/io/private-store.js").then(({ stateDirectory }) => stateDirectory(root)); await mkdir(join(root, ".job-fit/runs"), { recursive: true });
    const stem = createHash("sha256").update("analyze\0stale").digest("hex"); await writeFile(join(root, ".job-fit/runs", `${stem}.json.lock`), JSON.stringify({ requestHash: "hash", createdAt: 0, leaseExpiresAt: 0, pid: 99999999, owner: "dead-owner" }));
    expect(await store.run("analyze", "stale", "hash", async () => 42)).toEqual({ value: 42, cached: false });
    const external = join(root, "external.json"); await writeFile(external, JSON.stringify({ requestHash: "hash", value: "leak" }));
    const linkedStem = createHash("sha256").update("analyze\0linked").digest("hex"); await symlink(external, join(root, ".job-fit/runs", `${linkedStem}.json`));
    await expect(store.get("analyze", "linked", "hash")).rejects.toThrow(/unsafe|symbolic/);
  });
  it("recovers an old empty claim left by a crash", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-run-")); const store = new RunStore(root); await import("../../src/io/private-store.js").then(({ stateDirectory }) => stateDirectory(root)); await mkdir(join(root, ".job-fit/runs"), { recursive: true }); const stem = createHash("sha256").update("analyze\0empty").digest("hex"); const lock = join(root, ".job-fit/runs", `${stem}.json.lock`); await writeFile(lock, ""); await utimes(lock, new Date(0), new Date(0)); expect(await store.run("analyze", "empty", "hash", async () => 7)).toEqual({ value: 7, cached: false });
  });
  it("does not steal a brand-new incomplete claim", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-run-")); const store = new RunStore(root); await import("../../src/io/private-store.js").then(({ stateDirectory }) => stateDirectory(root)); await mkdir(join(root, ".job-fit/runs"), { recursive: true }); const stem = createHash("sha256").update("analyze\0fresh-empty").digest("hex"); const lock = join(root, ".job-fit/runs", `${stem}.json.lock`); await writeFile(lock, ""); let calls = 0; const pending = store.run("analyze", "fresh-empty", "hash", async () => { calls += 1; return 9; }); await new Promise((resolve) => setTimeout(resolve, 100)); expect(calls).toBe(0); await rm(lock); expect(await pending).toEqual({ value: 9, cached: false });
  });
  it("does not mistake an operation EEXIST failure for lock contention", async () => {
    const store = new RunStore(await mkdtemp(join(tmpdir(), "jfs-run-"))); let calls = 0; const failure = Object.assign(new Error("output exists"), { code: "EEXIST" });
    await expect(store.run("render-resume", "operation-error", "hash", async () => { calls += 1; throw failure; })).rejects.toBe(failure); expect(calls).toBe(1);
  });
});
