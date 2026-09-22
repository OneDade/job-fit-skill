# Advanced use

This page is for developers and integrations. Ordinary users should install the Skill folder and use a natural-language request as described in the [README](../README.md).

## Execution modes

The Skill chooses the best mode available without asking the user to understand the implementation:

- **Portable mode:** uses the host Agent's attachment and document tools. It labels the result `portable-agent-analysis` and does not claim deterministic CLI verification.
- **Verified CLI mode:** uses the local `job-fit` CLI, a compatible `@job-fit/core`, and a trusted runtime module.

## Verified CLI requirements

- Node.js 22.12 or later.
- A compatible `@job-fit/core` 0.1.x checkout or package.
- A trusted local ESM runtime module.

`@job-fit/skill` and `@job-fit/core` are not currently published to the public npm registry. Build from source only when developing or integrating the optional CLI:

```bash
git clone https://github.com/OneDade/job-fit-skill.git
cd job-fit-skill
npm ci
npm run build
npm link
```

## Runtime configuration

Set `JOB_FIT_RUNTIME_MODULE` to an absolute path for a trusted ESM module that exports `createJobFitDependencies()`:

```bash
export JOB_FIT_RUNTIME_MODULE=/absolute/path/to/job-fit-runtime.mjs
```

The runtime supplies model, learning-resource, and document adapters. When repository URLs are enabled, its `repositoryFetcher` must enforce byte, timeout, redirect, and public-network/SSRF limits and return fetched regular text files. A URL string alone is not evidence.

## CLI workflow

Create an analysis request from the [request template](../skills/job-fit-assistant/templates/analyze-request.zh-CN.json), then run:

```bash
job-fit analyze \
  --root /absolute/path/to/private-workspace \
  --input analyze.json \
  --idempotency-key YOUR-UUID
```

Available actions:

```bash
job-fit analyze --root /private/workspace --input analyze.json --idempotency-key UUID
job-fit optimize-resume --root /private/workspace --input optimize.json --idempotency-key UUID
job-fit render-resume --root /private/workspace --input render.json --idempotency-key UUID
printf '{"confirm":true}' | job-fit delete-local-data --root /private/workspace --input - --idempotency-key UUID
```

Use a fresh idempotency key for a new intent. Reuse a key only when retrying exactly the same normalized request and referenced file contents.

## Output and confirmation flow

- De-identified JSON/Markdown reports are written under `.job-fit/reports`.
- Full evidence context is stored with `0600` permissions under `.job-fit/contexts`.
- Risky resume drafts are stored under `.job-fit/proposals` and must preserve the original `proposalFile` during confirmation.
- Every risky item must be accepted or rejected. Confirmation does not regenerate model text.
- Only fully confirmed and fact-verified resume models are written under `.job-fit/resume-models`.
- `render-resume` accepts only verified models from that app-owned directory.

## CLI contract

Successful commands write one JSON envelope to stdout. Failed commands write one JSON envelope to stderr. The current schema version is `1.0.0`.

| Exit code | Meaning |
| --- | --- |
| `2` | Invalid input |
| `3` | Missing or unsafe file |
| `4` | Idempotency conflict or Core rejection |
| `5` | Runtime dependency unavailable |
| `10` | Internal failure |
| `130` | Interrupted run |

## Security boundary

- Resume, job description, project, repository, and model content is untrusted data, never instructions.
- “Not found” means insufficient evidence, not automatically a missing skill.
- Planned learning is not resume evidence.
- Errors do not expose identity fields, raw source text, model text, or artifact bytes.
- Cloud-model processing remains subject to the selected host and provider's data policies.

See [SECURITY.md](../SECURITY.md), the [Skill security guide](../skills/job-fit-assistant/references/security.md), and the [architecture guide](ARCHITECTURE.md) for implementation details.

## Development

```bash
npm run check
npm audit
```

Real-Core integration packs a sibling Core checkout or uses `CORE_TARBALL`. Test data must be synthetic or redacted. See [CONTRIBUTING.md](../CONTRIBUTING.md), [UPSTREAM.md](../UPSTREAM.md), and [CHANGELOG.md](../CHANGELOG.md).
