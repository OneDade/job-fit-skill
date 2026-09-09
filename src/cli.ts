#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { Command, CommanderError } from "commander";
import { ZodError } from "zod";
import { analyze, deleteLocalData, optimizeResume, renderResume, type PreparedFiles } from "./commands.js";
import type { CorePort } from "./core/core-port.js";
import { JobFitCoreAdapter } from "./core/job-fit-core-adapter.js";
import { canonicalHash } from "./io/private-store.js";
import { readSafeFile, resolveWorkspace } from "./io/safe-path.js";
import { releaseOwnedClaims, RunStore } from "./io/run-store.js";
import { CliFailure, exitCode, failure, success } from "./output/envelope.js";
import { requestSchemas, type ActionName } from "./schemas.js";
import { loadRuntime } from "./runtime/dependencies.js";

type Options = { input: string; root: string; idempotencyKey: string };
const MAX_STDIN_BYTES = 10 * 1024 * 1024;
const readStdin = async (): Promise<string> => { const chunks: Buffer[] = []; let bytes = 0; for await (const chunk of process.stdin) { const buffer = Buffer.from(chunk); bytes += buffer.byteLength; if (bytes > MAX_STDIN_BYTES) { process.stdin.pause(); throw new CliFailure("FILE_ERROR", "stdin exceeds the 10 MiB limit"); } chunks.push(buffer); } return Buffer.concat(chunks, bytes).toString("utf8"); };
const safeFailure = (error: unknown): CliFailure => error instanceof CliFailure ? error : error instanceof ZodError || error instanceof SyntaxError ? new CliFailure("INVALID_INPUT", "input does not match the action schema") : new CliFailure("INTERNAL_ERROR", "action failed without exposing private input", true);

export async function execute(action: ActionName, options: Options, coreOverride?: CorePort): Promise<void> {
  const runId = randomUUID();
  try {
    const root = await resolveWorkspace(options.root);
    const rawText = options.input === "-" ? await readStdin() : Buffer.from(await readSafeFile(root, options.input)).toString("utf8");
    const raw = JSON.parse(rawText) as unknown; requestSchemas[action].parse(raw);
    const prepared = action === "delete-local-data" ? new Map<string, Uint8Array>() : await prepareReferencedFiles(action, root, raw);
    const fileDigests = [...prepared].map(([path, bytes]): [string, string] => [path, createHash("sha256").update(bytes).digest("hex")]).sort(([left], [right]) => left.localeCompare(right));
    const requestHash = canonicalHash({ request: raw, files: fileDigests }); const store = new RunStore(root);
    if (action === "delete-local-data") { const data = await deleteLocalData(root, raw); process.stdout.write(`${JSON.stringify(success(runId, action, data, false))}\n`); return; }
    const executed = await store.run(action, options.idempotencyKey, requestHash, async () => {
      let core = coreOverride;
      if (!core) { const runtime = await loadRuntime(); core = runtime.core ?? await JobFitCoreAdapter.create(runtime.dependencies); }
      return action === "analyze" ? analyze(core, root, raw, prepared) : action === "optimize-resume" ? optimizeResume(core, root, raw, prepared) : renderResume(core, root, raw, prepared);
    });
    process.stdout.write(`${JSON.stringify(success(runId, action, executed.value, executed.cached))}\n`);
  } catch (error) { const safe = safeFailure(error); process.stderr.write(`${JSON.stringify(failure(runId, action, safe))}\n`); process.exitCode = exitCode(safe.kind); }
}

async function prepareReferencedFiles(action: Exclude<ActionName, "delete-local-data">, root: string, raw: unknown): Promise<PreparedFiles> {
  const files = new Map<string, Uint8Array>(); const source = raw as Record<string, unknown>;
  const load = async (path: string) => { if (!files.has(path)) files.set(path, await readSafeFile(root, path)); };
  if (action === "analyze") { for (const path of [...(source.resumeFiles as string[]), ...(source.projectFiles as string[] ?? [])]) await load(path); }
  else if (action === "render-resume") { const modelFile = source.resumeModelFile as string; if (!/^\.job-fit\/resume-models\/[A-Za-z0-9_-]{1,80}\.resume\.json$/u.test(modelFile)) throw new CliFailure("INVALID_INPUT", "resume model must be in app-owned private state"); await load(modelFile); }
  else { const analysisFile = source.analysisFile as string; if (!/^\.job-fit\/reports\/[A-Za-z0-9._-]+\.json$/u.test(analysisFile)) throw new CliFailure("INVALID_INPUT", "analysis report must be an app-owned private report"); await load(analysisFile); let reference: unknown; try { reference = JSON.parse(Buffer.from(files.get(analysisFile)!).toString("utf8")); } catch { throw new CliFailure("INVALID_INPUT", "analysis report reference is invalid"); } const contextId = typeof reference === "object" && reference !== null && "contextId" in reference ? (reference as { contextId?: unknown }).contextId : undefined; const contextFile = typeof reference === "object" && reference !== null && "contextFile" in reference ? (reference as { contextFile?: unknown }).contextFile : undefined; if (typeof contextId !== "string" || contextFile !== `.job-fit/contexts/${contextId}.json`) throw new CliFailure("INVALID_INPUT", "analysis report reference is invalid"); await load(contextFile); if (typeof source.proposalFile === "string") { if (!/^\.job-fit\/proposals\/[0-9a-f-]+\.json$/iu.test(source.proposalFile)) throw new CliFailure("INVALID_INPUT", "proposalFile must reference app-owned private state"); await load(source.proposalFile); } }
  return files;
}

export function createProgram(): Command {
  const program = new Command().name("job-fit").description("Evidence-grounded local job-fit assistant").version("0.1.0").showHelpAfterError().exitOverride().configureOutput({ writeOut: (text) => process.stdout.write(text), writeErr: () => undefined });
  for (const action of ["analyze", "optimize-resume", "render-resume", "delete-local-data"] as const) {
    program.command(action).description(`${action} action`).option("--input <path>", "request JSON path, or - for stdin", "-").requiredOption("--root <path>", "private workspace root").requiredOption("--idempotency-key <key>", "1–200 character retry key").action((opts: Options) => execute(action, opts));
  }
  return program;
}
export async function main(argv = process.argv): Promise<void> {
  const action = (["analyze", "optimize-resume", "render-resume", "delete-local-data"] as const).find((candidate) => argv.slice(2).includes(candidate)) ?? "analyze";
  let stopping = false; const onSignal = () => { if (stopping) return; stopping = true; void (async () => { await releaseOwnedClaims(); process.stderr.write(`${JSON.stringify(failure(randomUUID(), action, new CliFailure("INTERRUPTED", "operation interrupted", true)))}\n`); process.exit(130); })(); };
  process.once("SIGINT", onSignal); process.once("SIGTERM", onSignal);
  try { await createProgram().parseAsync(argv); }
  catch (error) { if (error instanceof CommanderError && (error.code === "commander.helpDisplayed" || error.code === "commander.version")) process.exitCode = 0; else { const safe = new CliFailure("INVALID_INPUT", "invalid command arguments"); process.stderr.write(`${JSON.stringify(failure(randomUUID(), action, safe))}\n`); process.exitCode = 2; } }
}
