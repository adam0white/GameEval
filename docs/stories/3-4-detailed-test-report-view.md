# Story 3.4: Detailed Test Report View

Status: ready-for-dev

## Story

As a game developer,
I want to view comprehensive test results with visual evidence,
so that I can understand quality issues and fix them.

## Business Context

Story 3.4 completes the Dashboard Worker MVP by implementing the detailed test report view that displays comprehensive test results when users click on a test run card. This story builds on Story 3.2 (test list with expandable cards) and Story 3.3 (WebSocket real-time updates) to provide a complete visualization of test execution results. The detailed report includes overall quality scores, individual metric breakdowns with AI justifications, a timeline of AI actions, screenshot galleries, console/network error logs, and JSON export functionality. This story implements the detailed test report component from the architecture, enabling developers to understand exactly what the AI discovered during testing and how quality scores were calculated.

**Value:** Provides developers with actionable feedback about game quality issues, enabling them to identify and fix problems quickly. Without this feature, developers would only see overall scores without understanding the reasoning behind evaluations or visual evidence of issues discovered during testing. This story transforms the dashboard from a simple status display into a comprehensive QA analysis tool.

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.4]  
[Source: docs/epic-3-tech-context.md, Story 3.4: Detailed Test Report View Flow]

## Acceptance Criteria

1. **Click test run card to expand inline (no separate page)**: Clicking a test run card expands an inline section showing detailed test report, replacing the placeholder content from Story 3.2
2. **Expanded view shows all required elements**: Large overall quality score (0-100) with color coding (green >70, yellow 50-70, red <50), 5 individual metric scores with progress bars (load, visual, controls, playability, technical), AI justification text for each metric (2-3 sentences), Timeline of AI actions with timestamps (chronological list of test_events), Screenshot gallery (grid layout, click to enlarge), Expandable console error log (if errors found), Expandable network error log (if failures found), Test duration and timestamp, AI model used for evaluation
3. **Screenshots display with captions**: Each screenshot shows phase and action description (e.g., "Phase 2: Discovered WASD controls")
4. **Screenshot lightbox: click to view full-size with prev/next navigation**: Clicking a screenshot opens a lightbox modal with full-size image, previous/next navigation buttons, and close button
5. **Console errors syntax highlighted (if applicable)**: Console error log displays with syntax highlighting for JavaScript errors (optional enhancement)
6. **"Export JSON" button downloads full test report**: Export button downloads complete TestReport JSON including all metadata, scores, events, and artifact URLs
7. **Collapse button to close expanded view**: Collapse button or clicking outside expanded view closes the detailed report section

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.4 Acceptance Criteria]  
[Source: docs/epic-3-tech-context.md, Story 3.4: Detailed Test Report View]

## Tasks / Subtasks

### Task 1: Implement getTestReport() RPC Method (AC: 2)

- [ ] Add `getTestReport(testId)` RPC method handler in `src/workers/dashboard.ts`
- [ ] Add route handler for `GET /rpc/getTestReport?testId={testId}`
- [ ] Validate `testId` parameter (UUID format)
- [ ] Query D1 for test run: `SELECT * FROM test_runs WHERE id = ?`
- [ ] Query D1 for evaluation scores: `SELECT * FROM evaluation_scores WHERE test_run_id = ? ORDER BY created_at`
- [ ] Query D1 for test events: `SELECT * FROM test_events WHERE test_run_id = ? ORDER BY timestamp`
- [ ] Query R2 for screenshots: List objects in `tests/{testId}/screenshots/` directory
- [ ] Query R2 for console log: Read `tests/{testId}/logs/console.log` file
- [ ] Query R2 for network log: Read `tests/{testId}/logs/network.log` file
- [ ] Join all data into `TestReport` object format
- [ ] Generate signed URLs for screenshots (if R2 bucket not public)
- [ ] Handle errors gracefully: Return user-friendly error message if test not found
- [ ] Test RPC method with valid testId
- [ ] Test RPC method with invalid testId (error handling)
- [ ] Test RPC method with test that has no screenshots (partial data)

### Task 2: Implement exportTestJSON() RPC Method (AC: 6)

- [ ] Add `exportTestJSON(testId)` RPC method handler in `src/workers/dashboard.ts`
- [ ] Add route handler for `GET /rpc/exportTestJSON?testId={testId}`
- [ ] Validate `testId` parameter (UUID format)
- [ ] Call `getTestReport()` to get complete test data
- [ ] Serialize TestReport to JSON string with proper formatting (2-space indent)
- [ ] Set response headers: `Content-Type: application/json`, `Content-Disposition: attachment; filename="test-{testId}.json"`
- [ ] Return JSON response (downloadable file)
- [ ] Test export with valid testId
- [ ] Test export with invalid testId (error handling)

### Task 3: Add TestReport Type Definitions (AC: 2, 6)

- [ ] Add `TestReport` interface to `src/shared/types.ts`
- [ ] Define interface with fields: `id`, `url`, `inputSchema?`, `status`, `overallScore`, `metrics: MetricScore[]`, `screenshots: ScreenshotMetadata[]`, `events: TestEvent[]`, `consoleLogs: string[]`, `networkErrors: NetworkError[]`, `timestamps: { createdAt, completedAt, duration }`, `aiModel?`
- [ ] Add `MetricScore` interface: `name`, `score`, `justification`
- [ ] Add `ScreenshotMetadata` interface: `url`, `phase`, `description`, `timestamp`
- [ ] Add `TestEvent` interface: `phase`, `eventType`, `description`, `timestamp`
- [ ] Add `NetworkError` interface: `url`, `status`, `timestamp`
- [ ] Export all interfaces for use in Dashboard Worker and frontend
- [ ] Test TypeScript compilation with new types

### Task 4: Implement Detailed Report UI Component (AC: 1, 2, 7)

- [ ] Replace placeholder expanded content from Story 3.2 with complete detailed report HTML structure
- [ ] Add overall score section: Large score display with color coding (green/yellow/red)
- [ ] Add metrics section: 5 metric scores with progress bars and AI justifications
- [ ] Add timeline section: Chronological list of test events with timestamps
- [ ] Add screenshot gallery section: Grid layout container for screenshots
- [ ] Add console error log section: Expandable/collapsible section with syntax highlighting (if applicable)
- [ ] Add network error log section: Expandable/collapsible section with error list
- [ ] Add metadata section: Test duration, timestamp, AI model used
- [ ] Add collapse button: Click to close expanded view
- [ ] Add CSS styles for all sections (colors, spacing, typography)
- [ ] Implement click-outside-to-close functionality (optional)
- [ ] Test expanded view displays correctly
- [ ] Test collapse button closes expanded view
- [ ] Test click-outside closes expanded view (if implemented)

### Task 5: Implement Screenshot Gallery Component (AC: 3, 4)

- [ ] Add screenshot gallery HTML structure: Grid layout with image thumbnails
- [ ] Add screenshot captions: Display phase and action description below each thumbnail
- [ ] Add CSS styles for gallery grid: Responsive grid layout, image thumbnails, captions
- [ ] Implement screenshot click handler: Opens lightbox modal
- [ ] Add lightbox modal HTML structure: Full-size image, prev/next buttons, close button
- [ ] Add lightbox CSS styles: Overlay, modal container, full-size image, navigation buttons
- [ ] Implement lightbox navigation: Previous/next buttons navigate through screenshots
- [ ] Implement lightbox close: Close button and ESC key closes lightbox
- [ ] Add keyboard navigation: Arrow keys for prev/next, ESC for close
- [ ] Test screenshot gallery displays with captions
- [ ] Test clicking screenshot opens lightbox
- [ ] Test lightbox navigation (prev/next buttons)
- [ ] Test lightbox keyboard navigation
- [ ] Test lightbox closes correctly

### Task 6: Implement Console Error Log Component (AC: 2, 5)

- [ ] Add console error log HTML structure: Expandable/collapsible section
- [ ] Add CSS styles for console log: Monospace font, syntax highlighting styles (if applicable)
- [ ] Parse console log content: Split by newlines, format as list
- [ ] Add syntax highlighting: Highlight JavaScript errors (optional enhancement)
- [ ] Add expand/collapse toggle button
- [ ] Default state: Console log collapsed (only show if errors found)
- [ ] Test console log displays correctly
- [ ] Test console log expands/collapses correctly
- [ ] Test syntax highlighting (if implemented)

### Task 7: Implement Network Error Log Component (AC: 2)

- [ ] Add network error log HTML structure: Expandable/collapsible section
- [ ] Add CSS styles for network log: Error list formatting
- [ ] Parse network log content: Format as list of errors with URL and status
- [ ] Add expand/collapse toggle button
- [ ] Default state: Network log collapsed (only show if errors found)
- [ ] Test network log displays correctly
- [ ] Test network log expands/collapses correctly

### Task 8: Implement Frontend getTestReport() Call and Rendering (AC: 1, 2)

- [ ] Add JavaScript function `loadTestReport(testId)` to fetch test report from RPC
- [ ] Add JavaScript function `renderTestReport(testReport)` to render all sections
- [ ] Update test card click handler: Call `loadTestReport()` when card clicked
- [ ] Render overall score: Format score with color coding
- [ ] Render metrics: Create progress bars for each metric, display justifications
- [ ] Render timeline: Format events chronologically with timestamps
- [ ] Render screenshot gallery: Create image elements with captions
- [ ] Render console error log: Format and display console errors (if present)
- [ ] Render network error log: Format and display network errors (if present)
- [ ] Render metadata: Display test duration, timestamp, AI model
- [ ] Add loading state: Show loading indicator while fetching test report
- [ ] Add error handling: Display error message if test report fetch fails
- [ ] Test test report loads correctly when card clicked
- [ ] Test all sections render correctly
- [ ] Test loading state displays during fetch
- [ ] Test error handling for failed fetch

### Task 9: Implement Export JSON Functionality (AC: 6)

- [ ] Add "Export JSON" button to detailed report UI
- [ ] Add JavaScript function `exportTestJSON(testId)` to trigger download
- [ ] Call RPC method `GET /rpc/exportTestJSON?testId={testId}`
- [ ] Create download link: Use `URL.createObjectURL()` or direct download
- [ ] Trigger file download: Set filename as `test-{testId}.json`
- [ ] Test export button downloads JSON file
- [ ] Test downloaded JSON contains complete test report
- [ ] Test export with invalid testId (error handling)

### Task 10: Add Integration Testing

- [ ] Test complete flow: Click test run card → Detailed report loads → All sections display correctly
- [ ] Test screenshot gallery displays with captions
- [ ] Test screenshot lightbox opens and navigates correctly
- [ ] Test console error log expands/collapses (if errors present)
- [ ] Test network error log expands/collapses (if errors present)
- [ ] Test export JSON downloads complete report
- [ ] Test collapse button closes expanded view
- [ ] Test error handling (test not found, R2 access failures)
- [ ] Test partial data display (test with no screenshots, no errors)

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-001**: Monorepo with RPC-Only Architecture - Dashboard Worker uses RPC service bindings exclusively, no REST API endpoints exposed. Test report data fetched via `getTestReport()` RPC method.
- **Data Query Pattern**: Dashboard Worker queries D1 for test_runs, evaluation_scores, test_events tables and R2 for screenshots and logs. Join queries combine data into TestReport object.
- **R2 Evidence Access**: Screenshots and logs retrieved via R2 signed URLs or public bucket access. Dashboard Worker generates signed URLs if bucket not public.
- **Frontend-Backend Unity**: All UI logic in same Worker, no CORS concerns. Detailed report HTML/CSS/JS inline in Dashboard Worker response.
- **Error Handling Pattern**: All RPC methods catch errors and return user-friendly messages (never expose stack traces). Use `sanitizeErrorMessage()` helper from Story 3.1.

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001]  
[Source: docs/epic-3-tech-context.md, Story 3.4: Detailed Test Report View Flow]  
[Source: docs/prd/4-functional-requirements.md, FR-1.5 Test Report Output]  
[Source: docs/prd/6-technical-architecture.md, Section 6.3 Service Communication Pattern]

### Source Tree Components to Touch

- **`src/workers/dashboard.ts`**: Add `getTestReport()` and `exportTestJSON()` RPC methods, update `getHTML()` to include detailed report UI components and JavaScript (MODIFIED)
  - `getTestReport()` RPC method: Query D1 and R2, join data into TestReport format
  - `exportTestJSON()` RPC method: Serialize TestReport to JSON and return as downloadable file
  - Frontend JavaScript: Add test report loading, rendering, screenshot gallery, lightbox, export functionality
  - HTML/CSS: Add detailed report UI structure, screenshot gallery, lightbox modal, console/network error logs
- **`src/shared/types.ts`**: Add `TestReport`, `MetricScore`, `ScreenshotMetadata`, `TestEvent`, `NetworkError` interfaces (MODIFIED)
  - `TestReport` interface: Complete test report structure with all fields
  - Supporting interfaces: MetricScore, ScreenshotMetadata, TestEvent, NetworkError
- **`src/shared/helpers/`**: May need R2 helper functions for listing screenshots and reading logs (VERIFY if helpers exist from Epic 1)

### Testing Standards Summary

- **Unit Testing**: Test `getTestReport()` queries D1 and R2 correctly, test `exportTestJSON()` serializes correctly, test frontend rendering functions
- **Integration Testing**: Test Dashboard Worker returns complete test report, test screenshot gallery displays correctly, test lightbox navigation works, test export JSON downloads correctly
- **Manual Testing**: Test detailed report displays in browser, verify all sections render correctly, test screenshot lightbox, test export functionality, test error handling
- **Error Handling Tests**: Test test report fetch failures, test R2 access failures, test invalid testId, test partial data display

[Source: docs/epic-3-tech-context.md, Test Strategy Summary section]

### Project Structure Notes

- Dashboard Worker follows existing project structure: `src/workers/dashboard.ts` (modify existing file from Story 3.2/3.3)
- Detailed report UI inline in Dashboard Worker HTML (no separate static directory needed)
- Types follow existing pattern: shared types in `src/shared/types.ts`
- R2 access follows existing patterns: Use R2 helper functions from Epic 1 if available, or implement direct R2 API calls

[Source: docs/architecture/project-structure.md]

### Learnings from Previous Story

**From Story 3.3 (WebSocket Connection for Live Updates) (Status: ready-for-dev)**

- **Dashboard Worker Structure**: Story 3.3 extended `src/workers/dashboard.ts` with WebSocket connection handler - Story 3.4 should extend this existing file, not create new files
- **RPC Method Pattern**: Story 3.3 established pattern for RPC methods: route handler in `fetch()` method, separate function for business logic, error handling with `sanitizeErrorMessage()` - Story 3.4 should follow same pattern for `getTestReport()` and `exportTestJSON()`
- **Frontend JavaScript Patterns**: Story 3.3 established frontend JavaScript patterns for WebSocket message handling and UI updates - Story 3.4 should follow similar patterns for test report loading and rendering
- **Test Run Card Component**: Story 3.3 added "Live Feed" section to test run card - Story 3.4 should replace placeholder expanded content from Story 3.2 with complete detailed report
- **Type Definitions**: Story 3.3 added `WebSocketMessage` interface to `src/shared/types.ts` - Story 3.4 should add `TestReport` and supporting interfaces to same file
- **Error Handling**: Story 3.3 implemented error handling for WebSocket connection failures - Story 3.4 should implement error handling for D1/R2 query failures and test report fetch failures
- **UI Component Patterns**: Story 3.3 created expandable "Live Feed" section - Story 3.4 should create expandable console/network error log sections following similar patterns

**From Story 3.2 (Test Run List with Real-Time Status) (Status: done)**

- **Test Run Card Structure**: Story 3.2 created test run card HTML structure with placeholder expanded section - Story 3.4 should replace placeholder with complete detailed report implementation
- **Card Click Handler**: Story 3.2 implemented card click handler that toggles expanded state - Story 3.4 should enhance this to load and render detailed test report
- **D1 Query Patterns**: Story 3.2 established D1 query patterns using helper functions - Story 3.4 should use similar patterns for querying test_runs, evaluation_scores, and test_events
- **RPC Method Implementation**: Story 3.2 implemented `listTests()` RPC method - Story 3.4 should follow same pattern for `getTestReport()` and `exportTestJSON()`

[Source: docs/stories/3-3-websocket-connection-for-live-updates.md#Dev-Agent-Record]  
[Source: docs/stories/3-2-test-run-list-with-real-time-status.md#Dev-Agent-Record]

### References

- **Cloudflare Workers Documentation**: https://developers.cloudflare.com/workers/
- **Cloudflare D1 Database Documentation**: https://developers.cloudflare.com/d1/
- **Cloudflare R2 Storage Documentation**: https://developers.cloudflare.com/r2/
- **MDN Web APIs - URL.createObjectURL**: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
- [Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001]  
[Source: docs/epic-3-tech-context.md, Story 3.4: Detailed Test Report View Flow]  
[Source: docs/prd/4-functional-requirements.md, FR-1.5 Test Report Output]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.4 Technical Notes]

## Dev Agent Record

### Context Reference

- `docs/stories/3-4-detailed-test-report-view.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-01-27: Story drafted (Adam)

