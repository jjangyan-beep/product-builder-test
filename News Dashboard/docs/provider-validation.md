# Provider validation

Checked: 2026-09-06

This record supports `ARCH-001`; it is technical product due diligence, not
legal advice. Every integration remains disabled until its credentials and
current terms are verified during implementation.

## News metadata

### Rejected: GDELT DOC 2.0

GDELT is retained here only as dated evaluation evidence. The owner rejected it
for production ingestion on 2026-09-07 after the validation environment could
not complete a representative sample reliably. Runtime code, configuration,
and tests no longer reference GDELT.

- [GDELT project and data use](https://www.gdeltproject.org/about.html)
- [DOC 2.0 API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)
- [Rate-limiting guidance](https://blog.gdeltproject.org/ukraine-api-rate-limiting-web-ngrams-3-0/)

The 2026-09-07 local spike attempted two fixed-window metadata requests before
opening its failure circuit. One returned HTTP 429 after about 11.5 seconds and
one ended with a network error after about 10.2 seconds. A separate, non-canonical
four-request spot check also received HTTP 429 consistently. No raw
response or publisher page was persisted or fetched. This is not evidence of
zero news coverage; it is evidence that the current/shared egress cannot
complete the required measurement reliably. See the historical
[dated spike report](spikes/gdelt-7day-2026-09-07.md).

### Selected initial source: SBS RSS

SBS publishes official section feeds for personal, non-commercial use. The
initial registry enables politics, economy, society, world, entertainment, and
sports feeds. Economy and world are mixed feeds: title classification may route
an item to domestic stocks or global markets. Ingest only feed title, link,
GUID, and publisher timestamp. Discard descriptions, content, authors, media,
and images immediately, and do not send them to an AI model.

- [SBS RSS information](https://news.sbs.co.kr/news/rss.do)

### Deferred

Direct feeds from other publishers remain disabled pending explicit compatible
terms or written permission. Naver News Search is excluded: its 2026-09-07
terms require independent, unmodified display of Naver search results and
restrict copying/caching, reranking, mixing, and AI use, which conflicts with
this dashboard's eight-section aggregation pipeline. BIGKinds is not selected
because its API availability is not a stable personal free-tier contract.

- [Naver News Search API](https://developers.naver.com/docs/serviceapi/search/news/news.md)
- [Naver Search API terms change effective 2026-09-07](https://developers.naver.com/notice/article/33400)

## Domestic market

### Conditional for owner-only use: KRX Open API

Use KRX daily KOSPI/KOSDAQ index values and KOSPI/KOSDAQ security daily data.
Compute the top ten ordinary listed shares by market capitalization from the
latest common trading date. KRX requires registration, per-API approval,
attribution, and restricts third-party provision. Its published terms specify
non-commercial use, 10,000 calls per key per day, a one-year renewable key,
and display attribution to KRX statistical information. This selection depends
on the owner-only Cloudflare Access decision and confirmation that owner-only
cloud processing does not violate the third-party-provision restriction. If the
Access policy is removed or another user is added, disable and re-review it.

- [KRX services](https://openapi.krx.co.kr/contents/OPP/INFO/service/OPPINFO004.cmd)
- [KRX application process](https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO003.jsp)
- [KRX terms](https://openapi.krx.co.kr/contents/OPP/INFO/OPPINFO002.jsp)

If KRX approval is unavailable, domestic individual-security data may fall
back to the Financial Services Commission daily stock API, but that API does
not satisfy the two index requirements.

- [Financial Services Commission daily stock API](https://www.data.go.kr/data/15094808/openapi.do)

### Conditional pending metadata verification: Bank of Korea ECOS

Use `731Y003 / 0000003` for the KRW/USD 15:30 closing rate, subject to a final
StatisticItemList name/unit/latest-date check after key issuance. ECOS has no
fixed public daily quota located in this review and may limit excessive calls.
Attribute the Bank of Korea and label any derived change explicitly. Do not use
ECOS-hosted KRX series to bypass KRX rights.

- [ECOS Open API](https://ecos.bok.or.kr/api/#/)
- [Bank of Korea data copyright policy](https://www.bok.or.kr/portal/main/contents.do?menuNo=200228)

## United States market

### Conditional for strictly personal owner-only use: FRED

Use daily close series `DJIA`, `SP500`, and `NASDAQCOM`. Each series contains
third-party copyrighted data. FRED does not grant redistribution rights for
those series, so the owner-only gate is a mandatory condition. Disable and
re-review the integration if Access is removed or another user is allowed.
Display FRED attribution and its exact required non-endorsement notice. Query
each series once daily and remain below the documented two-requests-per-second
v2 threshold; no fixed total free quota is assumed.

- [FRED observations API](https://fred.stlouisfed.org/docs/api/fred/series_observations.html)
- [FRED terms](https://fred.stlouisfed.org/legal/terms/)
- [DJIA](https://fred.stlouisfed.org/series/DJIA), [S&P 500](https://fred.stlouisfed.org/series/SP500), [Nasdaq Composite](https://fred.stlouisfed.org/series/NASDAQCOM)

## Hosting and storage

### Selected: GitHub Actions and Cloudflare

GitHub Actions runs the TypeScript batch. Cloudflare Pages serves the UI,
Pages Functions provide the GET endpoint, D1 stores immutable snapshots, and
Cloudflare Access applies the owner identity policy.

- [GitHub Actions included usage](https://docs.github.com/en/billing/reference/product-usage-included)
- [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [Cloudflare Access identity provider](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/cloudflare/)

### Free-tier capacity budget

| Service | Checked free limit | MVP budget |
| --- | --- | --- |
| GitHub Actions, private repository | 2,000 minutes/month | About 180 news runs plus daily market/release checks; target under 5 minutes/run and under 1,200 minutes/month |
| Cloudflare Pages | 500 builds/month, 20-minute build, 20,000 files, 25 MiB/file | UI builds only; data refreshes do not trigger a Pages build |
| Pages Functions / Workers Free | 100,000 requests/day | Owner-only reads; alert at 10,000/day |
| D1 Free | 5M rows read/day, 100k rows write/day, 5 GB/account, 500 MB/database, 2 MB row/BLOB, 7-day Time Travel | Payload capped at 1 MiB; at most 84 retained news rows plus 45 market rows |
| Cloudflare Access Free | $0 for up to 50 users | Exactly one allowed owner identity |
| Workers AI Free | 10,000 neurons/day | Disabled until rights/quality pass; estimate and cap before enabling |

## AI

### Conditional selection: Cloudflare Workers AI

Workers AI remains disabled until both input rights and a fixed Korean-summary
quality suite pass. Free allocation is ample for a personal top-five-only
workload, but quota is a hard failure boundary; metadata-only output is the
required fallback.

- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

Gemini's unpaid tier is not the default because its terms permit submitted and
generated content to be used for service improvement and reviewed by humans.

- [Gemini API terms](https://ai.google.dev/gemini-api/terms)
