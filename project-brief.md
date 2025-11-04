# Product Requirements Document: GameEval Browser Game QA Pipeline

**Version:** 1.3  
**Project Level:** 3 (Multi-service serverless application with AI agents)  
**Created:** November 3, 2025  
**Last Updated:** November 4, 2025  
**Status:** Ready for Implementation

---

## 1. Introduction/Overview

GameEval QA Pipeline is an AI-powered autonomous testing system for browser-based games. Users submit game URLs through a web dashboard, and an AI agent explores the game, captures evidence, evaluates quality metrics, and generates comprehensive test reports - all without manual configuration.

**Target Games**: Designed for HTML5 games that use **DOM-based UI elements** (not canvas-rendered). The system can optionally accept an **input schema** describing game controls to guide more targeted testing.

**Problem Statement**: Game creators need rapid, automated feedback on game quality, playability, and technical issues. Manual QA is time-consuming and doesn't scale for AI-generated games that need continuous testing during development iterations.

**Solution**: A fully serverless, AI-guided testing pipeline that autonomously plays games, evaluates quality across multiple dimensions, and provides actionable feedback with visual evidence.

---

## 2. Product Vision & Goals

### The Magic: "Submit URL → Watch AI Play Your Game → Get Instant Quality Report"

GameEval eliminates the QA bottleneck for browser games by deploying an **AI agent that thinks and plays like a human tester** - discovering controls, exploring gameplay, and evaluating quality - all autonomously in minutes. Developers get actionable feedback with visual proof, not just assertions.

### Core Goals

1. **Autonomous Testing**: AI agent explores and tests games without predetermined scripts or manual configuration - true Computer Use mode gameplay
2. **Real-Time Feedback**: Users watch the AI play their game live via WebSocket updates, seeing exactly what the agent discovers
3. **Comprehensive Analysis**: Multi-dimensional quality scoring (0-100) with visual evidence and detailed logs - every score justified
4. **Serverless Scale**: Handle multiple concurrent game tests without infrastructure management - pure Cloudflare platform
5. **Production-Ready**: Demonstrate Cloudflare's Developer Platform capabilities for AI agent orchestration at scale

---

## 3. User Stories

### Primary User Flow
**As a game developer**, I want to submit my game URL and immediately see an AI agent test it, so that I can get rapid feedback on quality and bugs without manual QA.

**As a game platform operator**, I want to batch test multiple games simultaneously, so that I can efficiently validate quality across my catalog.

**As an AI game generator**, I want automated feedback loops on generated games, so that I can improve my game-building agent through iterative testing.

### Supporting Flows
**As a user**, I want to see real-time progress as the AI tests my game, so that I understand what's happening and how long it will take.

**As a user**, I want detailed visual evidence (screenshots, logs) of issues found, so that I can reproduce and fix problems.

**As a platform admin**, I want to compare test results across model versions, so that I can optimize for cost and accuracy.

---

## 4. Functional Requirements

### 4.1 Web Dashboard

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

**FR-1.6** System MUST enforce rate limiting: maximum 10 tests per hour project-wide to prevent abuse

### 4.2 Test Orchestration (4-Phase Workflow)

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

### 4.3 Asynchronous Execution

**FR-3.1** Test runs MUST execute asynchronously - submitting a URL returns immediately with a test ID

**FR-3.2** System MUST support running multiple tests concurrently (initial target: 10 concurrent tests)

**FR-3.3** Each test run MUST have a unique ID (UUID format recommended)

**FR-3.4** Test status MUST be queryable via test ID

**FR-3.5** Long-running tests (>5 min) MUST NOT block other tests from starting

### 4.4 AI Evaluation Metrics

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

### 4.5 Test Report Output

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

### 4.6 Evidence Storage

**FR-6.1** All screenshots MUST be stored in R2 under path pattern: `tests/{test_id}/screenshots/{timestamp}.png`

**FR-6.2** Console logs MUST be stored as: `tests/{test_id}/logs/console.log`

**FR-6.3** Network logs MUST be stored as: `tests/{test_id}/logs/network.log`

**FR-6.4** Test metadata and results MUST be stored in D1 database

**FR-6.5** R2 objects MUST have appropriate Content-Type headers for browser viewing

**FR-6.6** Evidence retention: 30 days minimum, 90 days recommended

---

## 5. Non-Goals (Out of Scope)

**NG-1** User authentication and authorization - Rate limiting is project-wide (10 tests/hour)

**NG-2** Performance metrics (FPS, memory usage, load time benchmarks) - too complex for MVP

**NG-3** Game-specific test scripts (user-defined interaction sequences) - input schema provides basic guidance

**NG-4** Canvas-rendered games - System optimized for **DOM-based UI games** where interactive elements are inspectable HTML elements

**NG-5** Video recording of test sessions - screenshots sufficient for MVP

**NG-6** Mobile/responsive game testing - desktop web games only

**NG-7** Automated bug filing or integration with issue trackers

**NG-8** A/B testing or game version comparison

**NG-9** Analytics and usage tracking - can be added post-MVP using existing data

**NG-10** Advanced dashboard features (filtering, sorting, search) - post-MVP enhancements

---

## 6. Technical Architecture

### 6.1 Core Technology Stack (Cloudflare Developer Platform)

**Compute & Orchestration:**
- **Cloudflare Workers**: Serve dashboard UI, handle all requests, coordinate system
- **Cloudflare Workflows**: Orchestrate the 5-phase predetermined test pipeline with automatic retries and state persistence
- **Cloudflare Agents SDK**: AI agents as Durable Objects with built-in state management, WebSocket communication, and SQL storage per agent

**Browser Automation:**
- **Cloudflare Browser Rendering**: Serverless browser sessions
- **Stagehand**: AI-powered browser automation library with Computer Use mode
  - Reference: https://developers.cloudflare.com/browser-rendering/platform/stagehand/

**AI/LLM:**
- **AI Gateway**: **Primary entry point for ALL AI requests** - routes to Workers AI or external providers (OpenAI, Anthropic)
  - Provides unified caching, cost tracking, observability, and failover
  - Sits in front of both agent decisions and evaluation logic
- **AI Model Selection**: Start with Workers AI (Llama Vision, Gemini Flash) for testing; if insufficient capability, switch to frontier models (GPT-4o, Claude 3.5 Sonnet) from the start
- **Fallback Strategy**: AI Gateway automatically routes to backup model if primary fails, ensuring graceful degradation

**Storage:**
- **R2 Object Storage**: Screenshots, logs (zero egress fees)
- **D1 SQL Database**: Test metadata, results, scores (queryable for historical trends)
- **Agent SQL Storage**: Built-in per-agent SQL database (part of Agents SDK)

### 6.2 Architecture Pattern: Workflows + Agents SDK

**High-Level Flow:**
```
User submits URL → Dashboard Worker → Workflow triggered → TestAgent DO launched → Results streamed back
```

**Simplified Architecture: One Agent Per Test**
```
Workflow: GameTestPipeline
├─ Input: Test Run ID (UUID auto-generated), Game URL, Input Schema (optional JSON)
├─ Step 1: Launch TestAgent DO (ID = test run UUID)
├─ Step 2: TestAgent.runPhase1() - Load & Validation (30s timeout)
├─ Step 3: TestAgent.runPhase2() - Control Discovery (45s timeout)
├─ Step 4: TestAgent.runPhase3() - Gameplay Exploration (1-5 min, adaptive)
└─ Step 5: TestAgent.runPhase4() - Evaluation & Scoring (60s timeout)
```

**TestAgent Durable Object (Cloudflare Agents SDK):**

**One TestAgent instance per test run** with:
- **Unique ID**: Test run UUID (e.g., `test-550e8400-e29b-41d4-a716-446655440000`)
- **State Management**: Persistent state across all phases and retries
- **Browser Session**: Maintains single Browser Rendering session across phases 1-3
- **Evidence Storage**: Screenshots, logs accumulated throughout test
- **WebSocket Communication**: Streams real-time progress to dashboard
- **Built-in SQL Database**: Stores decisions, action history, intermediate results
- **AI Model Access**: All calls routed through AI Gateway

**TestAgent Lifecycle:**
1. Workflow creates TestAgent DO with test run ID
2. TestAgent persists for all 4 phases (same browser session, same state)
3. Evidence captured incrementally, stored to R2 during Phase 3
4. Final evaluation in Phase 4 reviews all accumulated evidence
5. TestAgent remains available for dashboard queries after completion

**Benefits of Single Agent Per Test:**
- Simpler state management (no coordination between multiple agents)
- Browser session persists across phases (faster, maintains game state)
- Evidence accumulates naturally in DO state
- Workflow focuses on orchestration and retry logic
- Clear ownership: TestAgent owns entire test execution

**Agent Resilience:**
- If phase fails, workflow retries same TestAgent (state preserved)
- TestAgent can try alternative strategies within a phase
- All AI calls through AI Gateway enable automatic model fallback
- Workflow enforces timeouts but TestAgent manages execution

### 6.3 Service Communication Pattern

**Workers-Only Architecture:**
- **Dashboard Worker**: Serves UI HTML/CSS/JS, accepts URL submissions, triggers Workflows
- **No exposed REST API**: Dashboard submits URLs directly to Workflow via Service Bindings
- **Real-time updates**: Agents push updates to dashboard via WebSockets (built into Agents SDK)
- **Internal RPC**: Workers ↔ Workflows ↔ Agents communicate via Service Bindings only

**AI Request Flow (ALL requests through AI Gateway):**
```
Agent decision needed
  → Agent calls AI Gateway endpoint
    → AI Gateway routes to Workers AI (default) or external provider
      → Response cached in AI Gateway
        → Returned to Agent
```

Benefits:
- Unified observability for all AI operations
- Cost tracking across providers
- Automatic failover if primary model unavailable
- Request caching reduces costs

### 6.4 Data Models

**D1 Database Schema (Test Metadata):**

Tables needed:
- `test_runs`: Core test metadata (id, url, input_schema, status, scores, timestamps)
- `evaluation_scores`: Individual metric scores with justifications
- `test_events`: Timeline of agent actions and phase transitions

**Input Schema Format (Optional):**
```json
{
  "controls": {
    "movement": ["W", "A", "S", "D"],
    "actions": ["Space", "Click"],
    "special": ["E", "Q"]
  },
  "objectives": "Collect items and reach the goal",
  "ui_elements": ["score display", "health bar", "inventory"]
}
```

**Agent SQL Storage (Built-in per Agent):**

Each agent maintains its own SQL database with:
- Decision logs (what the agent considered and why)
- Action history (clicks, inputs, observations)
- Intermediate results (hypotheses, discoveries)
- Error/retry history

**R2 Storage Structure:**
```
tests/{test-id}/
├── screenshots/
│   ├── {timestamp}-{phase}-{description}.png
│   └── ...
├── logs/
│   ├── console.log
│   ├── network.log
│   └── agent-decisions.log
└── report.json
```

### 6.5 Stagehand Integration

**Integration Within TestAgent:**
- **Phase 1**: Stagehand navigates to URL, validates page load
- **Phase 2**: Stagehand `observe()` identifies interactive elements  
- **Phase 3**: Stagehand Computer Use mode for autonomous gameplay exploration
- All Stagehand AI calls routed through AI Gateway

**Computer Use Mode for Gameplay (Phase 3):**
- TestAgent uses Stagehand agent with high-level goals: "Start the game", "Learn controls", "Play for 2-3 minutes"
- Stagehand agent autonomously decides specific actions (clicks, typing, keyboard, scrolling)
- Adapts strategy based on observations
- TestAgent captures screenshot after each significant action → stores to R2 immediately
- All decisions logged to TestAgent's SQL database

**Evidence Capture Pattern:**
- Screenshots stored in R2: `tests/{test-id}/screenshots/{timestamp}-{phase}-{action}.png`
- Console logs captured continuously from Browser Rendering session
- Failed network requests logged as they occur
- Agent decision trail in SQL: {timestamp, phase, decision, action, outcome}
- Evidence accumulated in TestAgent state throughout phases 1-3

---

## 7. Design Considerations

### 7.1 Dashboard UI/UX (Served by Workers)

**Architecture:**
- Single Worker serves both UI and handles URL submissions
- HTML/CSS/JS delivered directly from Worker
- WebSocket connection to agents for real-time updates (built into Agents SDK)
- No separate API endpoints needed

**Layout:**
- Header: "GameEval QA Pipeline" + URL submission form
- Main content: Live-updating list of test runs (newest first)
- Each test run card:
  - Game URL with status badge (Queued / Running / Completed / Failed)
  - Live progress indicator showing current phase
  - Quality score when complete (color-coded)
  - Click to expand detailed report inline

**Test Run Detail (Inline Expansion):**
- Large quality score with breakdown
- Individual metric scores with AI justifications
- Timeline of agent actions with timestamps
- Screenshot gallery with captions
- Expandable console logs / errors

**Real-Time Updates:**
- WebSocket connection to agents provides live phase updates
- Progress bar animates as agent completes actions
- Toast notifications on test completion
- No manual refresh needed

### 7.2 Visual Design

Follow Cloudflare design patterns:
- Clean, minimal interface
- Orange accents for primary actions
- Monospace for URLs and technical data
- Responsive layout (mobile-friendly)

---

## 8. Success Metrics

### 8.1 Technical Metrics

**TM-1** Test completion rate: >90% of submitted URLs complete successfully (not fail due to pipeline errors)

**TM-2** Average test duration: 2-4 minutes per game

**TM-3** Concurrent test capacity: Support 10 simultaneous tests without degradation

**TM-4** Dashboard responsiveness: Status updates appear within 5 seconds of phase change

**TM-5** Cost efficiency: <$0.10 per game test (including Browser Rendering, Workers AI, storage)

### 8.2 Quality Metrics

**QM-1** AI evaluation accuracy: Manual review of 50 test reports shows >80% agreement with AI scores

**QM-2** Evidence completeness: >95% of tests capture at least 5 useful screenshots

**QM-3** Error detection: System identifies and logs console errors in >90% of games with errors

### 8.3 User Experience Metrics

**UXM-1** Time to first feedback: Users see test start within 10 seconds of URL submission

**UXM-2** Report clarity: Users can identify main issues within 30 seconds of viewing report

**UXM-3** Platform reliability: Dashboard uptime >99.5%

---

## 9. Implementation Phases

### Phase 1: Core Pipeline (Days 1-3)
- Set up Cloudflare Workers project
- Implement Workflow for 4-phase test pipeline (orchestration layer)
- Implement TestAgent Durable Object (Agents SDK)
- Integrate Stagehand with Browser Rendering
- Implement Phase 1-2 in TestAgent (Load & Control Discovery)
- Basic evidence capture (screenshots to R2)
- D1 database setup
- Configure AI Gateway with Workers AI or frontier model

**Success Criteria:** Can trigger workflow, TestAgent launches, browser loads game, discovers controls, captures screenshots to R2

### Phase 2: AI Agent & Evaluation (Days 3-4)
- Implement Phase 3 in TestAgent (Gameplay Exploration with Stagehand Computer Use)
- Implement Phase 4 in TestAgent (Evaluation & Scoring with 5 metrics)
- Implement agent retry logic and graceful error handling with user-friendly messages
- Console log and network request capture during gameplay
- Agent decision logging to SQL database
- Input schema integration (optional parameter)

**Success Criteria:** Full 4-phase pipeline completes, TestAgent autonomously explores games, generates scores with justifications, handles failures gracefully

### Phase 3: Dashboard & Real-Time Updates (Days 4-5) **[MVP COMPLETE]**
- Build dashboard Worker (serves UI + handles submissions)
- Implement WebSocket connections to agents for real-time updates
- Test report detail view with inline screenshots and logs
- URL submission triggers workflow
- Rate limiting enforcement (10 tests/hour project-wide)
- **Test with example games** built with the target game engine (DOM-based UI)
- Validate input schema integration with sample games

**Success Criteria:** Users can submit URLs, see live progress via WebSocket, view complete reports inline. System reliably tests DOM-based games with autonomous agent exploration. **MVP FUNCTIONALITY COMPLETE.**

---

### Post-MVP: Phase 4: Polish & Optimization (Days 6+)
- Advanced error handling and edge cases
- Cost optimization (AI Gateway caching, model selection tuning)
- Load testing with 10+ concurrent requests
- UI polish and responsive design
- Documentation and deployment guide

**Success Criteria:** System handles 10 concurrent tests reliably, dashboard is production-ready, comprehensive documentation

### Post-MVP: Phase 5: Advanced Features (Future)
- **Dashboard Enhancements**: Filtering, sorting, search functionality
- **Parallel Testing**: Batch submit multiple URLs, test in parallel
- **Multi-Model Comparison**: Run same test with different AI models, compare results
- **Historical Trends**: Query D1 for game improvement over time
- **Analytics**: Usage tracking, popular game domains, test patterns
- **Advanced Features**: Custom test duration, model selection UI, export reports

---

## 10. Design Decisions

**DD-1: Rate Limiting Strategy** ✅ DECIDED
- **Decision:** Project-wide rate limiting of 10 tests per hour (not per-user/IP)
- **Rationale:** Simpler implementation for MVP, prevents abuse, can be refined post-launch
- **Implementation:** Enforced in Dashboard Worker before workflow trigger (FR-1.6)

**DD-2: User Interaction Handling** ✅ DECIDED
- **Decision:** Agent autonomously detects and handles games requiring interaction to start
- **Rationale:** Leverages Stagehand's Computer Use mode capabilities, no special cases needed
- **Implementation:** TestAgent in Phase 2 uses visual observation to detect "Play" buttons and click autonomously (FR-2.5)

**DD-3: Control Input Support** ✅ DECIDED
- **Decision:** Support both keyboard and mouse controls; agent decides which to use
- **Rationale:** Stagehand Computer Use mode handles both natively; input schema can guide when provided
- **Implementation:** TestAgent evaluates game context and uses appropriate input method; input schema (FR-1.1.1) provides explicit guidance

**DD-4: AI Model Fallback Strategy** ✅ DECIDED
- **Decision:** Use AI Gateway for automatic failover; frontier models available if Workers AI insufficient
- **Rationale:** Start with Workers AI for cost efficiency, but switch to frontier models (GPT-4o, Claude 3.5) if capability needed
- **Implementation:** AI Gateway configured with fallback chain; all errors fail gracefully with user-friendly messages (FR-2.5)

**DD-5: Dashboard Filtering/Sorting** ✅ DECIDED
- **Decision:** Deferred to post-MVP (Phase 5)
- **Rationale:** Nice-to-have but not essential for core value delivery; simple list view sufficient for MVP
- **Implementation:** Basic list view in Phase 3 MVP; filtering/sorting added in Phase 5 (NG-10)

**DD-6: Analytics and Usage Tracking** ✅ DECIDED
- **Decision:** Skipped for MVP
- **Rationale:** All test data stored in D1; analytics can be added post-launch using existing data
- **Implementation:** D1 schema supports future analytics; deferred to Phase 5 (NG-9)

**DD-7: AI Model Selection** ✅ DECIDED
- **Decision:** Test Workers AI first; switch to frontier models from start if capability insufficient
- **Rationale:** Cost vs capability trade-off; use best model for autonomous agent quality
- **Implementation:** Model selection in Phase 1; AI Gateway provides unified interface regardless of provider

---

## 11. References & Resources

### Cloudflare Documentation
- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/) - Core pattern for AI agents as Durable Objects
- [Stagehand Integration Guide](https://developers.cloudflare.com/browser-rendering/platform/stagehand/)
- [Cloudflare Workflows Documentation](https://developers.cloudflare.com/workflows/)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [AI Gateway Documentation](https://developers.cloudflare.com/ai-gateway/)
- [Browser Rendering Documentation](https://developers.cloudflare.com/browser-rendering/)
- [Reference Architecture: AI Agents](https://developers.cloudflare.com/reference-architecture/diagrams/ai/)

### Stagehand Resources
- [Stagehand Documentation](https://docs.stagehand.dev/)
- [Stagehand Computer Use Guide](https://docs.stagehand.dev/v3/best-practices/computer-use)

### Key Architecture Patterns
- **Agents SDK Pattern**: AI agents as Durable Objects with state management, WebSockets, and SQL storage
- **Workflow Orchestration**: Long-running multi-step pipelines with retries and state persistence
- **AI Gateway Pattern**: All AI requests routed through gateway for observability, caching, and failover
- **Service Bindings**: Internal RPC communication without exposed APIs

---

## 12. Acceptance Criteria Summary

### MVP Acceptance Criteria (Phase 1-3 Complete)

**For MVP to be considered complete, the system MUST:**

✅ **Core Pipeline (Phase 1)**
- Accept game URLs via dashboard Worker
- Optionally accept input schema (JSON) describing game controls
- Generate unique test run ID (UUID) auto-generated per submission
- Trigger Workflow which launches TestAgent DO (ID = test run UUID)
- TestAgent navigates to URL and validates load (Phase 1)
- TestAgent discovers DOM-based UI controls using Stagehand observe (Phase 2)
- Configure AI Gateway with Workers AI or frontier model
- Set up D1 database and R2 storage

✅ **AI Agent & Evaluation (Phase 2)**
- TestAgent autonomously explores game for 1-5 minutes with Computer Use mode (Phase 3)
- Autonomously detect and handle user interaction requirements (e.g., "Play" button)
- Support keyboard and mouse controls (agent decides based on game context)
- If input schema provided, use it to guide control discovery and testing
- Capture minimum 5 screenshots during gameplay (stored incrementally to R2)
- Log console errors and failed network requests throughout test
- TestAgent generates evaluation scores for all 5 metrics (Phase 4)
- Calculate overall quality score (0-100) with justifications
- Implement graceful error handling with user-friendly messages
- Route all AI requests through AI Gateway with automatic fallback

✅ **Dashboard & Real-Time Updates (Phase 3)** **[MVP MILESTONE]**
- Display live-updating list of test runs with status
- Stream real-time progress via WebSocket (Agents SDK)
- Show detailed test reports inline with screenshots and logs
- Enforce rate limiting (10 tests/hour project-wide)
- Test successfully with example DOM-based games
- Validate input schema integration
- Store all evidence in R2 (screenshots, logs) under test ID path
- Store test metadata in D1 and agent decisions in TestAgent SQL
- Deploy entirely on Cloudflare (Workers, Workflows, Agents SDK, Browser Rendering, AI Gateway, R2, D1)

**MVP Success Metrics:**
- System completes end-to-end test in under 6 minutes (4 phases)
- Can reliably test DOM-based games with autonomous AI agent
- Users receive actionable feedback with visual evidence
- Real-time progress updates via WebSocket

---

### Post-MVP Acceptance Criteria (Phase 4-5)

**Phase 4: Polish & Optimization**
- Advanced error handling for edge cases
- Support 10+ concurrent test runs reliably
- Cost optimization (AI Gateway caching, model tuning)
- Production-ready UI polish and responsive design
- Comprehensive documentation

**Phase 5: Advanced Features**
- Dashboard filtering, sorting, search
- Parallel batch testing
- Multi-model comparison
- Historical trends and analytics
- Custom test configuration UI

---

## Appendix A: Example Test Timeline

**Example test run for "https://game-example.com/space-shooter":**

```
Test ID: test-a7b3c9d2-4f1e-4a8b-9c2d-5e6f7a8b9c0d

00:00 - Test started, TestAgent DO created
00:02 - Phase 1: TestAgent navigating to URL
00:05 - Phase 1: Page loaded, screenshot captured and stored to R2
00:06 - Phase 1: Detected game canvas, ready for interaction
00:08 - Phase 2: Analyzing UI with Stagehand observe()
00:12 - Phase 2: Identified controls: WASD movement, Space to shoot, Click to start
00:15 - Phase 3: Starting gameplay exploration (Computer Use mode)
00:18 - Phase 3: Clicked "Start Game" button → screenshot saved
00:22 - Phase 3: Testing WASD movement → screenshot saved
00:35 - Phase 3: Testing shoot action (Space key) → screenshot saved
00:50 - Phase 3: Exploring enemy interactions → screenshot saved
01:15 - Phase 3: Attempting level progression → screenshot saved
02:15 - Phase 3: Gameplay session complete (2 min, 8 screenshots captured)
02:18 - Phase 4: Analyzing 8 screenshots with Workers AI vision
02:35 - Phase 4: Reviewing console logs (2 warnings, 0 errors)
02:40 - Phase 4: Generating evaluation scores across 5 metrics
02:48 - Phase 4: Calculating overall quality score
02:50 - Test completed, overall score: 78/100
02:51 - Results stored to D1, TestAgent ready for queries
```

---

---

*End of PRD*

