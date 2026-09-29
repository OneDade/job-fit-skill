# Resume template samples

These DOCX files are the visual source of truth for the four public template IDs. They all use the same fictional candidate (林一然) so the layouts can be compared side by side. Nothing in them describes a real person.

| File | Template ID | Display name |
| --- | --- | --- |
| `professional-business.docx` | `professional-business` | 专业商务版 |
| `technical-project.docx` | `technical-project` | 技术项目版 |
| `ats-minimal.docx` | `ats-minimal` | 极简黑白版 |
| `one-page-compact.docx` | `one-page-compact` | 一页紧凑版 |

Use these files as layout references, not as evidence about a real candidate. Replace all sample content, including the name, target role, contact line and every number, with the user's confirmed facts. Do not carry over decorative labels or footer text. Preserve selectable text, one-column reading order, A4 page size and the typography rules in `references/resume-templates.md`.

Regenerate the samples with `python3 scripts/build-resume-template-samples.py` (requires `python-docx`).
