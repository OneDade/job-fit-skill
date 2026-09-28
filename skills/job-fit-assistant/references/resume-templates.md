# Resume template selection and rendering

Content and layout are separate. Tailor and fact-check the resume once, then render the same confirmed content through the selected template. The user may choose directly or ask the Agent to recommend one.

## Template catalog

| User-facing template | CLI template ID | Recommend for | Layout rules |
| --- | --- | --- | --- |
| ATS 极简版 | `ats-minimal` | Default; most roles and applicant-tracking systems | One column, black/gray, no icons, sidebars, tables, text boxes, rating bars or essential header/footer content |
| 专业商务版 | `professional-business` | Product, operations, sales and management roles | One column, restrained blue/charcoal accent, compact header, clear outcome hierarchy, no decorative data graphics |
| 技术项目版 | `technical-project` | Engineering, data and technical roles | One column, projects and technical skills receive stronger hierarchy; no skill meters, logo grids or two-column reading order |

Legacy CLI IDs `ats-classic`, `ats-compact`, and `ats-graduate` remain accepted for compatibility. They map respectively to the three templates above.

## Recommendation rule

- Default to `ats-minimal` when the role or parsing environment is uncertain.
- Recommend `professional-business` when stakeholder scope, commercial outcomes and leadership are central.
- Recommend `technical-project` when projects, systems, tools and technical decisions carry most of the evidence.
- Explain the recommendation in one sentence and let the user override it. Do not ask again when a template was already selected.

## Rendering standard

- Prefer A4 for Chinese applications unless the user or target market requests Letter.
- Use common CJK/Latin font fallbacks; do not require a proprietary font to preserve layout.
- Keep body text readable, headings consistent and dates aligned without tables that damage reading order.
- Use selectable text. Never rasterize the resume into an image-only PDF.
- Preserve content order across DOCX, PDF and Markdown.
- Avoid orphan headings, split bullets, clipped text, blank trailing pages and contact details repeated in headers or footers.
- Reopen or extract each generated artifact. Check name/contact fields, headings, dates, bullet order, page count and PDF text selection before delivery.

“Ready to submit” means the user has confirmed the facts and does not need to manually repair typography, spacing, pagination or reading order. It does not remove the user's responsibility to review identity and factual details.

## Design provenance

The templates are original specifications informed by public design research, not copied layouts. Useful architectural references include MIT-licensed Reactive Resume and RenderCV; Awesome-CV is a visual reference under LPPL. Do not copy source code or protected design assets unless their license requirements are reviewed and preserved.
