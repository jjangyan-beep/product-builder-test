import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseFeed, type FeedConfig, type RssCandidate } from "./rss.ts";
import type { PublisherConfig } from "./normalize.ts";

type PublisherWithFeeds = PublisherConfig & { feeds: FeedConfig[] };
export type FeedHealth = {
  providerId: "publisher-rss";
  endpointId: string;
  attempts: number;
  httpStatus: number | null;
  rawCount: number;
  acceptedCount: number;
  rejectionCounts: Record<string, number>;
  errorCode: string | null;
};

export async function collectRssFeeds(options: {
  retrievedAt: string;
  runId: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}): Promise<{ candidates: RssCandidate[]; health: FeedHealth[] }> {
  const registry = JSON.parse(await readFile(resolve("packages/pipeline/config/feeds.v1.json"), "utf8")) as { publishers: PublisherWithFeeds[] };
  validateRegistry(registry.publishers);
  const jobs = registry.publishers.flatMap((publisher) => publisher.feeds.map((feed) => ({ publisher, feed })));
  const results = await mapLimit(jobs, 3, (job) => fetchFeed(job.publisher, job.feed, options));
  const seen = new Set<string>();
  const candidates = results.flatMap((result) => result.candidates)
    .sort((a, b) => b.recencyAt.localeCompare(a.recencyAt, "en") || a.stableId.localeCompare(b.stableId, "en"))
    .filter((candidate) => !seen.has(candidate.normalizedUrlHash) && Boolean(seen.add(candidate.normalizedUrlHash)));
  return { candidates, health: results.map((result) => result.health).sort((a, b) => a.endpointId.localeCompare(b.endpointId, "en")) };
}

function validateRegistry(publishers: PublisherWithFeeds[]): void {
  const publisherIds = new Set<string>();
  const endpointIds = new Set<string>();
  for (const publisher of publishers) {
    if (publisherIds.has(publisher.id)) throw new Error("duplicate_publisher_id");
    publisherIds.add(publisher.id);
    if (!publisher.allowedHosts.length || publisher.allowedHosts.some((host) => host !== host.toLowerCase())) throw new Error("invalid_allowed_hosts");
    for (const feed of publisher.feeds) {
      if (endpointIds.has(feed.id)) throw new Error("duplicate_endpoint_id");
      endpointIds.add(feed.id);
      const url = new URL(feed.url);
      if (url.protocol !== "https:" || url.username || url.password || url.hash) throw new Error("unsafe_feed_url");
    }
  }
}

async function fetchFeed(
  publisher: PublisherWithFeeds,
  feed: FeedConfig,
  options: { retrievedAt: string; runId: string; fetchImpl?: typeof fetch; sleep?: (ms: number) => Promise<void> },
): Promise<{ candidates: RssCandidate[]; health: FeedHealth }> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)));
  let httpStatus: number | null = null;
  let errorCode = "network_error";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetchImpl(feed.url, { redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { accept: "application/rss+xml, application/atom+xml, text/xml" } });
      httpStatus = response.status;
      if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); return failed(feed.id, attempt, response.status, "redirect_blocked"); }
      if (!response.ok) {
        errorCode = response.status === 429 ? "http_429" : response.status >= 500 ? "http_5xx" : "http_4xx";
        await response.body?.cancel();
        if ((response.status === 408 || response.status === 429 || response.status >= 500) && attempt === 1) { await sleep(2_000); continue; }
        return failed(feed.id, attempt, response.status, errorCode);
      }
      const declared = Number(response.headers.get("content-length") ?? 0);
      if (declared > 2 * 1024 * 1024) { await response.body?.cancel(); return failed(feed.id, attempt, response.status, "feed_too_large"); }
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 2 * 1024 * 1024) return failed(feed.id, attempt, response.status, "feed_too_large");
      try {
        const parsed = parseFeed(new TextDecoder().decode(bytes), publisher, feed, options.retrievedAt, options.runId);
        return { candidates: parsed.candidates, health: { providerId: "publisher-rss", endpointId: feed.id, attempts: attempt, httpStatus, rawCount: parsed.rawCount, acceptedCount: parsed.candidates.length, rejectionCounts: parsed.rejectionCounts, errorCode: null } };
      } catch (error) {
        const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : "invalid_feed";
        return failed(feed.id, attempt, response.status, code);
      }
    } catch (error) {
      errorCode = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error";
      if (attempt === 1) { await sleep(2_000); continue; }
      return failed(feed.id, attempt, httpStatus, errorCode);
    }
  }
  return failed(feed.id, 2, httpStatus, errorCode);
}

function failed(endpointId: string, attempts: number, httpStatus: number | null, errorCode: string) {
  return { candidates: [] as RssCandidate[], health: { providerId: "publisher-rss" as const, endpointId, attempts, httpStatus, rawCount: 0, acceptedCount: 0, rejectionCounts: {}, errorCode } };
}

async function mapLimit<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const index = cursor; cursor += 1; results[index] = await work(items[index]); }
  }));
  return results;
}
