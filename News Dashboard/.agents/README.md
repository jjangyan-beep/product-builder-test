# Agent workspace

This folder is the team's small, persistent working memory. It is deliberately
plain Markdown: no continuously running process, paid service, or framework is
required.

## Files

- `orchestrator.md`: the lead agent's routing and integration rules.
- `roles/`: bounded responsibilities for the specialists.
- `product-brief.md`: the current product contract.
- `decisions.md`: decisions that future changes must respect.
- `backlog.md`: the ordered work queue.
- `briefs/current.md`: the single active work item template.
- `review-checklist.md`: cross-role release gate.

## Use on every change

1. Copy the template in `briefs/current.md` into an active work item and fill
   in the owner, reviewer, allowed files, and acceptance checks.
2. The orchestrator routes the work to one specialist. Involve a second role
   only when its contract is affected.
3. The owner reports the verification performed.
4. The reviewer applies `review-checklist.md`; the orchestrator integrates and
   moves the brief to a completed record.

For small visual or wording changes, the orchestrator may handle the task
directly and still record the decision when it changes product behavior.
