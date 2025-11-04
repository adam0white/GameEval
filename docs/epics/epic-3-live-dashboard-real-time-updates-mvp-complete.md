# Epic 3: Live Dashboard & Real-Time Updates **[MVP COMPLETE]**

**Goal:** Build user-facing dashboard with WebSocket live updates and comprehensive test reports.

**Value:** Makes the magic visible - users watch the AI play their game in real-time and get actionable feedback. This epic completes the MVP end-to-end user experience.

**Phase:** 3 (MVP Complete) - Days 4-5

**Dependencies:** Epics 1 & 2 (complete infrastructure and TestAgent)

---

## Stories

**Story 3.1: Dashboard Worker with URL Submission**

As a game developer,
I want a web dashboard where I can submit game URLs for testing,
So that I can easily request QA tests.

**Acceptance Criteria:**
1. Dashboard Worker created: `src/workers/dashboard.ts`
2. Serves HTML/CSS/JS directly from Worker (no separate static hosting)
3. Clean, minimal UI following Cloudflare design patterns (orange accents, monospace fonts)
4. Header: "GameEval QA Pipeline" with tagline
5. URL submission form with fields:
   - Game URL (required, validated HTTP/HTTPS)
   - Input Schema (optional, JSON textarea with validation)
6. Submit button triggers RPC call to Dashboard Worker's `submitTest(gameUrl, inputSchema)` method
7. On successful submission: generate UUID, trigger Workflow via service binding, show test ID to user
8. Form validation: URL format, JSON schema format (if provided)
9. Responsive layout: works on desktop (mobile post-MVP)

**Prerequisites:** Epic 1 & 2 complete

**Technical Notes:**
- Inline HTML/CSS/JS in Worker response (no separate assets for simplicity)
- Use RPC service bindings - no REST API endpoints
- UUID generation: crypto.randomUUID()
- Workflow trigger: env.WORKFLOW.create().run({ testRunId, gameUrl, inputSchema })
- Dashboard communicates via RPC to Worker methods only

---

**Story 3.2: Test Run List with Real-Time Status**

As a game developer,
I want to see a live-updating list of test runs with their status,
So that I can track multiple tests and see progress.

**Acceptance Criteria:**
1. Test run list displayed below submission form
2. Polls Dashboard Worker's RPC method `listTests()` every 3 seconds for updates (simple polling for MVP)
3. Each test run card shows:
   - Game URL (truncated with tooltip on hover)
   - Status badge (Queued, Running, Completed, Failed) with color coding
   - Progress indicator showing current phase (1/4, 2/4, 3/4, 4/4)
   - Start time (relative: "2 minutes ago")
   - Duration (if completed)
   - Overall quality score (if completed, with color: green >70, yellow 50-70, red <50)
4. Test runs sorted by newest first
5. Status badge colors: gray (queued), blue (running), green (completed), red (failed)
6. Click test run card to expand inline for detailed report
7. Loading state while polling
8. Empty state message: "No tests yet. Submit a game URL to get started!"

**Prerequisites:** Story 3.1

**Technical Notes:**
- RPC method `listTests()` returns: array of {id, url, status, phase, score, timestamps}
- Query D1: SELECT from test_runs ORDER BY created_at DESC LIMIT 50
- Use CSS transitions for smooth updates
- Progress indicator: show "Phase 2/4" based on latest test_events entry
- All communication via RPC service bindings, no HTTP API

---

**Story 3.3: WebSocket Connection for Live Updates**

As a game developer,
I want to see real-time updates as the AI tests my game,
So that I understand what's happening without manual refresh.

**Acceptance Criteria:**
1. Dashboard connects to TestAgent DO via WebSocket (using Agents SDK WebSocket API)
2. Connection established through RPC call to Dashboard Worker: `connectToTest(testRunId)`
3. TestAgent broadcasts updates via WebSocket:
   - Phase transitions: "Starting Phase 2..."
   - Progress messages: "Discovering controls..."
   - Action updates: "Testing WASD movement"
   - Completion: "Test complete! Score: 78/100"
4. Dashboard receives WebSocket messages and updates UI instantly
5. Status badge updates in real-time (no polling delay)
6. Progress messages shown in expandable "Live Feed" section per test
7. WebSocket reconnects automatically if connection drops
8. Fallback to polling if WebSocket unavailable

**Prerequisites:** Story 3.2

**Technical Notes:**
- Use Agents SDK WebSocket API from TestAgent DO
- WebSocket connection via RPC service binding (no exposed HTTP WebSocket endpoint)
- WebSocket message format: { type: 'status'|'progress'|'complete', data: {...} }
- Frontend: WebSocket API with automatic reconnection logic
- Rate limit WS messages: max 1 update per 5 seconds to avoid spam

---

**Story 3.4: Detailed Test Report View**

As a game developer,
I want to view comprehensive test results with visual evidence,
So that I can understand quality issues and fix them.

**Acceptance Criteria:**
1. Click test run card to expand inline (no separate page)
2. Expanded view shows:
   - Large overall quality score (0-100) with color coding
   - 5 individual metric scores with progress bars
   - AI justification text for each metric (2-3 sentences)
   - Timeline of AI actions with timestamps
   - Screenshot gallery (grid layout, click to enlarge)
   - Expandable console error log (if errors found)
   - Expandable network error log (if failures found)
   - Test duration and timestamp
   - AI model used for evaluation
3. Screenshots display with captions: phase and action description
4. Screenshot lightbox: click to view full-size with prev/next navigation
5. Console errors syntax highlighted (if applicable)
6. "Export JSON" button downloads full test report
7. Collapse button to close expanded view

**Prerequisites:** Story 3.3

**Technical Notes:**
- RPC method `getTestReport(testId)` returns full test data
- Join queries: test_runs + evaluation_scores + test_events
- Screenshot URLs from R2: signed URLs or public access
- JSON export: full test metadata + scores + events + artifact URLs
- All data fetched via RPC, no HTTP API endpoints

---

**Story 3.5: Example Game Testing and Validation**

As a developer,
I want to test GameEval with real DOM-based example games,
So that I validate the system works end-to-end before launch.

**Acceptance Criteria:**
1. Test with 3-5 example DOM-based games (provided by user)
2. Validate: TestAgent successfully loads each game
3. Validate: Control discovery finds interactive elements
4. Validate: Agent plays each game autonomously for 1-3 minutes
5. Validate: Minimum 5 screenshots captured per test
6. Validate: Quality scores generated with justifications
7. Validate: Dashboard displays results correctly
8. Validate: WebSocket updates work in real-time
9. Test with input schema provided (for at least 1 game)
10. Test error handling: submit invalid URL, test graceful failures
11. Document any edge cases discovered for post-MVP fixes

**Prerequisites:** Stories 3.1, 3.2, 3.3, 3.4

**Technical Notes:**
- Example games should use DOM UI elements (not canvas)
- Test variety: different control schemes, game genres
- Manual QA checklist: load times, UI responsiveness, score accuracy
- Capture any bugs in GitHub issues for Epic 4

---

**Story 3.6: Production Deployment and Documentation**

As a developer,
I want GameEval deployed to production with basic documentation,
So that the system is accessible and maintainable.

**Acceptance Criteria:**
1. Deploy Dashboard Worker to Cloudflare Workers production
2. Deploy TestAgent DO to production
3. Deploy Workflow to production
4. Configure production bindings: D1, R2, Browser Rendering, AI Gateway
5. Set up production environment variables and secrets
6. Create README.md with:
   - Project overview and architecture
   - Setup instructions for local development
   - Deployment guide
   - Environment variable reference
   - RPC service binding documentation
7. Create USAGE.md with:
   - How to submit tests via dashboard
   - How to interpret quality scores
   - Input schema format and examples
   - Troubleshooting common issues
8. Configure custom domain (optional, post-MVP acceptable)
9. Test production deployment with example game

**Prerequisites:** Story 3.5 complete and validated

**Technical Notes:**
- Use wrangler publish for deployment
- Production secrets: AI Gateway keys, any external API keys
- Monitor logs for first 24 hours post-launch
- Consider Cloudflare Analytics for usage tracking (post-MVP)
- Document RPC architecture: all internal communication via service bindings

---

**Epic 3 Summary:**
- **Total Stories:** 6
- **Sequential dependencies:** 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6
- **Estimated Duration:** Days 4-5
- **Deliverable:** **🎉 MVP COMPLETE** - Full end-to-end game testing pipeline with live dashboard

**🏁 MVP MILESTONE:** After Epic 3, GameEval is feature-complete and production-ready. Users can submit game URLs, watch AI test games in real-time, and receive comprehensive quality reports.

---
