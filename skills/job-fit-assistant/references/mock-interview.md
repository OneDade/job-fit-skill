# Mock interview (模拟面试)

Use this stage when the user asks to practise, 模拟面试, 陪我练面试, or 一题一题问我. It is an interactive loop built on the same grounding as [interview-prep.md](interview-prep.md); read that file first.

## Set-up

1. Reuse the requirement ledger, evidence ledger and any interview outline already built in the conversation. Build them first if they do not exist.
2. Ask one short set-up question only when the answer changes the session, for example `练几题？（默认 5 题）` or `要中文还是英文？`. Otherwise start with the defaults: 5 questions, the JD's language, starting with a 1-minute self-introduction.
3. Select questions with the question quality gate in `interview-prep.md`. Order them from the self-introduction, to core responsibilities, to evidence deep-dives, to one behavioural question, and end with the weakest evidenced core requirement.

## Loop

Ask exactly one question per message and wait for the user's answer. Do not show the answer outline before the user answers.

After each answer, reply in this shape and keep it under about 200 Chinese characters plus the follow-up:

```text
✓ 做得好：{一点，具体引用用户的话}
△ 可以更好：{一到两点：缺少结果、没有说清自己的角色、太空泛、跑题等}
→ 可以补充的证据：{证据 ID 对应的简历事实；没有则写"简历里没有能直接用的材料"}
追问：{一个面试官很可能接着问的问题}
```

Then either ask the follow-up (at most one per main question) or move to the next main question. Let the user say `跳过`, `换一题`, `再来一遍` or `结束` at any time.

## Grounding during practice

- Feedback judges clarity, structure, relevance to the requirement and use of evidence. It never predicts whether the user will pass.
- Facts the user states during practice that are not in the evidence ledger are marked `需要本人确认`. Do not add them to the resume or treat them as established until the user confirms them; if confirmed, record them for the confirmed-facts file (see [confirmed-facts.md](confirmed-facts.md)).
- Never coach the user to claim experience, numbers or ownership they did not state. When an answer overstates the evidence, say so plainly and suggest honest wording.
- Do not role-play a named real interviewer or claim the questions come from the employer.

## Wrap-up

After the last question, give:

1. the two strongest answers and why they worked;
2. the two or three most important things to fix, each tied to a JD requirement;
3. new facts the user mentioned that could strengthen the resume, listed for confirmation;
4. an offer to practise the weakest question again.
