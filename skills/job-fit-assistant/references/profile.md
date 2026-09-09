# Evidence-first profile

Adapted from upstream `.claude/commands/setup.md`; see `UPSTREAM.md`.

1. Inventory only files the user selected: PDF, DOCX, TXT or Markdown. Public GitHub/Gitee project URLs are optional; never ask for private credentials or execute repository code.
2. Explain that the CLI saves only app-owned local state in `.job-fit/`. Warn if the workspace is a public repository.
3. Put resume files in `resumeFiles`, optional evidence documents in `projectFiles`, public links in `repositories`, and user-confirmed corrections in `confirmedFacts`.
4. Run `job-fit analyze`. Show conflicts and source locations. A claim without evidence remains insufficient evidence; absence is not automatically a missing skill.
5. Never print phone, email, exact address, identifiers or raw source text. Identity may be supplied later for a single resume generation and is not part of the de-identified profile.

Example: `job-fit analyze --root /private/job-search --input request.json --idempotency-key <uuid>`.
