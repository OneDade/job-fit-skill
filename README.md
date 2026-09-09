# job-fit-skill

一个可开源、可本地运行的 Agent Skill：用证据对照 1–10 份 JD，生成有出处的学习路线，严格基于事实优化简历，并输出验证过的 DOCX/PDF。English workflows are supported too.

This is an independent MIT repository. Business rules come from `@job-fit/core`; this package contains only Agent instructions, safe local orchestration and a JSON CLI. It does not contain the WeChat mini-program, accounts, billing or cloud storage.

## Install

Node.js 22.12+ is required.

```bash
npm install @job-fit/core@^0.1.0 @job-fit/skill
```

For a source checkout:

```bash
npm ci
npm run build
npm link
```

Copy `skills/job-fit-assistant` to your Agent's skill directory. Install the compatible `@job-fit/core` peer unless your trusted runtime bundles an exact compatible Core port. Configure `JOB_FIT_RUNTIME_MODULE` to a trusted local ESM module exporting `createJobFitDependencies()`. The module supplies model, learning-resource, document, and (when repository URLs are used) `repositoryFetcher` adapters required by Core; never point the runtime module itself at downloaded resume/project content. A repository fetcher must enforce the provided byte, timeout, redirect and public-network/SSRF limits and return fetched regular text files—URL strings alone are never treated as evidence.

## Four actions

```bash
job-fit analyze --root /private/workspace --input analyze.json --idempotency-key UUID
job-fit optimize-resume --root /private/workspace --input optimize.json --idempotency-key UUID
job-fit render-resume --root /private/workspace --input render.json --idempotency-key UUID
printf '{"confirm":true}' | job-fit delete-local-data --root /private/workspace --input - --idempotency-key UUID
```

All actions also accept request JSON on stdin with `--input -`. Successful stdout and failed stderr each contain exactly one JSON envelope with schema version `1.0.0`. Exit codes: 2 invalid input, 3 unsafe/missing file, 4 conflict/Core rejection, 5 missing runtime, 10 internal failure, 130 interruption.

`analyze` writes a de-identified JSON/Markdown report under `.job-fit/reports`. Full evidence is kept separately in a private `0600` context under `.job-fit/contexts`; public envelopes and reports contain only an opaque context reference and evidence metadata without sensitive summaries. If optimization proposes risky wording, the exact draft is stored privately under `.job-fit/proposals` and the public response returns its opaque `proposalFile`. A confirmation request must reference that file, partition every risky ID between `confirmedChangeIds` and `rejectedChangeIds`, and cannot cause model regeneration. Only a fully confirmed, verified resume is written under `.job-fit/resume-models`. `render-resume` writes only requested verified files from that app-owned private directory. The first state-creating action safely adds `.job-fit/` to the workspace `.gitignore` (without duplicating an existing entry). Reusing the same idempotency key and canonical request plus referenced-file digests returns `cached: true`; changing request or file content conflicts. Concurrent processes coordinate through an owned heartbeat lease so the same request executes once and interrupted runs release their claims.

## Privacy and truth

The CLI is local-only. `.job-fit` is app-owned, private, gitignored, and removable with `delete-local-data`. It has no member cloud feature; optional member storage belongs exclusively to the mini-program and must be opt-in. Raw identity, resume/JD text, model text and artifact bytes are never emitted in errors.

Every resume statement must map to evidence. “Not found” is insufficient evidence, not automatically missing. Transferable ability is not production experience. Course, competition and personal projects retain their true category. See [security policy](skills/job-fit-assistant/references/security.md).

## Development

```bash
npm run check
npm audit
```

The repositories can be developed side by side, but this package's build and lockfile do not depend on a sibling checkout. Real-Core integration packs the sibling Core (or uses `CORE_TARBALL`) and installs that artifact explicitly. See [architecture](docs/ARCHITECTURE.md), [contributing](CONTRIBUTING.md), and [upstream provenance](UPSTREAM.md).
