# Epic 5: Advanced Features **(Post-MVP)**

**Goal:** Add power-user features and enhancements for improved usability and insights.

**Value:** Differentiates GameEval with advanced capabilities - filtering, multi-model comparison, batch testing, and analytics.

**Phase:** Post-MVP - Future

**Dependencies:** Epic 4 (production-ready system)

---

## Stories

**Story 5.1: Dashboard Filtering and Sorting**

As a game developer,
I want to filter and sort test runs,
So that I can find specific tests quickly.

**Acceptance Criteria:**
1. Filter options: Status (all/completed/failed), Date range, Score range
2. Sort options: Newest first, Oldest first, Highest score, Lowest score
3. Search by game URL (partial match)
4. Filters persist in URL query params (shareable links)
5. Clear all filters button
6. Filter/sort state saved in localStorage

**Prerequisites:** Epic 4 complete

---

**Story 5.2: Batch Testing**

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

**Prerequisites:** Story 5.1

---

**Story 5.3: Multi-Model Comparison**

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

**Prerequisites:** Story 5.1

---

**Story 5.4: Historical Trends and Analytics**

As a game developer,
I want to see how my game improves over time,
So that I can track quality progress.

**Acceptance Criteria:**
1. Game history: all tests for same URL grouped
2. Score trend chart over time
3. Highlight improvements and regressions
4. Compare two test versions side-by-side
5. Analytics dashboard: total tests run, average scores, common issues
6. Top issues identified across all tests

**Prerequisites:** Story 5.2

---

**Story 5.5: Workers KV Dashboard Caching**

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
- **Total Stories:** 5
- **Can run in parallel:** All stories relatively independent
- **Estimated Duration:** Days 9-12+
- **Deliverable:** Advanced features for power users and platform operators

---
