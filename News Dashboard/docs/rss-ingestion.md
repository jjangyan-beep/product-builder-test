# Official RSS ingestion

Status: initial adapter implemented on 2026-09-07

## Decision

Production news discovery uses verified official publisher RSS feeds. GDELT and
Naver News Search are excluded. The first enabled source is SBS because its
official RSS page expressly permits personal, non-commercial use.

The pipeline remains deliberately small:

```text
versioned feed registry
  -> bounded RSS fetch (3 concurrent, 10 s timeout, 2 attempts)
  -> metadata allowlist projection
  -> section mapping/title fallback
  -> URL deduplication
  -> snapshot validation and promotion
```

The adapter never fetches an article page. It keeps only title, original HTTPS
link, GUID, and publisher timestamp. Raw XML, description, content, author,
media, image, headers, and credentials are never persisted.

## Enabled feeds

The registry currently enables six SBS section feeds: politics, economy,
society, world, entertainment, and sports. Explicit feeds use fixed mappings.
The economy feed may classify into economy, stocks, or global markets; the
world feed may classify into world or global markets. Classification cannot
escape those declared target sets.

- [SBS official RSS page](https://news.sbs.co.kr/news/rss.do)

## Live smoke result

On 2026-09-07 all six endpoints returned HTTP 200 on their first attempt. Each
returned 29 items, producing 174 unique accepted URLs. The current one-fetch
distribution was politics 29, economy 23, stocks 5, global markets 1, society
29, world 29, entertainment 29, and sports 29.

This proves the adapter works but not that the product coverage target is met.
Stocks and global markets require seven-day accumulation and probably an
additional rights-cleared business-news RSS source before the dashboard can
guarantee 20 items in every section.

## Why Naver News Search is excluded

Naver's News Search API is technically convenient and currently documents a
25,000-call daily limit. However, the terms effective 2026-09-07 require Naver
search results to be identified and displayed independently and without
reranking or other modification, and restrict copying/caching and AI use. That
does not fit a dashboard that mixes publishers, deduplicates events, assigns
eight custom sections, reranks articles, and optionally summarizes them.

- [Naver News Search API](https://developers.naver.com/docs/serviceapi/search/news/news.md)
- [Naver Search API terms change](https://developers.naver.com/notice/article/33400)

## Next acceptance gate

Accumulate normalized metadata for seven days, rerun section coverage, and
enable another publisher only after its owner-only storage/display terms are
confirmed. A failed feed attempt must not replace the last successful snapshot.
