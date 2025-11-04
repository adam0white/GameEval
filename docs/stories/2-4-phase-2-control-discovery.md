# Story 2.4: Phase 2 - Control Discovery

**Story ID:** 2.4  
**Epic:** Epic 2 - AI Test Agent & Browser Automation  
**Status:** ready-for-dev  
**Created:** 2025-01-27  

---

## Story

**As a** TestAgent,  
**I want** to discover interactive controls using Stagehand observe(),  
**So that** I understand how to interact with the game.

---

## Business Context

Story 2.4 implements Phase 2 of the test execution pipeline - Control Discovery. This story builds on Story 2.3's Phase 1 validation to discover and classify interactive controls using Stagehand's `observe()` method. Phase 2 identifies buttons, keyboard inputs, clickable elements, and other interactive controls, generates a control hypothesis, and stores the discoveries for use in Phase 3 gameplay exploration. This phase is critical as it enables the TestAgent to understand how to interact with the game before attempting autonomous gameplay.

**Value:** Enables the TestAgent to map out game controls before gameplay exploration, making Phase 3 more efficient and effective. Without Phase 2 control discovery, the TestAgent would need to discover controls through trial and error during gameplay, wasting time and potentially missing important controls. The control hypothesis provides actionable intelligence for Phase 3 decision-making.

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.4]  
[Source: docs/epic-2-tech-context.md, Services and Modules section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.2 Phase 2: Control Discovery]

---

## Acceptance Criteria

1. **`runPhase2()` method implemented**: Method exists in TestAgent class and executes Phase 2 logic
2. **Use Stagehand `observe()` to identify DOM-based interactive elements**: Call Stagehand observe() method to discover interactive elements on the page
3. **Classify discovered elements**: Classify controls as buttons, keyboard inputs, clickable divs, input fields, or other interactive types
4. **If inputSchema provided, use it to prioritize specific controls**: If inputSchema provided in constructor, use it to prioritize or validate discovered controls
5. **Capture screenshot of page with controls highlighted**: Screenshot saved to R2 with pattern `{timestamp}-phase2-controls.png` using `captureScreenshot()` helper
6. **Generate control hypothesis**: Generate a text hypothesis describing discovered controls (e.g., "Game has WASD movement controls and Space to shoot")
7. **Store control hypothesis in DO SQL database**: Store discovered controls in Agent SQL `control_discoveries` table for reference in Phase 3
8. **Log discovered controls to test_events**: Log each discovered control with description to D1 test_events table
9. **Broadcast progress via WebSocket**: Send progress message "Phase 2 complete - Discovered N controls" via WebSocket to connected dashboard clients
10. **Return Phase2Result**: Return `{ success: true, controls: ControlMap, hypothesis: string }` structure

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.4 Acceptance Criteria]  
[Source: docs/epic-2-tech-context.md, Acceptance Criteria section]  
[Source: docs/epic-2-tech-context.md, Data Models and Contracts section]

---

## Tasks / Subtasks

### Task 1: Implement `runPhase2()` Method Structure (AC: 1)

- [ ] Create `runPhase2(): Promise<Phase2Result>` method in TestAgent class
- [ ] Add try-catch wrapper for error handling:
  - Catch errors, translate to user-friendly messages
  - Return `{ success: false, controls: {}, hypothesis: '' }`
- [ ] Set timeout: 45 seconds total for Phase 2 execution
- [ ] Initialize result structure: `{ success: false, controls: {}, hypothesis: '' }`
- [ ] Add phase tracking: Log phase start to test_events
- [ ] Verify browser session exists from Phase 1 (reuse existing session)

### Task 2: Use Stagehand `observe()` to Identify Interactive Elements (AC: 2)

- [ ] Call Stagehand observe() method:
  - Use existing Stagehand instance from `launchBrowser()` (Story 2.2)
  - `const controls = await stagehand.observe()`
- [ ] Verify Stagehand instance available:
  - Check `this.stagehand` exists (from Story 2.2)
  - If not available, call `launchBrowser()` first
- [ ] Handle observe() errors gracefully:
  - If observe() fails, return user-friendly error message
  - Log error to test_events
- [ ] Parse observe() results:
  - Extract interactive element locators/selectors
  - Extract element types (button, input, clickable, etc.)

### Task 3: Classify Discovered Elements (AC: 3)

- [ ] Classify each discovered control by type:
  - **Buttons**: Elements with `button` tag or `role="button"`
  - **Keyboard inputs**: Input fields (`input`, `textarea`) or elements with keyboard event handlers
  - **Clickable divs**: Elements with click handlers or cursor pointer style
  - **Input fields**: Form inputs (`input[type="text"]`, `textarea`, etc.)
  - **Other interactive**: Elements with interactive roles (links, sliders, etc.)
- [ ] Build ControlMap structure:
  - `{ [selector]: { type: 'click' | 'keyboard' | 'drag' | 'hover', description: string } }`
- [ ] Extract control descriptions:
  - Use element text content, aria-label, or title attribute
  - Fallback to element tag name if no description available
- [ ] Store classification in result structure:
  - `result.controls = controlMap`

### Task 4: Use inputSchema to Prioritize Controls (AC: 4)

- [ ] Check if inputSchema provided in constructor:
  - `if (this.inputSchema?.controls) { ... }`
- [ ] If inputSchema provided:
  - Prioritize controls matching inputSchema hints:
    - If `inputSchema.controls.movement` includes "W", prioritize WASD keys
    - If `inputSchema.controls.actions` includes "Space", prioritize Space key
  - Validate discovered controls against inputSchema:
    - Check if expected controls (from inputSchema) were discovered
    - Log missing expected controls to test_events
  - Merge inputSchema guidance with discovered controls
- [ ] If inputSchema not provided:
  - Use all discovered controls equally
- [ ] Note: inputSchema guides but doesn't restrict discovery (agent can find additional controls)

### Task 5: Capture Screenshot with Controls Highlighted (AC: 5)

- [ ] Call `captureScreenshot()` helper method (from Story 2.2):
  - Description: `'phase2-controls'`
  - Screenshot will be saved with pattern: `{timestamp}-phase2-controls.png`
- [ ] Verify screenshot saved successfully:
  - Check R2 object key returned
  - Track screenshot in DO state evidence array
- [ ] Handle screenshot errors gracefully:
  - If screenshot fails, log error but continue Phase 2
  - Add error to errors array in result (if needed)
- [ ] Note: Screenshot captures page state after control discovery (may show highlighted controls if Stagehand provides this)

### Task 6: Generate Control Hypothesis (AC: 6)

- [ ] Analyze discovered controls:
  - Group controls by type (keyboard, mouse, input)
  - Identify common patterns (WASD movement, Space to shoot, etc.)
- [ ] Generate hypothesis text:
  - Example: "Game has WASD movement controls and Space to shoot"
  - Example: "Game uses mouse clicks for interaction, no keyboard controls detected"
  - Example: "Game has button-based controls: Start button, Pause button, Settings button"
- [ ] Store hypothesis in result:
  - `result.hypothesis = hypothesisText`
- [ ] Log hypothesis to test_events:
  - Log: `"Control hypothesis: {hypothesisText}"`

### Task 7: Store Control Hypothesis in Agent SQL Database (AC: 7)

- [ ] Create control_discoveries table in Agent SQL (if not exists):
  - Schema: `CREATE TABLE IF NOT EXISTS control_discoveries (id INTEGER PRIMARY KEY AUTOINCREMENT, element_selector TEXT NOT NULL, action_type TEXT NOT NULL, confidence REAL NOT NULL, discovered_at INTEGER NOT NULL)`
- [ ] Insert discovered controls into control_discoveries table:
  - For each control in ControlMap:
    - `element_selector`: CSS selector or Stagehand locator
    - `action_type`: 'click', 'keyboard', 'drag', 'hover'
    - `confidence`: 1.0 (from Stagehand observe())
    - `discovered_at`: Current timestamp
- [ ] Use Agent SQL database (built-in SQL storage):
  - Access via `this.state.storage.sql` or DO built-in SQL
- [ ] Handle SQL errors gracefully:
  - Log error but don't fail Phase 2
  - Controls still available in result structure

### Task 8: Log Discovered Controls to test_events (AC: 8)

- [ ] For each discovered control:
  - Create test_events entry:
    - `event_type: 'control_discovered'`
    - `message: "Discovered {type} control: {description} at {selector}"`
    - `timestamp: Date.now()`
- [ ] Use existing D1 helper function:
  - Use `logEvent()` from `src/shared/helpers/d1.ts` (if exists)
  - Or direct D1 query: `await env.DB.prepare('INSERT INTO test_events ...').bind(...).run()`
- [ ] Batch log entries if multiple controls:
  - Log all controls in single transaction if possible
- [ ] Handle D1 logging errors gracefully:
  - Log error but don't fail Phase 2
  - Controls still available in result structure

### Task 9: Broadcast Progress via WebSocket (AC: 9)

- [ ] Use existing `updateStatus()` helper method (from Story 2.1):
  - Call `await this.updateStatus('phase2', 'Phase 2 complete - Discovered N controls')`
  - Helper method handles:
    - Logging to D1 test_events
    - Broadcasting via WebSocket to connected dashboard clients
- [ ] Calculate control count:
  - `const controlCount = Object.keys(result.controls).length`
- [ ] Format progress message:
  - `"Phase 2 complete - Discovered {controlCount} controls"`
- [ ] Verify WebSocket broadcast:
  - Check if WebSocket clients connected
  - Send progress message: `{ phase: 'phase2', message: 'Phase 2 complete - Discovered N controls', timestamp: Date.now() }`
- [ ] Handle WebSocket errors gracefully:
  - If broadcast fails, log error but don't fail Phase 2

### Task 10: Return Phase2Result Structure (AC: 10)

- [ ] Set result success:
  - If controls discovered: `result.success = true`
  - If no controls discovered: `result.success = false` (log warning)
- [ ] Return Phase2Result:
  - `{ success: boolean, controls: ControlMap, hypothesis: string }`
- [ ] Update DO state with Phase 2 result:
  - Store in `this.state.phaseResults.phase2 = result`
- [ ] Store controls in DO state for Phase 3:
  - Store ControlMap in `this.state.discoveredControls = result.controls`
- [ ] Return result as JSON Response:
  - `return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })`

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-002**: Single TestAgent Durable Object per test run (DO ID = test UUID)
- **ADR-003**: Workflow Auto-Retry with TestAgent Error Awareness - Phase 2 failures trigger workflow retry
- **Pattern 1 (Novel Pattern Designs)**: Browser session persists in DO state across phases 1-3
- **Timeout constraint**: Phase 2 execution must complete within 45 seconds total
- **Stagehand observe()**: Use Stagehand observe() method for control discovery
- **RPC-only architecture**: No exposed HTTP APIs, all communication via service bindings
- **Agent SQL storage**: Use built-in Agent SQL database for per-test control discoveries (ephemeral data)

[Source: docs/architecture/novel-pattern-designs.md, Pattern 1]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-002, ADR-003]  
[Source: docs/epic-2-tech-context.md, Non-Functional Requirements section]  
[Source: docs/epic-2-tech-context.md, Workflows and Sequencing section]  
[Source: docs/epic-2-tech-context.md, Data Models and Contracts section]

### Source Tree Components to Touch

- **`src/agents/TestAgent.ts`**: Implement `runPhase2()` method (MODIFIED)
  - Phase 2 logic: control discovery, classification, hypothesis generation
  - Browser session reuse from Phase 1 (reuse existing session)
  - Stagehand observe() integration
  - Control discovery storage in Agent SQL
  - Status update and WebSocket broadcasting
- **`src/shared/types.ts`**: Add Phase2Result interface and ControlMap type (MODIFIED)
  - `interface Phase2Result { success: boolean; controls: ControlMap; hypothesis: string; }`
  - `type ControlMap = { [selector: string]: { type: 'click' | 'keyboard' | 'drag' | 'hover'; description: string; } };`
  - Update TestAgent state types if needed
- **`src/shared/helpers/d1.ts`**: Use existing helper functions for D1 updates (REVIEW)
  - `logEvent()` function (if exists) for test_events logging
  - Or direct D1 queries for test_events table inserts

### Testing Standards Summary

- **Integration Tests**: Test Phase 2 execution with real game URL
  - Verify Stagehand observe() discovers controls
  - Verify controls classified correctly
  - Verify screenshot capture works
  - Verify status update to D1
  - Verify WebSocket broadcast
- **Control Discovery Tests**: Test different game types:
  - Test DOM-based game (buttons, inputs)
  - Test keyboard-only game (no mouse controls)
  - Test game with inputSchema provided
  - Test game with no interactive elements (should handle gracefully)
- **Hypothesis Generation Tests**: Test hypothesis accuracy:
  - Test WASD movement detection
  - Test Space key detection
  - Test button-based control detection
- **Timeout Tests**: Test Phase 2 timeout handling:
  - Test observe() timeout (slow page)
  - Test classification timeout (many controls)
- **Error Handling Tests**: Test graceful error handling:
  - Test browser session not available
  - Test observe() failure
  - Test screenshot failure
  - Verify user-friendly error messages

### Project Structure Notes

- Follow existing file structure: `src/agents/` for agent implementations
- Use TypeScript strict mode (already configured)
- Reuse existing helpers: `launchBrowser()`, `captureScreenshot()`, `updateStatus()` from Story 2.2
- Browser session stored in DO state and reused from Phase 1
- Agent SQL database for control_discoveries table (per-DO ephemeral storage)
- Control discoveries stored in DO state for Phase 3 reference
- Phase 2 result stored in DO state for reference in subsequent phases

### Learnings from Previous Story

**From Story 2.3 (Phase 1 - Load & Validation) (Status: ready-for-dev)**

- **Browser Session Management**: Browser session persists from Phase 1 - reuse existing Stagehand instance from `this.stagehand` (no need to launch new browser)
- **Screenshot Capture**: `captureScreenshot(description)` helper method available - use for Phase 2 controls screenshot
- **Status Updates**: `updateStatus(phase, message)` helper method available - use for Phase 2 progress broadcasting
- **D1 Event Logging**: Use existing D1 helper functions or direct queries for test_events logging
- **Phase Result Storage**: Store Phase 2 result in `this.state.phaseResults.phase2` for reference in Phase 3
- **Error Handling Pattern**: User-friendly error messages pattern established - follow same approach for Phase 2 errors
- **Timeout Handling**: Phase 1 uses 30-second timeout - Phase 2 uses 45-second timeout (more complex discovery)
- **Input Schema Usage**: Input schema available in `this.inputSchema` if provided - use to prioritize controls in Phase 2

[Source: docs/stories/2-3-phase-1-load-validation.md#Dev-Agent-Record]

### References

- **Stagehand observe() Documentation**: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
- **Stagehand observe() API Reference**: https://docs.stagehand.dev/v3/api-reference/observe
- **Cloudflare Browser Rendering**: https://developers.cloudflare.com/browser-rendering/
- [Source: docs/prd/11b-references-resources.md, Stagehand Resources]  
[Source: docs/epic-2-tech-context.md, Stagehand Integration section]  
[Source: docs/architecture/technology-stack-details.md, Browser Automation]

---

## Dev Agent Record

### Context Reference

- `docs/stories/2-4-phase-2-control-discovery.context.xml`

### Agent Model Used

<!-- Will be filled by dev agent during implementation -->

### Debug Log References

<!-- Will be filled by dev agent during implementation -->

### Completion Notes List

<!-- Will be filled by dev agent during implementation -->

### File List

<!-- Will be filled by dev agent during implementation -->

