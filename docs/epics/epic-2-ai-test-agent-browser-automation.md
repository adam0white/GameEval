# Epic 2: AI Test Agent & Browser Automation

**Goal:** Build autonomous AI agent that plays games using Stagehand Computer Use mode and evaluates quality across 5 dimensions.

**Value:** This is the "magic" of GameEval - the AI that thinks like a human tester, discovering controls and exploring gameplay autonomously. Without this, it's just infrastructure.

**Phase:** 2 (Core Features) - Days 3-4

**Dependencies:** Epic 1 (all infrastructure must be in place)

---

## Stories

**Story 2.1: TestAgent Durable Object Skeleton**

As a developer,
I want a TestAgent Durable Object with state management and lifecycle hooks,
So that I have the foundation for AI-powered test execution.

**Acceptance Criteria:**
1. Durable Object class created: `src/agents/TestAgent.ts`
2. DO constructor accepts: testRunId, gameUrl, inputSchema (optional)
3. State storage initialized with built-in SQL database
4. WebSocket handler for real-time progress updates to dashboard
5. Methods defined (empty implementations): `runPhase1()`, `runPhase2()`, `runPhase3()`, `runPhase4()`
6. Helper method: `updateStatus(phase, message)` logs to D1 test_events and broadcasts via WebSocket
7. Helper method: `storeEvidence(type, data)` saves to R2 and tracks in DO state
8. Error handling wrapper: all phase methods catch errors and return user-friendly messages
9. DO can be instantiated by Workflow with test run UUID as DO ID

**Prerequisites:** Epic 1 complete (Stories 1.1-1.5)

**Technical Notes:**
- DO ID = test run UUID (1:1 mapping per test)
- State persists across all 4 phases and retries
- Use Agents SDK features: WebSocket API, built-in SQL storage
- Reference: https://developers.cloudflare.com/agents/
- SQL storage for: agent_actions (timestamp, action, reasoning), control_discoveries (selector, action_type), decision_log
- D1 for persistent cross-test metadata; Agent SQL for ephemeral per-test reasoning
- Browser session handle stored in DO state

---

**Story 2.2: Browser Rendering Integration and Stagehand Setup**

As a developer,
I want Stagehand integrated with Cloudflare Browser Rendering,
So that the TestAgent can control a browser session.

**Acceptance Criteria:**
1. Browser Rendering service binding configured in TestAgent DO
2. Stagehand library initialized with Browser Rendering connection
3. Helper method: `launchBrowser()` creates browser session and returns Stagehand instance
4. Browser session persists in DO state across phases 1-3
5. Helper method: `closeBrowser()` cleanly terminates session
6. Browser configured with: headless mode, viewport 1280x720, user agent string
7. Console log capture enabled and streamed to DO state
8. Network request monitoring enabled (track failed requests)
9. Screenshot capture function: `captureScreenshot(description)` saves to R2

**Prerequisites:** Story 2.1

**Technical Notes:**
- Stagehand docs: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
- Store browser session handle in DO state for reuse
- Console logs accumulated in memory, flushed to R2 at end of Phase 3
- Network errors tracked: status >= 400 or connection failures

---

**Story 2.3: Phase 1 - Load & Validation**

As a TestAgent,
I want to navigate to the game URL and validate it loaded successfully,
So that I can determine if the game is accessible before testing.

**Acceptance Criteria:**
1. `runPhase1()` method implemented
2. Launch browser using Stagehand
3. Navigate to game URL provided in constructor
4. Wait for page load complete (DOMContentLoaded event)
5. Capture initial screenshot and save to R2: `{timestamp}-phase1-initial-load.png`
6. Validate: page did not return 404 error
7. Validate: page is not blank (has visible DOM elements)
8. Detect if game requires user interaction to start (look for "Play" button, "Start" button)
9. Log any immediate console errors to test_events
10. Update test_runs.status = 'running' in D1
11. Broadcast progress via WebSocket: "Phase 1 complete - Game loaded successfully"
12. Return: { success: true, requiresInteraction: boolean, errors: string[] }

**Prerequisites:** Story 2.2

**Technical Notes:**
- Timeout: 30 seconds total for Phase 1
- Use Stagehand page.goto() for navigation
- Blank page detection: check if body has child elements
- Interaction detection: search for buttons with text containing "play", "start", "begin" (case-insensitive)

---

**Story 2.4: Phase 2 - Control Discovery**

As a TestAgent,
I want to discover interactive controls using Stagehand observe(),
So that I understand how to interact with the game.

**Acceptance Criteria:**
1. `runPhase2()` method implemented
2. Use Stagehand `observe()` to identify DOM-based interactive elements
3. Classify discovered elements: buttons, keyboard inputs, clickable divs, input fields
4. If inputSchema provided in constructor, use it to prioritize specific controls
5. Capture screenshot of page with controls highlighted: `{timestamp}-phase2-controls.png`
6. Generate control hypothesis: list of discovered controls with descriptions
7. Store control hypothesis in DO SQL database for reference in Phase 3
8. Log discovered controls to test_events with descriptions
9. Broadcast progress via WebSocket: "Phase 2 complete - Discovered N controls"
10. Return: { success: true, controls: ControlMap, hypothesis: string }

**Prerequisites:** Story 2.3

**Technical Notes:**
- Timeout: 45 seconds total for Phase 2
- Stagehand observe() returns interactive element locators
- inputSchema format: { controls: { movement: ["W","A","S","D"], actions: ["Space"] } }
- Control types: click, keyboard, drag, hover
- Hypothesis example: "Game has WASD movement controls and Space to shoot"

---

**Story 2.5: Phase 3 - Gameplay Exploration with Computer Use**

As a TestAgent,
I want to autonomously play the game using Stagehand Computer Use mode,
So that I can evaluate gameplay quality and capture evidence.

**Acceptance Criteria:**
1. `runPhase3()` method implemented
2. Use Stagehand agent in Computer Use mode for autonomous exploration
3. Execute goal-driven actions: "Start the game", "Learn the controls", "Play for 2-3 minutes"
4. If game requires interaction (from Phase 1), detect and click "Play" button autonomously
5. Agent decides between keyboard and mouse controls based on observations (or inputSchema if provided)
6. Capture screenshot every 10 seconds OR on significant state change (minimum 5 screenshots)
7. Screenshot naming: `{timestamp}-phase3-{action-description}.png`
8. Monitor console logs continuously - capture errors and warnings
9. Track failed network requests (status >= 400)
10. Log all AI decisions to DO SQL database: {timestamp, decision, action, outcome}
11. Store screenshots to R2 incrementally (don't wait until end)
12. Adaptive timeout: minimum 1 minute, maximum 5 minutes (stop when no new discoveries)
13. Broadcast progress via WebSocket every 15 seconds: current action
14. Return: { success: true, screenshotCount: number, errors: string[], actionsTaken: number }

**Prerequisites:** Story 2.4

**Technical Notes:**
- Timeout: 1-5 minutes adaptive (stop if agent detects no progress for 30s)
- Computer Use mode: agent autonomously decides mouse clicks, keyboard presses, scrolling
- inputSchema guides but doesn't restrict agent (agent can explore beyond schema)
- Evidence captured: screenshots, console logs, network errors, AI decision log
- Maximum workflow duration: 6 minutes total, so Phase 3 can't exceed ~5 minutes

---

**Story 2.6: Phase 4 - Evaluation & Scoring**

As a TestAgent,
I want to analyze all captured evidence and generate quality scores,
So that users receive actionable feedback on their game.

**Acceptance Criteria:**
1. `runPhase4()` method implemented
2. Retrieve all screenshots from R2 for this test
3. Retrieve console logs and network errors from DO state
4. Use AI Gateway (vision model) to analyze screenshots for quality assessment
5. Generate scores (0-100) for 5 metrics:
   - Game Loads Successfully (based on Phase 1 results)
   - Visual Quality (analyze screenshots for polish, coherence)
   - Controls & Responsiveness (based on Phase 2-3 observations)
   - Playability (game has clear objective, mechanics work)
   - Technical Stability (console errors, network failures, crashes)
6. Calculate overall quality score: weighted average (Load 15%, Visual 20%, Controls 20%, Playability 30%, Technical 15%)
7. Generate 2-3 sentence justification for each metric score
8. Store evaluation_scores to D1 (6 rows: 5 metrics + overall)
9. Store overall_score in test_runs table
10. Flush all logs to R2: console.log, network.log, agent-decisions.log
11. Update test_runs.status = 'completed' in D1
12. Broadcast final results via WebSocket
13. Return: { success: true, overallScore: number, metrics: MetricScore[] }

**Prerequisites:** Story 2.5

**Technical Notes:**
- Timeout: 60 seconds total for Phase 4
- AI model: Use vision model via AI Gateway (Workers AI or frontier model)
- Prompt engineering: provide clear scoring rubric to AI
- Justifications must be specific (reference what AI saw in screenshots)
- Error handling: if AI fails, use fallback scoring based on Phase 1-3 technical data

---

**Story 2.7: Graceful Error Handling and User-Friendly Messages**

As a TestAgent,
I want to handle all failures gracefully with helpful error messages,
So that users understand what went wrong without seeing stack traces.

**Acceptance Criteria:**
1. Wrap all phase methods in try-catch blocks
2. Translate technical errors to user-friendly messages:
   - "Game failed to load (404)" → "The game URL could not be accessed. Please check the URL is correct."
   - "Timeout in Phase 3" → "The AI agent couldn't make progress playing the game. The game may require specific interactions we couldn't detect."
   - "AI model unavailable" → "The AI evaluation service is temporarily unavailable. Please try again in a few minutes."
3. If Phase 1-2 fail: skip to Phase 4 with partial evidence and generate limited evaluation
4. If Phase 3 fails: still run Phase 4 with whatever evidence was captured
5. If Phase 4 fails: store partial results with error message
6. All error messages stored in test_runs table and broadcast via WebSocket
7. Retry logic delegated to Workflow (TestAgent reports failure, Workflow decides retry)
8. Never expose: stack traces, internal error codes, infrastructure details

**Prerequisites:** Stories 2.3, 2.4, 2.5, 2.6

**Technical Notes:**
- Error message templates in constants file
- Log full error details to test_events for debugging (but hide from users)
- Graceful degradation: always provide some feedback, even if test partially fails
- AI Gateway fallback handles model unavailability automatically

---

**Epic 2 Summary:**
- **Total Stories:** 7
- **Sequential dependencies:** Must complete 2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 (mostly sequential due to phase dependencies)
- **Estimated Duration:** Days 3-4
- **Deliverable:** Fully autonomous AI test agent that plays games and generates quality reports

---
