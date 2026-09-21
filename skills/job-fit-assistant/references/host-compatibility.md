# Host compatibility

The same `SKILL.md` is the source of truth across hosts. Install the complete `job-fit-assistant` folder so references remain available.

| Host | Typical installation | Execution mode |
| --- | --- | --- |
| Codex | Copy to `~/.agents/skills/job-fit-assistant/` or a repository's `.agents/skills/job-fit-assistant/` | Verified CLI when configured; otherwise portable |
| Claude Code | Copy to `~/.claude/skills/job-fit-assistant/` or `.claude/skills/job-fit-assistant/` | Verified CLI when configured; otherwise portable |
| WorkBuddy | Upload the complete local Skill package, or install it from the Skill interface | Portable by default; CLI only when the host exposes and authorizes the local executable |
| 千问办公 / QwenWork | Upload the folder/package or install it under `~/.qwenwork/skills/job-fit-assistant/` | Portable by default |
| 豆包办公 | Upload the complete Skill package in a client version that supports custom Skills | Portable by default; exact packaging and local-tool permissions depend on the installed client |

After installation, attach or select the resume and JD, then say:

> 分析我的简历和这个 JD，告诉我值不值得投，然后帮我生成定制简历。

The host must be able to read the selected files. DOCX/PDF delivery also requires the host's document-generation capability. When those tools are unavailable, the Skill returns an ATS-friendly Markdown resume instead of pretending a file was generated.

Do not claim that installing the Skill alone installs the optional `job-fit` CLI, `@job-fit/core`, a model provider, or a document converter.
