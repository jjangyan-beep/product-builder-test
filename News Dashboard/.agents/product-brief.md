# Product brief

## Purpose

A personal, Korean-language dashboard for monitoring major breaking news. It
uses Korean publishers only and opens the original publisher page in a new tab.

## Sections

`정치`, `경제`, `증권`, `해외증시`, `사회`, `국제`, `엔터`, `스포츠`.

- The default tab is `증권`.
- Every article belongs to exactly one best-fitting section.
- Each section displays 20 articles. Use the most recent 24 hours by default;
  expand the time window by one day at a time only when fewer than 20 qualify.
- Exclude columns, editorials, contributed opinion, and other opinion-led
  content. Use major Korean publishers selected as a balanced fixed set.

## Ranking and presentation

- Deduplicate one event to one representative article. Choose with freshness as
  the primary signal and available public engagement/ranking as a secondary
  signal. Never claim unavailable publisher view counts.
- Top 5: cards with title, publisher, published time, NEW state, and a neutral
  1–2 sentence AI summary. The first card is featured; cards 2–5 form a compact
  two-column grid on desktop.
- Remaining 15: compact table with rank, title, publisher, time, NEW, and link;
  no AI summary.
- If a summary fails, retain the article and show its normal metadata.
- Text only: do not use article thumbnails.

## Refresh and state

- Refresh news in KST at 06:07, 09:07, 12:07, 15:07, 18:07, and 21:07. Do not
  refresh from midnight through 06:00.
- Mark items introduced in the newest successful refresh as `NEW` until the
  next successful refresh. Do not issue pop-up, sound, or browser alerts.
- Show the last successful refresh time. On failure retain the prior snapshot
  and show a compact status message.
- Read/unread state and the selected theme are per-browser local state only.

## Market panels

- `증권`: KOSPI, KOSDAQ, KRW/USD, and the 10 largest Korean listed companies by
  market capitalization.
- `해외증시`: Dow Jones, S&P 500, and Nasdaq Composite.
- Market values use the latest trading-day close and refresh once daily. Label
  the as-of date clearly; never imply real-time pricing. Include a concise
  no-investment-advice notice.

## Experience and operations

- Desktop-first responsive design; mobile must remain usable.
- Light theme by default; user may toggle dark theme and the choice persists.
- No application-level account or login, no publisher filters, no
  archive/search, and no user-data sync in the initial release. Protect the
  deployed dashboard with an infrastructure access gate restricted to the
  owner; its session may persist in the browser.
- Aim for no monthly operating cost using free tiers. Degrade gracefully if a
  free AI quota or provider is unavailable.
