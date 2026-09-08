import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { collectRssFeeds } from "../packages/pipeline/src/news/collect-rss.ts";
import { classifyTitle, resolveSection, type PublisherConfig } from "../packages/pipeline/src/news/normalize.ts";
import { parseFeed, type FeedConfig } from "../packages/pipeline/src/news/rss.ts";

const publisher: PublisherConfig = { id: "sbs", name: "SBS", allowedHosts: ["news.sbs.co.kr"], rightsProfileId: "sbs-rss-personal-noncommercial-v1" };
const feed: FeedConfig = { id: "sbs-politics", url: "https://example.invalid/rss", sectionHint: "politics", sectionStrategy: "fixed" };

test("RSS projects only approved metadata and excludes opinion", async () => {
  const xml = await readFile("tests/fixtures/rss/sbs-section.xml", "utf8");
  const result = parseFeed(xml, publisher, feed, "2026-09-07T00:07:00.000Z", "run-1");
  assert.equal(result.rawCount, 2);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.rejectionCounts.opinion_title_prefix, 1);
  assert.equal(result.candidates[0].articleUrl, "https://news.sbs.co.kr/news/endPage.do?news_id=N1000001");
  assert.equal(result.candidates[0].publishedAt, "2026-09-07T00:00:00.000Z");
  assert.equal(result.candidates[0].section, "politics");
  assert.equal("description" in result.candidates[0], false);
});

test("mixed feeds use title classification before their fallback", () => {
  assert.equal(resolveSection("코스피 공모주 상승", "economy", "fallback", ["economy", "stocks", "global_markets"]), "stocks");
  assert.equal(resolveSection("뉴욕증시 나스닥 상승", "world", "fallback", ["world", "global_markets"]), "global_markets");
  assert.equal(resolveSection("새로운 산업 소식", "economy", "fallback"), "economy");
  assert.equal(resolveSection("국회 본회의", "economy", "fallback", ["economy", "stocks", "global_markets"]), "economy");
  assert.equal(classifyTitle("일본 총선 여당 승리"), "world");
});

test("rejects DTD, oversized feeds, invalid timezone, and unexpected hosts", () => {
  assert.throws(() => parseFeed("<!DOCTYPE rss><rss/>", publisher, feed, "2026-09-07T00:07:00Z", "run"), /xml_doctype_forbidden/);
  assert.throws(() => parseFeed("x".repeat(2 * 1024 * 1024 + 1), publisher, feed, "2026-09-07T00:07:00Z", "run"), /feed_too_large/);
  const invalid = `<rss><channel><item><title>국회 소식</title><link>https://evil.example/a</link><pubDate>2026-09-07 09:00:00</pubDate></item></channel></rss>`;
  const result = parseFeed(invalid, publisher, feed, "2026-09-07T00:07:00Z", "run");
  assert.equal(result.rejectionCounts.disallowed_host, 1);
});

test("collector isolates failures and retries only transient responses", async () => {
  let calls = 0;
  const valid = await readFile("tests/fixtures/rss/sbs-section.xml", "utf8");
  const result = await collectRssFeeds({
    retrievedAt: "2026-09-07T00:07:00.000Z", runId: "run-1", sleep: async () => {},
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response("busy", { status: 503 });
      return new Response(valid, { status: 200, headers: { "content-type": "application/rss+xml" } });
    },
  });
  assert.equal(result.health.length, 6);
  assert.equal(result.health.some((item) => item.attempts === 2), true);
  assert.equal(result.candidates.length, 1);
});
