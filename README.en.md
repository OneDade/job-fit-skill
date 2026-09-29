# Job Fit Assistant

> Give an AI agent your resume and a job description. It tells you whether the role is worth applying for and creates a tailored resume.

[中文](README.md) · [English](README.en.md)

Works with agents that support custom Skills and user-selected attachments, including Codex, Claude Code, WorkBuddy, QwenWork, and Doubao Office. Exact installation permissions depend on the client version.

## Step 1: ask your Agent to install it

Send this entire message to your Agent:

```text
Please install this Skill:

https://github.com/OneDade/job-fit-skill/tree/main/skills/job-fit-assistant

Requirements:
1. Install the complete skills/job-fit-assistant folder only. Do not run repository code or install npm dependencies.
2. Use the user-level Skills directory supported by the current Agent.
3. Preserve SKILL.md, agents, assets, references, and templates.
4. After installation, verify that the Agent recognizes a Skill named job-fit-assistant and report its installation path.
5. If this client does not support custom Skills, say so directly instead of claiming success.
```

### Using Codex? Use this shorter prompt

```text
Use $skill-installer to install this Skill:
https://github.com/OneDade/job-fit-skill/tree/main/skills/job-fit-assistant
```

Codex officially supports asking `$skill-installer` to download Skills from other GitHub repositories. Restart Codex if the Skill does not appear immediately. See the [official OpenAI Skills documentation](https://developers.openai.com/codex/skills/).

### Cannot access GitHub from your Agent?

Download `job-fit-assistant.zip` from [Releases](https://github.com/OneDade/job-fit-skill/releases), then upload it through the client's Skill interface. Do not upload only `SKILL.md`.

## Step 2: attach your files and use it

Attach or select your resume and one job description (text, file, job-app screenshot, or posting link), then send:

```text
Analyze my resume and this job description, tell me whether I should apply, and then create a tailored resume.
```

No JSON, command-line setup, or manual keyword extraction is required. If you only want one part (for example, just the resume or just interview prep), say so and it will not do more.

No real resume at hand? Try the fictional resume and JD in [examples](examples/).

For the complete company-research, resume, and interview workflow, send:

```text
Using my resume and this job description, research the company, recommend a resume template, create tailored Word/PDF resumes, and prepare interview-answer outlines.
```

## What you get

- One recommendation: apply, apply with risks, or do not apply—plus the decisive reasons.
- A clear view of direct matches, transferable experience, explicit gaps, and evidence that is missing from the resume.
- A tailored resume reordered and rewritten for the target role.
- Four template choices: Professional Business, Technical Project, One-page Compact, and Plain (for foreign employers and applicant-tracking systems).
- Word and PDF output when supported, with pagination, reading-order, and selectable-text checks.
- Cited company research plus interview questions and evidence-grounded answer outlines.
- A ranked comparison when you send several job descriptions, including gaps they share.
- Three short first-message greetings for recruiters, each under 100 Chinese characters.
- An interactive mock interview with feedback and a follow-up after each answer.
- A confirmed-facts file you can send next time so you do not re-confirm the same details.
- No invented experience, metrics, or outcomes when the source material does not support them.

The Agent asks before using risky claims involving metrics, scope, ownership, titles, or dates. It creates DOCX/PDF when the host provides document tools and otherwise delivers an ATS-friendly Markdown resume.

## FAQ

### How do I verify the installation?

Ask the Agent to list installed Skills and confirm that `job-fit-assistant` appears. In Codex, you can also run `/skills` or explicitly invoke `$job-fit-assistant`.

### Why did I not receive a Word or PDF file?

The Skill uses the current Agent's document capabilities. If the client cannot create documents, it returns Markdown rather than pretending a file was generated.

### Does it search or apply for jobs automatically?

No. It analyzes job descriptions you supply. It does not sign in to job boards, submit applications, or contact recruiters.

### Where is my resume uploaded?

That depends on the Agent and model provider you use. Review the client's data and privacy policies. The Skill itself never submits your resume to this repository.

## Acknowledgements and provenance

Parts of this project's Agent workflow design are adapted from
[`MadsLorentzen/ai-job-search`](https://github.com/MadsLorentzen/ai-job-search)
(audited commit: [`e6f6f4e`](https://github.com/MadsLorentzen/ai-job-search/commit/e6f6f4e322148cc3558726c4b060486f5388316f)).
The upstream project is MIT-licensed, and its copyright and license notice are retained here.

See [upstream provenance](UPSTREAM.md) for the adaptation map and excluded features, and
[third-party notices](THIRD_PARTY_NOTICES.md) for the retained license text. Thanks to Mads Lorentzen for the original open-source work.

## Developers and advanced use

Ordinary users do not need the CLI. For the local CLI, runtime integration, JSON contracts, deterministic verification, or development, read:

- [Advanced guide](docs/ADVANCED.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
