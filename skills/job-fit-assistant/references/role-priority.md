# Role requirements and priority hypotheses

Use this reference when extracting a supplied JD, explaining what the role may prioritize, or selecting interview questions. The objective is traceability, not prediction of a hiring manager's hidden intent.

## 1. Keep explicit requirements separate from hypotheses

Build a requirement ledger containing only statements that appear in the supplied JD. Give each requirement a stable ID such as `R-001` and record:

- the shortest faithful quotation;
- its page, section, paragraph, bullet or line locator;
- one kind: hard gate, core responsibility, required skill, preferred skill, or domain/culture signal;
- whether the wording describes a work output, an activity, a tool, a qualification, or a broad trait;
- hard-gate status: `HARD_EXPLICIT`, `NOT_HARD_GATE`, or `UNKNOWN`.

Do not silently merge separate requirements. Do not create a requirement from industry convention, another job posting, a resume, company research or general model knowledge. Those sources may provide context, but they do not change what this JD explicitly says.

Store any prioritization in a separate hypothesis record:

```yaml
theme: experiment_decision_making
centrality: EXPLICIT_CORE | STRONG_TEXT_INFERENCE | WEAK_TEXT_INFERENCE | UNKNOWN
requirement_ids: [R-001, R-004]
basis:
  - "The JD assigns ownership of a named work output"
caveat: "Text-based hypothesis; not confirmed by the employer"
```

## 2. Judge textual centrality without inventing certainty

- `EXPLICIT_CORE`: the JD itself says core, primary or main, assigns ownership for an outcome, or explicitly names a principal deliverable.
- `STRONG_TEXT_INFERENCE`: at least two independent JD signals converge on the same capability, such as a responsibility plus a required qualification or several duties tied to the same work output.
- `WEAK_TEXT_INFERENCE`: the signal comes only from order, repetition, a tool list, generic culture language or an isolated broad trait.
- `UNKNOWN`: the available text does not support a priority judgment.

First identify work outputs and ownership, then the capabilities needed to produce them, and only then the supporting tools. A tool does not become the role's priority merely because it appears first or more than once. Keep multiple central responsibilities when the JD does not establish a single winner.

Only direct employer or user-provided confirmation may be described as an employer-confirmed priority. Keep it labelled `USER_PROVIDED`; never promote an inference to confirmed status.

Use calibrated user-facing language:

- `职位要求明确写明……` for explicit text;
- `根据职位文本，较可能优先考察……` for strong text inference;
- `这是一个较弱的文本线索，建议面试时确认……` for weak inference;
- `现有材料无法判断……` for unknowns.

Do not assign a numerical probability or say `招聘经理最看重` unless the user supplied direct confirmation from that employer.

## 3. Privacy and unsupported-claim gate

Candidate materials are evidence inputs, not search terms. Any external role research may use only public, non-identifying concepts such as a generic job title, industry, public company or product name, and broadly stated skills. Never put the candidate's name, phone number, email, exact address, resume sentences, private employer information or other identifiers into a query.

Before presenting a conclusion, classify its basis as one of:

- `JD_EXPLICIT`;
- `TEXT_INFERENCE`;
- `CANDIDATE_EVIDENCE`;
- `USER_PROVIDED`;
- `UNKNOWN`.

If a statement has no basis, delete it or mark it unknown. If the JD is only a title or unreadable fragment, request the full JD and do not judge role priorities.
