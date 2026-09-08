import { createHash } from "node:crypto";

export const SECTION_IDS = ["politics", "economy", "stocks", "global_markets", "society", "world", "entertainment", "sports"] as const;
export type SectionId = typeof SECTION_IDS[number];

export type PublisherConfig = {
  id: string;
  name: string;
  allowedHosts: string[];
  rightsProfileId: string;
  opinionPathSegments?: string[];
};

const TRACKING_KEYS = new Set(["fbclid", "gclid", "ref", "source", "campaign"]);
const SENSITIVE_KEYS = /^(?:access[_-]?token|auth|authorization|api[_-]?key|key|password|secret|session|signature|token)$/i;
const OPINION_PREFIX = /^(?:\s*\[(?:사설|칼럼|기고|시론|논단|데스크칼럼|기자수첩|취재수첩|오피니언)\]|\s*(?:사설|칼럼|기고|시론|논단)\s*[:：])/;
const OPINION_SERIES = /^(?:\s*\[(?:광화문에서|횡설수설|만물상|중앙시평|매경춘추|한경에세이)\]|(?:\s*\[[^\]]*\]\s*)?(?:광화문에서|횡설수설|만물상|중앙시평|매경춘추|한경에세이)(?:\s|[\[\]:：]))/;

const TERMS: Record<SectionId, RegExp> = {
  politics: /대통령실|국정감사|탄핵|총선|대선|지방선거|국회|여당|야당|민주당|국민의힘|정당|공천|의원|장관|개각/,
  economy: /국내총생산|소비자물가|기준금리|수출입|무역수지|한국은행|기획재정부|공정위|부동산|고용|실업|관세|수출|수입/,
  stocks: /코스피|코스닥|공모주|기업공개|시가총액|국내증시|상장|증권사|순매수|순매도|종목|ETF|IPO/,
  global_markets: /뉴욕증시|월가|다우(?:존스)?|S&P\s*500|나스닥|FOMC|미국채|연방준비제도|연준|해외증시|유럽증시|아시아증시/,
  society: /대법원|헌법재판소|산불|지진|태풍|집중호우|경찰|검찰|법원|재판|구속|화재|재난|교육|의료|교통|학교/,
  world: /유엔|정상회담|휴전|전쟁|공습|외교부|외교|분쟁|제재|국제기구|대사관|우크라이나|러시아|중국|일본|미국 정부/,
  entertainment: /연예계|아이돌|드라마|영화제|가요계|배우|가수|앨범|공연|방송|예능|팬미팅|콘서트/,
  sports: /올림픽|월드컵|프로야구|프로축구|챔피언스리그|야구|축구|농구|배구|골프|대표팀|구단|리그|우승|득점/,
};

export function normalizeTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const decoded = value.replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
  const title = decoded.normalize("NFC").replace(/\s+/g, " ").trim();
  return title && title.length <= 300 ? title : null;
}

export function normalizeArticleUrl(value: unknown, publisher: PublisherConfig):
  | { ok: true; url: string; host: string; hash: string }
  | { ok: false; reason: string } {
  if (typeof value !== "string") return { ok: false, reason: "invalid_url" };
  let url: URL;
  try { url = new URL(value); } catch { return { ok: false, reason: "invalid_url" }; }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:") return { ok: false, reason: "non_https" };
  if (url.username || url.password) return { ok: false, reason: "userinfo" };
  if (url.hash) return { ok: false, reason: "fragment" };
  if (!publisher.allowedHosts.includes(host)) return { ok: false, reason: "disallowed_host" };
  for (const key of [...url.searchParams.keys()]) {
    if (SENSITIVE_KEYS.test(key)) return { ok: false, reason: "sensitive_query" };
    if (key.toLowerCase().startsWith("utm_") || TRACKING_KEYS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/$/, "");
  const normalized = url.toString();
  return { ok: true, url: normalized, host, hash: sha256(normalized) };
}

export function classifyTitle(title: string): SectionId | null {
  const matches = SECTION_IDS.filter((section) => TERMS[section].test(title));
  const foreignPolitics = /미국|일본|중국|러시아|우크라이나|유럽|영국|프랑스|독일|대만|북한/.test(title)
    && /총선|대선|선거|여당|야당|정부|의회|대통령|총리|외교|제재|전쟁/.test(title);
  if (foreignPolitics) return "world";
  if (matches.includes("global_markets")) return "global_markets";
  if (matches.includes("stocks")) return "stocks";
  return matches.length === 1 ? matches[0] : null;
}

export function resolveSection(title: string, hint: SectionId, strategy: "fixed" | "fallback", targets: SectionId[] = [hint]): SectionId {
  if (strategy === "fixed") return hint;
  const classified = classifyTitle(title);
  return classified && targets.includes(classified) ? classified : hint;
}

export function opinionReason(title: string, articleUrl: string, pathRules: string[] = []): string | null {
  const parts = new URL(articleUrl).pathname.toLowerCase().split("/").filter(Boolean);
  if (parts.some((part) => pathRules.map((rule) => rule.toLowerCase()).includes(part))) return "opinion_path";
  if (OPINION_PREFIX.test(title)) return "opinion_title_prefix";
  if (OPINION_SERIES.test(title)) return "opinion_series";
  return null;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
