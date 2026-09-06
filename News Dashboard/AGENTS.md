# News Dashboard agent harness

This repository uses a small, file-based team harness. It is designed for
iterative work: an orchestrator breaks a request into bounded work, assigns it
to the relevant specialist, and accepts a change only after the defined checks
pass.

## Start here

1. Read `.agents/product-brief.md` and `.agents/decisions.md`.
2. The orchestrator records the work item in `.agents/backlog.md`.
3. Use the role instructions in `.agents/roles/` for implementation work.
4. Update the decision log when a product or architectural decision changes.
5. Run the role's checks and the release checks before declaring work complete.

## Team

| Role | Owns |
| --- | --- |
| Orchestrator | scope, task routing, contracts, integration, final acceptance |
| News ingestion | permitted sources, collection, normalization, deduplication |
| News intelligence | classification, ranking, representative-article selection, summaries |
| Market data | end-of-day domestic and US market data |
| Frontend UI | dashboard interface, accessibility, local browser state |
| Platform & quality | schedule, storage, secrets, reliability, tests, release checks |

The orchestrator owns cross-cutting decisions. Specialists must not silently
expand their file ownership or change another role's contract.

## Non-negotiable product rules

- Keep the dashboard useful when a provider or AI summary fails: show the last
  successful snapshot and any available article metadata.
- Never expose credentials in client code, committed files, or logs.
- Store links and short metadata, not republished article bodies.
- Treat a private URL as convenience only, never as authentication.
- Verify time-sensitive provider limits, terms, and APIs immediately before
  implementing an integration.

See `.agents/orchestrator.md` for the operating workflow.
