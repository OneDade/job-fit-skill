import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, open, rm } from "node:fs/promises";
import { join } from "node:path";
import { CliFailure } from "../output/envelope.js";
import { atomicWrite, stateDirectory } from "./private-store.js";
import { createSafeDirectory } from "./safe-path.js";
type Entry<T> = { requestHash: string; value: T };
type Claim = { requestHash: string; createdAt: number; leaseExpiresAt: number; pid: number; owner: string };
const CLAIM_LEASE_MS = 2_000;
const CLAIM_WAIT_MS = 30_000;
const MALFORMED_CLAIM_GRACE_MS = 500;
type ClaimSnapshot = { ino: number; dev: number; mtimeMs: number; claim?: Claim };
const activeClaims = new Map<string, () => Promise<void>>();
export async function releaseOwnedClaims(): Promise<void> { await Promise.allSettled([...activeClaims.values()].map((release) => release())); }
export class RunStore {
  constructor(private readonly root: string) {}
  private async path(action: string, key: string): Promise<string> {
    if (key.length < 1 || key.length > 200) throw new CliFailure("INVALID_INPUT", "idempotency key must contain 1–200 characters");
    const state = await stateDirectory(this.root); const runs = await createSafeDirectory(state, "runs");
    return join(runs, `${createHash("sha256").update(`${action}\0${key}`).digest("hex")}.json`);
  }
  async get<T>(action: string, key: string, requestHash: string): Promise<T | undefined> {
    const path = await this.path(action, key); let entry: Entry<T>;
    let handle; try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW); const info = await handle.stat(); if (!info.isFile() || info.nlink !== 1) throw new Error("unsafe"); entry = JSON.parse(await handle.readFile("utf8")) as Entry<T>; } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw new CliFailure("FILE_ERROR", "cached result is unreadable or unsafe"); } finally { await handle?.close(); }
    if (entry.requestHash !== requestHash) throw new CliFailure("IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different request");
    return entry.value;
  }
  async put(action: string, key: string, requestHash: string, value: unknown): Promise<void> { await atomicWrite(await this.path(action, key), JSON.stringify({ requestHash, value })); }

  async run<T>(action: string, key: string, requestHash: string, operation: () => Promise<T>): Promise<{ value: T; cached: boolean }> {
    const resultPath = await this.path(action, key); const claimPath = `${resultPath}.lock`; const deadline = Date.now() + CLAIM_WAIT_MS;
    for (;;) {
      const cached = await this.get<T>(action, key, requestHash); if (cached !== undefined) return { value: cached, cached: true };
      const owner = randomUUID(); const initialClaim: Claim = { requestHash, createdAt: Date.now(), leaseExpiresAt: Date.now() + CLAIM_LEASE_MS, pid: process.pid, owner };
      if (!(await createClaim(claimPath, initialClaim))) {
        const snapshot = await inspectClaim(claimPath);
        if (!snapshot) continue;
        if (snapshot.claim && snapshot.claim.requestHash !== requestHash) throw new CliFailure("IDEMPOTENCY_CONFLICT", "idempotency key was already used for a different request");
        const malformedStale = !snapshot.claim && Date.now() - snapshot.mtimeMs >= MALFORMED_CLAIM_GRACE_MS;
        const expiredDead = snapshot.claim && snapshot.claim.leaseExpiresAt < Date.now() && !pidIsAlive(snapshot.claim.pid);
        if (malformedStale || expiredDead) { await removeClaim(claimPath, snapshot, snapshot.claim?.owner); continue; }
        if (Date.now() >= deadline) throw new CliFailure("INTERNAL_ERROR", "timed out waiting for an in-progress request", true);
        await new Promise((resolve) => setTimeout(resolve, 20));
        continue;
      }
      let renewing = Promise.resolve(); let heartbeat: NodeJS.Timeout | undefined;
      const release = async () => { clearInterval(heartbeat); await renewing; const snapshot = await inspectClaim(claimPath).catch(() => undefined); if (snapshot) await removeClaim(claimPath, snapshot, owner); activeClaims.delete(owner); }; activeClaims.set(owner, release);
      heartbeat = setInterval(() => { renewing = renewing.then(() => renewClaim(claimPath, requestHash, owner)); }, CLAIM_LEASE_MS / 4); heartbeat.unref();
      try {
        // The result may have been committed after our pre-claim cache check but
        // before the previous owner released its claim. Re-check only after we
        // own the claim so that this process never repeats an already completed
        // operation in that hand-off window.
        const completed = await this.get<T>(action, key, requestHash);
        if (completed !== undefined) return { value: completed, cached: true };
        const value = await operation(); await this.put(action, key, requestHash, value); return { value, cached: false };
      }
      finally { clearInterval(heartbeat); await release(); }
    }
  }
}

async function createClaim(path: string, claim: Claim): Promise<boolean> { const temp = `${path}.${claim.owner}.tmp`; let handle; try { handle = await open(temp, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600); await handle.writeFile(JSON.stringify(claim)); await handle.sync(); await handle.close(); handle = undefined; try { await link(temp, path); return true; } catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") return false; throw error; } } finally { await handle?.close(); await rm(temp, { force: true }).catch(() => undefined); } }
async function inspectClaim(path: string): Promise<ClaimSnapshot | undefined> { const info = await lstat(path).catch(() => undefined); if (!info) return undefined; if (!info.isFile() || info.isSymbolicLink() || info.nlink > 2 || info.size > 2_048) throw new CliFailure("FILE_ERROR", "idempotency claim is unsafe"); let handle; let raw = ""; try { handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return undefined; throw error; }); if (!handle) return undefined; const opened = await handle.stat(); if (opened.ino !== info.ino || opened.dev !== info.dev) return undefined; if (!opened.isFile() || opened.nlink > 2 || opened.size > 2_048) throw new CliFailure("FILE_ERROR", "idempotency claim is unsafe"); raw = await handle.readFile("utf8"); } finally { await handle?.close(); } let claim: Claim | undefined; try { const value = JSON.parse(raw) as Partial<Claim>; if (typeof value.requestHash === "string" && typeof value.createdAt === "number" && typeof value.leaseExpiresAt === "number" && Number.isInteger(value.pid) && Number(value.pid) > 0 && typeof value.owner === "string" && value.owner.length > 0) claim = value as Claim; } catch { /* malformed crash residue is reclaimed only after grace */ } return { ino: info.ino, dev: info.dev, mtimeMs: info.mtimeMs, ...(claim ? { claim } : {}) }; }
async function removeClaim(path: string, expected: ClaimSnapshot, owner?: string): Promise<void> { const current = await inspectClaim(path).catch(() => undefined); if (!current || current.ino !== expected.ino || current.dev !== expected.dev || (owner !== undefined && current.claim?.owner !== owner)) return; await rm(path, { force: true }); }
async function renewClaim(path: string, requestHash: string, owner: string): Promise<void> { const snapshot = await inspectClaim(path).catch(() => undefined); const current = snapshot?.claim; if (!snapshot || current?.owner !== owner) return; await atomicWrite(path, JSON.stringify({ ...current, requestHash, leaseExpiresAt: Date.now() + CLAIM_LEASE_MS } satisfies Claim)); }
function pidIsAlive(pid: number): boolean { if (!Number.isInteger(pid) || pid <= 0) return false; try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code !== "ESRCH"; } }
