# Release review checklist

The orchestrator applies the relevant items before calling a change complete.

## Data and reliability

- [ ] Publisher, canonical link, published time, and source/refresh timestamp
      are present for every visible article.
- [ ] Articles are in exactly one of the eight sections and event duplicates do
      not reappear across them.
- [ ] A failed fetch, provider failure, or AI failure keeps the last successful
      snapshot visible.
- [ ] The dashboard labels its last successful refresh and market-data as-of
      date.

## Product behavior

- [ ] News refresh uses the six product-brief KST times: 06:07, 09:07, 12:07,
      15:07, 18:07, and 21:07.
- [ ] NEW items expire at the next successful refresh.
- [ ] Top five and remaining fifteen use the approved card/table split.
- [ ] Read state and theme remain local to the browser.

## Safety and presentation

- [ ] No secrets are in browser code, git history, logs, or tracked files.
- [ ] Articles open the original publisher URL in a new safe tab.
- [ ] Market data never appears real-time and includes a no-advice notice.
- [ ] Desktop, mobile, light theme, and dark theme were checked.
- [ ] No unapproved recurring/paid service was introduced.
