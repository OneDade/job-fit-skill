export const TEMPLATE_IDS = [
  "professional-business",
  "technical-project",
  "one-page-compact",
  "ats-minimal",
  "ats-classic",
  "ats-compact",
  "ats-graduate",
] as const;

export type TemplateId = typeof TEMPLATE_IDS[number];
export type CoreTemplate = "CLASSIC" | "COMPACT" | "GRADUATE";

const CORE_TEMPLATE_BY_ID: Record<TemplateId, CoreTemplate> = {
  "professional-business": "COMPACT",
  "technical-project": "GRADUATE",
  "one-page-compact": "CLASSIC",
  "ats-minimal": "CLASSIC",
  "ats-classic": "CLASSIC",
  "ats-compact": "COMPACT",
  "ats-graduate": "GRADUATE",
};

export function toCoreTemplate(templateId: string): CoreTemplate | undefined {
  return CORE_TEMPLATE_BY_ID[templateId as TemplateId];
}
