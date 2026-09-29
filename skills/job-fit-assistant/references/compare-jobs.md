# Comparing several supplied jobs

Use this stage when the user supplies two to ten JDs with one resume and asks which to apply for first, which fits best, or how the roles differ. It works in portable mode; the CLI's aggregation in [analyze.md](analyze.md) is only used when the verified CLI is configured.

## Process

1. Give each JD a short label the user will recognize, such as `公司名-职位名`, or `JD-1` when the company is not stated. If two inputs look like the same posting, say so and compare it once.
2. Build one evidence ledger for the resume and reuse it. Build a separate requirement ledger per JD, following [role-priority.md](role-priority.md).
3. Match each JD independently and reach the same qualitative recommendation used for a single job: `建议投递`, `可以投但有风险`, or `暂不建议投递`.
4. Rank only within the same recommendation band. Within a band, prefer the role where more `EXPLICIT_CORE` requirements are `MATCHED` and fewer core requirements are `INSUFFICIENT_EVIDENCE`. When two roles cannot be separated on evidence, say they are tied instead of inventing a tiebreaker.
5. Name the requirements that recur across several JDs. A gap shared by most of the target roles is the most valuable thing to fix in the resume or to learn next; a gap that appears in one JD only is local.

Do not compute or display numeric match scores or percentages. Do not rank on salary, company reputation or growth prospects unless the user supplies that information or asks for cited company research; if they do, keep it in a separate column and label its source.

## Output

```text
结论：先投 {岗位A}、{岗位B}；{岗位C} 暂不建议（一句话原因）

| 优先级 | 岗位 | 结论 | 最强匹配 | 关键差距 |
| 1 | … | 建议投递 | … | … |

多个岗位都要求、你简历里没写清的：
- {要求}：出现在 {岗位列表}，建议 {补充证据或学习}

下一步：需要我先为 {第一优先级岗位} 生成定制简历吗？
```

Tailored resumes are still produced one JD at a time. Offer them in priority order instead of generating all of them unasked.
