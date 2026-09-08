import { XMLParser } from "fast-xml-parser";
import {
  normalizeArticleUrl,
  normalizeTitle,
  opinionReason,
  resolveSection,
  sha256,
  type PublisherConfig,
  type SectionId,
} from "./normalize.ts";

export type FeedConfig = {
  id: string;
  url: string;
  sectionHint: SectionId;
  sectionStrategy: "fixed" | "fallback";
  classificationTargets?: SectionId[];
};

export type RssCandidate = {
  stableId: string;
  stableIdVersion: "1";
  title: string;
  publisherId: string;
  publisherName: string;
  publisherHost: string;
  articleUrl: string;
  publishedAt: string;
  observedAt: string;
  timestampProvenance: "publisher";
  recencyAt: string;
  retrievedAt: string;
  providerId: "publisher-rss";
  providerEndpointId: string;
  sourceItemId: string | null;
  sourceSectionHint: SectionId;
  sectionHintProvenance: "publisher_feed";
  retrievalRunId: string;
  normalizedUrlHash: string;
  urlNormalizationVersion: "1";
  publisherRegistryVersion: "1";
  rightsProfileId: string;
  section: SectionId;
  sectionDecisionMethod: "feed_mapping" | "title_fallback";
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", trimValues: true, parseTagValue: false });

export function parseFeed(xml: string, publisher: PublisherConfig, feed: FeedConfig, retrievedAt: string, runId: string): {
  candidates: RssCandidate[];
  rejectionCounts: Record<string, number>;
  rawCount: number;
} {
  if (Buffer.byteLength(xml, "utf8") > 2 * 1024 * 1024) throw new Error("feed_too_large");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("xml_doctype_forbidden");
  let document: Record<string, unknown>;
  try { document = parser.parse(xml) as Record<string, unknown>; }
  catch { throw new Error("invalid_xml"); }
  const items = extractItems(document);
  if (!items) throw new Error("unsupported_feed_schema");
  const candidates: RssCandidate[] = [];
  const rejectionCounts: Record<string, number> = {};
  for (const item of items) {
    const rejected = (reason: string) => { rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1; };
    const title = normalizeTitle(item.title);
    if (!title) { rejected("invalid_title"); continue; }
    const link = rssLink(item.link);
    const normalizedUrl = normalizeArticleUrl(link, publisher);
    if (!normalizedUrl.ok) { rejected(normalizedUrl.reason); continue; }
    const publishedAt = parsePublisherTime(item.pubDate ?? item.published ?? item.updated);
    if (!publishedAt) { rejected("invalid_published_at"); continue; }
    const opinion = opinionReason(title, normalizedUrl.url, publisher.opinionPathSegments);
    if (opinion) { rejected(opinion); continue; }
    const section = resolveSection(title, feed.sectionHint, feed.sectionStrategy, feed.classificationTargets);
    const titleSection = feed.sectionStrategy === "fallback" ? section : null;
    candidates.push({
      stableId: sha256(`${publisher.id}:${normalizedUrl.hash}`), stableIdVersion: "1", title,
      publisherId: publisher.id, publisherName: publisher.name, publisherHost: normalizedUrl.host,
      articleUrl: normalizedUrl.url, publishedAt, observedAt: retrievedAt, timestampProvenance: "publisher",
      recencyAt: publishedAt, retrievedAt, providerId: "publisher-rss", providerEndpointId: feed.id,
      sourceItemId: scalar(item.guid ?? item.id), sourceSectionHint: feed.sectionHint,
      sectionHintProvenance: "publisher_feed", retrievalRunId: runId,
      normalizedUrlHash: normalizedUrl.hash, urlNormalizationVersion: "1", publisherRegistryVersion: "1",
      rightsProfileId: publisher.rightsProfileId, section,
      sectionDecisionMethod: titleSection && titleSection !== feed.sectionHint ? "title_fallback" : "feed_mapping",
    });
  }
  candidates.sort((a, b) => b.recencyAt.localeCompare(a.recencyAt, "en") || a.stableId.localeCompare(b.stableId, "en"));
  return { candidates, rejectionCounts: sortedCounts(rejectionCounts), rawCount: items.length };
}

function extractItems(document: Record<string, unknown>): Record<string, unknown>[] | null {
  const rss = object(document.rss);
  const channel = object(rss?.channel);
  if (channel?.item) return array(channel.item).filter(isObject);
  const feed = object(document.feed);
  if (feed?.entry) return array(feed.entry).filter(isObject);
  return null;
}

function rssLink(value: unknown): string | null {
  if (typeof value === "string") return value;
  for (const link of array(value)) {
    if (isObject(link) && (link["@_rel"] === undefined || link["@_rel"] === "alternate") && typeof link["@_href"] === "string") return link["@_href"];
  }
  return null;
}

function parsePublisherTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const explicitZone = /(?:Z|[+-]\d{2}:?\d{2}|GMT|UTC)$/i.test(value.trim());
  if (!explicitZone) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function scalar(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") return String(value).slice(0, 500);
  if (isObject(value) && typeof value["#text"] === "string") return value["#text"].slice(0, 500);
  return null;
}
function object(value: unknown): Record<string, unknown> | null { return isObject(value) ? value : null; }
function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]; }
function sortedCounts(value: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, "en")));
}
