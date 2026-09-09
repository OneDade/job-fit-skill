import { mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSafeDirectory, mediaTypeFor, readSafeFile } from "../../src/io/safe-path.js";
describe("safe paths", () => {
  it("reads a selected regular file", async () => { const root = await mkdtemp(join(tmpdir(), "jfs-")); await writeFile(join(root, "cv.txt"), "safe"); expect(Buffer.from(await readSafeFile(root, "cv.txt")).toString()).toBe("safe"); });
  it("rejects traversal and symlinks", async () => { const root = await mkdtemp(join(tmpdir(), "jfs-")); const outside = join(root, "outside.txt"); await writeFile(outside, "secret"); await symlink(outside, join(root, "link.txt")); await expect(readSafeFile(root, "../outside.txt")).rejects.toThrow("outside workspace"); await expect(readSafeFile(root, "link.txt")).rejects.toThrow("symbolic links"); });
  it("accepts only supported material extensions", () => { expect(mediaTypeFor("x.md")).toBe("text/plain"); expect(() => mediaTypeFor("x.sh")).toThrow("supported file types"); });
  it("rejects symlinked parent components for reads and outputs", async () => { const root = await mkdtemp(join(tmpdir(), "jfs-")); const outside = await mkdtemp(join(tmpdir(), "jfs-out-")); await writeFile(join(outside, "secret.txt"), "secret"); await symlink(outside, join(root, "linked")); await expect(readSafeFile(root, "linked/secret.txt")).rejects.toThrow(/outside workspace|symbolic/); await expect(createSafeDirectory(root, "linked/new")).rejects.toThrow("unsafe"); });
});
