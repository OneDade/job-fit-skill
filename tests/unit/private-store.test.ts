import { chmod, lstat, mkdir, mkdtemp, readFile, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deleteOwnedState, stateDirectory } from "../../src/io/private-store.js";

describe("private state ownership", () => {
  it("creates an idempotent gitignore entry on first use", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-"));
    await writeFile(join(root, ".gitignore"), "dist/\n");
    await stateDirectory(root); await stateDirectory(root);
    expect(await readFile(join(root, ".gitignore"), "utf8")).toBe("dist/\n.job-fit/\n");
  });
  it("never adopts or deletes a pre-existing unowned .job-fit directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-")); await mkdir(join(root, ".job-fit")); await writeFile(join(root, ".job-fit/user-notes.txt"), "keep me");
    await expect(stateDirectory(root)).rejects.toThrow(/unowned|ownership|marker/); await expect(deleteOwnedState(root)).rejects.toThrow(/unowned|ownership|marker/); expect(await readFile(join(root, ".job-fit/user-notes.txt"), "utf8")).toBe("keep me");
  });
  it("initializes ownership atomically across concurrent first use", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-")); const paths = await Promise.all(Array.from({ length: 12 }, () => stateDirectory(root))); expect(new Set(paths).size).toBe(1); expect(await readFile(join(root, ".job-fit/.job-fit-owned-v1"), "utf8")).toBe("job-fit-skill\n");
  });
  it("reclaims a stale gitignore claim and restores the required entry", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-")); await stateDirectory(root); await writeFile(join(root, ".gitignore"), "dist/\n"); const lock = join(root, ".job-fit/.gitignore.lock"); await mkdir(lock, { mode: 0o700 }); await writeFile(join(lock, "owner.json"), JSON.stringify({ pid: 99999999, owner: "dead-owner", createdAt: 0, leaseExpiresAt: 0 }), { mode: 0o600 }); await utimes(lock, new Date(0), new Date(0)); await stateDirectory(root); expect(await readFile(join(root, ".gitignore"), "utf8")).toBe("dist/\n.job-fit/\n"); await expect(lstat(lock)).rejects.toThrow();
  });
  it("recovers an old empty gitignore lock directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-empty-lock-")); await stateDirectory(root); await writeFile(join(root, ".gitignore"), "dist/\n"); const lock = join(root, ".job-fit/.gitignore.lock"); await mkdir(lock, { mode: 0o700 }); await utimes(lock, new Date(0), new Date(0)); await stateDirectory(root); expect(await readFile(join(root, ".gitignore"), "utf8")).toBe("dist/\n.job-fit/\n"); await expect(lstat(lock)).rejects.toThrow();
  });
  it("serializes concurrent gitignore initialization to one exact entry", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-")); await Promise.all(Array.from({ length: 20 }, () => stateDirectory(root))); const entries = (await readFile(join(root, ".gitignore"), "utf8")).split(/\r?\n/u).filter((line) => line === ".job-fit/"); expect(entries).toHaveLength(1);
  });
  it("survives repeated owner-unlink races during concurrent gitignore initialization", async () => {
    for (let round = 0; round < 200; round += 1) { const root = await mkdtemp(join(tmpdir(), "jfs-private-race-")); await Promise.all(Array.from({ length: 32 }, () => stateDirectory(root))); const entries = (await readFile(join(root, ".gitignore"), "utf8")).split(/\r?\n/u).filter((line) => line === ".job-fit/"); expect(entries).toHaveLength(1); }
  }, 60_000);
  it("rejects symlinked gitignore lock directories and owner metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-lock-link-")); const outside = await mkdtemp(join(tmpdir(), "jfs-private-lock-out-")); await stateDirectory(root); await symlink(outside, join(root, ".job-fit/.gitignore.lock")); await expect(stateDirectory(root)).rejects.toThrow(/claim|unsafe/);
    const root2 = await mkdtemp(join(tmpdir(), "jfs-private-owner-link-")); await stateDirectory(root2); const lock = join(root2, ".job-fit/.gitignore.lock"); await mkdir(lock, { mode: 0o700 }); const externalOwner = join(root2, "owner.json"); await writeFile(externalOwner, "{}", { mode: 0o600 }); await symlink(externalOwner, join(lock, "owner.json")); await expect(stateDirectory(root2)).rejects.toThrow(/claim owner|unsafe/);
  });
  it("refuses a symlink ownership marker", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-"));
    await stateDirectory(root); const external = join(root, "external-marker"); await writeFile(external, "job-fit-skill\n");
    await import("node:fs/promises").then(({ rm }) => rm(join(root, ".job-fit/.job-fit-owned-v1")));
    await symlink(external, join(root, ".job-fit/.job-fit-owned-v1"));
    await expect(deleteOwnedState(root)).rejects.toThrow(/ownership|marker|unsafe/);
    expect(await readFile(external, "utf8")).toBe("job-fit-skill\n");
    expect((await lstat(join(root, ".job-fit"))).isDirectory()).toBe(true);
  });
  it("deletes links inside owned state without following them", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-")); const outside = join(root, "outside-user-file"); await writeFile(outside, "keep me"); await stateDirectory(root); await symlink(outside, join(root, ".job-fit/link-to-user-file")); await deleteOwnedState(root); expect(await readFile(outside, "utf8")).toBe("keep me");
  });
  it("refuses a marker with unsafe permissions", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-")); await stateDirectory(root);
    await chmod(join(root, ".job-fit/.job-fit-owned-v1"), 0o644);
    await expect(deleteOwnedState(root)).rejects.toThrow(/ownership|permissions/);
  });
  it("refuses to write state after marker ownership is corrupted", async () => {
    const root = await mkdtemp(join(tmpdir(), "jfs-private-")); await stateDirectory(root); await writeFile(join(root, ".job-fit/.job-fit-owned-v1"), "someone-else\n");
    await expect(stateDirectory(root)).rejects.toThrow(/ownership|unowned/);
  });
});
