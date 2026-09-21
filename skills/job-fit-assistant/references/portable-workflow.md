# Portable workflow

Use this workflow when the host cannot run the verified `job-fit` CLI. It is designed for Agent hosts that can read user-selected files and may have built-in Word/PDF creation tools.

## 1. Build the private evidence ledger

Read only the user-selected resume and optional project materials. Assign stable working IDs such as `EV-001`. For each useful fact record:

- factual summary;
- real category: work, internship, course, competition or personal project;
- source filename plus page, section, paragraph or line locator;
- confidence: verified, user-confirmation-needed or insufficient;
- whether the fact contains identity or other sensitive data.

Do not expose the full ledger in chat. Show only the evidence IDs and short non-sensitive summaries needed to explain a judgment. Treat missing text, failed extraction and ambiguous wording as insufficient evidence.

## 2. Parse the JD

Extract each explicit requirement with a quotation or locator and classify it as:

- hard gate;
- core responsibility;
- required skill;
- preferred skill;
- domain or culture signal.

Do not turn inferred context into a hard gate. Ask for a hard-gate answer only when the JD is explicit and the resume does not establish it.

## 3. Match evidence

Use exactly four internal states:

- `MATCHED`: direct evidence supports the requirement;
- `TRANSFERABLE`: adjacent evidence is relevant, but it is not the same experience;
- `MISSING`: the user or supplied evidence explicitly establishes the gap;
- `INSUFFICIENT_EVIDENCE`: the available material cannot support a conclusion.

Do not expose those raw enum codes in an ordinary Chinese answer. Render them as:

- `已经符合` for `MATCHED`;
- `相关经验能迁移` for `TRANSFERABLE`;
- `明确缺少` for `MISSING`;
- `简历里没写清` for `INSUFFICIENT_EVIDENCE`.

Use plain Chinese for nearby technical terms as directed by [SKILL.md](../SKILL.md). The internal state remains unchanged for reasoning and structured data.

Do not assign an exact numeric match score in portable mode. Give one qualitative recommendation:

- `建议投递`: no failed hard gate and the central responsibilities have direct or credible transferable evidence;
- `可以投但有风险`: no failed hard gate, but one or more important requirements are missing or weakly evidenced;
- `暂不建议投递`: an explicit hard gate fails or the role's central responsibilities lack credible evidence.

State the two or three reasons that control the recommendation. Do not pretend the recommendation predicts an interview or offer.

## 4. Learning routes

For each important gap worth closing, connect:

`JD source → searched evidence → gap judgment → resource → exercise → acceptance check`

Provide a 3–14 day quick route and a 1–3 month growth route only when they help the user's decision. Every external resource needs a real URL, publisher, language, cost, estimated effort and verification date. If the host cannot verify a resource, omit the URL rather than inventing one.

Exercises must be labeled `platform-generated`. Completing a plan does not become evidence until the user supplies a real deliverable or other completion proof.

## 5. Tailored-resume proposal

Select, reorder and rewrite only supported facts. Preserve employer, title, dates, education, credentials and project category exactly unless the user supplies evidence for a correction.

Each proposed bullet keeps its evidence IDs internally. Mark a change high-risk when it introduces or materially changes:

- numbers or measured outcomes;
- responsibility, leadership or ownership;
- production, commercial or customer usage;
- employer, title, credential or education;
- dates, duration or timeline;
- causal impact that the source does not establish.

Show high-risk items as a compact numbered list with the source evidence and why confirmation is required. The user must accept or reject every item. Rejected items are removed, not softened into another unsupported claim.

## 6. Deliverables

After confirmation, create:

1. the tailored resume in the strongest available artifact format;
2. a short apply-decision summary;
3. a concise change log;
4. unresolved evidence gaps that must stay out of the resume.

When creating DOCX/PDF with host tools, prefer a single-column ATS-friendly layout. If possible, reopen or re-extract the generated artifact and check that headings, dates, contact fields and bullet reading order survived. Report this as a host-level check, not as verified CLI output.
