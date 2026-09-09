# Upstream provenance

- Upstream: https://github.com/MadsLorentzen/ai-job-search
- Audited commit: `e6f6f4e322148cc3558726c4b060486f5388316f`
- License: MIT; the original notice is retained in `THIRD_PARTY_NOTICES.md`.

| Upstream source | Local adaptation | What was retained and changed |
|---|---|---|
| `.claude/commands/setup.md` | `skills/job-fit-assistant/references/profile.md` | Multi-source inventory and confirmation; changed to de-identified local state. |
| `.claude/skills/upskill/SKILL.md` and job-evaluation guidance | `skills/job-fit-assistant/references/analyze.md` | Gap ordering and sourced learning; changed to supplied 1–10 JDs and Core-owned scoring. |
| `.claude/commands/apply.md` | `skills/job-fit-assistant/references/tailor.md` | Grounding/reviewer gates; removed applying, tracking and cover letters. |
| `SECURITY.md`, `tools/security_guards.py` | `skills/job-fit-assistant/references/security.md`, `scripts/check-skill.mjs` | Adapted filesystem/privacy invariants for a cross-agent CLI. |
| `tests/test_upskill_skill.py`, `tests/test_security_guards.py` | `tests/security/skill-policy.test.ts` | Invariant-level test adaptation; no Python source copied. |

Not included: Danish job portals, Gmail, Notion, salary features, job discovery,
application tracking, cover letters, interviews, or Claude-specific permissions.
