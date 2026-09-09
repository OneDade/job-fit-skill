import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, readdir, realpath, rename, rm, rmdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { CliFailure } from "../output/envelope.js";
import { assertContained, resolveWorkspace } from "./safe-path.js";

const marker = ".job-fit-owned-v1";
type GitIgnoreClaim = { pid: number; owner: string; createdAt: number; leaseExpiresAt: number };
type LockSnapshot = { ino: number; dev: number; mtimeMs: number; ownerFile?: { ino: number; dev: number }; claim?: GitIgnoreClaim };
const GIT_LOCK_LEASE_MS = 2_000;
const GIT_LOCK_WAIT_MS = 3_000;
const MALFORMED_LOCK_GRACE_MS = 500;
export async function stateDirectory(rootInput: string): Promise<string> {
  const root = await resolveWorkspace(rootInput); const state = resolve(root, ".job-fit"); assertContained(root, state);
  const existing = await lstat(state).catch(() => undefined);
  if (!existing) await initializeOwnedState(root, state);
  const stateInfo = await lstat(state).catch(() => undefined);
  if (!stateInfo?.isDirectory() || stateInfo.isSymbolicLink() || await realpath(state).catch(() => "") !== state) throw new CliFailure("FILE_ERROR", "local state path is unsafe");
  await validateMarker(join(state, marker)); await chmod(state, 0o700).catch(() => undefined);
  await ensureGitIgnored(root, state);
  return state;
}
export async function atomicWrite(path: string, value: Uint8Array | string): Promise<void> {
  const parent = resolve(path, ".."); const parentReal = await realpath(parent).catch(() => undefined); const parentInfo = await lstat(parent).catch(() => undefined);
  if (parentReal !== parent || !parentInfo?.isDirectory() || parentInfo.isSymbolicLink()) throw new CliFailure("FILE_ERROR", "private output parent is unsafe");
  const target = await lstat(path).catch(() => undefined); if (target?.isSymbolicLink() || (target && !target.isFile())) throw new CliFailure("FILE_ERROR", "private output target is unsafe");
  const temp = join(parent, `.${basename(path)}.${randomUUID()}.tmp`);
  try { await writeFile(temp, value, { mode: 0o600, flag: "wx" }); const currentParent = await lstat(parent); if (await realpath(parent) !== parent || !currentParent.isDirectory() || currentParent.isSymbolicLink() || currentParent.ino !== parentInfo.ino || currentParent.dev !== parentInfo.dev) throw new CliFailure("FILE_ERROR", "private output parent changed"); await rename(temp, path); await chmod(path, 0o600).catch(() => undefined); }
  catch (error) { await rm(temp, { force: true }).catch(() => undefined); throw error; }
}
export async function writePrivateJson(path: string, value: unknown): Promise<void> { await atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`); }
export async function deleteOwnedState(rootInput: string): Promise<void> {
  const root = await resolveWorkspace(rootInput); const state = resolve(root, ".job-fit"); assertContained(root, state);
  const info = await lstat(state).catch(() => undefined); if (!info) return;
  if (info.isSymbolicLink() || !info.isDirectory()) throw new CliFailure("FILE_ERROR", "local state path is unsafe");
  if (await realpath(state).catch(() => "") !== state) throw new CliFailure("FILE_ERROR", "local state path is unsafe");
  await validateMarker(join(state, marker));
  const tombstone = resolve(root, `.job-fit.delete-${randomUUID()}`); assertContained(root, tombstone);
  await rename(state, tombstone);
  const moved = await lstat(tombstone).catch(() => undefined);
  if (!moved?.isDirectory() || moved.isSymbolicLink() || moved.ino !== info.ino || moved.dev !== info.dev || await realpath(tombstone).catch(() => "") !== tombstone) throw new CliFailure("FILE_ERROR", "refusing to delete: local state changed during ownership validation");
  await validateMarker(join(tombstone, marker)); await rm(tombstone, { recursive: true, force: false });
}

async function validateMarker(markerPath: string): Promise<void> {
  const markerInfo = await lstat(markerPath).catch(() => undefined);
  if (!markerInfo?.isFile() || markerInfo.isSymbolicLink() || (markerInfo.mode & 0o777) !== 0o600 || markerInfo.nlink !== 1) throw new CliFailure("FILE_ERROR", "refusing to use an unowned directory: ownership marker is unsafe");
  let handle; try { handle = await open(markerPath, constants.O_RDONLY | constants.O_NOFOLLOW); const opened = await handle.stat(); if (opened.ino !== markerInfo.ino || opened.dev !== markerInfo.dev) throw new CliFailure("FILE_ERROR", "refusing to use state: ownership marker changed"); if (await handle.readFile("utf8") !== "job-fit-skill\n") throw new CliFailure("FILE_ERROR", "refusing to use an unowned local directory"); }
  finally { await handle?.close(); }
}

async function createMarker(markerPath: string): Promise<void> {
  let handle; try { handle = await open(markerPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); await handle.writeFile("job-fit-skill\n"); await handle.sync(); return; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  finally { await handle?.close(); }
  for (let attempt = 0; attempt < 100; attempt += 1) { try { await validateMarker(markerPath); return; } catch { await new Promise((resolveWait) => setTimeout(resolveWait, 10)); } }
  throw new CliFailure("FILE_ERROR", "local state ownership marker could not be initialized safely");
}

async function initializeOwnedState(root: string, state: string): Promise<void> {
  const staging = resolve(root, `.job-fit.init-${randomUUID()}`); assertContained(root, staging);
  await mkdir(staging, { mode: 0o700 });
  try {
    await createMarker(join(staging, marker));
    try { await rename(staging, state); }
    catch (error) { if (!["EEXIST", "ENOTEMPTY"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error; }
  } finally { await rm(staging, { recursive: true, force: true }).catch(() => undefined); }
}

async function ensureGitIgnored(root: string, state: string): Promise<void> {
  const lock = join(state, ".gitignore.lock"); const ignorePath = join(root, ".gitignore"); const deadline = Date.now() + GIT_LOCK_WAIT_MS;
  const parent = await lstat(state); if (!parent.isDirectory() || parent.isSymbolicLink() || await realpath(state) !== state) throw new CliFailure("FILE_ERROR", "local state path is unsafe");
  for (;;) {
    const owner = randomUUID(); const claim: GitIgnoreClaim = { pid: process.pid, owner, createdAt: Date.now(), leaseExpiresAt: Date.now() + GIT_LOCK_LEASE_MS }; const owned = await createGitLock(lock, claim, state, parent);
    if (!owned) {
      const snapshot = await inspectGitLock(lock);
      if (!snapshot) { if (await gitIgnoreContains(ignorePath)) return; continue; }
      if (await gitIgnoreContains(ignorePath)) return;
      const malformedStale = !snapshot.claim && Date.now() - snapshot.mtimeMs >= MALFORMED_LOCK_GRACE_MS;
      const expiredDead = snapshot.claim && snapshot.claim.leaseExpiresAt < Date.now() && !pidIsAlive(snapshot.claim.pid);
      if (malformedStale || expiredDead) { await removeGitLock(lock, snapshot, snapshot.claim?.owner); continue; }
      if (Date.now() >= deadline) { if (await gitIgnoreContains(ignorePath)) return; throw new CliFailure("FILE_ERROR", "timed out waiting to update .gitignore safely"); }
      await new Promise((resolveWait) => setTimeout(resolveWait, 20)); continue;
    }
    try {
      const info = await lstat(ignorePath).catch(() => undefined);
      if (info?.isSymbolicLink() || (info && (!info.isFile() || info.nlink !== 1))) throw new CliFailure("FILE_ERROR", ".gitignore is unsafe");
      const handle = await open(ignorePath, constants.O_CREAT | constants.O_APPEND | constants.O_RDWR | constants.O_NOFOLLOW, 0o600);
      try { const opened = await handle.stat(); if (!opened.isFile() || opened.nlink !== 1 || (info && (opened.ino !== info.ino || opened.dev !== info.dev))) throw new CliFailure("FILE_ERROR", ".gitignore changed or is unsafe"); const existing = await handle.readFile("utf8"); if (!existing.split(/\r?\n/u).includes(".job-fit/")) { const prefix = existing.length > 0 && !existing.endsWith("\n") ? "\n" : ""; await handle.write(`${prefix}.job-fit/\n`); await handle.sync(); } }
      finally { await handle.close(); }
      return;
    } finally { await removeGitLock(lock, owned, owner); }
  }
}

async function createGitLock(path: string, claim: GitIgnoreClaim, parentPath: string, expectedParent: Awaited<ReturnType<typeof lstat>>): Promise<LockSnapshot | undefined> {
  try { await mkdir(path, { mode: 0o700 }); } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return undefined; throw error; }
  const directory = await lstat(path); const parent = await lstat(parentPath);
  if (!directory.isDirectory() || directory.isSymbolicLink() || (directory.mode & 0o777) !== 0o700 || !parent.isDirectory() || parent.isSymbolicLink() || parent.ino !== expectedParent.ino || parent.dev !== expectedParent.dev || await realpath(parentPath) !== parentPath) throw new CliFailure("FILE_ERROR", ".gitignore claim parent changed");
  const base: LockSnapshot = { ino: directory.ino, dev: directory.dev, mtimeMs: directory.mtimeMs }; const ownerPath = join(path, "owner.json"); let handle;
  try {
    handle = await open(ownerPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); await handle.writeFile(JSON.stringify(claim)); await handle.sync(); const owner = await handle.stat(); if (!owner.isFile() || owner.nlink !== 1 || (owner.mode & 0o777) !== 0o600) throw new CliFailure("FILE_ERROR", ".gitignore claim owner is unsafe"); return { ...base, mtimeMs: Math.max(base.mtimeMs, owner.mtimeMs), ownerFile: { ino: owner.ino, dev: owner.dev }, claim };
  } catch (error) { const partial = await inspectGitLock(path).catch(() => undefined); if (partial?.ino === base.ino && partial.dev === base.dev) await removeGitLock(path, partial, partial.claim?.owner); throw error; }
  finally { await handle?.close(); }
}

async function inspectGitLock(path: string): Promise<LockSnapshot | undefined> {
  const info = await lstat(path).catch(() => undefined); if (!info) return undefined; if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o777) !== 0o700) throw new CliFailure("FILE_ERROR", ".gitignore claim is unsafe");
  const entries = await readdir(path).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return undefined; throw error; }); if (!entries) return undefined; if (entries.some((entry) => entry !== "owner.json")) throw new CliFailure("FILE_ERROR", ".gitignore claim contains unsafe entries");
  const ownerPath = join(path, "owner.json"); const ownerInfo = await lstat(ownerPath).catch(() => undefined); if (!ownerInfo) { const current = await lstat(path).catch(() => undefined); return current?.ino === info.ino && current.dev === info.dev ? { ino: info.ino, dev: info.dev, mtimeMs: info.mtimeMs } : undefined; } if (!ownerInfo.isFile() || ownerInfo.isSymbolicLink() || ownerInfo.nlink !== 1 || (ownerInfo.mode & 0o777) !== 0o600 || ownerInfo.size > 2_048) throw new CliFailure("FILE_ERROR", ".gitignore claim owner is unsafe");
  let handle; let raw = ""; try { handle = await open(ownerPath, constants.O_RDONLY | constants.O_NOFOLLOW).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return undefined; throw error; }); if (!handle) return undefined; const opened = await handle.stat(); if (opened.ino !== ownerInfo.ino || opened.dev !== ownerInfo.dev || opened.nlink === 0) return undefined; if (!opened.isFile() || opened.nlink !== 1 || (opened.mode & 0o777) !== 0o600 || opened.size > 2_048) throw new CliFailure("FILE_ERROR", ".gitignore claim owner is unsafe"); raw = await handle.readFile("utf8"); } finally { await handle?.close(); }
  let claim: GitIgnoreClaim | undefined; try { const value = JSON.parse(raw) as Partial<GitIgnoreClaim>; if (Number.isInteger(value.pid) && Number(value.pid) > 0 && typeof value.owner === "string" && value.owner.length > 0 && typeof value.createdAt === "number" && typeof value.leaseExpiresAt === "number") claim = value as GitIgnoreClaim; } catch { /* malformed crash residue is handled after a grace period */ }
  const current = await lstat(path).catch(() => undefined); if (current?.ino !== info.ino || current.dev !== info.dev) return undefined;
  return { ino: info.ino, dev: info.dev, mtimeMs: Math.max(info.mtimeMs, ownerInfo.mtimeMs), ownerFile: { ino: ownerInfo.ino, dev: ownerInfo.dev }, ...(claim ? { claim } : {}) };
}
async function removeGitLock(path: string, expected: LockSnapshot, owner?: string): Promise<void> { const current = await inspectGitLock(path).catch(() => undefined); if (!current || current.ino !== expected.ino || current.dev !== expected.dev || (owner !== undefined && current.claim?.owner !== owner)) return; if (current.ownerFile) { const ownerPath = join(path, "owner.json"); const ownerInfo = await lstat(ownerPath).catch(() => undefined); if (!ownerInfo || ownerInfo.ino !== current.ownerFile.ino || ownerInfo.dev !== current.ownerFile.dev || ownerInfo.isSymbolicLink() || !ownerInfo.isFile() || ownerInfo.nlink !== 1) return; await rm(ownerPath, { force: false }); } const directory = await lstat(path).catch(() => undefined); if (!directory || directory.ino !== current.ino || directory.dev !== current.dev || !directory.isDirectory() || directory.isSymbolicLink() || (await readdir(path)).length !== 0) return; try { await rmdir(path); } catch (error) { if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error; } }
async function gitIgnoreContains(path: string): Promise<boolean> { const info = await lstat(path).catch(() => undefined); if (!info) return false; if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1 || info.size > 10 * 1024 * 1024) throw new CliFailure("FILE_ERROR", ".gitignore is unsafe"); let handle; try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); const opened = await handle.stat(); if (opened.ino !== info.ino || opened.dev !== info.dev) throw new CliFailure("FILE_ERROR", ".gitignore changed or is unsafe"); return (await handle.readFile("utf8")).split(/\r?\n/u).includes(".job-fit/"); } finally { await handle?.close(); } }
function pidIsAlive(pid: number): boolean { try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; } }
export function canonicalHash(value: unknown): string {
  const normalize = (v: unknown): unknown => Array.isArray(v) ? v.map(normalize) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, normalize(x)])) : v;
  return createHash("sha256").update(JSON.stringify(normalize(value))).digest("hex");
}
