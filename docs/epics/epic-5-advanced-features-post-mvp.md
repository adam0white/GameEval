# Epic 5: Power User & Advanced Features **(Post-MVP)**

**Goal:** Add power-user features (Table View, filtering, export) and advanced capabilities (batch testing, analytics, multi-model comparison).

**Value:** Differentiates GameEval with advanced capabilities - efficient Table View for power users, filtering/sorting, export options, batch testing, version comparison, and cost optimization.

**Phase:** Post-MVP - Future

**Dependencies:** Epic 4 (polished UX and production-ready system)

**UX Alignment:** This epic implements **UX Phase 2 (Power User Features)** first, then **UX Phase 4 (Advanced Features)**.

---

## UX Phase 2: Power User Features

**Story 5.1: UX Phase 2 - Table View with Filtering, Sorting, and Export**

As a game developer and power user,
I want a high-density Table View with filtering, sorting, search, and export capabilities,
So that I can efficiently manage multiple tests and extract the data I need.

**Acceptance Criteria:**

**1. Table View Toggle**
1. View toggle button in header (Card icon / Table icon)
2. Toggle between Card Gallery and Table View
3. Remember user preference in localStorage
4. Smooth transition animation between views
5. URL reflects view mode: `/?view=table` or `/?view=cards`

**2. Table View Layout**
6. High-density table with columns: Game URL, Status, Score, Duration, Started, Actions
7. Responsive: Hide less critical columns on tablet (e.g., Duration)
8. Compact row height for scanning many tests
9. Status badges color-coded (same as Card View)
10. Click row → Navigate to Agent Focus Mode

**3. Sorting**
11. Sort by: Most recent (default), Oldest first, Highest score, Lowest score, Longest duration
12. Sort indicator (arrow icon) in column headers
13. Sort state persists in URL query params (`?sort=score-desc`)
14. Click column header to cycle sort direction

**4. Filtering**
15. Filter by Status: All / Completed / Running / Failed
16. Filter by Score range: All / High (80+) / Medium (60-79) / Low (<60)
17. Filter by Date range: All / Today / Last 7 days / Last 30 days / Custom range
18. Filters stack (AND logic)
19. Active filters shown as badges with X to remove
20. "Clear all filters" button
21. Filters persist in URL query params (shareable links)

**5. Search**
22. Search by game URL (partial match, case-insensitive)
23. Search input with clear button (X icon)
24. Real-time search (debounced 300ms)
25. "No results found" empty state for filtered results

**6. Export Options**
26. "Export" button for each completed test (in table Actions column)
27. Export dropdown: "Download JSON" / "Download Screenshots (.zip)"
28. JSON export: full test metadata, scores, events, artifact URLs
29. Screenshot export: zip file with all screenshots, named by timestamp/phase
30. Bulk export (future): Select multiple tests, export all as single zip

**7. Quick Submit in Table View**
31. URL submission form always visible at top (same as Card Gallery)
32. Submit → Auto-open Agent Focus Mode (consistent behavior)

**Prerequisites:** Epic 4 complete (polished UX foundation)

**Technical Notes:**
- Reference: `docs/ux-design-specification.md` (Section 4.1: Three-View Architecture)
- Use shadcn/ui Table component as base
- Implement with Tailwind responsive utilities
- URL state management: React Router (or similar) query params
- Export: Generate JSON client-side, screenshots via R2 signed URLs
- This completes UX Phase 2 (Power User Features)

---

## UX Phase 4: Advanced Features

**Story 5.2: Stop/Kill Running Tests**

As a game developer,
I want to stop a running test that's taking too long or is stuck,
So that I don't waste resources on tests I no longer need.

**Acceptance Criteria:**
1. "Stop Test" button visible in Agent Focus Mode for running tests
2. Button styled as destructive (red) with confirmation dialog
3. Confirmation: "Are you sure? This will stop the test immediately."
4. On confirm: Send stop signal to TestAgent DO
5. TestAgent gracefully terminates: save partial results, mark status as "Stopped"
6. Dashboard updates status badge to "Stopped" (gray color)
7. Partial results viewable: show progress up to stop point
8. Stop reason logged in test_events: "Stopped by user"
9. WebSocket connection closed cleanly

**Prerequisites:** Story 5.1 complete

**Technical Notes:**
- Add RPC method: `stopTest(testId)` on Dashboard Worker
- TestAgent DO handles stop signal: abort Workflow, save state
- Graceful shutdown: capture final screenshot, log stop event
- UI: Use shadcn/ui AlertDialog for confirmation
- UX Phase 4 feature

---

**Story 5.3: Batch Testing**

As a game platform operator,
I want to submit multiple URLs at once for testing,
So that I can efficiently test my game catalog.

**Acceptance Criteria:**
1. Batch submission form: textarea for multiple URLs (one per line)
2. Validate all URLs before submission
3. Submit up to 10 tests in parallel (respecting rate limits)
4. Batch progress indicator showing X/Y tests completed
5. Batch results summary: average score, pass/fail counts
6. Export batch results as CSV

**Prerequisites:** Story 5.2

---

**Story 5.4: Multi-Model Comparison**

As a developer,
I want to compare test results across different AI models,
So that I can optimize for accuracy vs cost.

**Acceptance Criteria:**
1. Option to run same test with multiple models
2. Side-by-side comparison view of scores
3. Highlight score differences >10 points
4. Show cost and duration per model
5. Model comparison analytics: agreement rate, cost efficiency
6. Recommended model based on game type

**Prerequisites:** Story 5.3

---

**Story 5.5: Version Comparison and Historical Analytics**

As a game developer,
I want to see how my game improves over time and compare versions side-by-side,
So that I can track quality progress and understand regressions.

**Acceptance Criteria:**

**1. Version History**
1. Group all tests for the same game URL
2. "Version History" view accessible from Agent Focus Mode
3. Show timeline of all tests for this URL (chronological)
4. Highlight score trends: improving (green arrows), regressing (red arrows), stable

**2. Side-by-Side Comparison**
5. Select two test versions to compare
6. Split-screen view: Version A (left) vs Version B (right)
7. Compare overall scores with delta (+5, -3, etc.)
8. Compare individual metric scores side-by-side
9. Compare screenshots (same phase/timestamp aligned)
10. Highlight key differences in AI justifications

**3. Trend Visualization**
11. Score trend chart over time (line graph)
12. X-axis: test dates, Y-axis: quality score (0-100)
13. Interactive: hover to see test details, click to open
14. Mark significant score changes (>10 points)

**4. Aggregated Analytics Dashboard**
15. Global analytics view: total tests run, average score across all games
16. Top performing games (highest average scores)
17. Most common issues identified (extracted from AI justifications)
18. Test volume over time (bar chart)
19. Average test duration trend

**Prerequisites:** Story 5.4

**Technical Notes:**
- Reference: `docs/ux-design-specification.md` (UX Phase 4: Version comparison)
- URL grouping: normalize URLs (strip query params, trailing slashes)
- Chart library: Consider lightweight options (Chart.js, Recharts)
- Store version labels (optional): Allow users to tag versions
- UX Phase 4 advanced feature

---

**Story 5.6: Workers KV Dashboard Caching**

As a developer,
I want to use Workers KV for high-performance dashboard caching,
So that the dashboard loads instantly even under high traffic.

**Acceptance Criteria:**
1. Workers KV namespace created and bound to Dashboard Worker
2. Cache test list in KV with 30-second TTL
3. Cache individual test reports in KV with 5-minute TTL
4. Cache invalidation on test completion (update KV immediately)
5. Fallback to D1 if KV cache miss
6. Dashboard load time improved: <200ms for cached data
7. Monitor KV hit rate and cache effectiveness
8. Document caching strategy in technical docs

**Prerequisites:** Story 5.1

**Technical Notes:**
- Workers KV provides global, low-latency reads
- Use KV for hot data (recent tests, active test reports)
- D1 remains source of truth; KV is read cache only
- Cache key format: `test:list:recent`, `test:report:{testId}`
- Reference: https://developers.cloudflare.com/kv/
- Consider KV for other frequently accessed data (analytics, leaderboards)

---

**Epic 5 Summary:**
- **Total Stories:** 6
- **Story Order:** 5.1 (UX Phase 2: Table View) → 5.2-5.6 (UX Phase 4: Advanced Features)
- **UX Phases Implemented:** Phase 2 (Power User Features) + Phase 4 (Advanced Features)
- **Estimated Duration:** Days 9-14+
- **Deliverable:** Advanced features for power users, batch operators, and analytics

**🚀 POWER USER MILESTONE:** After Story 5.1, power users have efficient Table View with filtering, sorting, search, and export. Stories 5.2-5.6 add advanced capabilities (stop tests, batch, comparison, analytics, caching).

---
