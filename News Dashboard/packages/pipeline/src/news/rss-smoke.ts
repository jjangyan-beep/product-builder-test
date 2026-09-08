import { collectRssFeeds } from "./collect-rss.ts";

const retrievedAt = new Date().toISOString();
const result = await collectRssFeeds({ retrievedAt, runId: `manual-${retrievedAt}` });
const sectionCounts = Object.fromEntries(
  [...new Set(result.candidates.map((item) => item.section))].sort()
    .map((section) => [section, result.candidates.filter((item) => item.section === section).length]),
);
process.stdout.write(`${JSON.stringify({
  retrievedAt,
  candidateCount: result.candidates.length,
  sectionCounts,
  endpoints: result.health.map((item) => ({
    endpointId: item.endpointId,
    attempts: item.attempts,
    httpStatus: item.httpStatus,
    rawCount: item.rawCount,
    acceptedCount: item.acceptedCount,
    rejectionCounts: item.rejectionCounts,
    errorCode: item.errorCode,
  })),
}, null, 2)}\n`);
