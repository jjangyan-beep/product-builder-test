# Backlog

## Active

- [ ] **ARCH-001 (active):** Establish application architecture and choose the
  free-tier deployment, feed, market-data, and AI-summary integrations.
  Provider research, access/schedule decisions, and contract review are
  complete. External provider validation and two product decisions remain
  before acceptance.

## Next

- [ ] Run a seven-day GDELT sample to validate Korean publisher coverage,
  timestamp meaning, URL hosts, section volume, and rate-limit behavior.
- [ ] Confirm with KRX that owner-only cloud processing and display behind
  Cloudflare Access comply with its third-party-provision restriction.
- [ ] Resolve a rights-cleared summary input; until then publish top-five
  metadata with `summaryStatus: unavailable_rights`.
- [ ] Build a static dashboard shell with the eight-tab responsive interface.
- [ ] Define versioned data contracts and a persisted last-successful snapshot.
- [ ] Implement permitted-source ingestion and normalization.
- [ ] Implement classification, deduplication, ranking, and summary pipeline.
- [ ] Implement daily market-data snapshot pipeline.
- [ ] Add the KST schedule, reliability status, and release checks.

## Completed

- [x] Capture the initial product requirements.
- [x] Create the persistent multi-agent harness.

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
