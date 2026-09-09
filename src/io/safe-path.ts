import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, stat } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { CliFailure } from "../output/envelope.js";

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export async function resolveWorkspace(root: string): Promise<string> {
  try { const resolved = await realpath(resolve(root)); if (!(await stat(resolved)).isDirectory()) throw new Error(); return resolved; }
  catch { throw new CliFailure("FILE_ERROR", "workspace does not exist or is not a directory"); }
}
export function assertContained(root: string, candidate: string): void {
  const rel = relative(root, candidate);
  if (rel === "" || rel === ".") return;
  if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new CliFailure("FILE_ERROR", "path is outside workspace");
}
export async function readSafeFile(rootInput: string, input: string, maxBytes = MAX_INPUT_BYTES): Promise<Uint8Array> {
  const root = await resolveWorkspace(rootInput);
  const candidate = resolve(root, input);
  assertContained(root, candidate);
  let info;
  try { info = await lstat(candidate); } catch { throw new CliFailure("FILE_ERROR", "selected file does not exist"); }
  if (info.isSymbolicLink()) throw new CliFailure("FILE_ERROR", "symbolic links are not accepted");
  if (!info.isFile()) throw new CliFailure("FILE_ERROR", "selected path is not a regular file");
  if (info.size > maxBytes) throw new CliFailure("FILE_ERROR", "selected file exceeds the 10 MB limit");
  const fileReal = await realpath(candidate); assertContained(root, fileReal);
  if (fileReal !== candidate) throw new CliFailure("FILE_ERROR", "symbolic path components are not accepted");
  try {
    const handle = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW);
    try { return await handle.readFile(); } finally { await handle.close(); }
  } catch { throw new CliFailure("FILE_ERROR", "selected file could not be read safely"); }
}
export async function createSafeDirectory(root: string, relativePath: string): Promise<string> {
  const candidate = resolve(root, relativePath); assertContained(root, candidate); const rel = relative(root, candidate); let current = root;
  for (const part of rel.split(sep).filter(Boolean)) { current = resolve(current, part); let info = await lstat(current).catch(() => undefined); if (info?.isSymbolicLink() || (info && !info.isDirectory())) throw new CliFailure("FILE_ERROR", "output directory is unsafe"); if (!info) { await mkdir(current, { mode: 0o700 }).catch(async (error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; }); info = await lstat(current).catch(() => undefined); if (!info?.isDirectory() || info.isSymbolicLink()) throw new CliFailure("FILE_ERROR", "output directory is unsafe"); } }
  const actual = await realpath(current); assertContained(root, actual); if (actual !== current) throw new CliFailure("FILE_ERROR", "symbolic output path is not accepted"); return current;
}
export function mediaTypeFor(path: string): "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain" {
  const ext = extname(path).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === ".txt" || ext === ".md") return "text/plain";
  throw new CliFailure("INVALID_INPUT", "supported file types are PDF, DOCX, TXT, and Markdown");
}
