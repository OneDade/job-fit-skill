const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu;
const PHONE = /(?<!\d)(?:\+?86[\s-]?)?1[3-9]\d(?:[\s-]?\d){8}(?!\d)/gu;
const CHINESE_ID = /(?<!\d)\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[0-9Xx](?!\d)/gu;
const ADDRESS = /(?:中国)?(?:北京市|上海市|天津市|重庆市|[\p{Script=Han}]{2,8}(?:省|自治区))?[\p{Script=Han}]{2,10}(?:市|区|县)[\p{Script=Han}\d弄巷街道路号栋单元室-]{2,40}/gu;
const LATIN_FULL_NAME = /^\s*[A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3}\s*$/u;
const MAX_PUBLIC_TEXT = 10_000;
const LATIN_ACTION_NAME = /\b([A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,2})(?=\s+(?:delivered|completed|led|built|implemented|migrated|designed|developed|managed|owned|shipped|drove|created|improved|reduced|increased|launched)\b)/gu;
const PRODUCT_NAMES = new Set(["Amazon Web Services", "Apache Kafka", "Apache Spark", "Apple Music", "GitHub Actions", "GitLab CI", "Google Cloud", "Microsoft Azure", "OpenAI Codex", "React Native", "Spring Boot", "Visual Studio", "Visual Studio Code"]);
const CHINESE_ACTION_NAME = /([\p{Script=Han}]{2,4})(?=(?:完成|交付|负责|开发|实现|参与|主导|构建|设计|上线|推动)了?)/gu;
// Containers whose every string comes from the JD or a catalog (for example requirements[].text).
const NON_CANDIDATE_CONTAINERS = new Set(["requirements", "resources", "tasks"]);
// Fields whose text comes from the JD or a skill/learning catalog, never from the candidate.
// Only deterministic redaction applies to them; name-guessing heuristics would mangle
// ordinary phrases such as "Looker Studio" or "能够独立负责".
const NON_CANDIDATE_KEYS = new Set(["jdQuote", "label", "skillId", "targetSkillId", "title", "publisher", "deliverables", "acceptanceCriteria", "suggestedStack", "matchedSkills", "transferableSkills", "skillGaps", "evidenceGaps", "jobIds"]);
const RESUME_HEADINGS = new Set(["个人简历", "简历", "个人信息", "基本信息", "教育背景", "教育经历", "工作经历", "实习经历", "项目经历", "项目经验", "校园经历", "联系方式", "求职意向", "专业技能", "技能", "技能证书", "获奖情况", "荣誉奖项", "自我评价", "个人总结", "个人概况"]);
const CHINESE_NOUNS = ["项目", "团队", "系统", "平台", "服务", "产品", "公司", "部门", "模型", "应用", "工具", "网站", "程序", "数据库", "后端", "前端", "客户", "用户", "业务", "技术", "工程"];

export function sanitizePublicText(value: string, key = "", deniedNames: readonly string[] = []): string {
  let output = value.slice(0, MAX_PUBLIC_TEXT).replace(EMAIL, "[EMAIL]").replace(PHONE, "[PHONE]").replace(CHINESE_ID, "[ID]").replace(ADDRESS, "[ADDRESS]");
  if (NON_CANDIDATE_KEYS.has(key)) return redactDeniedNames(output, deniedNames);
  output = output.replace(/\b(Candidate|Name)(\s*[:：]?\s*)([A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3})/gu, "$1$2[NAME]");
  output = output.replace(/(候选人|姓名)(\s*[:：]?\s*)([\p{Script=Han}]{2,4}?)(?=交付|完成|负责|开发|实现|参与|，|,|\s|$)/gu, "$1$2[NAME]");
  output = output.replace(LATIN_ACTION_NAME, (candidate) => PRODUCT_NAMES.has(candidate) ? candidate : "[NAME]");
  output = output.replace(CHINESE_ACTION_NAME, (candidate) => CHINESE_NOUNS.some((noun) => candidate.includes(noun)) ? candidate : "[NAME]");
  output = output.replace(/(?:身份证(?:号)?|住址|地址|姓名)\s*[:：]?\s*[^\n,，;；]{2,80}/gu, (match) => match.startsWith("姓名") ? "姓名：[NAME]" : match.startsWith("身份证") ? "身份证：[ID]" : "地址：[ADDRESS]");
  if (/name|姓名/iu.test(key) || LATIN_FULL_NAME.test(output)) output = "[NAME]";
  output = output.replace(/^\s*[A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3}(?=\s*[|｜,，·•]\s*(?:\[EMAIL\]|\[PHONE\]))/u, "[NAME]").replace(/^\s*[\p{Script=Han}]{2,4}(?=\s*[|｜,，·•]\s*(?:\[EMAIL\]|\[PHONE\]))/u, "[NAME]");
  return redactDeniedNames(output, deniedNames);
}

function redactDeniedNames(value: string, deniedNames: readonly string[]): string {
  let output = value;
  for (const name of [...new Set(deniedNames.map((item) => item.trim()).filter((item) => item.length >= 2))].sort((left, right) => right.length - left.length)) output = output.replace(new RegExp(escapeRegex(name), "gu"), "[NAME]");
  return output;
}

export function sanitizePublicValue<T>(value: T, key = "", deniedNames: readonly string[] = []): T {
  return sanitizeNode(value, key, deniedNames, false);
}

function sanitizeNode<T>(value: T, key: string, deniedNames: readonly string[], fromJdOrCatalog: boolean): T {
  if (typeof value === "string") return (fromJdOrCatalog ? redactDeniedNames(sanitizePublicText(value, "jdQuote"), deniedNames) : sanitizePublicText(value, key, deniedNames)) as T;
  const inherited = fromJdOrCatalog || NON_CANDIDATE_CONTAINERS.has(key);
  if (Array.isArray(value)) return value.map((item) => sanitizeNode(item, key, deniedNames, inherited)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitizeNode(child, childKey, deniedNames, inherited)])) as T;
  return value;
}

export function candidateNamesFromText(value: string): string[] {
  const names: string[] = [];
  const lines = value.split(/\r?\n/u).slice(0, 12).map((item) => item.trim().replace(/^#+\s*/u, "")).filter(Boolean);
  const firstHeading = lines.findIndex((line) => RESUME_HEADINGS.has(line));
  const headerEnd = Math.min(3, firstHeading < 0 ? lines.length : firstHeading);
  for (const [index, line] of lines.entries()) {
    const labeled = /^(?:Candidate|Name|候选人|姓名)\s*[:：]?\s*([A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3}|[\p{Script=Han}]{2,4})/u.exec(line)?.[1];
    const contact = /^([A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3}|[\p{Script=Han}]{2,4})(?=\s*[|｜,，·•]\s*(?:[^\s]+@|(?:\+?86)?1[3-9]\d))/u.exec(line)?.[1];
    // A bare short line is only a name in the header block (first three lines, before any heading);
    // later ones are usually section titles such as 自我评价.
    const standalone = index < headerEnd && (LATIN_FULL_NAME.test(line) || /^[\p{Script=Han}]{2,4}$/u.test(line)) ? line : undefined;
    if (labeled || contact || standalone) names.push(labeled ?? contact ?? standalone!);
  }
  return [...new Set(names)];
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
