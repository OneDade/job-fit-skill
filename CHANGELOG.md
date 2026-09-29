# Changelog

## 0.3.0 - 2026-09-30

- Rewrote the Skill description in Chinese-first trigger phrases so hosts pick it up for everyday requests such as 值不值得投、帮我改简历、面试会问什么.
- Made the workflow request-scoped: company research, resume and interview outlines only run when asked, with a one-line offer of the next step.
- Made portable mode the documented default and moved CLI orchestration details to `tailor.md`.
- Accepted JD screenshots and user-supplied job-posting links, and resumes that need image reading.
- Added a conclusion-first chat reply shape and single-message batch confirmation for risky changes.
- Stopped over-translating everyday terms (JD, AI, SQL) in chat, and kept JD keywords untranslated inside resumes for screening systems.
- Added Chinese-market resume conventions (one-page rule, 求职意向, section order, no invented personal fields).
- Added fictional sample materials under `examples/` for trying the Skill.
- Corrected `UPSTREAM.md`, which still listed interviews as excluded.
- Added job comparison for 2–10 supplied JDs with a ranked table and shared gaps, in portable mode.
- Added three evidence-grounded first-message greetings for recruiters (Boss 直聘 and similar apps).
- Added an interactive mock interview with per-answer feedback and follow-up questions.
- Added a confirmed-facts file users can bring to the next session instead of re-confirming details.
- Restored a plain black-and-white template (`ats-minimal`) for foreign employers and applicant-tracking systems.
- Added CI and a tag-triggered release workflow that builds `job-fit-assistant.zip`.
- Fixed the install instructions, which omitted the new `assets` folder.
- Added `scripts/render_resume.py`, which renders confirmed JSON content into any of the four templates, re-checks the saved DOCX for missing or reordered content, and exports PDF with a page count when LibreOffice is available. The template samples are now built by the same renderer.
- Replaced the initial font-only choices with three visually distinct templates: Professional Business, Technical Project and One-page Compact, with A4 DOCX samples as the visual reference. Legacy template IDs remain accepted.

## 0.2.0 - 2026-09-28

- Added public-source company research guidance with citations, retrieval dates and privacy-safe search constraints.
- Added ATS Minimal, Professional Business and Technical Project template choices while preserving legacy CLI template IDs.
- Added multi-format document QA requirements and evidence-grounded interview-answer outlines.
- Made apply recommendations optional instead of a gate for resume and interview workflows.

## 0.1.1 - 2026-09-23

- Added a natural-language entry that accepts an attached resume and JD without exposing JSON, paths or idempotency details.
- Added a portable host workflow for Codex, Claude Code, WorkBuddy, QwenWork and compatible office Agents when the optional CLI runtime is unavailable.
- Added Codex UI metadata, host installation guidance and explicit portable-versus-verified output labels.
- Clarified cloud-model privacy boundaries and removed the unpublished npm packages from the documented installation path.
- Added plain-Chinese display labels and jargon explanations so Chinese users do not see raw match-state codes or unexplained English terms.
- Replaced the long landing page with copy-and-paste Agent installation and usage prompts, moved English to `README.en.md`, and moved CLI details to `docs/ADVANCED.md`.

## 0.1.0 - 2026-09-07

- Initial Agent Skill and deterministic JSON CLI.
- Added analyze, optimize-resume, render-resume and delete-local-data actions.
- Added secure local storage, request-bound idempotency, evidence-first workflow guidance and upstream attribution.
