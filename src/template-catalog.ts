export const TEMPLATE_IDS = [
  "ats-minimal",
  "professional-business",
  "technical-project",
  "ats-classic",
  "ats-compact",
  "ats-graduate",
] as const;

export type TemplateId = typeof TEMPLATE_IDS[number];
export type CoreTemplate = "CLASSIC" | "COMPACT" | "GRADUATE";

const CORE_TEMPLATE_BY_ID: Record<TemplateId, CoreTemplate> = {
  "ats-minimal": "CLASSIC",
  "professional-business": "COMPACT",
  "technical-project": "GRADUATE",
  "ats-classic": "CLASSIC",
  "ats-compact": "COMPACT",
  "ats-graduate": "GRADUATE",
};

export function toCoreTemplate(templateId: string): CoreTemplate | undefined {
  return CORE_TEMPLATE_BY_ID[templateId as TemplateId];
}
