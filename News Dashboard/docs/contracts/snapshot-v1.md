# Snapshot contract v1

Deferred full-product proposal. The current local reader uses the smaller
`news-dashboard.links/1` contract documented in `docs/simple-dashboard.md`
and validated by `apps/web/model.js`. In particular, empty sections are valid
and there are no AI summaries or market values in the current payload.

Contract identifier: `news-dashboard.snapshot/1.0`

All timestamps are RFC 3339 with an explicit offset. Dates are `YYYY-MM-DD` in
the source market. All persisted URLs are credential-free HTTPS URLs without
userinfo, fragments, or sensitive query keys. UTF-8 snapshot payloads are at
most 1 MiB. Unknown values are `null`; values are never relabeled with a newer
date.

## Ingestion handoff

```ts
interface NormalizedArticleCandidateV1 {
  stableId: string;
  stableIdVersion: "1";
  title: string;                    // normalized, 1..300 characters
  publisherId: string;
  publisherName: string;
  publisherHost: string;
  articleUrl: string;
  publishedAt: string | null;
  observedAt: string;
  timestampProvenance: "publisher" | "provider_observed";
  recencyAt: string;
  retrievedAt: string;
  providerId: string;
  providerEndpointId: string;
  sourceItemId: string | null;
  sourceSectionHint: string | null;
  sectionHintProvenance: "publisher_feed" | "provider_query" | null;
  retrievalRunId: string;
  normalizedUrlHash: string;
  urlNormalizationVersion: "1";
  publisherRegistryVersion: "1";
  rightsProfileId: string;
}

interface DuplicateEvidenceV1 {
  retrievalRunId: string;
  duplicateAlgorithmVersion: "1";
  candidateA: string;
  candidateB: string;
  normalizedUrlMatch: boolean;
  titleSimilarity: number;
  timeDistanceMinutes: number;
  decision: "same_event" | "different_event";
}
```

Adapters immediately discard descriptions, bodies, images, cookies, and
personal information. Titles are HTML-stripped, entity-decoded, Unicode NFC
normalized, whitespace-collapsed, and length-limited. HTTP article URLs are
rejected unless the versioned publisher registry contains a deterministic,
verified HTTPS rewrite. Redirects are not followed. Host checks use exact
allowed hosts, never loose suffix matching.

The registry maps each publisher ID to its display name, exact allowed hosts,
verified official RSS endpoints, section hints, opinion exclusion rules, and
rights profile. Conservative opinion path/title markers are tested and each
rejection is counted by reason.

## Dashboard response

```ts
interface DashboardResponseV1 {
  schemaVersion: "news-dashboard.snapshot/1.0";
  servedAt: string;
  news: NewsSnapshotV1 | null;
  market: MarketSnapshotV1 | null;
  status: RefreshStatusV1;
}
```

News and market may come from different runs. `null` is allowed only before
that snapshot type has ever succeeded. A previously cached response in the
owner's browser may be shown during read-API failure with an explicit offline
status.

## News snapshot

```ts
type SectionId =
  | "politics" | "economy" | "stocks" | "global_markets"
  | "society" | "world" | "entertainment" | "sports";

interface NewsSnapshotV1 {
  snapshotId: string;
  schemaVersion: "news-dashboard.snapshot/1.0";
  refreshedAt: string;              // pipeline publication time
  previousSuccessfulSnapshotId: string | null;
  candidateWindowDays: number;      // 1..7
  sections: Record<SectionId, RankedArticleV1[]>;
  collectionHealthAtPublication: {
    runId: string;
    asOf: string;
    providerRequests: ProviderRequestHealthV1[];
    publisherCoverage: PublisherCoverageV1[];
  };
}

interface RankedArticleV1 {
  stableId: string;
  stableIdVersion: "1";
  eventClusterId: string;
  duplicateAlgorithmVersion: "1";
  rank: number;                     // 1..20 within one section
  section: SectionId;
  title: string;                    // 1..300 characters
  publisherId: string;
  publisherName: string;
  articleUrl: string;
  publishedAt: string | null;
  observedAt: string;
  timestampProvenance: "publisher" | "provider_observed";
  displayTimeKind: "published" | "provider_observed";
  retrievedAt: string;
  providerId: string;
  providerEndpointId: string;
  sourceItemId: string | null;
  normalizedUrlHash: string;
  urlNormalizationVersion: "1";
  rightsProfileId: string;
  isNew: boolean;
  summary: string | null;           // max 360 characters
  summaryStatus:
    | "generated" | "unavailable_rights" | "provider_failure"
    | "quota_exceeded" | "validation_failed" | "not_required";
  representativeReasonCode:
    | "freshest" | "public_rank_secondary" | "only_candidate";
  publicRank: {
    value: number;
    source: string;
    kind: "publisher_popular_feed";
    observedAt: string;
  } | null;
}

interface ProviderRequestHealthV1 {
  providerId: string;
  endpointId: string;
  queryId: string | null;
  attempts: number;
  httpStatus: number | null;
  retryable: boolean;
  rawCount: number;
  acceptedCount: number;
  rejectionCounts: Record<string, number>;
  errorCode: string | null;
}

interface PublisherCoverageV1 {
  publisherId: string;
  candidateCount: number;
  selectedCount: number;
  lastObservedAt: string | null;
}
```

News publication invariants:

- All eight section keys exist and each has exactly 20 items. Collection tries
  24 hours, then whole-day increments through seven days; failure after day
  seven retains the prior success. Production requires a passing initial seed.
- `stableId` and `eventClusterId` each occur exactly once in the final snapshot.
  NEW is event-based: it compares event-cluster IDs with the immediately prior
  successful snapshot, so a new representative URL for the same event is not
  marked NEW.
- Stable ID v1 is the deterministic hash of `publisherId + normalizedUrlHash`;
  a provider GUID is evidence only and never the sole identity. Event clustering
  is reconciled against the prior successful snapshot using URL, normalized
  title, and time evidence. A match inherits the prior `eventClusterId`; only
  an unmatched event receives a new deterministic ID. The evidence records the
  retrieval run and duplicate-algorithm version.
- Ranks are contiguous 1..20 and match their containing section.
- `displayTimeKind` is `published` only when publisher provenance is available;
  this requires non-null `publishedAt` and `timestampProvenance: publisher`.
  Otherwise provenance and display kind are `provider_observed`, and the UI
  labels `observedAt` as provider-observed time. Candidate `recencyAt` equals
  `publishedAt ?? observedAt`, and the lookback is measured from scheduled run
  time; neither value may be rewritten to appear newer.
- `generated` requires a non-empty neutral Korean summary of one or two
  sentences; every other summary status requires `summary: null`. Ranks 1..5
  cannot use `not_required`; ranks 6..20 use only `not_required`.
- `publicRank` defaults to null. It is never inferred from feed ordering or
  presented as a publisher view count.

## Market snapshot

```ts
interface MarketSnapshotV1 {
  snapshotId: string;
  schemaVersion: "news-dashboard.snapshot/1.0";
  refreshedAt: string;              // composite publication time
  domestic: {
    kospi: MarketValueV1;
    kosdaq: MarketValueV1;
    krwUsd: MarketValueV1;
    topSecurities: SecurityRankingV1;
  };
  unitedStates: {
    dowJones: MarketValueV1;
    sp500: MarketValueV1;
    nasdaqComposite: MarketValueV1;
  };
}

interface MarketValueV1 {
  symbol: string;
  label: string;
  value: number | null;
  unit: "index_points" | "KRW_per_USD";
  change: number | null;
  changePercent: number | null;
  changeBasis: "provider" | "derived" | null;
  asOfDate: string | null;
  previousAsOfDate: string | null;
  sourceObservedAt: string | null;
  sourceName: string;
  sourceUrl: string;
  availability: "available" | "unavailable";
  staleAfter: string | null;
  originSnapshotId: string | null;
  isRealtime: false;
}

interface SecurityRankingV1 {
  items: ListedSecurityMarketCapV1[];
  asOfDate: string | null;
  sourceObservedAt: string | null;
  sourceName: string;
  sourceUrl: string;
  availability: "available" | "unavailable";
  staleAfter: string | null;
  originSnapshotId: string | null;
}

interface ListedSecurityMarketCapV1 {
  rank: number;
  securityCode: string;
  securityName: string;
  close: number;
  marketCapitalization: number;
  currency: "KRW";
  asOfDate: string;
  sourceName: string;
  sourceUrl: string;
}
```

Market publication invariants:

- A composite uses each value series and the security-ranking group's latest
  successful result. Provider failure may
  advance other series but retains the failed series' value, dates, source, and
  `originSnapshotId`; carry-forward also preserves the origin `staleAfter`.
  `unavailable` is valid only before first success.
- `available` requires non-null value/as-of/source observation/origin ID.
  It also requires a non-null `staleAfter`.
  `unavailable` requires value, changes, dates, stale-after, and origin ID null.
  Fresh/stale presentation is calculated from `servedAt` and `staleAfter`, not
  stored as a mutable snapshot fact. Weekend/holiday context is not claimed
  without a verified exchange calendar.
- Derived change equals `value - previousValue`; percent equals
  `change / previousValue * 100`. Both change fields, `changeBasis`, and
  `previousAsOfDate` are either present together or all null. Display rounding
  happens only in the UI. Positive KRW/USD change means USD appreciation/KRW
  depreciation.
- An available `topSecurities` group contains exactly ten unique KOSPI/KOSDAQ
  common-stock codes from the latest date present in both markets, ranked
  continuously by market capitalization descending. Preferred shares, ETFs,
  ETNs, REITs, and SPACs are excluded; all rows share the wrapper's date and
  source. An available group requires non-null `asOfDate`, `sourceObservedAt`,
  `staleAfter`, `originSnapshotId`, `sourceName`, and `sourceUrl`. An unavailable
  group has an empty `items` array and null date, observation, stale, and origin
  provenance.
- `sourceObservedAt` is when the adapter retrieved the source observation; it
  does not claim a provider publication timestamp unless separately documented.
- The UI shows per-series dates, latest-close wording, required attribution,
  and a no-investment-advice notice; it never collapses mixed dates into one.

## Refresh status

```ts
interface AttemptStatusV1 {
  attemptedAt: string | null;
  state: "success" | "degraded" | "failed" | "missed" | "initializing";
  failedProviders: { providerId: string; endpointId: string }[];
  providerDiagnostics: ProviderRequestHealthV1[];
  publisherCoverage: PublisherCoverageV1[];
  message: string | null;
}

interface RefreshStatusV1 {
  news: AttemptStatusV1 & { latestSuccessfulAt: string | null };
  market: AttemptStatusV1 & { latestSuccessfulAt: string | null };
}
```

Attempt state and sanitized per-provider counts/errors are read from the latest
best-effort versioned `refresh_runs` record, including failed promotions.
If that write also fails, the API/UI derives `missed` from the KST schedule and
latest successful timestamp. `latestSuccessfulAt` is pipeline publication time,
not a source trading date. Diagnostics contain codes and counts only—never
headers, credentials, raw responses, article text, or request URLs.
