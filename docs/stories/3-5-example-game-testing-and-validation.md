# Story 3.5: Example Game Testing and Validation

Status: ready-for-dev

## Story

As a developer,
I want to test GameEval with real DOM-based example games,
so that I validate the system works end-to-end before launch.

## Business Context

Story 3.5 is a critical validation story that tests the entire GameEval system with real DOM-based games before production deployment. This story completes the MVP validation phase by ensuring all components (Dashboard Worker, TestAgent DO, Workflow, D1, R2, Browser Rendering, AI Gateway) work together correctly with actual game URLs. The story validates that TestAgent successfully loads games, discovers controls, plays autonomously, captures evidence, generates quality scores, and displays results correctly in the dashboard. This story also tests error handling scenarios and validates WebSocket real-time updates. Any edge cases or bugs discovered during validation will be documented for Epic 4 fixes.

**Value:** Provides confidence that the MVP system works correctly with real games before production launch. Without this validation, production deployment risks exposing critical bugs to users. This story ensures all Epic 3 features work together seamlessly and validates the end-to-end user experience.

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.5]

## Acceptance Criteria

1. **Test with 3-5 example DOM-based games (provided by user)**: Submit 3-5 different DOM-based game URLs through the dashboard, covering different game genres and control schemes
2. **Validate: TestAgent successfully loads each game**: Each game URL loads successfully in browser rendering, no 404 errors, no blank pages, Phase 1 completes successfully
3. **Validate: Control discovery finds interactive elements**: Phase 2 discovers at least one interactive element (button, input, clickable div) for each game, screenshots show discovered controls
4. **Validate: Agent plays each game autonomously for 1-3 minutes**: Phase 3 executes successfully, agent performs autonomous actions (clicks, keyboard input, navigation), test runs for 1-3 minutes per game
5. **Validate: Minimum 5 screenshots captured per test**: Each test run captures at least 5 screenshots stored in R2 under `tests/{testId}/screenshots/`, screenshots visible in dashboard detailed report
6. **Validate: Quality scores generated with justifications**: Phase 4 completes successfully, overall quality score (0-100) generated, all 5 individual metric scores generated with 2-3 sentence justifications, scores stored in D1
7. **Validate: Dashboard displays results correctly**: Test run appears in dashboard test list, status updates correctly (Queued → Running → Completed), detailed report view shows all sections (scores, metrics, timeline, screenshots, logs), WebSocket updates work in real-time
8. **Validate: WebSocket updates work in real-time**: WebSocket connection established, phase transitions broadcast in real-time, progress messages appear in Live Feed section, status badge updates without polling delay
9. **Test with input schema provided (for at least 1 game)**: Submit at least one game with input schema JSON, verify agent uses schema to guide control discovery, verify schema appears in test report metadata
10. **Test error handling: submit invalid URL, test graceful failures**: Submit invalid URL (non-HTTP, malformed), verify user-friendly error message displayed, verify graceful error message, verify test run status shows "Failed" status with error message
11. **Document any edge cases discovered for post-MVP fixes**: Document any bugs, edge cases, or unexpected behaviors in a markdown file or GitHub issues, categorize issues (critical, major, minor), prioritize for Epic 4

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.5 Acceptance Criteria]

## Tasks / Subtasks

### Task 1: Prepare Example Game URLs and Input Schema (AC: 1, 9)

- [ ] Identify 3-5 DOM-based example games (different genres: puzzle, action, strategy, etc.) **[MANUAL - User Required]**
- [ ] Verify each game URL is accessible and loads correctly in browser **[MANUAL - User Required]**
- [x] Create input schema JSON for at least one game (controls, game mechanics, expected interactions)
- [x] Document game URLs and input schema in a test plan document
- [ ] Verify games use DOM UI elements (not canvas) for compatibility with TestAgent **[MANUAL - User Required]**

### Task 2: Validate Game Loading (AC: 2)

- [ ] Submit first example game URL through dashboard
- [ ] Monitor test run status in dashboard
- [ ] Verify Phase 1 completes successfully: game loads, no 404 errors, no blank pages
- [ ] Check test_events table in D1: verify Phase 1 event logged with "load" status
- [ ] Verify initial screenshot captured in R2
- [ ] Repeat for all 3-5 example games
- [ ] Document any games that fail to load (for Epic 4)

### Task 3: Validate Control Discovery (AC: 3)

- [ ] Monitor test run for Phase 2 execution
- [ ] Verify Phase 2 completes successfully: at least one interactive element discovered
- [ ] Check test_events table: verify Phase 2 event logged with control discovery details
- [ ] Verify screenshot captured showing discovered controls
- [ ] Check console logs in R2: verify control discovery messages
- [ ] Repeat validation for all games
- [ ] Document any games where control discovery fails (for Epic 4)

### Task 4: Validate Autonomous Gameplay (AC: 4)

- [ ] Monitor test run for Phase 3 execution
- [ ] Verify Phase 3 executes for 1-3 minutes per game
- [ ] Check test_events table: verify multiple Phase 3 events logged (actions, decisions, progress)
- [ ] Verify agent performs autonomous actions: clicks, keyboard input, navigation
- [ ] Check console logs: verify agent decision-making and action execution
- [ ] Verify test run duration is between 1-3 minutes (check test_runs.completed_at - created_at)
- [ ] Repeat validation for all games
- [ ] Document any games where gameplay exploration fails or times out (for Epic 4)

### Task 5: Validate Screenshot Capture (AC: 5)

- [ ] Check R2 storage: verify screenshots stored under `tests/{testId}/screenshots/` directory
- [ ] Count screenshots: verify at least 5 screenshots per test run
- [ ] Verify screenshot filenames include timestamps
- [ ] Check dashboard detailed report: verify screenshot gallery displays all screenshots
- [ ] Verify screenshot captions show phase and action description
- [ ] Test screenshot lightbox: click to view full-size, navigate prev/next
- [ ] Repeat validation for all test runs
- [ ] Document any issues with screenshot capture or display (for Epic 4)

### Task 6: Validate Quality Score Generation (AC: 6)

- [ ] Monitor test run for Phase 4 execution
- [ ] Verify Phase 4 completes successfully: overall quality score (0-100) generated
- [ ] Check evaluation_scores table in D1: verify all 5 metric scores stored (load, visual, controls, playability, technical)
- [ ] Check evaluation_scores table: verify each metric has justification text (2-3 sentences)
- [ ] Verify test_runs.overall_score updated with weighted average
- [ ] Check dashboard detailed report: verify all scores displayed with progress bars and justifications
- [ ] Repeat validation for all test runs
- [ ] Document any issues with score generation or justification quality (for Epic 4)

### Task 7: Validate Dashboard Display (AC: 7)

- [ ] Verify test run appears in dashboard test list immediately after submission
- [ ] Verify status badge updates correctly: Queued → Running → Completed
- [ ] Verify progress indicator shows current phase (1/4, 2/4, 3/4, 4/4)
- [ ] Verify overall quality score displayed in test list (when completed)
- [ ] Click test run card to expand detailed report
- [ ] Verify detailed report shows all sections:
  - Overall score with color coding
  - All 5 metric scores with progress bars and justifications
  - Timeline of AI actions with timestamps
  - Screenshot gallery with captions
  - Console error log (if errors found)
  - Network error log (if failures found)
  - Test duration and timestamp
  - AI model used for evaluation
- [ ] Verify "Export JSON" button downloads complete test report
- [ ] Test collapse button closes expanded view
- [ ] Repeat validation for all test runs
- [ ] Document any UI issues or missing information (for Epic 4)

### Task 8: Validate WebSocket Real-Time Updates (AC: 8)

- [ ] Monitor dashboard while test run executes
- [ ] Verify WebSocket connection established (check browser console for connection messages)
- [ ] Verify phase transitions broadcast in real-time: "Starting Phase 2...", "Starting Phase 3...", etc.
- [ ] Verify progress messages appear in Live Feed section: "Discovering controls...", "Testing WASD movement", etc.
- [ ] Verify status badge updates in real-time without polling delay (no 3-second delay)
- [ ] Verify completion message: "Test complete! Score: {score}/100"
- [ ] Test WebSocket reconnection: simulate connection drop, verify automatic reconnection
- [ ] Test fallback to polling: disable WebSocket, verify polling still works (3-second updates)
- [ ] Repeat validation for multiple test runs
- [ ] Document any WebSocket connection issues or message delays (for Epic 4)

### Task 9: Validate Input Schema Handling (AC: 9)

- [ ] Submit game URL with input schema JSON through dashboard
- [ ] Verify input schema stored in test_runs.input_schema column in D1
- [ ] Monitor test run: verify agent uses schema to guide control discovery (check console logs)
- [ ] Verify Phase 2 prioritizes controls mentioned in schema
- [ ] Check dashboard detailed report: verify input schema displayed in metadata section
- [ ] Verify schema appears in exported JSON report
- [ ] Document any issues with schema parsing or usage (for Epic 4)

### Task 10: Test Error Handling (AC: 10)

- [ ] Submit invalid URL: `not-a-url`
- [ ] Verify user-friendly error message displayed: "Invalid URL format. Please provide a valid HTTP or HTTPS URL."
- [ ] Verify test run status shows "Failed" with error message
- [ ] Submit non-HTTP URL: `ftp://example.com/game`
- [ ] Verify error message displayed
- [ ] Submit malformed URL: `http://`
- [ ] Verify error message displayed
- [ ] Submit valid URL that returns 404: `https://example.com/nonexistent`
- [ ] Verify graceful error handling: test run shows "Failed" with clear error message
- [ ] Check error message stored in test_runs.error_message column
- [ ] Verify error message appears in dashboard (not stack trace)
- [ ] Document any error handling issues or unclear error messages (for Epic 4)

### Task 11: Document Edge Cases and Issues (AC: 11)

- [x] Create markdown file: `docs/validation/edge-cases-epic-3.md` or GitHub issues
- [ ] Document all bugs discovered during validation: **[MANUAL - Complete After Testing]**
  - Critical bugs (block MVP launch)
  - Major bugs (should fix soon)
  - Minor bugs (nice to have)
- [ ] Document edge cases: **[MANUAL - Complete After Testing]**
  - Games that fail to load
  - Control discovery failures
  - Gameplay exploration timeouts
  - Screenshot capture issues
  - Score generation problems
  - Dashboard display issues
  - WebSocket connection problems
  - Error handling gaps
- [x] Categorize issues by component: Dashboard Worker, TestAgent, Workflow, D1, R2, Browser Rendering, AI Gateway
- [x] Prioritize issues for Epic 4: assign P0 (critical), P1 (major), P2 (minor), P3 (nice to have)
- [x] Include steps to reproduce for each issue
- [x] Include expected vs actual behavior for each issue
- [ ] Update sprint-status.yaml with validation findings summary **[MANUAL - Complete After Testing]**

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-001**: Monorepo with RPC-Only Architecture - Validation tests all RPC service bindings (Dashboard Worker → Workflow → TestAgent DO). All communication verified via service bindings.
- **ADR-006**: WebSocket for Real-Time Updates, Polling as Fallback - Validation tests WebSocket connection and real-time message delivery, with fallback to polling if WebSocket unavailable.
- **Error Handling Pattern**: All error scenarios must return user-friendly messages (never expose stack traces). Validation ensures graceful failures with clear error messages.
- **Evidence Storage Pattern**: Screenshots stored in R2 under `tests/{testId}/screenshots/`, logs under `tests/{testId}/logs/`. Validation verifies correct storage structure and accessibility.
- **Test Execution Pattern**: Each test run executes 4-phase workflow (Load → Control Discovery → Gameplay → Evaluation). Validation ensures all phases complete successfully.

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001, ADR-006]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.5 Technical Notes]  
[Source: docs/prd/4-functional-requirements.md, FR-2.5 Error Handling & Agent Resilience]  
[Source: docs/prd/4-functional-requirements.md, FR-6.1-FR-6.3 Evidence Storage]

### Source Tree Components to Touch

- **`docs/validation/edge-cases-epic-3.md`**: Create new file documenting edge cases and issues discovered during validation (NEW)
- **`docs/stories/3-5-example-game-testing-and-validation.md`**: Story file itself (NEW)
- **Dashboard Worker (`src/workers/dashboard.ts`)**: No code changes needed - validation only (NO CHANGES)
- **TestAgent (`src/agents/TestAgent.ts`)**: No code changes needed - validation only (NO CHANGES)
- **Workflow (`src/workflows/GameTestPipeline.ts`)**: No code changes needed - validation only (NO CHANGES)
- **D1 Database**: Query test_runs, evaluation_scores, test_events tables to verify data integrity (VALIDATION ONLY)
- **R2 Storage**: List screenshots and logs to verify evidence storage (VALIDATION ONLY)

### Testing Standards Summary

- **Manual Testing**: This story is primarily manual validation testing. No automated tests created - manual QA checklist executed.
- **Integration Testing**: Validates integration between all components (Dashboard Worker, TestAgent DO, Workflow, D1, R2, Browser Rendering, AI Gateway).
- **End-to-End Testing**: Full end-to-end validation of user journey: submit URL → watch AI test game → view results → export report.
- **Error Scenario Testing**: Validates error handling with invalid URLs, 404 errors, and graceful failure scenarios.
- **Documentation**: All edge cases and issues documented for Epic 4 fixes.

[Source: docs/epic-1-context.md, Section 8. Test Strategy]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.5 Technical Notes]

### Project Structure Notes

- Validation story follows existing project structure: documentation in `docs/validation/` directory (new subdirectory)
- Edge cases document follows markdown documentation patterns established in project
- No code changes required - pure validation and documentation story
- GitHub issues (if used) follow existing project issue tracking patterns

[Source: docs/architecture/project-structure.md]

### Learnings from Previous Story

**From Story 3.4 (Detailed Test Report View) (Status: ready-for-dev)**

- **Dashboard Worker Structure**: Story 3.4 implemented `getTestReport()` and `exportTestJSON()` RPC methods in `src/workers/dashboard.ts` - Story 3.5 should verify these methods work correctly with real test data
- **TestReport Type Definitions**: Story 3.4 added `TestReport`, `MetricScore`, `ScreenshotMetadata`, `TestEvent`, `NetworkError` interfaces to `src/shared/types.ts` - Story 3.5 should verify these types match actual test data structure
- **Detailed Report UI**: Story 3.4 implemented complete detailed report UI with screenshot gallery, lightbox, console/network error logs - Story 3.5 should verify all UI components display correctly with real test data
- **R2 Evidence Access**: Story 3.4 implemented R2 screenshot and log retrieval via signed URLs - Story 3.5 should verify screenshots and logs are accessible and display correctly
- **D1 Query Patterns**: Story 3.4 established D1 query patterns for joining test_runs, evaluation_scores, and test_events - Story 3.5 should verify queries return correct data for real test runs
- **Export JSON Functionality**: Story 3.4 implemented JSON export feature - Story 3.5 should verify exported JSON contains complete and accurate test data

**From Story 3.3 (WebSocket Connection for Live Updates) (Status: in-progress)**

- **WebSocket Connection Pattern**: Story 3.3 implemented WebSocket connection from Dashboard to TestAgent DO - Story 3.5 should verify WebSocket messages broadcast correctly during real test execution
- **Real-Time Updates**: Story 3.3 implemented Live Feed section for real-time progress messages - Story 3.5 should verify Live Feed displays messages correctly during test execution
- **WebSocket Reconnection**: Story 3.3 implemented automatic reconnection logic - Story 3.5 should verify reconnection works correctly if connection drops

[Source: docs/stories/3-4-detailed-test-report-view.md#Dev-Agent-Record]  
[Source: docs/stories/3-3-websocket-connection-for-live-updates.md#Dev-Agent-Record]

### References

- **Cloudflare Workers Documentation**: https://developers.cloudflare.com/workers/
- **Cloudflare D1 Database Documentation**: https://developers.cloudflare.com/d1/
- **Cloudflare R2 Storage Documentation**: https://developers.cloudflare.com/r2/
- **Cloudflare Browser Rendering Documentation**: https://developers.cloudflare.com/browser-rendering/
- [Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001, ADR-006]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.5 Technical Notes]  
[Source: docs/prd/4-functional-requirements.md, FR-2.5 Error Handling & Agent Resilience]  
[Source: docs/prd/4-functional-requirements.md, FR-6.1-FR-6.3 Evidence Storage]

## Dev Agent Record

### Context Reference

- `docs/stories/3-5-example-game-testing-and-validation.context.xml`

### Agent Model Used

Claude Sonnet 4.5 (via Cursor)

### Debug Log References

**Implementation Plan:**
- Story 3.5 is a validation story - no code changes required
- All system components exist from previous stories (Dashboard Worker, TestAgent DO, Workflow, D1, R2, Browser Rendering, AI Gateway)
- Validation approach: Manual QA testing with real DOM-based games
- Deliverables: Test plan document, edge cases documentation, validation findings

**Preparatory Work Completed:**
1. Created comprehensive test plan: `docs/validation/test-plan-story-3-5.md`
   - Includes 11 task checklists matching story acceptance criteria
   - Provides input schema example for AC 9
   - Includes SQL queries and wrangler commands for validation
   - Includes results tracking tables for all validation activities
2. Created edge cases documentation: `docs/validation/edge-cases-epic-3.md`
   - Template for documenting bugs and edge cases
   - Categorized by priority (P0-P3) and component
   - Includes recommendations for Epic 4 prioritization

**Manual Validation Required:**
- Adam needs to identify 3-5 DOM-based game URLs (different genres, control schemes)
- Execute validation tests per test plan checklist
- Deploy or run dashboard worker locally to test submissions
- Query D1 database to verify data integrity
- Check R2 storage for screenshot and log evidence
- Document any issues discovered in edge cases file
- Update sprint-status.yaml with validation findings

**Story Status:**
- Preparatory tasks (Task 1 partial, Task 11 partial): Complete
- Manual validation tasks (Tasks 2-10, remaining subtasks): Require user execution
- Story marked "in-progress" in sprint-status.yaml

### Completion Notes List

**2025-11-05: Validation Preparation Complete (Dev Agent)**
- ✅ Created comprehensive test plan with 11 task validation checklists
- ✅ Provided input schema JSON example for at least one game
- ✅ Created edge cases documentation template with P0-P3 categorization
- ✅ Documented validation approach, SQL queries, wrangler commands
- ⏸️ Manual validation testing requires user execution (cannot be automated)
- 📋 Ready for Adam to perform manual QA validation with real games

### File List

**New Files Created:**
- `docs/validation/test-plan-story-3-5.md` - Comprehensive validation test plan
- `docs/validation/edge-cases-epic-3.md` - Edge cases and issues documentation template

**Modified Files:**
- `docs/stories/3-5-example-game-testing-and-validation.md` - Updated tasks with completion status
- `docs/sprint-status.yaml` - Updated story status: ready-for-dev → in-progress

**No Code Changes:**
- This is a validation story - all code exists from previous stories
- Dashboard Worker (Story 3.1) - no changes
- TestAgent DO (Story 2.1-2.7) - no changes
- Workflow (Story 1.4) - no changes

## Change Log

- 2025-01-27: Story drafted (Adam)
- 2025-11-05: Validation preparation complete - test plan and edge cases documentation created (Dev Agent)

