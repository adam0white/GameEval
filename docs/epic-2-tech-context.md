# Epic Technical Specification: AI Test Agent & Browser Automation

Date: 2025-01-27
Author: Adam
Epic ID: epic-2
Status: Ready for Implementation

---

## Overview

Epic 2 implements the core AI-powered test agent that autonomously plays browser games and evaluates their quality across 5 dimensions. This epic builds on Epic 1's infrastructure foundation to create the "magic" of GameEval - an AI agent that thinks like a human tester, discovering controls and exploring gameplay autonomously using Stagehand Computer Use mode. The TestAgent Durable Object orchestrates a 4-phase test pipeline: Load & Validation, Control Discovery, Gameplay Exploration, and Evaluation & Scoring. Each phase captures evidence (screenshots, console logs, network errors) and uses AI Gateway for intelligent decision-making and quality assessment. The epic delivers a fully functional autonomous test agent that generates actionable quality reports for game developers.

## Objectives and Scope

**Objectives:**
- Implement TestAgent Durable Object with state management, lifecycle hooks, and WebSocket communication
- Integrate Stagehand with Cloudflare Browser Rendering for autonomous browser control
- Implement 4-phase test execution pipeline (Load & Validation, Control Discovery, Gameplay Exploration, Evaluation)
- Enable Computer Use mode for goal-driven autonomous gameplay exploration
- Generate quality scores across 5 metrics (Load, Visual, Controls, Playability, Technical Stability)
- Provide graceful error handling with user-friendly messages

**In Scope:**
- TestAgent Durable Object class with 4 phase methods (`runPhase1-4()`)
- Browser Rendering integration with Stagehand library
- Agent SQL database for per-test reasoning and decision logging
- WebSocket broadcasting for real-time progress updates
- Screenshot capture and R2 storage during gameplay
- Console log and network error monitoring
- AI Gateway integration for Computer Use decisions and Phase 4 evaluation
- Evidence aggregation and scoring logic
- Error translation and graceful degradation

**Out of Scope:**
- Dashboard UI implementation (Epic 3)
- Multi-game batch testing (Epic 5)
- Advanced analytics and trends (Epic 5)
- Production hardening (rate limiting, advanced security) (Epic 4)

## System Architecture Alignment

### Architecture Pattern
Epic 2 implements **Pattern 1: TestAgent as Durable Object** (ADR-002) and **Pattern 2: Event-Driven Progress Streaming** (ADR-006):
- **TestAgent Durable Object**: One instance per test run (DO ID = test UUID), persisting across all 4 phases and retries
- **Workflow Orchestration**: GameTestPipeline (from Epic 1) calls TestAgent methods sequentially with timeouts and retries
- **Browser Session Persistence**: Browser session stored in DO state, reused across phases 1-3 for efficiency
- **Evidence Accumulation**: Screenshots, logs, AI decisions accumulate in DO state and R2 throughout execution
- **WebSocket Broadcasting**: Real-time progress updates to dashboard via Agents SDK WebSocket API

### Integration Points
- **Epic 1 Dependencies**: D1 database, R2 bucket, AI Gateway, Workflow orchestration
- **Browser Rendering**: Serverless browser sessions via Cloudflare Browser Rendering service
- **Stagehand Library**: Computer Use mode for autonomous gameplay, `observe()` for control discovery
- **AI Gateway**: All AI requests (Computer Use decisions, Phase 4 evaluation) route through gateway (ADR-004)

### Data Storage Strategy (ADR-007)
- **D1 Database**: Cross-test metadata (test_runs.status, evaluation_scores, test_events)
- **Agent SQL**: Per-test ephemeral data (agent_actions, control_discoveries, decision_log)
- **R2 Object Storage**: Screenshots and logs (evidence artifacts)

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|---|---|---|---|---|
| **TestAgent Durable Object** (`src/agents/TestAgent.ts`) | Execute 4-phase test pipeline, manage browser session, capture evidence | Phase method calls, gameUrl, inputSchema | Phase results, evidence artifacts | Story 2.1 |
| **Browser Session Manager** (`src/agents/TestAgent.ts`) | Launch/maintain browser session, configure Stagehand | Browser Rendering binding | Stagehand instance, browser session handle | Story 2.2 |
| **Phase 1 Handler** (`runPhase1()`) | Navigate to game URL, validate load, detect interaction requirements | gameUrl | PhaseResult with validation results | Story 2.3 |
| **Phase 2 Handler** (`runPhase2()`) | Discover interactive controls using Stagehand observe() | inputSchema (optional) | PhaseResult with control map and hypothesis | Story 2.4 |
| **Phase 3 Handler** (`runPhase3()`) | Autonomous gameplay exploration via Computer Use mode | Control discoveries from Phase 2 | PhaseResult with evidence count, actions taken | Story 2.5 |
| **Phase 4 Handler** (`runPhase4()`) | Analyze evidence, generate quality scores via AI Gateway | All evidence from R2, DO state | PhaseResult with scores and justifications | Story 2.6 |
| **Error Handler** (`handleError()`) | Translate technical errors to user-friendly messages | Error object | User-friendly error message | Story 2.7 |
| **WebSocket Handler** (`handleWebSocket()`) | Broadcast progress updates to connected dashboard clients | Progress events | WebSocket messages | Story 2.1 |
| **Evidence Manager** (`storeEvidence()`, `captureScreenshot()`) | Save screenshots/logs to R2, track in DO state | Evidence data, testId | R2 URLs, stored metadata | Story 2.2 |

### Data Models and Contracts

**Agent SQL Schema (Per-DO):**

```sql
-- agent_actions table (Story 2.3, 2.5)
CREATE TABLE agent_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  action TEXT NOT NULL,              -- 'click', 'type', 'scroll', 'wait', 'keyboard'
  reasoning TEXT NOT NULL,           -- Why agent chose this action
  outcome TEXT                        -- Result of action (success/failure description)
);

-- control_discoveries table (Story 2.4)
CREATE TABLE control_discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  element_selector TEXT NOT NULL,     -- CSS selector or Stagehand locator
  action_type TEXT NOT NULL,          -- 'click', 'keyboard', 'drag', 'hover'
  confidence REAL NOT NULL,           -- 0.0 - 1.0 (from Stagehand observe())
  discovered_at INTEGER NOT NULL
);

-- decision_log table (Story 2.5)
CREATE TABLE decision_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  decision TEXT NOT NULL,            -- What agent decided to do
  context TEXT NOT NULL,             -- Information used to make decision
  ai_model TEXT                      -- Model used for this decision (from AI Gateway)
);
```

**TestAgent State (DO State):**

```typescript
interface TestAgentState {
  testRunId: string;
  gameUrl: string;
  inputSchema?: InputSchema;
  browserSession?: BrowserSessionHandle;  // Persisted across phases 1-3
  phaseResults: {
    phase1?: PhaseResult;
    phase2?: PhaseResult;
    phase3?: PhaseResult;
    phase4?: PhaseResult;
  };
  evidence: {
    screenshots: ScreenshotMetadata[];
    consoleLogs: string[];
    networkErrors: NetworkError[];
    agentDecisions: DecisionLogEntry[];
  };
  websocketClients: WebSocket[];  // Connected dashboard clients
}
```

**Phase Result Types:**

```typescript
interface Phase1Result {
  success: boolean;
  requiresInteraction: boolean;  // Game needs "Play" button click
  errors: string[];
}

interface Phase2Result {
  success: boolean;
  controls: ControlMap;  // { [selector]: { type: 'click' | 'keyboard', description: string } }
  hypothesis: string;     // "Game has WASD movement and Space to shoot"
}

interface Phase3Result {
  success: boolean;
  screenshotCount: number;
  errors: string[];
  actionsTaken: number;
}

interface Phase4Result {
  success: boolean;
  overallScore: number;
  metrics: MetricScore[];  // [{ name: 'load', score: 85, justification: '...' }, ...]
}
```

**Input Schema Format (Optional):**

```typescript
interface InputSchema {
  controls?: {
    movement?: string[];  // ['W', 'A', 'S', 'D']
    actions?: string[];   // ['Space', 'Click']
    special?: string[];   // ['E', 'Q']
  };
  objectives?: string;    // "Collect items and reach the goal"
  ui_elements?: string[]; // ['score display', 'health bar', 'inventory']
}
```

### APIs and Interfaces

**TestAgent Durable Object RPC Interface:**

```typescript
// TestAgent class structure
export class TestAgent implements DurableObject {
  constructor(state: DurableObjectState, env: Env);
  
  async fetch(request: Request): Promise<Response> {
    // Routes:
    // - /ws → WebSocket upgrade
    // - /phase1 → runPhase1()
    // - /phase2 → runPhase2()
    // - /phase3 → runPhase3()
    // - /phase4 → runPhase4()
    // - /init → initialize(testRunId, gameUrl, inputSchema)
  }
  
  private async runPhase1(): Promise<Response>;
  private async runPhase2(): Promise<Response>;
  private async runPhase3(): Promise<Response>;
  private async runPhase4(): Promise<Response>;
  private async launchBrowser(): Promise<StagehandSession>;
  private async closeBrowser(): Promise<void>;
  private async captureScreenshot(description: string): Promise<string>;
  private async updateStatus(phase: string, message: string): Promise<void>;
  private async storeEvidence(type: 'screenshot' | 'log', data: unknown): Promise<void>;
  private async handleError(error: Error, phase: string): Promise<Response>;
}
```

**Stagehand Integration (Story 2.2, 2.3, 2.4, 2.5):**

```typescript
// Browser session initialization
const browser = await env.BROWSER.launch({
  headless: true,
  viewport: { width: 1280, height: 720 },
  userAgent: 'GameEval TestAgent/1.0'
});

const page = await browser.newPage();
const stagehand = new Stagehand(page, {
  mode: 'computer-use',  // Enables autonomous gameplay (Story 2.5)
  model: 'gpt-4o'  // Or via AI Gateway
});

// Phase 2: Control discovery
const controls = await stagehand.observe();  // Returns interactive elements

// Phase 3: Autonomous gameplay
await stagehand.do('Start the game and play for 2-3 minutes');
await stagehand.do('Learn the controls and test movement');
```

**AI Gateway Integration (Story 2.5, 2.6):**

```typescript
// Phase 3: Computer Use decisions (via AI Gateway)
const decision = await callAI(env, {
  prompt: 'What action should I take next?',
  images: [currentScreenshot],
  modelPreference: 'primary'  // Workers AI or fallback
}, testRunId);

// Phase 4: Evaluation (vision model via AI Gateway)
const scores = await callAI(env, {
  prompt: `Analyze these screenshots and score the game on 5 metrics:
  - Game Loads Successfully (0-100)
  - Visual Quality (0-100)
  - Controls & Responsiveness (0-100)
  - Playability (0-100)
  - Technical Stability (0-100)
  Return JSON with scores and justifications.`,
  images: allScreenshots,
  modelPreference: 'primary'  // Vision model (Llama Vision or Gemini Flash)
}, testRunId);
```

**R2 Evidence Storage:**

```typescript
// Screenshot upload (Story 2.3, 2.4, 2.5)
const screenshotUrl = await uploadScreenshot(
  env.EVIDENCE_BUCKET,
  testRunId,
  phase,
  actionDescription,
  screenshotBuffer
);

// Log upload (Story 2.6)
await uploadLog(
  env.EVIDENCE_BUCKET,
  testRunId,
  'console',  // or 'network' or 'agent-decisions'
  logContent
);
```

### Workflows and Sequencing

**TestAgent Phase Execution Flow:**

```
Workflow Step 1: Launch TestAgent DO
    → TestAgent initialized with testRunId, gameUrl, inputSchema
    → DO state created, WebSocket handler ready
    ↓
Workflow Step 2: Phase 1 - Load & Validation (30s timeout)
    → TestAgent.runPhase1()
        → launchBrowser() → Browser session created, stored in DO state
        → stagehand.goto(gameUrl)
        → Wait for DOMContentLoaded
        → captureScreenshot('phase1-initial-load')
        → Validate: no 404, page not blank, detect "Play" button
        → updateStatus('phase1', 'Game loaded successfully')
        → Log to D1 test_events, broadcast via WebSocket
        → Return: { success: true, requiresInteraction: boolean, errors: [] }
    ↓
Workflow Step 3: Phase 2 - Control Discovery (45s timeout)
    → TestAgent.runPhase2()
        → Reuse browser session from Phase 1
        → stagehand.observe() → Discover interactive elements
        → Classify controls: buttons, keyboard inputs, clickable divs, input fields
        → If inputSchema provided, prioritize specific controls
        → Store controls in Agent SQL (control_discoveries table)
        → captureScreenshot('phase2-controls')
        → Generate hypothesis: "Game has WASD movement and Space to shoot"
        → updateStatus('phase2', 'Discovered N controls')
        → Return: { success: true, controls: ControlMap, hypothesis: string }
    ↓
Workflow Step 4: Phase 3 - Gameplay Exploration (5min adaptive timeout)
    → TestAgent.runPhase3()
        → Reuse browser session from Phase 1-2
        → If requiresInteraction: stagehand.do('Click the Play button')
        → stagehand.do('Start the game') → Computer Use mode activates
        → stagehand.do('Learn the controls') → Agent explores via keyboard/mouse
        → stagehand.do('Play for 2-3 minutes') → Adaptive exploration
        → Capture screenshot every 10 seconds OR on state change (min 5 screenshots)
        → Monitor console logs, network errors continuously
        → Log all AI decisions to Agent SQL (decision_log table)
        → Store screenshots incrementally to R2
        → Broadcast progress every 15 seconds via WebSocket
        → Adaptive timeout: stop if no progress for 30 seconds
        → Return: { success: true, screenshotCount: number, errors: [], actionsTaken: number }
    ↓
Workflow Step 5: Phase 4 - Evaluation & Scoring (60s timeout)
    → TestAgent.runPhase4()
        → Retrieve all screenshots from R2 for this test
        → Retrieve console logs, network errors from DO state
        → Call AI Gateway (vision model) to analyze screenshots
        → Generate scores (0-100) for 5 metrics + overall
        → Store evaluation_scores to D1 (6 rows)
        → Store overall_score in test_runs table
        → Flush all logs to R2: console.log, network.log, agent-decisions.log
        → Update test_runs.status = 'completed'
        → Broadcast final results via WebSocket
        → closeBrowser() → Terminate browser session
        → Return: { success: true, overallScore: number, metrics: MetricScore[] }
```

**Error Handling Flow (Story 2.7):**

```
Phase fails with error
    ↓
TestAgent catches error in phase method
    ↓
handleError() translates to user-friendly message:
    - "Game failed to load (404)" → "The game URL could not be accessed. Please check the URL is correct."
    - "Timeout in Phase 3" → "The AI agent couldn't make progress playing the game. The game may require specific interactions we couldn't detect."
    ↓
If Phase 1-2 fail: Skip to Phase 4 with partial evidence
    → Phase 4 still runs, generates limited evaluation
    ↓
If Phase 3 fails: Still run Phase 4 with whatever evidence captured
    → Phase 4 uses available screenshots/logs
    ↓
If Phase 4 fails: Store partial results with error message
    → Mark test as 'failed' but preserve evidence
    ↓
Error message stored in test_runs table and broadcast via WebSocket
    → Never expose stack traces, internal error codes
```

## Non-Functional Requirements

### Performance

| Metric | Target | Justification |
|---|---|---|
| Phase 1 execution time | < 30 seconds | Load validation should complete quickly |
| Phase 2 execution time | < 45 seconds | Control discovery typically fast for DOM-based games |
| Phase 3 execution time | 1-5 minutes (adaptive) | Autonomous gameplay exploration, most tests complete in 2-3 min |
| Phase 4 execution time | < 60 seconds | AI evaluation with vision model |
| Screenshot capture latency | < 200ms | Must not block gameplay exploration |
| WebSocket broadcast rate | Max 1 event per 5 seconds | Prevent spam, maintain dashboard responsiveness |
| Browser session reuse | Persist across phases 1-3 | Reduces overhead, maintains game state |
| AI Gateway request latency | < 5 seconds (primary), < 10 seconds (fallback) | Computer Use decisions must be responsive |

### Security

- **Browser Session Isolation**: Each test run uses isolated browser session (no cross-test contamination)
- **Input Validation**: Validate game URL format (HTTP/HTTPS only), input schema JSON structure (max 10KB)
- **AI Gateway Routing**: All AI requests route through AI Gateway (no direct provider access)
- **Error Message Sanitization**: Never expose stack traces, internal error codes, infrastructure details in user-facing messages
- **R2 Access Control**: Screenshots/logs have public read access (signed URLs for dashboard viewing)
- **WebSocket Security**: WebSocket connections proxied through Worker (no direct DO access)

### Reliability/Availability

- **Browser Session Persistence**: Browser session stored in DO state, survives workflow retries
- **Evidence Incremental Storage**: Screenshots stored to R2 incrementally (don't wait until end of Phase 3)
- **Graceful Degradation**: If Phase 1-2 fail, skip to Phase 4 with partial evidence; if Phase 3 fails, still run Phase 4
- **AI Gateway Failover**: Automatic switch to fallback model (GPT-4o/Claude 3.5) if Workers AI fails
- **Error Recovery**: TestAgent receives error context on retry, tries alternative strategies
- **Workflow Auto-Retry**: Workflow retries failed phases (2 retries per phase with exponential backoff)

### Observability

- **D1 Event Logging**: All phase transitions, control discoveries, errors logged to test_events table
- **Agent SQL Decision Logging**: All AI decisions logged to decision_log table (timestamp, decision, context, model)
- **R2 Evidence Storage**: All screenshots and logs stored for post-test analysis
- **WebSocket Progress Broadcasting**: Real-time progress updates to dashboard (phase transitions, evidence captures)
- **AI Gateway Telemetry**: Request logs, cost tracking, model selection visible in AI Gateway dashboard
- **Console Log Capture**: Browser console logs accumulated in memory, flushed to R2 at end of Phase 3
- **Network Error Tracking**: Failed network requests (status >= 400) tracked and included in evaluation

## Dependencies and Integrations

### External Dependencies

| Dependency | Version | Purpose | Installation |
|---|---|---|---|
| `stagehand` | Latest | Browser automation, Computer Use mode, observe() for control discovery | `npm install stagehand` |
| `@cloudflare/workers-types` | `^4.0.0` | TypeScript types for Workers APIs (from Epic 1) | `npm install --save-dev @cloudflare/workers-types` |
| `@cloudflare/ai` | `^1.0.0` | AI Gateway SDK (from Epic 1) | `npm install @cloudflare/ai` |

### Cloudflare Services (Bindings)

| Service | Binding Name | Purpose | Epic 1 Status |
|---|---|---|---|
| Browser Rendering | `BROWSER` | Serverless browser sessions | ✅ Configured in wrangler.toml |
| D1 Database | `DB` | Test metadata, scores, events | ✅ Configured (Story 1.2) |
| R2 Bucket | `EVIDENCE_BUCKET` | Screenshots/logs storage | ✅ Configured (Story 1.3) |
| Workflows | `WORKFLOW` | Test orchestration | ✅ Configured (Story 1.4) |
| Durable Objects | `TEST_AGENT` | TestAgent instances | ✅ Configured (Story 1.1) |
| AI Gateway | `AI` | AI request routing | ✅ Configured (Story 1.5) |

### Integration Points

**Stagehand + Browser Rendering Integration (Story 2.2):**

```typescript
// Browser Rendering service binding (from Epic 1)
const browser = await env.BROWSER.launch(options);
const page = await browser.newPage();

// Stagehand initialization
import { Stagehand } from 'stagehand';
const stagehand = new Stagehand(page, {
  mode: 'computer-use',
  model: 'gpt-4o'  // Or via AI Gateway
});
```

**AI Gateway Integration (Story 2.5, 2.6):**

```typescript
// Use existing callAI() helper from Epic 1 (src/shared/helpers/ai-gateway.ts)
import { callAI } from '../shared/helpers/ai-gateway';

// Phase 3: Computer Use decisions
const response = await callAI(env, prompt, [screenshot], 'primary', testRunId);

// Phase 4: Evaluation with vision model
const scores = await callAI(env, evaluationPrompt, allScreenshots, 'primary', testRunId);
```

## Acceptance Criteria (Authoritative)

### Story 2.1: TestAgent Durable Object Skeleton
✅ **AC-1**: Durable Object class created: `src/agents/TestAgent.ts`  
✅ **AC-2**: DO constructor accepts: testRunId, gameUrl, inputSchema (optional)  
✅ **AC-3**: State storage initialized with built-in SQL database  
✅ **AC-4**: WebSocket handler for real-time progress updates to dashboard  
✅ **AC-5**: Methods defined (empty implementations): `runPhase1()`, `runPhase2()`, `runPhase3()`, `runPhase4()`  
✅ **AC-6**: Helper method: `updateStatus(phase, message)` logs to D1 test_events and broadcasts via WebSocket  
✅ **AC-7**: Helper method: `storeEvidence(type, data)` saves to R2 and tracks in DO state  
✅ **AC-8**: Error handling wrapper: all phase methods catch errors and return user-friendly messages  
✅ **AC-9**: DO can be instantiated by Workflow with test run UUID as DO ID  

### Story 2.2: Browser Rendering Integration and Stagehand Setup
✅ **AC-1**: Browser Rendering service binding configured in TestAgent DO  
✅ **AC-2**: Stagehand library initialized with Browser Rendering connection  
✅ **AC-3**: Helper method: `launchBrowser()` creates browser session and returns Stagehand instance  
✅ **AC-4**: Browser session persists in DO state across phases 1-3  
✅ **AC-5**: Helper method: `closeBrowser()` cleanly terminates session  
✅ **AC-6**: Browser configured with: headless mode, viewport 1280x720, user agent string  
✅ **AC-7**: Console log capture enabled and streamed to DO state  
✅ **AC-8**: Network request monitoring enabled (track failed requests)  
✅ **AC-9**: Screenshot capture function: `captureScreenshot(description)` saves to R2  

### Story 2.3: Phase 1 - Load & Validation
✅ **AC-1**: `runPhase1()` method implemented  
✅ **AC-2**: Launch browser using Stagehand  
✅ **AC-3**: Navigate to game URL provided in constructor  
✅ **AC-4**: Wait for page load complete (DOMContentLoaded event)  
✅ **AC-5**: Capture initial screenshot and save to R2: `{timestamp}-phase1-initial-load.png`  
✅ **AC-6**: Validate: page did not return 404 error  
✅ **AC-7**: Validate: page is not blank (has visible DOM elements)  
✅ **AC-8**: Detect if game requires user interaction to start (look for "Play" button, "Start" button)  
✅ **AC-9**: Log any immediate console errors to test_events  
✅ **AC-10**: Update test_runs.status = 'running' in D1  
✅ **AC-11**: Broadcast progress via WebSocket: "Phase 1 complete - Game loaded successfully"  
✅ **AC-12**: Return: { success: true, requiresInteraction: boolean, errors: string[] }  

### Story 2.4: Phase 2 - Control Discovery
✅ **AC-1**: `runPhase2()` method implemented  
✅ **AC-2**: Use Stagehand `observe()` to identify DOM-based interactive elements  
✅ **AC-3**: Classify discovered elements: buttons, keyboard inputs, clickable divs, input fields  
✅ **AC-4**: If inputSchema provided in constructor, use it to prioritize specific controls  
✅ **AC-5**: Capture screenshot of page with controls highlighted: `{timestamp}-phase2-controls.png`  
✅ **AC-6**: Generate control hypothesis: list of discovered controls with descriptions  
✅ **AC-7**: Store control hypothesis in DO SQL database for reference in Phase 3  
✅ **AC-8**: Log discovered controls to test_events with descriptions  
✅ **AC-9**: Broadcast progress via WebSocket: "Phase 2 complete - Discovered N controls"  
✅ **AC-10**: Return: { success: true, controls: ControlMap, hypothesis: string }  

### Story 2.5: Phase 3 - Gameplay Exploration with Computer Use
✅ **AC-1**: `runPhase3()` method implemented  
✅ **AC-2**: Use Stagehand agent in Computer Use mode for autonomous exploration  
✅ **AC-3**: Execute goal-driven actions: "Start the game", "Learn the controls", "Play for 2-3 minutes"  
✅ **AC-4**: If game requires interaction (from Phase 1), detect and click "Play" button autonomously  
✅ **AC-5**: Agent decides between keyboard and mouse controls based on observations (or inputSchema if provided)  
✅ **AC-6**: Capture screenshot every 10 seconds OR on significant state change (minimum 5 screenshots)  
✅ **AC-7**: Screenshot naming: `{timestamp}-phase3-{action-description}.png`  
✅ **AC-8**: Monitor console logs continuously - capture errors and warnings  
✅ **AC-9**: Track failed network requests (status >= 400)  
✅ **AC-10**: Log all AI decisions to DO SQL database: {timestamp, decision, action, outcome}  
✅ **AC-11**: Store screenshots to R2 incrementally (don't wait until end)  
✅ **AC-12**: Adaptive timeout: minimum 1 minute, maximum 5 minutes (stop when no new discoveries)  
✅ **AC-13**: Broadcast progress via WebSocket every 15 seconds: current action  
✅ **AC-14**: Return: { success: true, screenshotCount: number, errors: string[], actionsTaken: number }  

### Story 2.6: Phase 4 - Evaluation & Scoring
✅ **AC-1**: `runPhase4()` method implemented  
✅ **AC-2**: Retrieve all screenshots from R2 for this test  
✅ **AC-3**: Retrieve console logs and network errors from DO state  
✅ **AC-4**: Use AI Gateway (vision model) to analyze screenshots for quality assessment  
✅ **AC-5**: Generate scores (0-100) for 5 metrics:
   - Game Loads Successfully (based on Phase 1 results)
   - Visual Quality (analyze screenshots for polish, coherence)
   - Controls & Responsiveness (based on Phase 2-3 observations)
   - Playability (game has clear objective, mechanics work)
   - Technical Stability (console errors, network failures, crashes)
✅ **AC-6**: Calculate overall quality score: weighted average (Load 15%, Visual 20%, Controls 20%, Playability 30%, Technical 15%)  
✅ **AC-7**: Generate 2-3 sentence justification for each metric score  
✅ **AC-8**: Store evaluation_scores to D1 (6 rows: 5 metrics + overall)  
✅ **AC-9**: Store overall_score in test_runs table  
✅ **AC-10**: Flush all logs to R2: console.log, network.log, agent-decisions.log  
✅ **AC-11**: Update test_runs.status = 'completed' in D1  
✅ **AC-12**: Broadcast final results via WebSocket  
✅ **AC-13**: Return: { success: true, overallScore: number, metrics: MetricScore[] }  

### Story 2.7: Graceful Error Handling and User-Friendly Messages
✅ **AC-1**: Wrap all phase methods in try-catch blocks  
✅ **AC-2**: Translate technical errors to user-friendly messages:
   - "Game failed to load (404)" → "The game URL could not be accessed. Please check the URL is correct."
   - "Timeout in Phase 3" → "The AI agent couldn't make progress playing the game. The game may require specific interactions we couldn't detect."
   - "AI model unavailable" → "The AI evaluation service is temporarily unavailable. Please try again in a few minutes."
✅ **AC-3**: If Phase 1-2 fail: skip to Phase 4 with partial evidence and generate limited evaluation  
✅ **AC-4**: If Phase 3 fails: still run Phase 4 with whatever evidence was captured  
✅ **AC-5**: If Phase 4 fails: store partial results with error message  
✅ **AC-6**: All error messages stored in test_runs table and broadcast via WebSocket  
✅ **AC-7**: Retry logic delegated to Workflow (TestAgent reports failure, Workflow decides retry)  
✅ **AC-8**: Never expose: stack traces, internal error codes, infrastructure details  

## Traceability Mapping

| AC ID | Spec Section | Component(s)/API(s) | Test Idea |
|---|---|---|---|
| **2.1-AC-1** | 3.1 Services | `src/agents/TestAgent.ts` | Verify TestAgent class exists, implements DurableObject |
| **2.1-AC-2** | 3.2 Data Models | TestAgent constructor | Initialize TestAgent with testRunId, gameUrl, inputSchema |
| **2.1-AC-3** | 3.2 Data Models | Agent SQL database | Create agent_actions, control_discoveries, decision_log tables |
| **2.1-AC-4** | 3.3 APIs | WebSocket handler | Connect WebSocket to TestAgent, verify messages received |
| **2.1-AC-5** | 3.3 APIs | Phase methods | Verify runPhase1-4() methods exist (can be empty implementations) |
| **2.1-AC-6** | 3.3 APIs | updateStatus() helper | Call updateStatus(), verify D1 test_events entry and WebSocket broadcast |
| **2.1-AC-7** | 3.3 APIs | storeEvidence() helper | Call storeEvidence(), verify R2 object created and DO state updated |
| **2.1-AC-8** | 3.4 Workflows | Error handling wrapper | Trigger phase method with error, verify user-friendly message returned |
| **2.1-AC-9** | 3.4 Workflows | Workflow → TestAgent binding | Workflow calls TestAgent.fetch(), verify DO instantiated |
| **2.2-AC-1** | 5.2 Dependencies | Browser Rendering binding | Verify env.BROWSER accessible in TestAgent |
| **2.2-AC-2** | 5.2 Dependencies | Stagehand initialization | Call launchBrowser(), verify Stagehand instance returned |
| **2.2-AC-3** | 3.1 Services | launchBrowser() method | Call launchBrowser(), verify browser session created |
| **2.2-AC-4** | 3.2 Data Models | DO state persistence | Run Phase 1, then Phase 2, verify browser session reused |
| **2.2-AC-5** | 3.1 Services | closeBrowser() method | Call closeBrowser(), verify browser session terminated |
| **2.2-AC-6** | 3.3 APIs | Browser configuration | Verify viewport 1280x720, headless mode, user agent set |
| **2.2-AC-7** | 3.3 APIs | Console log capture | Navigate to page with console.log(), verify logs captured in DO state |
| **2.2-AC-8** | 3.3 APIs | Network monitoring | Navigate to page with failed request (404), verify error tracked |
| **2.2-AC-9** | 3.3 APIs | captureScreenshot() method | Call captureScreenshot(), verify screenshot saved to R2 |
| **2.3-AC-1** | 3.3 APIs | runPhase1() method | Call runPhase1(), verify method executes |
| **2.3-AC-2** | 3.3 APIs | Browser launch | Verify browser session created in runPhase1() |
| **2.3-AC-3** | 3.3 APIs | Stagehand navigation | Navigate to game URL, verify page loaded |
| **2.3-AC-4** | 3.3 APIs | DOMContentLoaded wait | Verify page load event detected |
| **2.3-AC-5** | 3.3 APIs | Screenshot capture | Verify screenshot saved to R2 with correct path pattern |
| **2.3-AC-6** | 3.3 APIs | 404 validation | Navigate to invalid URL, verify 404 detected |
| **2.3-AC-7** | 3.3 APIs | Blank page detection | Navigate to blank page, verify detection |
| **2.3-AC-8** | 3.3 APIs | Interaction detection | Navigate to game with "Play" button, verify detected |
| **2.3-AC-9** | 3.3 APIs | Console error logging | Navigate to page with console.error(), verify logged to test_events |
| **2.3-AC-10** | 3.4 Workflows | D1 status update | Verify test_runs.status = 'running' after Phase 1 |
| **2.3-AC-11** | 3.3 APIs | WebSocket broadcast | Verify progress message broadcast during Phase 1 |
| **2.3-AC-12** | 3.3 APIs | Phase result return | Verify Phase1Result returned with correct structure |
| **2.4-AC-1** | 3.3 APIs | runPhase2() method | Call runPhase2(), verify method executes |
| **2.4-AC-2** | 3.3 APIs | Stagehand observe() | Call observe(), verify interactive elements identified |
| **2.4-AC-3** | 3.3 APIs | Control classification | Verify controls classified as buttons, keyboard inputs, etc. |
| **2.4-AC-4** | 3.2 Data Models | inputSchema usage | Provide inputSchema, verify controls prioritized |
| **2.4-AC-5** | 3.3 APIs | Screenshot capture | Verify screenshot saved with controls highlighted |
| **2.4-AC-6** | 3.3 APIs | Hypothesis generation | Verify hypothesis string generated describing controls |
| **2.4-AC-7** | 3.2 Data Models | Agent SQL storage | Verify controls stored in control_discoveries table |
| **2.4-AC-8** | 3.4 Workflows | D1 event logging | Verify discovered controls logged to test_events |
| **2.4-AC-9** | 3.3 APIs | WebSocket broadcast | Verify progress message broadcast during Phase 2 |
| **2.4-AC-10** | 3.3 APIs | Phase result return | Verify Phase2Result returned with controls and hypothesis |
| **2.5-AC-1** | 3.3 APIs | runPhase3() method | Call runPhase3(), verify method executes |
| **2.5-AC-2** | 3.3 APIs | Computer Use mode | Verify Stagehand agent in Computer Use mode |
| **2.5-AC-3** | 3.4 Workflows | Goal-driven actions | Verify agent executes "Start the game", "Learn controls", "Play" |
| **2.5-AC-4** | 3.4 Workflows | Play button detection | If requiresInteraction=true, verify "Play" button clicked |
| **2.5-AC-5** | 3.4 Workflows | Control decision | Verify agent chooses keyboard vs mouse based on observations |
| **2.5-AC-6** | 3.3 APIs | Screenshot frequency | Verify screenshot captured every 10 seconds or on state change |
| **2.5-AC-7** | 3.3 APIs | Screenshot naming | Verify screenshots named with timestamp and action description |
| **2.5-AC-8** | 3.3 APIs | Console log monitoring | Verify console logs captured continuously during Phase 3 |
| **2.5-AC-9** | 3.3 APIs | Network error tracking | Verify failed network requests (>=400) tracked |
| **2.5-AC-10** | 3.2 Data Models | Decision logging | Verify AI decisions logged to decision_log table |
| **2.5-AC-11** | 3.4 Workflows | Incremental storage | Verify screenshots stored to R2 incrementally (not batched) |
| **2.5-AC-12** | 3.4 Workflows | Adaptive timeout | Verify Phase 3 stops if no progress for 30 seconds |
| **2.5-AC-13** | 3.3 APIs | Progress broadcasting | Verify progress broadcast every 15 seconds |
| **2.5-AC-14** | 3.3 APIs | Phase result return | Verify Phase3Result returned with screenshotCount, errors, actionsTaken |
| **2.6-AC-1** | 3.3 APIs | runPhase4() method | Call runPhase4(), verify method executes |
| **2.6-AC-2** | 3.3 APIs | R2 evidence retrieval | Verify all screenshots retrieved from R2 |
| **2.6-AC-3** | 3.2 Data Models | DO state retrieval | Verify console logs and network errors retrieved from DO state |
| **2.6-AC-4** | 3.3 APIs | AI Gateway vision model | Verify AI Gateway called with vision model for screenshot analysis |
| **2.6-AC-5** | 3.4 Workflows | Score generation | Verify scores (0-100) generated for 5 metrics |
| **2.6-AC-6** | 3.4 Workflows | Overall score calculation | Verify overall score calculated as weighted average |
| **2.6-AC-7** | 3.4 Workflows | Justification generation | Verify 2-3 sentence justification generated for each metric |
| **2.6-AC-8** | 3.4 Workflows | D1 score storage | Verify evaluation_scores stored to D1 (6 rows) |
| **2.6-AC-9** | 3.4 Workflows | Overall score storage | Verify overall_score stored in test_runs table |
| **2.6-AC-10** | 3.4 Workflows | Log flushing | Verify all logs flushed to R2 (console.log, network.log, agent-decisions.log) |
| **2.6-AC-11** | 3.4 Workflows | Status update | Verify test_runs.status = 'completed' after Phase 4 |
| **2.6-AC-12** | 3.3 APIs | Final broadcast | Verify final results broadcast via WebSocket |
| **2.6-AC-13** | 3.3 APIs | Phase result return | Verify Phase4Result returned with overallScore and metrics |
| **2.7-AC-1** | 3.4 Workflows | Error handling | Verify all phase methods wrapped in try-catch |
| **2.7-AC-2** | 3.4 Workflows | Error translation | Trigger errors, verify user-friendly messages returned |
| **2.7-AC-3** | 3.4 Workflows | Graceful degradation | Fail Phase 1-2, verify Phase 4 still runs with partial evidence |
| **2.7-AC-4** | 3.4 Workflows | Partial evidence | Fail Phase 3, verify Phase 4 runs with available evidence |
| **2.7-AC-5** | 3.4 Workflows | Partial results | Fail Phase 4, verify partial results stored with error message |
| **2.7-AC-6** | 3.4 Workflows | Error storage | Verify error messages stored in test_runs and broadcast |
| **2.7-AC-7** | 3.4 Workflows | Retry delegation | Verify TestAgent reports failure, Workflow handles retry |
| **2.7-AC-8** | 3.4 Workflows | Error sanitization | Verify no stack traces, internal codes exposed in messages |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Stagehand Computer Use mode fails to discover controls** | Phase 3 cannot progress | Medium | Provide inputSchema as fallback, use observe() results from Phase 2 |
| **Browser session timeout during long Phase 3** | Game state lost, test fails | Low | Browser session persists in DO state, survives workflow retries |
| **AI Gateway vision model fails to analyze screenshots** | Phase 4 evaluation incomplete | Medium | Use fallback model (GPT-4o/Claude 3.5), or fallback to technical-only scoring |
| **R2 upload failures during Phase 3** | Evidence loss | Medium | Implement retry logic in uploadScreenshot(), buffer screenshots in DO state |
| **WebSocket connection drops during test** | Dashboard loses real-time updates | Low | Dashboard falls back to polling (Epic 3), test state persists in D1 |
| **Phase 3 timeout too aggressive for complex games** | Tests fail prematurely | Medium | Adaptive timeout (1-5 min), stop if no progress for 30s, adjust based on testing |
| **Stagehand observe() misses interactive elements** | Phase 2 control discovery incomplete | Medium | Use inputSchema to supplement discovery, log missed controls for analysis |

### Assumptions

- **Assumption 1**: Stagehand Computer Use mode can handle most browser-based games (2D/3D Canvas, DOM-based)
  - **Validation**: Test with diverse game types during Epic 2 implementation
  - **Mitigation**: If Computer Use fails, fallback to inputSchema-guided exploration
- **Assumption 2**: Workers AI vision models (Llama Vision/Gemini Flash) sufficient for Phase 4 evaluation
  - **Validation**: Compare evaluation quality with GPT-4o/Claude 3.5 fallback
  - **Mitigation**: AI Gateway automatic failover to frontier models if Workers AI insufficient
- **Assumption 3**: 5-minute maximum Phase 3 duration sufficient for most games
  - **Validation**: Monitor Phase 3 completion times during testing
  - **Mitigation**: Adaptive timeout (stop if no progress for 30s), can extend to 10 minutes if needed
- **Assumption 4**: Browser Rendering service supports concurrent sessions (10+ tests)
  - **Validation**: Test concurrent test execution during Epic 2
  - **Mitigation**: Monitor Browser Rendering service limits, scale if needed
- **Assumption 5**: Agent SQL database sufficient for per-test decision logging (no size limits)
  - **Validation**: Monitor Agent SQL usage during testing
  - **Mitigation**: If size limits hit, flush to R2 incrementally

### Questions for Stakeholders

- **Q1**: Should we expose AI decision reasoning to users in dashboard? (Post-MVP consideration)
- **Q2**: What is acceptable false positive rate for control discovery? (Currently prioritizing precision over recall)
- **Q3**: Should we support custom scoring rubrics per user? (Currently using fixed 5-metric system)
- **Q4**: What is acceptable Phase 3 completion rate? (Currently targeting 90% success rate)
- **Q5**: Should we support game-specific input schemas as templates? (Currently one-off JSON input)

## Test Strategy Summary

### Unit Testing

**Scope**: TestAgent helper methods, error translation, evidence management  
**Framework**: Manual testing via Wrangler dev mode (unit tests optional for MVP)  
**Key Tests**:
- `launchBrowser()` creates browser session correctly
- `captureScreenshot()` saves to R2 with correct path pattern
- `updateStatus()` logs to D1 and broadcasts via WebSocket
- `handleError()` translates technical errors to user-friendly messages

**Coverage Goal**: Not required for MVP (focus on integration and E2E testing)

### Integration Testing

**Scope**: Phase execution, Browser Rendering integration, Stagehand integration, AI Gateway calls  
**Approach**: Manual testing in Cloudflare dashboard + `wrangler dev` local environment  
**Key Tests**:

1. **Phase 1 Integration Test**:
   - Deploy TestAgent
   - Trigger Workflow with test game URL
   - Verify browser launches, navigates to URL, screenshot captured
   - Verify test_events logged, WebSocket broadcast received

2. **Phase 2 Integration Test**:
   - Run Phase 1 successfully
   - Trigger Phase 2
   - Verify Stagehand observe() discovers controls
   - Verify controls stored in Agent SQL, hypothesis generated
   - Verify screenshot captured with controls highlighted

3. **Phase 3 Integration Test**:
   - Run Phase 1-2 successfully
   - Trigger Phase 3
   - Verify Computer Use mode activates
   - Verify agent executes gameplay actions
   - Verify screenshots captured every 10 seconds (minimum 5)
   - Verify console logs and network errors tracked
   - Verify AI decisions logged to Agent SQL

4. **Phase 4 Integration Test**:
   - Run Phase 1-3 successfully
   - Trigger Phase 4
   - Verify all screenshots retrieved from R2
   - Verify AI Gateway called with vision model
   - Verify scores generated for 5 metrics + overall
   - Verify evaluation_scores stored to D1
   - Verify logs flushed to R2

5. **Error Handling Integration Test**:
   - Trigger Phase 1 with invalid URL (404)
   - Verify error caught, user-friendly message returned
   - Verify Phase 4 still runs with partial evidence
   - Verify error message stored in test_runs, broadcast via WebSocket

### End-to-End Testing

**Scope**: Full 4-phase test execution with real game  
**Approach**: Manual test with real browser game URL  
**Test Scenario**:

1. **E2E Test: Simple DOM-Based Game**:
   - Deploy all components (Epic 1 + Epic 2)
   - Submit test game URL via Dashboard Worker (Epic 3) or Workflow trigger
   - Observe:
     - Phase 1: Game loads, screenshot captured
     - Phase 2: Controls discovered (buttons, keyboard)
     - Phase 3: Agent plays game autonomously, screenshots captured
     - Phase 4: Scores generated, results stored
   - Verify:
     - test_runs.status transitions: queued → running → completed
     - test_events logged for each phase
     - evaluation_scores stored (6 rows)
     - Screenshots and logs accessible in R2
     - Overall score calculated correctly

2. **E2E Test: Game Requiring Interaction**:
   - Submit game URL with "Play" button
   - Verify Phase 1 detects requiresInteraction=true
   - Verify Phase 3 clicks "Play" button autonomously
   - Verify gameplay continues after interaction

3. **E2E Test: Graceful Degradation**:
   - Submit invalid game URL (404)
   - Verify Phase 1 fails with user-friendly error
   - Verify Phase 4 still runs, generates limited evaluation
   - Verify test marked as 'failed' but evidence preserved

**Success Criteria**: 
- All 4 phases execute successfully for valid games
- Scores generated with specific justifications
- Evidence (screenshots, logs) accessible in R2
- Error handling provides actionable feedback
- WebSocket updates received in real-time (if dashboard connected)

---

**Document Status:** ✅ Ready for Story Drafting  
**Epic Status:** Backlog → **Contexted**  
**Next Action:** Run `create-story` workflow to draft Story 2.1

