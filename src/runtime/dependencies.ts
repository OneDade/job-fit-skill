import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { CliFailure } from "../output/envelope.js";
import type { CorePort } from "../core/core-port.js";
export async function loadRuntime(): Promise<{ dependencies?: unknown; core?: CorePort }> {
  const modulePath = process.env.JOB_FIT_RUNTIME_MODULE;
  if (!modulePath) throw new CliFailure("DEPENDENCY_UNAVAILABLE", "JOB_FIT_RUNTIME_MODULE must point to a trusted local runtime adapter");
  try {
    const loaded = await import(pathToFileURL(resolve(modulePath)).href) as { createJobFitDependencies?: () => unknown | Promise<unknown>; createJobFitCorePort?: () => CorePort | Promise<CorePort> };
    if (typeof loaded.createJobFitCorePort === "function") { const core = await loaded.createJobFitCorePort(); if (!core || typeof core !== "object" || core.contractVersion !== "2.0.0" || typeof core.analyze !== "function" || typeof core.optimizeResume !== "function" || typeof core.renderResume !== "function" || typeof core.validateAnalysis !== "function" || typeof core.validateStoredResume !== "function") throw new Error("invalid core port"); return { core }; }
    if (typeof loaded.createJobFitDependencies === "function") return { dependencies: await loaded.createJobFitDependencies() };
    throw new Error("missing factory");
  } catch { throw new CliFailure("DEPENDENCY_UNAVAILABLE", "runtime adapter could not be loaded"); }
}
