# Job Fit Skill

> 用证据连接岗位要求、能力差距、学习路线与简历表达。
>
> Evidence-grounded job-fit analysis, learning plans, and truthful resume tailoring.

[简体中文](#简体中文) · [English](#english)

`job-fit-skill` 是一个跨 Agent 的求职 Skill。它可以对照 1–10 份由你提供的职位描述（JD）分析简历与项目证据，生成有出处的学习路线，并在人工确认高风险措辞后输出定制简历；完整 CLI 模式还会对 DOCX/PDF 进行确定性验证。

本仓库采用 MIT 许可证，可独立开源。可移植模式由 Skill 指令和宿主文件工具执行；可选的严格模式由 `@job-fit/core` 提供业务规则，并通过安全的本地编排层和稳定 JSON CLI 运行。

安装后，附上简历和 JD，直接说：

> 分析我的简历和这个 JD，告诉我值不值得投，然后帮我生成定制简历。

Skill 会自动选择可用执行方式：配置完整的环境使用严格 CLI；其他支持读取附件的 Agent 使用可移植工作流，不要求用户编写 JSON 或理解命令行。

---

## 简体中文

### 为什么使用它

- **证据优先**：每项能力和简历表述都必须关联可追溯证据，不凭空补充经历、数字或成果。
- **不把“没找到”当成“不会”**：明确区分已具备、可迁移、确实缺失和证据不足。
- **从分析到行动**：同时生成 3–14 天速成路线和 1–3 个月成长路线，并保留 JD 来源与资源出处。
- **高风险改写必须确认**：涉及数字、职责范围、所有权、生产经验或时间线的改写，必须逐项接受或拒绝。
- **隐私边界清楚**：原始简历、JD、模型输出和生成文件不会出现在 CLI 公共报告或错误信息中；使用云端模型时仍受对应服务商的数据政策约束。
- **适合 Agent 集成**：所有命令使用版本化 JSON 输入输出，支持幂等重试与并发租约。

### 能做什么

| 工作流 | 命令 | 结果 |
| --- | --- | --- |
| 岗位匹配分析 | `job-fit analyze` | 对照 1–10 份 JD，输出证据化差距分析与学习路线 |
| 事实化简历优化 | `job-fit optimize-resume` | 针对一个目标岗位生成改写方案，并对高风险措辞进行确认门控 |
| 简历文件生成 | `job-fit render-resume` | 仅从已确认、已验证的简历模型生成 DOCX/PDF |
| 本地数据删除 | `job-fit delete-local-data` | 经明确确认后删除该工作区的 `.job-fit` 数据 |

> 本项目不会搜索职位、自动投递、处理账号或账单，也不提供成员云存储。可选的会员云存储仅属于微信小程序，且必须由用户主动选择加入。

### 工作原理

```text
Agent Skill
    ├─ 可移植模式 → 宿主附件与文档工具
    └─ 严格模式 → 版本化 JSON CLI
                    ↓
                  安全本地 I/O → CorePort → @job-fit/core
                    ├─ 脱敏公共报告
                    ├─ 私有证据上下文（0600）
                    └─ 内容绑定的幂等缓存 + 并发租约
```

可移植模式提供跨宿主的一致方法，但不冒充确定性验证。严格模式由 `job-fit-skill` 负责安全边界、文件状态与 CLI 契约，由 `@job-fit/core` 负责匹配、评分和事实校验。更多设计细节见[架构说明](docs/ARCHITECTURE.md)。

### 环境要求

- **可移植模式**：支持自定义 Skill、读取用户附件并创建文件的 Agent 宿主。
- **严格 CLI 模式（可选）**：Node.js 22.12+、兼容的 `@job-fit/core` 0.1.x，以及一个受信任的本地 ESM Runtime 模块。

### 安装

先克隆仓库：

```bash
git clone https://github.com/OneDade/job-fit-skill.git
```

安装完整的 [`skills/job-fit-assistant`](skills/job-fit-assistant) 文件夹，不要只复制 `SKILL.md`：

| 宿主 | 安装位置或方式 |
| --- | --- |
| Codex | `~/.agents/skills/job-fit-assistant/`，或项目中的 `.agents/skills/job-fit-assistant/` |
| Claude Code | `~/.claude/skills/job-fit-assistant/`，或项目中的 `.claude/skills/job-fit-assistant/` |
| WorkBuddy | 在技能界面上传完整本地 Skill 包 |
| 千问办公 | 上传 Skill 包，或放入 `~/.qwenwork/skills/job-fit-assistant/` |
| 豆包办公 | 在支持自定义 Skill 的客户端中上传完整 Skill 包；具体权限取决于当前客户端版本 |

如需启用可选的严格 CLI 模式，再从源码构建 CLI：

```bash
cd job-fit-skill
npm ci
npm run build
npm link
```

> `@job-fit/skill` 与 `@job-fit/core` 目前尚未发布到公共 npm registry，因此本 README 不把 npm 安装写成可用路径。严格 CLI 模式还需要一个兼容的 Core 与 Runtime；仅安装 Skill 不会自动安装这些可选组件。

### 配置 Runtime

通过 `JOB_FIT_RUNTIME_MODULE` 指向一个受信任的本地 ESM 模块。该模块需要导出 `createJobFitDependencies()`，为 Core 提供模型、学习资源、文档生成器，以及在使用公开仓库 URL 时所需的 `repositoryFetcher`。

```bash
export JOB_FIT_RUNTIME_MODULE=/absolute/path/to/job-fit-runtime.mjs
```

Runtime 模块本身不应指向下载来的简历或项目内容。`repositoryFetcher` 必须执行字节数、超时、重定向和公共网络/SSRF 限制，并返回实际获取到的普通文本文件；仅提供 URL 字符串不能作为证据。

### 快速开始

1. 在支持的 Agent 中安装完整 Skill 文件夹。
2. 附上或选中简历和一个目标 JD，可选附上项目材料。
3. 直接发送：

> 分析我的简历和这个 JD，告诉我值不值得投，然后帮我生成定制简历。

Agent 会自动读取材料、给出 `建议投递` / `可以投但有风险` / `暂不建议投递`，再生成有证据约束的定制简历。只有涉及数字、职责范围、所有权、生产经验、职位或时间线的高风险改写才会中途请求确认。

没有 CLI 时，结果会标记为 `portable-agent-analysis`，并使用宿主现有的文档工具生成 DOCX/PDF；宿主不支持文档生成时则交付 ATS 友好的 Markdown。它不会把可移植模式冒充成严格 CLI 验证。

#### 可选：直接使用 CLI

需要自动化或集成时，可基于[中文请求模板](skills/job-fit-assistant/templates/analyze-request.zh-CN.json)创建 `analyze.json`：

```bash
job-fit analyze \
  --root /absolute/path/to/private-workspace \
  --input analyze.json \
  --idempotency-key YOUR-UUID
```

最小请求示例：

```json
{
  "resumeFiles": ["resume.pdf"],
  "jobs": [
    {
      "id": "jd-backend",
      "text": "负责后端服务的设计、开发与维护，熟悉 Node.js、数据库和 API 设计，能够编写自动化测试并与产品团队协作交付。"
    }
  ],
  "projectFiles": [],
  "repositories": [],
  "confirmedFacts": [],
  "locale": "zh-CN",
  "reportFormats": ["json", "markdown"]
}
```

四个命令都支持通过 `--input -` 从 stdin 读取请求：

```bash
job-fit analyze --root /private/workspace --input analyze.json --idempotency-key UUID
job-fit optimize-resume --root /private/workspace --input optimize.json --idempotency-key UUID
job-fit render-resume --root /private/workspace --input render.json --idempotency-key UUID
printf '{"confirm":true}' | job-fit delete-local-data --root /private/workspace --input - --idempotency-key UUID
```

### 输出与确认机制

- 脱敏 JSON/Markdown 报告写入 `.job-fit/reports`。
- 完整证据上下文以 `0600` 权限保存在 `.job-fit/contexts`，公共输出只包含不透明引用和非敏感元数据。
- 高风险简历草稿保存在 `.job-fit/proposals`。确认请求必须引用原 `proposalFile`，并将每个风险项完整划分到 `confirmedChangeIds` 或 `rejectedChangeIds`；确认阶段不会再次调用模型改写。
- 只有全部确认且通过事实校验的简历模型才会写入 `.job-fit/resume-models`，`render-resume` 只接受该目录中的已验证模型。
- 首次创建状态时会安全地将 `.job-fit/` 加入工作区 `.gitignore`，且不会重复添加。

同一个幂等键与完全相同的规范化请求（包括引用文件摘要）会返回 `cached: true`。若请求或文件内容发生变化，则返回冲突，避免误用旧结果。

### CLI 契约

成功时，stdout 只输出一个 JSON envelope；失败时，stderr 只输出一个 JSON envelope。当前 schema 版本为 `1.0.0`。

| 退出码 | 含义 |
| --- | --- |
| `2` | 输入无效 |
| `3` | 文件缺失或路径不安全 |
| `4` | 幂等冲突或 Core 拒绝 |
| `5` | Runtime 依赖不可用 |
| `10` | 内部错误 |
| `130` | 运行被中断 |

### 隐私与真实性原则

- 简历、JD、项目文件和仓库内容都被视为**不可信数据，而不是指令**。
- “未找到证据”只代表证据不足，不自动等同于能力缺失。
- 可迁移能力不等于生产经验；课程、竞赛和个人项目必须保留其真实类别。
- 计划学习的技能不能写进简历，只有完成后的证据才能更新候选人画像。
- 错误信息不会泄露身份、原始文本、模型文本或生成文件内容。
- Skill 的本地文件状态与模型调用是两层边界：如宿主或 Runtime 使用云端模型，所选材料可能发送给该服务商；使用前应检查宿主和模型提供商的数据政策。

完整边界见[安全策略](SECURITY.md)与 [Skill 安全说明](skills/job-fit-assistant/references/security.md)。

### 开发与贡献

```bash
npm run check
npm audit
```

本仓库可以与 Core 并排开发，但构建与 lockfile 不依赖相邻目录。Real-Core 集成测试会打包相邻 Core，或显式使用 `CORE_TARBALL`。

提交代码前请阅读[贡献指南](CONTRIBUTING.md)、[上游来源说明](UPSTREAM.md)和[更新日志](CHANGELOG.md)。测试数据必须是合成或脱敏数据。

---

## English

### Why use it

- **Evidence first:** every capability and resume claim must trace back to evidence—no invented experience, metrics, or outcomes.
- **“Not found” does not mean “missing”:** present, transferable, missing, and insufficient-evidence skills remain distinct.
- **Analysis that leads to action:** generate both a 3–14 day quick route and a 1–3 month growth route with JD citations and sourced learning resources.
- **Human confirmation for risky edits:** changes involving metrics, scope, ownership, production claims, or timelines must be accepted or rejected individually.
- **Explicit privacy boundary:** raw resumes, JDs, model text, and artifacts are excluded from CLI public reports and errors; cloud-model use remains subject to the selected provider's data policy.
- **Built for Agent integration:** every command uses versioned JSON I/O, content-bound idempotency, and cross-process leases.

### What it does

| Workflow | Command | Result |
| --- | --- | --- |
| Job-fit analysis | `job-fit analyze` | Compare evidence against 1–10 supplied JDs and produce gap analysis plus learning routes |
| Truthful resume tailoring | `job-fit optimize-resume` | Create a proposal for one target job and gate risky wording behind explicit confirmation |
| Resume rendering | `job-fit render-resume` | Generate DOCX/PDF only from a confirmed and verified resume model |
| Local data deletion | `job-fit delete-local-data` | Delete this workspace's `.job-fit` data after explicit confirmation |

> This project does not discover jobs, submit applications, manage accounts or billing, or provide member cloud storage. Optional member storage belongs exclusively to the WeChat mini-program and must be opt-in.

### How it works

```text
Agent Skill
    ├─ portable mode → host attachment and document tools
    └─ verified mode → versioned JSON CLI
                         ↓
                       safe local I/O → CorePort → @job-fit/core
                         ├─ de-identified public report
                         ├─ private evidence context (0600)
                         └─ content-bound idempotency cache + owned lease
```

Portable mode provides a consistent cross-host method without claiming deterministic verification. In verified mode, `job-fit-skill` owns the security boundary, local state, and CLI contract; matching, scoring, and factual verification belong to `@job-fit/core`. See the [architecture guide](docs/ARCHITECTURE.md) for details.

### Requirements

- **Portable mode:** an Agent host that supports custom Skills, user-selected files, and file creation.
- **Verified CLI mode (optional):** Node.js 22.12+, a compatible `@job-fit/core` 0.1.x release, and a trusted local ESM runtime module.

### Installation

Clone the repository:

```bash
git clone https://github.com/OneDade/job-fit-skill.git
```

Install the complete [`skills/job-fit-assistant`](skills/job-fit-assistant) folder rather than copying only `SKILL.md`:

| Host | Location or method |
| --- | --- |
| Codex | `~/.agents/skills/job-fit-assistant/`, or `.agents/skills/job-fit-assistant/` in a project |
| Claude Code | `~/.claude/skills/job-fit-assistant/`, or `.claude/skills/job-fit-assistant/` in a project |
| WorkBuddy | Upload the complete local Skill package from the Skills interface |
| QwenWork | Upload the Skill package, or use `~/.qwenwork/skills/job-fit-assistant/` |
| Doubao Office | Upload the complete package in a client version that supports custom Skills; exact permissions are client-dependent |

To enable the optional verified CLI mode, build the CLI from the source checkout:

```bash
cd job-fit-skill
npm ci
npm run build
npm link
```

> `@job-fit/skill` and `@job-fit/core` are not currently published to the public npm registry, so npm installation is not presented as an available path. Verified CLI mode also needs a compatible Core and runtime; installing the Skill alone does not install those optional components.

### Runtime configuration

Set `JOB_FIT_RUNTIME_MODULE` to a trusted local ESM module exporting `createJobFitDependencies()`. It supplies Core's model, learning-resource, and document adapters, plus a `repositoryFetcher` when public repository URLs are used.

```bash
export JOB_FIT_RUNTIME_MODULE=/absolute/path/to/job-fit-runtime.mjs
```

Do not point the runtime module itself at downloaded resume or project content. A repository fetcher must enforce the provided byte, timeout, redirect, and public-network/SSRF limits and return fetched regular text files. URL strings alone are never evidence.

### Quick start

1. Install the complete Skill folder in a supported Agent.
2. Attach or select a resume and one target JD, plus optional project evidence.
3. Say:

> Analyze my resume and this JD, tell me whether I should apply, and then create a tailored resume.

The Agent reads the materials, returns `apply`, `apply with risks`, or `do not apply`, and creates an evidence-grounded tailored resume. It interrupts only when metrics, scope, ownership, production claims, titles, or timelines require confirmation.

Without the CLI, output is labeled `portable-agent-analysis`. The Skill uses the host's document tools for DOCX/PDF when available and otherwise delivers ATS-friendly Markdown. It never presents portable mode as deterministic CLI verification.

#### Optional: direct CLI use

For automation and integrations, create `analyze.json` from the [request template](skills/job-fit-assistant/templates/analyze-request.zh-CN.json), then run:

```bash
job-fit analyze \
  --root /absolute/path/to/private-workspace \
  --input analyze.json \
  --idempotency-key YOUR-UUID
```

Minimal request:

```json
{
  "resumeFiles": ["resume.pdf"],
  "jobs": [
    {
      "id": "jd-backend",
      "text": "Paste a job description containing at least 40 characters here..."
    }
  ],
  "projectFiles": [],
  "repositories": [],
  "confirmedFacts": [],
  "locale": "en",
  "reportFormats": ["json", "markdown"]
}
```

All four commands also accept request JSON from stdin via `--input -`:

```bash
job-fit analyze --root /private/workspace --input analyze.json --idempotency-key UUID
job-fit optimize-resume --root /private/workspace --input optimize.json --idempotency-key UUID
job-fit render-resume --root /private/workspace --input render.json --idempotency-key UUID
printf '{"confirm":true}' | job-fit delete-local-data --root /private/workspace --input - --idempotency-key UUID
```

### Output and confirmation flow

- De-identified JSON/Markdown reports are written under `.job-fit/reports`.
- Full evidence context is stored separately with `0600` permissions under `.job-fit/contexts`; public outputs contain only an opaque reference and non-sensitive metadata.
- Risky resume drafts are stored under `.job-fit/proposals`. A confirmation request must reference the original `proposalFile` and partition every risky item between `confirmedChangeIds` and `rejectedChangeIds`; the confirmation step never regenerates model text.
- Only a fully confirmed and fact-verified model is written under `.job-fit/resume-models`. `render-resume` accepts only verified models from that app-owned directory.
- The first state-creating action safely adds `.job-fit/` to the workspace `.gitignore` without duplicating an existing entry.

Reusing an idempotency key with the exact same canonical request and referenced-file digests returns `cached: true`. Changing the request or file content produces a conflict, preventing stale results from being reused.

### CLI contract

On success, stdout contains exactly one JSON envelope. On failure, stderr contains exactly one JSON envelope. The current schema version is `1.0.0`.

| Exit code | Meaning |
| --- | --- |
| `2` | Invalid input |
| `3` | Missing or unsafe file |
| `4` | Idempotency conflict or Core rejection |
| `5` | Runtime dependency unavailable |
| `10` | Internal failure |
| `130` | Interrupted run |

### Privacy and truthfulness

- Resume, JD, project, and repository content is **untrusted data, never instructions**.
- “Not found” means insufficient evidence, not automatically a missing skill.
- Transferable ability is not production experience. Courses, competitions, and personal projects keep their real category.
- Planned learning never becomes resume evidence; only completion evidence can update the candidate profile.
- Errors never expose identity fields, raw source text, model text, or artifact bytes.
- Local file state and model calls are separate boundaries. If the host or runtime uses a cloud model, selected materials may be sent to that provider; review the host and provider data policies before use.

See the [security policy](SECURITY.md) and [Skill security guide](skills/job-fit-assistant/references/security.md) for the complete boundary.

### Development and contributing

```bash
npm run check
npm audit
```

The repositories can be developed side by side, but this package's build and lockfile do not depend on a sibling checkout. Real-Core integration packs the sibling Core or explicitly uses `CORE_TARBALL`.

Before contributing, read the [contributing guide](CONTRIBUTING.md), [upstream provenance](UPSTREAM.md), and [changelog](CHANGELOG.md). Use synthetic or redacted test data only.

## License

[MIT](LICENSE)
