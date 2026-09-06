# MVP architecture

Status: proposed for `ARCH-001` acceptance

## Outcome

Build a TypeScript application whose scheduled pipeline publishes only fully
validated, immutable snapshots. Serve the latest successful snapshot through
an owner-only dashboard. Provider, AI, validation, or deployment failure must
leave the previous successful snapshot readable.

## Components

```text
GitHub Actions (scheduled and manual)
  -> TypeScript collection pipeline
     -> news metadata and daily-close market providers
     -> classification, grouping, ranking, optional summaries
     -> contract and product-rule validation
  -> Cloudflare D1 immutable snapshot rows
  -> Cloudflare Pages Function (GET only)
  -> React + Vite static dashboard
  -> Cloudflare Access owner identity gate
```

### Repository layout

```text
apps/web/                 React and Vite dashboard
functions/api/            Cloudflare Pages read-only API
packages/contracts/       Runtime schemas and shared TypeScript types
packages/pipeline/        Collection, intelligence, validation, and publishing
tests/fixtures/           Sanitized metadata-only contract fixtures
docs/                     Architecture, provider evidence, and operations
.github/workflows/        Scheduled collection and release checks
```

Use npm workspaces and one lockfile. Browser code may depend on
`packages/contracts` but never on pipeline code or provider credentials.

## Execution and schedule

GitHub Actions runs the news pipeline at `06:07`, `09:07`, `12:07`, `15:07`,
`18:07`, and `21:07` in `Asia/Seoul`, and exposes a manual dispatch. The
workflow uses one concurrency group so a delayed run cannot overlap its
successor. GitHub documents scheduled workflows as best-effort, so the UI
detects a stale successful snapshot rather than claiming that a run occurred
exactly on time.

Candidate collection begins with 24 hours and expands one whole day at a time
to a hard maximum of seven days. A run that still cannot produce 20 valid
items in every section fails promotion and retains the previous success. The
initial release cannot go live until a seven-day seed fixture passes this rule.

Market data runs once daily at 14:10 KST and queries a 10-day lookback for the
latest valid source observations. Each series is promoted independently and a
composite market snapshot uses the latest successful value for every series.
If one provider fails, its prior value keeps its original `asOfDate` and the
attempt status reports the failure while newly successful series may advance.
The pipeline never relabels a previous close with today's date.

## Persistence and promotion

D1 stores three bounded tables:

- `news_snapshots`: one complete versioned JSON document per successful run.
- `market_snapshots`: one complete versioned JSON document per successful run.
- `refresh_runs`: best-effort operational outcome without article bodies or
  secrets.

The pipeline validates a candidate in memory and inserts a new snapshot row
only after every required invariant passes. It never updates the current row.
The read API selects the newest successful row, so a failed run cannot replace
or invalidate the last success. Retain 14 days of news snapshots and 45 days of
market snapshots; cleanup runs only after a successful insert.

Each table uses `snapshot_id` as a primary key plus `schema_version`,
`refreshed_at`, `payload`, and `created_at`, with an index for latest-success
selection. Snapshot IDs are deterministic per job and scheduled time, so a
manual retry is idempotent. Payload UTF-8 size is capped at 1 MiB before insert.
Retention cleanup is non-gating and never removes the newly promoted row.

## Access and secrets

Cloudflare Access protects the custom production hostname, the production
`pages.dev` hostname, and every enabled preview alias, and permits the exact
owner identity only. Preview deployments never bind production D1; they use
fixtures or an isolated preview database. Release smoke tests verify that an
unauthenticated request cannot reach any hostname or API route. This is
infrastructure authentication, not an application account system. The web
application stores theme, read state, and the latest owner-browser response in
local storage. That response is the fallback during a read-API outage; a first
visit during an outage cannot display a snapshot.

GitHub Environment secrets hold separate least-privilege credentials for
Cloudflare/D1, Workers AI, KRX, ECOS, and FRED. Workflows use `contents: read`;
third-party actions are pinned to commit SHAs. Contract URLs are credential-free
public documentation or source URLs: validators reject userinfo, fragments,
and sensitive query keys. Secrets, provider responses, article bodies, and
request URLs are excluded from browser bundles and logs.

## Collection boundaries

Provider adapters emit a versioned normalized candidate contract. A versioned
publisher registry maps publisher IDs to exact allowed hosts, GDELT query
domains, rights profiles, and conservative opinion-path/title exclusions.
Adapters do not follow publisher redirects or fetch article pages. Provider
request health and publisher coverage are measured separately.

## AI summaries

Summary generation is an optional pipeline stage, never a publication gate.
Only text whose provider terms explicitly permit this use may be sent to a
model. The initial metadata-only sources do not establish rights to summarize
article bodies, so the initial value is `summary: null` with
`summaryStatus: unavailable_rights` unless a permitted input source is added.

Cloudflare Workers AI is the preferred free-tier execution path after a Korean
quality and rights fixture passes. Quota, provider, malformed output, or quality
failure keeps the article and publishes its metadata without a summary.

## Release gates

- Validate the versioned contracts and all eight exclusive sections.
- Validate one unique event-cluster ID per selected representative article.
- Prove source, AI, validation, and D1 write failures retain the latest success.
- Verify KST schedules, non-overlap, manual rerun, and stale detection.
- Verify `NEW` changes only between successful news snapshots.
- Verify safe original links, local theme/read state, and mobile layouts.
- Scan tracked files, logs, fixtures, and browser output for secrets.
- Check current provider terms and free-tier usage before release.
- Verify Access blocks production, `pages.dev`, previews, and every API route,
  and verify previews have no production data binding.

## Current external constraints

The architecture relies on the official limits and behavior recorded in
[provider validation](provider-validation.md). These are time-sensitive and
must be rechecked immediately before each integration is enabled.
