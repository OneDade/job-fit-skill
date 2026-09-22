# Job Fit 求职助手

> 把简历和职位要求交给 AI，判断值不值得投，并生成一份针对该岗位的定制简历。

[中文](README.md) · [English](README.en.md)

适用于支持自定义 Skill 和附件读取的 Agent，例如 Codex、Claude Code、WorkBuddy、千问办公和豆包办公。具体安装权限取决于你使用的客户端版本。

## 第一步：复制给 Agent 安装

把下面整段话发送给你的 Agent：

```text
请帮我安装这个 Skill：

https://github.com/OneDade/job-fit-skill/tree/main/skills/job-fit-assistant

安装要求：
1. 只安装 skills/job-fit-assistant 整个文件夹，不运行仓库代码，也不安装 npm 依赖。
2. 安装到当前 Agent 支持的用户级 Skills 目录。
3. 保留 SKILL.md、agents、references 和 templates。
4. 安装完成后，确认能识别名为 job-fit-assistant 的 Skill，并告诉我安装位置。
5. 如果当前客户端不支持自定义 Skill，请直接说明，不要假装安装成功。
```

### 使用 Codex？复制这个更短

```text
使用 $skill-installer 安装这个 Skill：
https://github.com/OneDade/job-fit-skill/tree/main/skills/job-fit-assistant
```

Codex 官方支持让 `$skill-installer` 从其他 GitHub 仓库下载 Skill。安装后如果没有立即出现，请重启 Codex。参见 [OpenAI 官方 Skills 文档](https://developers.openai.com/codex/skills/)。

### Agent 无法访问 GitHub？

从 [Releases](https://github.com/OneDade/job-fit-skill/releases) 下载 `job-fit-assistant.zip`，然后在客户端的 Skill/技能页面上传。不要只上传 `SKILL.md`。

## 第二步：上传材料并使用

上传或选中你的简历和一个职位要求，然后发送：

```text
分析我的简历和这个职位要求，告诉我值不值得投，然后帮我生成定制简历。
```

不需要填写 JSON，不需要配置命令行，也不需要自己整理关键词。

## 你会得到什么

- `建议投递`、`可以投但有风险` 或 `暂不建议投递`，以及关键原因。
- 哪些要求已经符合、哪些相关经验能迁移、哪些内容简历里没写清。
- 一份针对目标岗位重新排序和改写的定制简历。
- 如果材料里没有相关证据，Skill 不会编造工作经历、数字或成果。

当改写涉及业绩数字、职责范围、项目所有权、职位或时间时，Agent 会先向你确认。宿主支持文档工具时可生成 DOCX/PDF，否则会交付适合招聘系统读取的 Markdown 简历。

## 常见问题

### 安装完成后怎么确认？

让 Agent 列出已安装的 Skills，确认其中包含 `job-fit-assistant`。Codex 也可以输入 `/skills` 或用 `$job-fit-assistant` 显式调用。

### 为什么没有生成 Word 或 PDF？

Skill 会使用当前 Agent 已有的文档能力。客户端不支持创建文档时，会输出 Markdown，不会假装文件已经生成。

### 它会自动找工作或投递吗？

不会。它只分析你提供的职位要求，不会登录招聘网站、自动投递或联系招聘方。

### 简历会上传到哪里？

这取决于你使用的 Agent 和模型服务。使用前请检查对应客户端的数据与隐私政策。Skill 本身不会把你的简历提交到本仓库。

## 开发者与高级功能

普通用户不需要配置 CLI。需要本地 CLI、Runtime、JSON 接口、严格验证或二次开发时，请阅读：

- [高级使用说明](docs/ADVANCED.md)
- [架构说明](docs/ARCHITECTURE.md)
- [安全策略](SECURITY.md)
- [贡献指南](CONTRIBUTING.md)

## License

[MIT](LICENSE)
