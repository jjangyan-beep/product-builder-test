# Backlog

## Active

- [x] **WEB-001 (complete):** Build a simple news-link reader with eight tabs,
  up to 20 available links per section, read/theme state, and last-successful
  JSON storage. Defer AI, market integration, database, and hosted deployment.
  Owner: orchestrator / frontend-ui. Reviewer: platform-quality (read-only).
  Checks passed: 11 tests, live refresh, failure retention, deduplication,
  static build, HTTP smoke and leak scan. See docs/simple-dashboard.md.

## Deferred architecture

- [ ] **ARCH-001 (deferred):** Establish application architecture and choose the
  free-tier deployment, feed, market-data, and AI-summary integrations.
  Provider research, access/schedule decisions, and contract review are
  complete. Superseded for the local reader by the 2026-09-08 simplification;
  AI, market and hosted integration decisions remain future work.

## Next

- [ ] Broaden business-news coverage beyond SBS if needed after trying this version.
- [ ] Arrange always-on collection and owner-only deployment when requested.

## Deferred full-product scope

- [ ] Confirm with KRX that owner-only cloud processing and display behind
  Cloudflare Access comply with its third-party-provision restriction.
- [ ] Revisit AI summaries only if requested; the current version omits them.
- [x] Build a static dashboard shell with the eight-tab responsive interface.
- [x] Define the small links/1 contract and a persisted last-successful snapshot.
- [ ] Expand the verified official-feed registry beyond SBS only after each
  publisher's owner-only storage/display terms are confirmed.
- [ ] Accumulate a seven-day RSS metadata sample to assess coverage; 20 items
  is a display maximum, not a gate.
- [x] Implement feed/title classification, exact URL/title deduplication and latest-first ranking.
- [ ] Implement daily market-data snapshot pipeline.
- [x] Add the local KST schedule, reliability status, and release checks.

## Completed

- [x] Capture the initial product requirements.
- [x] Create the persistent multi-agent harness.
- [x] Reject GDELT after the live reliability spike and preserve its report as
  dated evidence.
- [x] Exclude Naver News Search because its display and processing terms do not
  fit the dashboard pipeline.
- [x] Implement the initial metadata-only SBS RSS adapter and feed registry.

## Work-item template

```md
### [ID] Short outcome
- Owner:
- Reviewer:
- Scope / allowed files:
- Inputs and output contract:
- Acceptance checks:
- Status: planned | active | blocked | complete
- Notes / decision needed:
```
