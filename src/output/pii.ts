const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu;
const PHONE = /(?<!\d)(?:\+?86[\s-]?)?1[3-9]\d(?:[\s-]?\d){8}(?!\d)/gu;
const CHINESE_ID = /(?<!\d)\d{6}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[0-9Xx](?!\d)/gu;
const ADDRESS = /(?:中国)?(?:北京市|上海市|天津市|重庆市|[\p{Script=Han}]{2,8}(?:省|自治区))?[\p{Script=Han}]{2,10}(?:市|区|县)[\p{Script=Han}\d弄巷街道路号栋单元室-]{2,40}/gu;
const LATIN_FULL_NAME = /^\s*[A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3}\s*$/u;
const MAX_PUBLIC_TEXT = 10_000;
const LATIN_ACTION_NAME = /\b([A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,2})(?=\s+(?:delivered|completed|led|built|implemented|migrated|designed|developed|managed|owned|shipped|drove|created|improved|reduced|increased|launched)\b)/gu;
const PRODUCT_NAMES = new Set(["Amazon Web Services", "Apache Kafka", "Apache Spark", "Apple Music", "GitHub Actions", "GitLab CI", "Google Cloud", "Microsoft Azure", "OpenAI Codex", "React Native", "Spring Boot", "Visual Studio", "Visual Studio Code"]);
const CHINESE_ACTION_NAME = /([\p{Script=Han}]{2,4})(?=(?:完成|交付|负责|开发|实现|参与|主导|构建|设计|上线|推动)了?)/gu;
const CHINESE_NOUNS = ["项目", "团队", "系统", "平台", "服务", "产品", "公司", "部门", "模型", "应用", "工具", "网站", "程序", "数据库", "后端", "前端", "客户", "用户", "业务", "技术", "工程"];

export function sanitizePublicText(value: string, key = "", deniedNames: readonly string[] = []): string {
  let output = value.slice(0, MAX_PUBLIC_TEXT).replace(EMAIL, "[EMAIL]").replace(PHONE, "[PHONE]").replace(CHINESE_ID, "[ID]").replace(ADDRESS, "[ADDRESS]");
  output = output.replace(/\b(Candidate|Name)(\s*[:：]?\s*)([A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3})/gu, "$1$2[NAME]");
  output = output.replace(/(候选人|姓名)(\s*[:：]?\s*)([\p{Script=Han}]{2,4}?)(?=交付|完成|负责|开发|实现|参与|，|,|\s|$)/gu, "$1$2[NAME]");
  output = output.replace(LATIN_ACTION_NAME, (candidate) => PRODUCT_NAMES.has(candidate) ? candidate : "[NAME]");
  output = output.replace(CHINESE_ACTION_NAME, (candidate) => CHINESE_NOUNS.some((noun) => candidate.includes(noun)) ? candidate : "[NAME]");
  output = output.replace(/(?:身份证(?:号)?|住址|地址|姓名)\s*[:：]?\s*[^\n,，;；]{2,80}/gu, (match) => match.startsWith("姓名") ? "姓名：[NAME]" : match.startsWith("身份证") ? "身份证：[ID]" : "地址：[ADDRESS]");
  if (/name|姓名/iu.test(key) || LATIN_FULL_NAME.test(output)) output = "[NAME]";
  output = output.replace(/^\s*[A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3}(?=\s*[|｜,，·•]\s*(?:\[EMAIL\]|\[PHONE\]))/u, "[NAME]").replace(/^\s*[\p{Script=Han}]{2,4}(?=\s*[|｜,，·•]\s*(?:\[EMAIL\]|\[PHONE\]))/u, "[NAME]");
  for (const name of [...new Set(deniedNames.map((item) => item.trim()).filter((item) => item.length >= 2))].sort((left, right) => right.length - left.length)) output = output.replace(new RegExp(escapeRegex(name), "gu"), "[NAME]");
  return output;
}

export function sanitizePublicValue<T>(value: T, key = "", deniedNames: readonly string[] = []): T {
  if (typeof value === "string") return sanitizePublicText(value, key, deniedNames) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizePublicValue(item, key, deniedNames)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, sanitizePublicValue(child, childKey, deniedNames)])) as T;
  return value;
}

export function candidateNamesFromText(value: string): string[] {
  const names: string[] = []; const headings = new Set(["个人简历", "教育背景", "工作经历", "项目经历", "联系方式", "求职意向"]);
  for (const line of value.split(/\r?\n/u).slice(0, 12).map((item) => item.trim()).filter(Boolean)) {
    const labeled = /^(?:Candidate|Name|候选人|姓名)\s*[:：]?\s*([A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3}|[\p{Script=Han}]{2,4})/u.exec(line)?.[1];
    const contact = /^([A-Z][a-z]{1,29}(?:[ -][A-Z][a-z]{1,29}){1,3}|[\p{Script=Han}]{2,4})(?=\s*[|｜,，·•]\s*(?:[^\s]+@|(?:\+?86)?1[3-9]\d))/u.exec(line)?.[1];
    const standalone = LATIN_FULL_NAME.test(line) || (/^[\p{Script=Han}]{2,4}$/u.test(line) && !headings.has(line)) ? line : undefined;
    if (labeled || contact || standalone) names.push(labeled ?? contact ?? standalone!);
  }
  return [...new Set(names)];
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
