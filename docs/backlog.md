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

| 2025-11-05 | 3.3 | 3 | Feature | Medium | TBD | Open | Add abort button for running tests (requires workflow API changes) |
| 2025-11-05 | 2.7 | 2 | Enhancement | Medium | TBD | Open | Update test status to "Aborted" when tests are killed/interrupted |
| 2025-11-05 | 2.6 | 2 | Enhancement | Medium | TBD | Open | Run Phase 4 evaluation with partial data when earlier phases fail |
| 2025-11-05 | 3.7 | 3 | Bug | High | TBD | Open | Fix Vite build output so ASSETS serves SPA root (`vite.config.ts`, Worker fallback, deployment docs) |
| 2025-11-05 | 3.7 | 3 | Bug | High | TBD | Open | Implement Card/Table toggle with scroll persistence and localStorage preference (`src/frontend/App.tsx`) |
| 2025-11-05 | 3.7 | 3 | Bug | High | TBD | Open | Extend Agent Focus metrics to include confidence per UX spec (`src/frontend/components/AgentStatusHeader.tsx`) |
| 2025-11-05 | 3.7 | 3 | Bug | High | TBD | Open | Remove dangling import and stabilize ScreenshotGallery lightbox (`src/frontend/components/ScreenshotGallery.tsx`) |
| 2025-11-05 | 3.7 | 3 | TechDebt | High | TBD | Open | Resolve architecture mismatch between React bundle and ADR-001 (`docs/epic-3-tech-context.md`) |
| 2025-11-05 | 3.7 | 3 | TechDebt | Medium | TBD | Open | Configure Tailwind typography scale to match design system (`tailwind.config.js`, `src/frontend/index.css`) |

Adam's human notes:
- We can deploy our own small games and test them with the system.
- Find a way to kill the DO once the test is done.