# Active work item

> Keep only one active work item in this file. On completion, move it into a
> dated file in `.agents/briefs/completed/`.

## [ARCH-001] Choose the implementation architecture

- **Goal:** select free-tier-compatible services and a code structure for the
  dashboard, then document the data contracts before feature implementation.
- **Owner:** orchestrator, with news-ingestion, market-data, and
  platform-quality consultation.
- **Reviewer:** platform-quality.
- **Allowed files:** `docs/`, configuration files created for the selected
  application stack; no production credentials.
- **Inputs:** `.agents/product-brief.md`, `.agents/decisions.md`.
- **Outputs:** implementation architecture, source/provider validation, data
  contract, and an updated backlog.

## Acceptance checks

- [ ] All external providers are rechecked for current terms, free limits, and
      permitted use before selection.
- [ ] News and market snapshots have explicit, versioned contracts.
- [ ] The selected schedule works in KST and preserves the previous snapshot
      after a failed refresh.
- [ ] No planned integration requires a paid monthly subscription.

## Status

`active`

## Decisions needed

- Resolved 2026-09-06: use owner-only Cloudflare Access without an
  application-level login system.
- Resolved 2026-09-06: schedule news refreshes at minute seven of the six
  approved KST hours.
- Pending: decide whether a GDELT-only article may visibly show a clearly
  labeled provider-observed time when publisher publication time is unavailable.
- Pending: approve a metadata-only initial release if no rights-cleared summary
  input is found, or defer release until summaries can be enabled.
