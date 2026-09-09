# Truthful resume optimization and rendering

Adapted from upstream `.claude/commands/apply.md`; see `UPSTREAM.md`.

1. Select exactly one JD analysis. Provide confirmed facts and their evidence IDs. Every resume claim must carry evidence_id.
2. Show proposed section order, selected projects, retained keywords and risky before/after changes. Explicitly confirm numbers, scope, ownership, production claims and timeline changes.
3. Run `job-fit optimize-resume` without change decisions to obtain a `NEEDS_CONFIRMATION` proposal. Show its safe `changes`, `riskyChanges`, and opaque `requiredConfirmationIds`; preserve its opaque `proposalFile`. The exact full proposal stays in private `0600` state and no renderable resume model is written while a risky change remains.
4. Ask the user to accept or reject every risky ID. Rerun with the returned `proposalFile`, accepted IDs in `confirmedChangeIds`, and rejected IDs in `rejectedChangeIds`. Unknown, duplicate, overlapping, or no-longer-proposed IDs are invalid. Accepted and rejected IDs must cover every high-risk bullet. Skill passes the full saved proposal to Core unchanged; Core confirms the exact accepted wording and removes rejected bullets without another model generation.
5. Missing or planned skills stay in the gap report. A course/personal project must not become employment or production experience.
6. Only after the response is `CONFIRMED` and factual verification passes, run `job-fit render-resume` for DOCX/PDF. Deliver only requested, non-empty artifacts when verification passes.
7. If a gate fails, request evidence or remove the claim. Never soften the check or add unsupported keywords.

中文示例：先选择 `jd-backend`，确认变更，再优化；验证通过后输出 ATS DOCX/PDF。
English example: select one job, confirm risky changes, optimize, then render verified files.
