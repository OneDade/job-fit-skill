# Architecture

```text
Agent Skill → JSON CLI → validation + safe local I/O → CorePort → optional @job-fit/core
                         ↘ public report (de-identified)
                         ↘ private evidence context (0600)
                         ↘ content-bound idempotency cache + owned lease
```

`schemas.ts` owns the stable CLI `1.0.0` wire contract. `commands.ts` owns the four workflows but no matching/scoring rules. `CorePort` is the test boundary; `JobFitCoreAdapter` dynamically validates the optional `@job-fit/core` 0.1.0/schema 2.0.0 runtime shape, so this repository builds independently. A trusted runtime module supplies Core's external ports, including bounded repository fetching when requested.

Security boundaries are intentional: materials are passive bytes, paths remain under a real workspace, symbolic links are rejected, app state is marked before it may be recursively deleted, and output names never come from untrusted input or Core. Sensitive evidence summaries live only in the private context and are omitted from stdout/public reports. Cached values bind action/key, canonical request and every referenced file digest. Cross-process claims carry an owner, PID and renewable lease; signal cleanup removes only the caller's claim.
