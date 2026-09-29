"""Rebuild the template sample DOCX files from sample-resume.json.

Uses the same renderer the Skill uses for real resumes, so the samples always
match what users receive. Requires python-docx.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "job-fit-assistant"
OUTPUT = SKILL / "assets" / "resume-templates"
sys.path.insert(0, str(SKILL / "scripts"))

from render_resume import TEMPLATES, render, verify  # noqa: E402

# The technical template leads with projects; the others lead with work history.
PROJECT_FIRST = {"technical-project"}


def ordered(data: dict, template: str) -> dict:
    sections = list(data["sections"])
    if template in PROJECT_FIRST:
        work = next(i for i, s in enumerate(sections) if s["title"] == "工作经历")
        project = next(i for i, s in enumerate(sections) if s["title"] == "个人项目")
        sections.insert(work, sections.pop(project))
    return {**data, "template": template, "sections": sections}


def main() -> None:
    base = json.loads((OUTPUT / "sample-resume.json").read_text(encoding="utf-8"))
    for template in TEMPLATES:
        data = ordered(base, template)
        path = OUTPUT / f"{template}.docx"
        doc = render(data)
        doc.core_properties.title = f"{data['name']} 简历样例（{template}）"
        doc.save(str(path))
        problems = verify(path, data)
        if problems:
            raise SystemExit(f"{path.name}: {problems}")
        print(path)


if __name__ == "__main__":
    main()
