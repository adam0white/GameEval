# 4. Functional Requirements

## 4.1 Web Dashboard

**FR-1.1** Dashboard MUST provide a URL submission form accepting valid HTTP/HTTPS game URLs

**FR-1.1.1** Dashboard MAY optionally accept an **input schema** (JSON) describing game controls, which will be provided to the AI agent as guidance during testing

**FR-1.2** Dashboard MUST display a list of test runs showing:
- Game URL (truncated with tooltip)
- Status (Queued, Running, Completed, Failed)
- Progress percentage
- Start time
- Duration
- Overall quality score (when complete)

**FR-1.3** Dashboard MUST update test status in real-time without manual refresh (polling interval: 2-5 seconds recommended)

**FR-1.4** Dashboard MUST allow clicking a test run to view detailed results

**FR-1.5** Dashboard MUST support submitting multiple URLs concurrently

## 4.2 Test Orchestration (4-Phase Workflow)

The AI agent MUST follow this high-level workflow structure:

**FR-2.1 Phase 1: Load & Validation** (30s timeout)
- Navigate to game URL
- Wait for page load complete
- Capture initial screenshot
- Validate game loaded successfully (not 404, not blank page)
- Detect if game requires user interaction to start
- Log any immediate errors

**FR-2.2 Phase 2: Control Discovery** (45s timeout)
- Use Stagehand `observe()` to identify **DOM-based interactive elements** (buttons, inputs, clickable divs)
- If input schema provided, use it to guide control discovery and prioritize testing specific controls
- Capture screenshot of detected controls
- Classify control types (click buttons, keyboard inputs, drag areas)
- Generate hypothesis about game controls and how to start
- Note: Target games use DOM for UI (not canvas), making element detection more reliable

**FR-2.3 Phase 3: Gameplay Exploration** (1-5 min, adaptive timeout)
- Use Stagehand agent in Computer Use mode for autonomous exploration
- Execute goal-driven actions: "Try to start the game", "Test main controls", "Explore game mechanics"
- **Capture evidence continuously throughout:**
  - Screenshot after each significant action (every 5-10 seconds or on state change)
  - Monitor console logs (errors and warnings)
  - Track failed network requests
  - Log all AI decisions and action plans
- Store artifacts to R2 incrementally as captured
- Adjust strategy based on observed outcomes

**FR-2.4 Phase 4: Evaluation & Scoring** (60s timeout)
- Analyze all captured evidence using Workers AI vision model
- Review screenshots, console logs, network errors
- Generate structured evaluation report (see FR-4.x)
- Calculate overall quality score (0-100)
- Store final results to D1

**FR-2.5 Error Handling & Agent Resilience**
- **Agent Retry Logic**: If agent fails a phase, workflow retries with same agent instance (state preserved in Durable Object)
- **Alternative Strategies**: On repeated failures within a phase, agent tries different approach
  - Example: If clicking fails, try keyboard navigation
  - Example: If game doesn't respond, try different start sequence
- **User Interaction Detection**: Agent autonomously detects and handles games requiring interaction to start (e.g., click "Play" button)
- **Timeout Recovery**: If agent makes no progress for 30 seconds, attempts alternative action
- **Graceful Degradation**: If Phase 1-2 fail, skip to evaluation with partial evidence and provide clear user-facing error message
- **AI Model Fallback**: AI Gateway automatically routes to backup model (frontier model if needed) if primary fails
- **Fail-Safe Error Messages**: All failures MUST return helpful, actionable error messages to users (no stack traces)
- **Maximum test duration**: 6 minutes end-to-end (workflow enforces timeout)

## 4.3 Asynchronous Execution

**FR-3.1** Test runs MUST execute asynchronously - submitting a URL returns immediately with a test ID

**FR-3.2** System MUST support running multiple tests concurrently (initial target: 10 concurrent tests)

**FR-3.3** Each test run MUST have a unique ID (UUID format recommended)

**FR-3.4** Test status MUST be queryable via test ID

**FR-3.5** Long-running tests (>5 min) MUST NOT block other tests from starting

## 4.4 AI Evaluation Metrics

The AI MUST evaluate games across these dimensions and provide a 0-100 score for each:

**FR-4.1 Game Loads Successfully** (0-100)
- 0: Fails to load, 404, or blank page
- 50: Loads with errors or missing assets
- 100: Loads perfectly with all assets

**FR-4.2 Visual Quality** (0-100)
- Assets loaded correctly
- Visual polish and coherence
- No broken images or missing textures
- Appropriate for game genre

**FR-4.3 Controls & Responsiveness** (0-100)
- Controls are discoverable
- Input responsiveness
- Feedback on user actions
- Intuitive interaction patterns

**FR-4.4 Playability** (0-100)
- Game has clear objective or gameplay loop
- Player can make meaningful progress
- Game mechanics function as expected
- No game-breaking bugs encountered

**FR-4.5 Technical Stability** (0-100)
- No console errors
- No failed network requests
- No crashes or freezes
- Performance is acceptable (subjective, based on visual smoothness)

**FR-4.6 Overall Quality Score** (0-100)
- Weighted average of above metrics
- Suggested weights: Load (15%), Visual (20%), Controls (20%), Playability (30%), Technical (15%)

**FR-4.7** Each metric score MUST include a 2-3 sentence justification explaining the rating

## 4.5 Test Report Output

**FR-5.1** Report MUST be viewable directly in the dashboard (no separate file download required for basic viewing)

**FR-5.2** Report MUST include:
- Game URL and test timestamp
- Overall quality score (0-100) prominently displayed
- Individual metric scores with justifications
- Timeline of AI actions taken (with timestamps)
- Key screenshots (initial load, controls, gameplay moments, errors)
- Console error log (if any errors found)
- Failed network requests (if any)
- Test duration

**FR-5.3** Report MUST support exporting as JSON for programmatic access

**FR-5.4** Screenshots MUST be viewable inline with captions describing what they show

**FR-5.5** Report MUST indicate which AI model was used for testing and evaluation

## 4.6 Evidence Storage

**FR-6.1** All screenshots MUST be stored in R2 under path pattern: `tests/{test_id}/screenshots/{timestamp}.png`

**FR-6.2** Console logs MUST be stored as: `tests/{test_id}/logs/console.log`

**FR-6.3** Network logs MUST be stored as: `tests/{test_id}/logs/network.log`

**FR-6.4** Test metadata and results MUST be stored in D1 database

**FR-6.5** R2 objects MUST have appropriate Content-Type headers for browser viewing

**FR-6.6** Evidence retention: 30 days minimum, 90 days recommended

---
