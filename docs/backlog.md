# Engineering Backlog

This backlog collects cross-cutting or future action items that emerge from reviews and planning.

Routing guidance:

- Use this file for non-urgent optimizations, refactors, or follow-ups that span multiple stories/epics.
- Must-fix items to ship a story belong in that story’s `Tasks / Subtasks`.
- Same-epic improvements may also be captured under the epic Tech Spec `Post-Review Follow-ups` section.

| Date | Story | Epic | Type | Severity | Owner | Status | Notes |
| ---- | ----- | ---- | ---- | -------- | ----- | ------ | ----- |
| 2025-11-04 | 1.4 | 1 | Bug | High | TBD | Open | Propagate workflow phase errors so retries run per AC #11 (`src/workflows/GameTestPipeline.ts`) |
| 2025-11-04 | 1.4 | 1 | Bug | High | TBD | Open | Check `DbResult` outcomes when writing status/events to D1 (`src/workflows/GameTestPipeline.ts`) |
| 2025-11-04 | 1.4 | 1 | TechDebt | Medium | TBD | Open | Revisit per-phase timeouts so total runtime stays under six minutes (`src/workflows/GameTestPipeline.ts`) |

Adam's human notes to add to the backlog:
- AI Gateway isn't being utilized at all, we're doing pure Workers AI calls.
- The live feed and Timeline are very similar.
- Do we really need to hot reload with polling?
- The screenshots don't work, bucket is empty despite the URLs on the logs.
- We can deploy our own small games and test them with the system.