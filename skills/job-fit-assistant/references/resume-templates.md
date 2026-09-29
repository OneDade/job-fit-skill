# Resume template selection and rendering

Content and layout are separate. Tailor and fact-check the resume once, then render the same confirmed content through the selected template. The user may choose directly or ask the Agent to recommend one.

## Template catalog

| User-facing template | CLI template ID | Recommend for | Layout rules |
| --- | --- | --- | --- |
| 专业商务版 | `professional-business` | Default; product, operations, sales and management roles | Full-height navy spine, split identity header, pale-blue summary block and outcome-first experience |
| 技术项目版 | `technical-project` | Engineering, data, AI and technical-product roles | Teal section titles, pale-teal contact strip and project-first evidence order |
| 一页紧凑版 | `one-page-compact` | Experienced candidates with dense evidence who need a one-page resume | Full-bleed wine header, compact one-column body and short aligned dates |

Legacy CLI IDs `ats-classic`, `ats-compact`, `ats-graduate`, and `ats-minimal` remain accepted for compatibility. `ats-minimal` and `ats-classic` map to the one-page renderer; `ats-compact` maps to professional business; `ats-graduate` maps to technical project.

## Recommendation rule

- Default to `professional-business` for a general Chinese application.
- Recommend `professional-business` when stakeholder scope, commercial outcomes and leadership are central.
- Recommend `technical-project` when projects, systems, tools and technical decisions carry most of the evidence.
- Recommend `one-page-compact` when the confirmed content is dense but can remain readable on one A4 page.
- Explain the recommendation in one sentence and let the user override it. Do not ask again when a template was already selected.

## Rendering standard

- Prefer A4 for Chinese applications unless the user or target market requests Letter.
- Use common CJK/Latin font fallbacks; do not require a proprietary font to preserve layout.
- Keep body text readable, headings consistent and dates aligned without tables that damage reading order.
- Use selectable text. Never rasterize the resume into an image-only PDF.
- Preserve content order across DOCX, PDF and Markdown.
- Avoid orphan headings, split bullets, clipped text, blank trailing pages and contact details repeated in headers or footers.
- Reopen or extract each generated artifact. Check name/contact fields, headings, dates, bullet order, page count and PDF text selection before delivery.

## Deterministic style specifications

All three templates are one-column, ATS-safe and use selectable text. The sample DOCX files in `../assets/resume-templates/` are the visual source of truth.

### Professional business

- A4 with an approximately 17 mm left margin, 15.5 mm right margin and 10.5 mm top margin.
- Use a full-height navy `#1C4069` spine at the page edge. Keep the header white rather than placing the identity inside a solid banner.
- Place the name and target role on the left and the compact contact line on the right. Add a romanized name only when the user's original resume already contains one.
- Put the confirmed summary in a pale-blue `#EAF1F7` block. Use three aligned skill rows and restrained navy section markers.
- Order: summary, skills, work experience, selected project, education. Use compact dates such as `2023.03—至今`.

### Technical project

- A4 with 16 mm side margins and an approximately 10.5 mm top margin.
- Use dark `#15333A`, teal `#087F8C` and pale teal `#E6F4F2`.
- Place the name on the left and the target role (the JD's exact title) on the right. Put contact details in a pale-teal strip beneath the identity row.
- Use unfilled teal section titles. Do not use solid heading bars.
- Order: summary, skills, selected project, work experience, education. Put tools, scale, decisions and measured results early in each bullet.

### One-page compact

- A4 with 14 mm body margins and no top inset before the header.
- Use a full-bleed, approximately 4 cm wine `#742B32` header. Place the name and target role on the left and two compact contact lines on the right.
- Use wine section rules, three aligned skill rows and short dates. Keep the one-column reading order and selectable text.
- Order: summary, skills, work experience, selected project, education. If content exceeds one page, shorten repetition instead of shrinking the font below the readable floor.

Every visible string in a sample is sample content, not layout. Do not copy the sample's name, romanized name, target role, contact details, employers, dates or numbers into a user's resume. Do not add decorative codes such as page numbers like `02`, `01 / SECTION` or `03 / SYSTEM`, and leave the footer empty; the page must contain only the user's confirmed information.

Fonts: use `Microsoft YaHei` (微软雅黑) for Chinese text and `Arial` for Latin text. Both ship with Windows, Microsoft Office for Mac and WPS, which covers the machines Chinese recruiters typically use. Do not use `Arial Unicode MS` or other fonts that are missing on Windows; a missing font silently changes line breaks and page count.

The renderer must adapt vertical density to the user's confirmed evidence. It may tighten or relax spacing, but it must never invent achievements, employers, dates or projects merely to fill the page.

“Ready to submit” means the user has confirmed the facts and does not need to manually repair typography, spacing, pagination or reading order. It does not remove the user's responsibility to review identity and factual details.

## Chinese-market conventions

Apply these when the target JD is Chinese or the user is applying in mainland China, unless the user asks otherwise:

- Length: one page for students, new graduates (应届生) and candidates with under about three years of experience; two pages at most otherwise. Cut weak or irrelevant items before shrinking fonts or margins.
- Header: name, phone, email and city. Add `求职意向：{JD 职位名称}` directly under the header, using the JD's exact title.
- Section order for students and new graduates: 教育背景 → 实习经历 → 项目经历 → 校园经历/获奖 → 技能证书. For experienced candidates: 工作经历 → 项目经历 → 教育背景 → 技能证书.
- Keep a photo, date of birth, gender, hometown, marital status or political affiliation only when the user's original resume already has it or the user asks; never add these fields, and never infer them.
- Education lines keep school, degree, major and dates exactly as supplied. Include GPA/rank or school tier labels (985/211/双一流) only when the source resume states them.
- Bullets start with a verb and state what the candidate did and the result the evidence supports, for example `负责…，通过…，实现…`. Never add a number that is not in the evidence.
- File name suggestion: `姓名-求职意向-学校或公司.pdf`; Chinese HR systems commonly display the file name.

## Design provenance

The templates are original specifications informed by public design research, not copied layouts. Useful architectural references include MIT-licensed Reactive Resume and RenderCV; Awesome-CV is a visual reference under LPPL. Do not copy source code or protected design assets unless their license requirements are reviewed and preserved.
