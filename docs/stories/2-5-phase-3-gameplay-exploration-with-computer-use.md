# Story 2.5: Phase 3 - Gameplay Exploration with Computer Use

**Story ID:** 2.5  
**Epic:** Epic 2 - AI Test Agent & Browser Automation  
**Status:** ready-for-dev  
**Created:** 2025-01-27  

---

## Story

**As a** TestAgent,  
**I want** to autonomously play the game using Stagehand Computer Use mode,  
**So that** I can evaluate gameplay quality and capture evidence.

---

## Business Context

Story 2.5 implements Phase 3 of the test execution pipeline - Gameplay Exploration with Computer Use. This story builds on Story 2.4's Phase 2 control discovery to autonomously explore and play the game using Stagehand's Computer Use mode. Phase 3 is the core "magic" of GameEval, where the AI agent makes autonomous decisions about gameplay actions, captures evidence continuously (screenshots, console logs, network errors, AI decisions), and adapts its strategy based on observations. The agent executes goal-driven actions like "Start the game", "Learn the controls", and "Play for 2-3 minutes", making autonomous decisions between keyboard and mouse controls, detecting and handling game start interactions, and capturing evidence incrementally throughout gameplay.

**Value:** Enables the TestAgent to autonomously explore and play games, generating rich evidence for quality evaluation. Without Phase 3 gameplay exploration, the TestAgent cannot assess playability, control responsiveness, or technical stability during actual gameplay. Phase 3 captures the evidence needed for Phase 4's quality scoring across all 5 dimensions.

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.5]  
[Source: docs/epic-2-tech-context.md, Services and Modules section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.3 Phase 3: Gameplay Exploration]

---

## Acceptance Criteria

1. **`runPhase3()` method implemented**: Method exists in TestAgent class and executes Phase 3 logic
2. **Use Stagehand agent in Computer Use mode for autonomous exploration**: Initialize Stagehand agent with Computer Use mode for goal-driven autonomous actions
3. **Execute goal-driven actions**: Agent executes high-level goals: "Start the game", "Learn the controls", "Play for 2-3 minutes"
4. **If game requires interaction, detect and click "Play" button autonomously**: Detect if game requires user interaction from Phase 1 result, then autonomously click "Play" or "Start" button
5. **Agent decides between keyboard and mouse controls**: Agent makes autonomous decisions about using keyboard vs mouse controls based on observations or inputSchema
6. **Capture screenshot every 10 seconds OR on significant state change (minimum 5 screenshots)**: Screenshots captured at regular intervals or when game state changes significantly
7. **Screenshot naming**: Screenshots saved with pattern `{timestamp}-phase3-{action-description}.png` using `captureScreenshot()` helper
8. **Monitor console logs continuously**: Console errors and warnings captured and accumulated in DO state throughout Phase 3
9. **Track failed network requests**: Network requests with status >= 400 or connection failures tracked in DO state
10. **Log all AI decisions to DO SQL database**: Every AI decision logged to Agent SQL `decision_log` table with timestamp, decision, action, and outcome
11. **Store screenshots to R2 incrementally**: Screenshots saved to R2 immediately after capture (don't batch until end)
12. **Adaptive timeout: minimum 1 minute, maximum 5 minutes (stop when no new discoveries)**: Phase 3 execution adapts timeout based on progress (stops if no progress for 30 seconds)
13. **Broadcast progress via WebSocket every 15 seconds**: Progress updates sent to dashboard every 15 seconds with current action description
14. **Return Phase3Result**: Return `{ success: true, screenshotCount: number, errors: string[], actionsTaken: number }` structure

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.5 Acceptance Criteria]  
[Source: docs/epic-2-tech-context.md, Acceptance Criteria section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.3 Phase 3: Gameplay Exploration]

---

## Tasks / Subtasks

### Task 1: Implement `runPhase3()` Method Structure (AC: 1)

- [ ] Create `runPhase3(): Promise<Phase3Result>` method in TestAgent class
- [ ] Add try-catch wrapper for error handling:
  - Catch errors, translate to user-friendly messages
  - Return `{ success: false, screenshotCount: 0, errors: [errorMessage], actionsTaken: 0 }`
- [ ] Set adaptive timeout: minimum 1 minute, maximum 5 minutes
- [ ] Initialize result structure: `{ success: false, screenshotCount: 0, errors: [], actionsTaken: 0 }`
- [ ] Add phase tracking: Log phase start to test_events
- [ ] Verify browser session exists from Phase 1-2 (reuse existing session)
- [ ] Verify Stagehand instance available from `launchBrowser()` (Story 2.2)

### Task 2: Initialize Stagehand Computer Use Mode (AC: 2)

- [ ] Configure Stagehand agent for Computer Use mode:
  - Use existing Stagehand instance from `this.stagehand` (from Story 2.2)
  - Verify Stagehand initialized with Computer Use mode during `launchBrowser()`
  - If not configured, reinitialize Stagehand with `mode: 'computer-use'`
- [ ] Verify Stagehand agent available for autonomous actions
- [ ] Handle Stagehand initialization errors gracefully:
  - If Stagehand not available, return user-friendly error message
  - Log error to test_events

### Task 3: Execute Goal-Driven Actions (AC: 3)

- [ ] Define high-level goals for Stagehand agent:
  - Goal 1: "Start the game" (if requires interaction from Phase 1)
  - Goal 2: "Learn the controls" (explore discovered controls from Phase 2)
  - Goal 3: "Play for 2-3 minutes" (autonomous gameplay exploration)
- [ ] Execute goals sequentially using Stagehand agent:
  - Use Stagehand agent's autonomous action capabilities
  - Pass goals as natural language instructions
- [ ] Track goal execution progress:
  - Log each goal start/completion to Agent SQL decision_log
  - Update progress counter for actionsTaken
- [ ] Handle goal execution failures:
  - If goal fails, log error but continue with next goal
  - Add error to errors array in result

### Task 4: Detect and Click "Play" Button Autonomously (AC: 4)

- [ ] Check Phase 1 result for `requiresInteraction` flag:
  - If `requiresInteraction === true` from Phase 1, proceed with interaction detection
- [ ] Use Stagehand agent to detect "Play" or "Start" button:
  - Agent autonomously searches for buttons with text containing "play", "start", "begin" (case-insensitive)
  - Use Stagehand's autonomous element discovery
- [ ] Execute button click autonomously:
  - Use Stagehand agent to click detected button
  - Log action to Agent SQL decision_log
- [ ] Verify game started:
  - Wait for game state change (check for gameplay elements)
  - Capture screenshot after interaction
- [ ] Handle interaction detection failures:
  - If no button found, log warning but continue Phase 3
  - Add warning to errors array (non-fatal)

### Task 5: Agent Decision Logic for Keyboard vs Mouse Controls (AC: 5)

- [ ] Retrieve discovered controls from Phase 2:
  - Load `this.state.discoveredControls` from Phase 2 result
  - Check `this.state.phaseResults.phase2.controls` for control types
- [ ] Check inputSchema if provided:
  - If `this.inputSchema?.controls` exists, use it to guide control selection
  - Prioritize controls matching inputSchema hints (WASD, Space, etc.)
- [ ] Agent autonomous decision:
  - Stagehand agent autonomously decides keyboard vs mouse based on:
    - Discovered controls from Phase 2
    - InputSchema guidance (if provided)
    - Observations during gameplay
- [ ] Log decision to Agent SQL:
  - Store decision in `decision_log` table: `{ timestamp, decision: 'use-keyboard' | 'use-mouse', action: 'selected-control-strategy', outcome: 'success' }`
- [ ] Note: Agent can explore beyond inputSchema (inputSchema guides but doesn't restrict)

### Task 6: Screenshot Capture Every 10 Seconds or on State Change (AC: 6, 7)

- [ ] Set up screenshot capture timer:
  - Capture screenshot every 10 seconds (minimum interval)
  - Also capture on significant state change (game state transition detected)
- [ ] Track screenshot count:
  - Initialize counter: `let screenshotCount = 0`
  - Increment on each capture
  - Ensure minimum 5 screenshots captured
- [ ] Capture screenshots using `captureScreenshot()` helper:
  - Call `await this.captureScreenshot(description)` with action description
  - Description format: `'phase3-{action-description}'` (e.g., 'phase3-clicked-play-button', 'phase3-movement-test')
- [ ] Screenshot naming pattern:
  - Screenshots saved with pattern: `{timestamp}-phase3-{action-description}.png`
  - Timestamp format: `Date.now()` or ISO string
  - Action description from Stagehand agent action
- [ ] Detect significant state changes:
  - Monitor for gameplay state transitions (score changes, level changes, UI updates)
  - Capture screenshot immediately on state change detection
- [ ] Handle screenshot failures gracefully:
  - If screenshot fails, log error but continue Phase 3
  - Add error to errors array (non-fatal)

### Task 7: Continuous Console Log Monitoring (AC: 8)

- [ ] Verify console log capture enabled:
  - Console logs already captured by `launchBrowser()` (Story 2.2)
  - Console logs accumulated in `this.state.consoleLogs` array
- [ ] Monitor console logs during Phase 3:
  - Console logs captured automatically by browser session listeners
  - No additional setup needed (already implemented in Story 2.2)
- [ ] Filter console logs for errors and warnings:
  - Extract logs with level `'error'` or `'warn'` from accumulated logs
  - Add to errors array in result if needed
- [ ] Log console errors to test_events:
  - Log significant console errors to D1 test_events table
  - Include error message and timestamp

### Task 8: Track Failed Network Requests (AC: 9)

- [ ] Verify network request monitoring enabled:
  - Network errors already tracked by `launchBrowser()` (Story 2.2)
  - Network errors accumulated in `this.state.networkErrors` array
- [ ] Monitor network requests during Phase 3:
  - Network errors captured automatically by browser session listeners
  - Track requests with status >= 400 or connection failures
- [ ] Log network errors:
  - Extract network errors from `this.state.networkErrors`
  - Add to errors array in result if needed
- [ ] Log significant network errors to test_events:
  - Log failed requests to D1 test_events table
  - Include URL, status code, error message

### Task 9: Log AI Decisions to Agent SQL Database (AC: 10)

- [ ] Create decision_log table in Agent SQL (if not exists):
  - Schema: `CREATE TABLE IF NOT EXISTS decision_log (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER NOT NULL, decision TEXT NOT NULL, action TEXT NOT NULL, outcome TEXT NOT NULL, context TEXT)`
- [ ] Log AI decisions during Phase 3:
  - Decision: What the agent decided (e.g., "use-keyboard", "click-play-button", "explore-movement")
  - Action: What action was taken (e.g., "pressed-W-key", "clicked-element", "scrolled-page")
  - Outcome: Result of action (e.g., "success", "failed", "partial")
  - Context: Additional context (JSON string)
- [ ] Log each Stagehand agent action:
  - Intercept Stagehand agent decisions
  - Log to Agent SQL decision_log table
- [ ] Use Agent SQL database (built-in SQL storage):
  - Access via `this.state.storage.sql` or DO built-in SQL
- [ ] Handle SQL errors gracefully:
  - Log error but don't fail Phase 3
  - Decisions still available in result structure

### Task 10: Store Screenshots to R2 Incrementally (AC: 11)

- [ ] Verify screenshot storage:
  - `captureScreenshot()` helper (Story 2.2) already saves to R2 immediately
  - No additional batching needed
- [ ] Track screenshot storage:
  - Verify each screenshot saved successfully (check R2 object key returned)
  - Track screenshot metadata in DO state evidence array
- [ ] Handle R2 storage errors:
  - If screenshot storage fails, log error but continue Phase 3
  - Add error to errors array (non-fatal)
  - Note: Screenshots are stored immediately, not batched

### Task 11: Implement Adaptive Timeout (AC: 12)

- [ ] Set timeout bounds:
  - Minimum: 1 minute (60 seconds)
  - Maximum: 5 minutes (300 seconds)
- [ ] Implement progress detection:
  - Track last significant action timestamp
  - Detect if no progress for 30 seconds (no new discoveries, no state changes)
- [ ] Adaptive timeout logic:
  - Start with minimum 1 minute timeout
  - If agent makes progress (new discoveries, state changes), extend timeout up to maximum 5 minutes
  - If no progress for 30 seconds, stop Phase 3 early
- [ ] Log timeout decisions:
  - Log timeout reason to Agent SQL decision_log
  - Log timeout to test_events
- [ ] Handle timeout gracefully:
  - Return partial result with whatever evidence was captured
  - Don't fail Phase 3 if timeout occurs naturally

### Task 12: Broadcast Progress via WebSocket Every 15 Seconds (AC: 13)

- [ ] Set up progress broadcast timer:
  - Broadcast progress message every 15 seconds
  - Include current action description from Stagehand agent
- [ ] Use existing `updateStatus()` helper method (from Story 2.1):
  - Call `await this.updateStatus('phase3', progressMessage)` every 15 seconds
  - Helper method handles:
    - Logging to D1 test_events
    - Broadcasting via WebSocket to connected dashboard clients
- [ ] Format progress message:
  - Include current action: `"Phase 3 - {currentAction}"`
  - Include progress indicator: `"Phase 3 - {currentAction} ({screenshotCount} screenshots captured)"`
  - Example: `"Phase 3 - Testing WASD movement controls (3 screenshots captured)"`
- [ ] Handle WebSocket errors gracefully:
  - If broadcast fails, log error but don't fail Phase 3
  - Progress updates are best-effort (not critical for Phase 3 execution)

### Task 13: Return Phase3Result Structure (AC: 14)

- [ ] Set result success:
  - If gameplay exploration completed: `result.success = true`
  - If gameplay exploration failed: `result.success = false` (log error)
- [ ] Populate result fields:
  - `screenshotCount`: Number of screenshots captured (minimum 5)
  - `errors`: Array of error messages (console errors, network errors, screenshot failures)
  - `actionsTaken`: Number of actions executed by Stagehand agent
- [ ] Return Phase3Result:
  - `{ success: boolean, screenshotCount: number, errors: string[], actionsTaken: number }`
- [ ] Update DO state with Phase 3 result:
  - Store in `this.state.phaseResults.phase3 = result`
- [ ] Return result as JSON Response:
  - `return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })`

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-002**: Single TestAgent Durable Object per test run (DO ID = test UUID)
- **ADR-003**: Workflow Auto-Retry with TestAgent Error Awareness - Phase 3 failures trigger workflow retry
- **ADR-004**: AI Gateway as Primary Entry Point for All AI Requests - Stagehand AI calls routed through AI Gateway
- **Pattern 1 (Novel Pattern Designs)**: Browser session persists in DO state across phases 1-3
- **Timeout constraint**: Phase 3 execution must complete within 1-5 minutes adaptive (stops if no progress for 30s)
- **Maximum workflow duration**: 6 minutes total end-to-end, so Phase 3 can't exceed ~5 minutes
- **Stagehand Computer Use mode**: Agent autonomously decides mouse clicks, keyboard presses, scrolling
- **RPC-only architecture**: No exposed HTTP APIs, all communication via service bindings
- **Agent SQL storage**: Use built-in Agent SQL database for per-test AI decision logs (ephemeral data)
- **Evidence capture**: Screenshots, console logs, network errors, AI decision log accumulated throughout Phase 3

[Source: docs/architecture/novel-pattern-designs.md, Pattern 1]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-002, ADR-003, ADR-004]  
[Source: docs/epic-2-tech-context.md, Non-Functional Requirements section]  
[Source: docs/epic-2-tech-context.md, Workflows and Sequencing section]  
[Source: docs/prd/6-technical-architecture.md, 6.5 Stagehand Integration]

### Source Tree Components to Touch

- **`src/agents/TestAgent.ts`**: Implement `runPhase3()` method (MODIFIED)
  - Phase 3 logic: autonomous gameplay exploration, evidence capture, AI decision logging
  - Browser session reuse from Phase 1-2 (reuse existing session)
  - Stagehand Computer Use mode integration
  - Adaptive timeout logic
  - Progress broadcasting
  - Status update and WebSocket broadcasting
- **`src/shared/types.ts`**: Add Phase3Result interface (MODIFIED)
  - `interface Phase3Result { success: boolean; screenshotCount: number; errors: string[]; actionsTaken: number; }`
  - Update TestAgent state types if needed
- **`src/shared/helpers/ai-gateway.ts`**: Stagehand AI calls may route through AI Gateway (REVIEW)
  - Stagehand Computer Use mode may use AI Gateway for autonomous decisions
  - Verify Stagehand integration with AI Gateway if needed

### Testing Standards Summary

- **Integration Tests**: Test Phase 3 execution with real game URL
  - Verify Stagehand Computer Use mode executes autonomous actions
  - Verify screenshots captured at regular intervals (minimum 5)
  - Verify console logs and network errors captured
  - Verify AI decisions logged to Agent SQL
  - Verify status update to D1
  - Verify WebSocket broadcast
- **Autonomous Gameplay Tests**: Test different game types:
  - Test game requiring interaction to start (click "Play" button)
  - Test keyboard-based game (WASD movement)
  - Test mouse-based game (click controls)
  - Test game with inputSchema provided
  - Test game with no clear controls (should handle gracefully)
- **Adaptive Timeout Tests**: Test timeout behavior:
  - Test minimum timeout (1 minute)
  - Test maximum timeout (5 minutes)
  - Test early stop on no progress (30 seconds no progress)
  - Test timeout extension on progress
- **Evidence Capture Tests**: Test evidence capture:
  - Test screenshot capture every 10 seconds
  - Test screenshot capture on state change
  - Test console log capture
  - Test network error capture
  - Test AI decision logging
- **Error Handling Tests**: Test graceful error handling:
  - Test browser session not available
  - Test Stagehand initialization failure
  - Test screenshot capture failure
  - Test R2 storage failure
  - Verify user-friendly error messages

### Project Structure Notes

- Follow existing file structure: `src/agents/` for agent implementations
- Use TypeScript strict mode (already configured)
- Reuse existing helpers: `launchBrowser()`, `captureScreenshot()`, `updateStatus()` from Story 2.2
- Browser session stored in DO state and reused from Phase 1-2
- Agent SQL database for decision_log table (per-DO ephemeral storage)
- Phase 3 result stored in DO state for reference in Phase 4
- Screenshots stored to R2 incrementally (not batched)
- Console logs and network errors accumulated in DO state (from Story 2.2)

### Learnings from Previous Story

**From Story 2.4 (Phase 2 - Control Discovery) (Status: ready-for-dev)**

- **Browser Session Management**: Browser session persists from Phase 1-2 - reuse existing Stagehand instance from `this.stagehand` (no need to launch new browser)
- **Screenshot Capture**: `captureScreenshot(description)` helper method available - use for Phase 3 screenshots
- **Status Updates**: `updateStatus(phase, message)` helper method available - use for Phase 3 progress broadcasting
- **Control Discovery**: Discovered controls available in `this.state.discoveredControls` from Phase 2 - use to guide Phase 3 gameplay decisions
- **Control Hypothesis**: Control hypothesis available in Phase 2 result - use to inform Stagehand agent goals
- **Input Schema Usage**: Input schema available in `this.inputSchema` if provided - use to prioritize controls in Phase 3
- **Agent SQL Storage**: Agent SQL database available for control_discoveries - add decision_log table for Phase 3 AI decisions
- **Phase Result Storage**: Store Phase 3 result in `this.state.phaseResults.phase3` for reference in Phase 4
- **Error Handling Pattern**: User-friendly error messages pattern established - follow same approach for Phase 3 errors
- **Timeout Handling**: Phase 2 uses 45-second timeout - Phase 3 uses 1-5 minute adaptive timeout (longest phase)

[Source: docs/stories/2-4-phase-2-control-discovery.md#Dev-Agent-Record]

### References

- **Stagehand Computer Use Documentation**: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
- **Stagehand Computer Use Guide**: https://docs.stagehand.dev/v3/best-practices/computer-use
- **Cloudflare Browser Rendering**: https://developers.cloudflare.com/browser-rendering/
- **AI Gateway Usage**: https://developers.cloudflare.com/ai-gateway/
- [Source: docs/prd/11b-references-resources.md, Stagehand Resources]  
[Source: docs/epic-2-tech-context.md, Stagehand Integration section]  
[Source: docs/architecture/technology-stack-details.md, Browser Automation]  
[Source: docs/ai-gateway-usage.md, AI Gateway Integration]

---

## Dev Agent Record

### Context Reference

- `docs/stories/2-5-phase-3-gameplay-exploration-with-computer-use.context.xml`

### Agent Model Used

<!-- Will be filled by dev agent during implementation -->

### Debug Log References

<!-- Will be filled by dev agent during implementation -->

### Completion Notes List

<!-- Will be filled by dev agent during implementation -->

### File List

<!-- Will be filled by dev agent during implementation -->

