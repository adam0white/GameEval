# Story 2.3: Phase 1 - Load & Validation

**Story ID:** 2.3  
**Epic:** Epic 2 - AI Test Agent & Browser Automation  
**Status:** ready-for-dev  
**Created:** 2025-01-27  

---

## Story

**As a** TestAgent,  
**I want** to navigate to the game URL and validate it loaded successfully,  
**So that** I can determine if the game is accessible before testing.

---

## Business Context

Story 2.3 implements Phase 1 of the test execution pipeline - Load & Validation. This story builds on Story 2.2's browser integration to implement the first phase of autonomous game testing. Phase 1 navigates to the game URL, validates successful loading, detects interaction requirements, and captures initial evidence. This phase is critical as it determines whether the game is accessible and ready for testing, providing early validation before proceeding to control discovery and gameplay exploration.

**Value:** Enables the TestAgent to verify game accessibility and detect interaction requirements before investing time in control discovery and gameplay. Without Phase 1 validation, the TestAgent might waste resources attempting to test inaccessible or broken games. Early detection of load failures or interaction requirements enables smarter subsequent phase execution.

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.3]  
[Source: docs/epic-2-tech-context.md, Services and Modules section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.1 Phase 1: Load & Validation]

---

## Acceptance Criteria

1. **`runPhase1()` method implemented**: Method exists in TestAgent class and executes Phase 1 logic
2. **Launch browser using Stagehand**: Browser session launched using `launchBrowser()` helper method from Story 2.2
3. **Navigate to game URL**: Navigate to game URL provided in constructor using Stagehand `page.goto()`
4. **Wait for page load complete**: Wait for DOMContentLoaded event before proceeding
5. **Capture initial screenshot**: Screenshot saved to R2 with pattern `{timestamp}-phase1-initial-load.png` using `captureScreenshot()` helper
6. **Validate: page did not return 404 error**: Check response status code, detect 404 errors
7. **Validate: page is not blank**: Check if page has visible DOM elements (body has child elements)
8. **Detect if game requires user interaction to start**: Search for buttons with text containing "play", "start", "begin" (case-insensitive)
9. **Log any immediate console errors**: Capture console errors during page load, log to test_events table in D1
10. **Update test_runs.status = 'running' in D1**: Update test_runs table status column to 'running' after successful Phase 1
11. **Broadcast progress via WebSocket**: Send progress message "Phase 1 complete - Game loaded successfully" via WebSocket to connected dashboard clients
12. **Return Phase1Result**: Return `{ success: true, requiresInteraction: boolean, errors: string[] }` structure

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.3 Acceptance Criteria]  
[Source: docs/epic-2-tech-context.md, Acceptance Criteria section]  
[Source: docs/epic-2-tech-context.md, Data Models and Contracts section]

---

## Tasks / Subtasks

### Task 1: Implement `runPhase1()` Method Structure (AC: 1)

- [ ] Create `runPhase1(): Promise<Phase1Result>` method in TestAgent class
- [ ] Add try-catch wrapper for error handling:
  - Catch errors, translate to user-friendly messages
  - Return `{ success: false, requiresInteraction: false, errors: [errorMessage] }`
- [ ] Set timeout: 30 seconds total for Phase 1 execution
- [ ] Initialize result structure: `{ success: false, requiresInteraction: false, errors: [] }`
- [ ] Add phase tracking: Log phase start to test_events

### Task 2: Launch Browser Session (AC: 2)

- [ ] Call `launchBrowser()` helper method (from Story 2.2):
  - Reuse browser session if exists in DO state
  - Create new session if needed
- [ ] Verify browser session created successfully:
  - Check Stagehand instance returned
  - Verify page accessible
- [ ] Handle errors gracefully:
  - If browser launch fails, return user-friendly error message
  - Log error to test_events

### Task 3: Navigate to Game URL (AC: 3)

- [ ] Use Stagehand page navigation:
  - `await stagehand.page.goto(this.gameUrl, { waitUntil: 'domcontentloaded' })`
- [ ] Get game URL from TestAgent state:
  - `this.gameUrl` (provided in constructor)
- [ ] Handle navigation errors:
  - Network failures (connection timeout)
  - Invalid URL errors
  - Return user-friendly error message

### Task 4: Wait for Page Load Complete (AC: 4)

- [ ] Wait for DOMContentLoaded event:
  - Use `waitUntil: 'domcontentloaded'` in page.goto() options
  - Or use `await page.waitForLoadState('domcontentloaded')`
- [ ] Set timeout for page load: 20 seconds
- [ ] Handle timeout errors:
  - If page doesn't load within timeout, return error: "Game page did not load within timeout"
- [ ] Verify page loaded:
  - Check `page.url()` matches expected URL
  - Verify page is not in error state

### Task 5: Capture Initial Screenshot (AC: 5)

- [ ] Call `captureScreenshot()` helper method (from Story 2.2):
  - Description: `'phase1-initial-load'`
  - Screenshot will be saved with pattern: `{timestamp}-phase1-initial-load.png`
- [ ] Verify screenshot saved successfully:
  - Check R2 object key returned
  - Track screenshot in DO state evidence array
- [ ] Handle screenshot errors gracefully:
  - If screenshot fails, log error but continue Phase 1
  - Add error to errors array in result

### Task 6: Validate Page Did Not Return 404 Error (AC: 6)

- [ ] Check response status code:
  - Get response from navigation: `const response = await page.goto(...)`
  - Check `response.status()`:
    - If status === 404, return error: "Game URL returned 404 error. Please check the URL is correct."
    - If status >= 400, return error: "Game URL returned error {status}. Please check the URL is accessible."
- [ ] Store validation result:
  - Set `result.success = false` if 404 detected
  - Add error message to `result.errors` array
- [ ] Log validation result to test_events:
  - Log success/failure with status code

### Task 7: Validate Page Is Not Blank (AC: 7)

- [ ] Check if page has visible DOM elements:
  - Use Stagehand/page API: `const bodyChildren = await page.locator('body').locator('> *').count()`
  - Or: `const bodyText = await page.locator('body').innerText()`
- [ ] Blank page detection logic:
  - If bodyChildren === 0, page is blank
  - If bodyText.trim() === '', page is blank
- [ ] Return error if blank:
  - Error message: "Game page appears to be blank. Please check the game URL loads correctly."
  - Set `result.success = false`
  - Add error to `result.errors` array
- [ ] Log validation result to test_events

### Task 8: Detect If Game Requires User Interaction to Start (AC: 8)

- [ ] Search for interaction buttons:
  - Search for buttons with text containing "play", "start", "begin" (case-insensitive):
    - `await page.locator('button:has-text("play")').count()`
    - `await page.locator('button:has-text("start")').count()`
    - `await page.locator('button:has-text("begin")').count()`
  - Or use Stagehand observe() to find interactive elements (preview for Phase 2)
- [ ] Set interaction detection result:
  - If buttons found: `result.requiresInteraction = true`
  - If no buttons found: `result.requiresInteraction = false`
- [ ] Log interaction detection to test_events:
  - Log: "Game requires interaction: {true/false}"

### Task 9: Log Immediate Console Errors (AC: 9)

- [ ] Capture console errors during page load:
  - Console errors already captured by console log listener (from Story 2.2)
  - Filter console logs for errors: `level === 'error'`
- [ ] Extract console errors from DO state:
  - Get `consoleLogs` array from DO state
  - Filter for errors: `consoleLogs.filter(log => log.level === 'error')`
- [ ] Log console errors to test_events:
  - For each console error, create test_events entry:
    - `event_type: 'console_error'`
    - `message: log.text`
    - `timestamp: log.timestamp`
- [ ] Add console errors to result:
  - Add error messages to `result.errors` array

### Task 10: Update test_runs.status = 'running' in D1 (AC: 10)

- [ ] Use existing D1 helper function:
  - Use `updateTestRunStatus()` from `src/shared/helpers/d1.ts` (from Epic 1)
  - Or direct D1 query: `await env.DB.prepare('UPDATE test_runs SET status = ? WHERE id = ?').bind('running', this.testRunId).run()`
- [ ] Update test_runs table:
  - Set `status = 'running'`
  - Update `updated_at` timestamp
  - WHERE `id = this.testRunId`
- [ ] Handle D1 update errors:
  - Log error but don't fail Phase 1
  - Retry logic handled by Workflow (if needed)
- [ ] Log status update to test_events:
  - Log: "Phase 1 started - Test status updated to 'running'"

### Task 11: Broadcast Progress via WebSocket (AC: 11)

- [ ] Use existing `updateStatus()` helper method (from Story 2.1):
  - Call `await this.updateStatus('phase1', 'Phase 1 complete - Game loaded successfully')`
  - Helper method handles:
    - Logging to D1 test_events
    - Broadcasting via WebSocket to connected dashboard clients
- [ ] Verify WebSocket broadcast:
  - Check if WebSocket clients connected
  - Send progress message: `{ phase: 'phase1', message: 'Phase 1 complete - Game loaded successfully', timestamp: Date.now() }`
- [ ] Handle WebSocket errors gracefully:
  - If broadcast fails, log error but don't fail Phase 1

### Task 12: Return Phase1Result Structure (AC: 12)

- [ ] Set result success:
  - If all validations pass: `result.success = true`
  - If any validation fails: `result.success = false`
- [ ] Return Phase1Result:
  - `{ success: boolean, requiresInteraction: boolean, errors: string[] }`
- [ ] Update DO state with Phase 1 result:
  - Store in `this.state.phaseResults.phase1 = result`
- [ ] Return result as JSON Response:
  - `return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })`

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-002**: Single TestAgent Durable Object per test run (DO ID = test UUID)
- **ADR-003**: Workflow Auto-Retry with TestAgent Error Awareness - Phase 1 failures trigger workflow retry
- **Pattern 1 (Novel Pattern Designs)**: Browser session persists in DO state across phases 1-3
- **Timeout constraint**: Phase 1 execution must complete within 30 seconds total
- **Stagehand navigation**: Use Stagehand page.goto() for navigation with waitUntil option
- **RPC-only architecture**: No exposed HTTP APIs, all communication via service bindings

[Source: docs/architecture/novel-pattern-designs.md, Pattern 1]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-002, ADR-003]  
[Source: docs/epic-2-tech-context.md, Non-Functional Requirements section]  
[Source: docs/epic-2-tech-context.md, Workflows and Sequencing section]

### Source Tree Components to Touch

- **`src/agents/TestAgent.ts`**: Implement `runPhase1()` method (MODIFIED)
  - Phase 1 logic: navigation, validation, screenshot capture
  - Browser session reuse from Story 2.2 (reuse existing session)
  - Console error logging integration
  - Status update and WebSocket broadcasting
- **`src/shared/helpers/d1.ts`**: Use existing helper functions for D1 updates (REVIEW)
  - `updateTestRunStatus()` function (if exists)
  - Or direct D1 queries for test_runs table updates
- **`src/shared/types.ts`**: Add Phase1Result interface (MODIFIED)
  - `interface Phase1Result { success: boolean; requiresInteraction: boolean; errors: string[]; }`
  - Update TestAgent state types if needed

### Testing Standards Summary

- **Integration Tests**: Test Phase 1 execution with real game URL
  - Verify browser navigation works
  - Verify screenshot capture works
  - Verify status update to D1
  - Verify WebSocket broadcast
- **Validation Tests**: Test error detection scenarios:
  - Test 404 error detection
  - Test blank page detection
  - Test interaction requirement detection
  - Test console error logging
- **Timeout Tests**: Test Phase 1 timeout handling:
  - Test page load timeout (slow page)
  - Test navigation timeout (invalid URL)
- **Error Handling Tests**: Test graceful error handling:
  - Test browser launch failure
  - Test navigation failure
  - Test screenshot failure
  - Verify user-friendly error messages

### Project Structure Notes

- Follow existing file structure: `src/agents/` for agent implementations
- Use TypeScript strict mode (already configured)
- Reuse existing helpers: `launchBrowser()`, `captureScreenshot()`, `updateStatus()` from Story 2.2
- Browser session stored in DO state and reused from Story 2.2
- Console logs captured by Story 2.2 listeners - just extract errors here
- Network errors tracked by Story 2.2 listeners - not used in Phase 1
- Phase 1 result stored in DO state for reference in subsequent phases

### Learnings from Previous Story

**From Story 2.2 (Browser Rendering Integration and Stagehand Setup) (Status: ready-for-dev)**

- **Browser Session Management**: `launchBrowser()` helper method available - reuse existing browser session if available in DO state
- **Screenshot Capture**: `captureScreenshot(description)` helper method available - use for Phase 1 initial screenshot
- **Console Log Capture**: Console log listener already set up in `launchBrowser()` - extract errors from DO state consoleLogs array
- **Network Error Tracking**: Network error listener already set up - not needed for Phase 1, but available for future use
- **Browser Session Persistence**: Browser session persists in DO state - check for existing session before launching new one
- **Error Handling Pattern**: User-friendly error messages pattern established - follow same approach for Phase 1 errors
- **R2 Upload Pattern**: Screenshot upload uses `uploadScreenshot()` from `src/shared/helpers/r2.ts` - handled by `captureScreenshot()` helper

[Source: docs/stories/2-2-browser-rendering-integration-and-stagehand-setup.md#Dev-Agent-Record]

### References

- **Stagehand Navigation**: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
- **Stagehand Page API**: https://docs.stagehand.dev/v3/api-reference/page
- **Cloudflare Browser Rendering**: https://developers.cloudflare.com/browser-rendering/
- [Source: docs/prd/11b-references-resources.md, Stagehand Resources]  
[Source: docs/epic-2-tech-context.md, Stagehand Integration section]  
[Source: docs/architecture/technology-stack-details.md, Browser Automation]

---

## Dev Agent Record

### Context Reference

- `docs/stories/2-3-phase-1-load-validation.context.xml`

### Agent Model Used

<!-- Will be filled by dev agent during implementation -->

### Debug Log References

<!-- Will be filled by dev agent during implementation -->

### Completion Notes List

<!-- Will be filled by dev agent during implementation -->

### File List

<!-- Will be filled by dev agent during implementation -->

