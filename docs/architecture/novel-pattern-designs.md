# Novel Pattern Designs

## Pattern 1: TestAgent as Durable Object (Single Agent Per Test)

**Purpose:** Provide stateful, persistent test execution with built-in WebSocket communication and SQL storage for autonomous AI gameplay testing.

**Components:**
- **TestAgent Durable Object**: One instance per test run
  - DO ID: Test run UUID (e.g., `test-550e8400-e29b-41d4-a716-446655440000`)
  - Persists across all 4 phases and workflow retries
  - Maintains browser session state
  - Accumulates evidence (screenshots, logs, decisions)
- **Workflow Orchestrator**: Calls TestAgent methods sequentially
  - Step 1: Launch TestAgent DO
  - Steps 2-5: Call `runPhase1()`, `runPhase2()`, `runPhase3()`, `runPhase4()`
  - Enforces timeouts, retries on failure
- **Agent SQL Storage**: Per-agent database
  - `agent_actions`: timestamp, action, reasoning, outcome
  - `control_discoveries`: element_selector, action_type, confidence
  - `decision_log`: timestamp, decision, context

**Data Flow:**
```
Dashboard submits URL
    → Workflow creates TestAgent DO (ID = UUID)
        → TestAgent.runPhase1() - Load & Validation
            → Browser session opened, stored in DO state
            → Screenshot saved to R2
            → Status logged to D1, broadcast via WebSocket
        → TestAgent.runPhase2() - Control Discovery
            → Stagehand observe() identifies elements
            → Controls stored in Agent SQL
            → Screenshot saved to R2
        → TestAgent.runPhase3() - Gameplay Exploration
            → Stagehand Computer Use mode: autonomous play
            → Evidence captured incrementally → R2
            → AI decisions logged → Agent SQL
            → Progress updates → WebSocket
        → TestAgent.runPhase4() - Evaluation & Scoring
            → Retrieve all evidence from R2
            → AI Gateway (vision model) analyzes screenshots
            → Scores calculated and stored → D1
            → Final report broadcast → WebSocket
    → Workflow completes, TestAgent DO remains for queries
```

**Implementation Guide:**

```typescript
// TestAgent Durable Object structure
export class TestAgent extends DurableObject {
  private browserSession: StagehandSession;
  private evidence: Evidence[] = [];
  private websocketClients: WebSocket[] = [];

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    // Built-in SQL and WebSocket APIs available
  }

  async fetch(request: Request): Promise<Response> {
    if (request.url.endsWith("/ws")) {
      return this.handleWebSocket(request);
    }
    if (request.url.endsWith("/phase1")) {
      return await this.runPhase1();
    }
    // ... other phase handlers
  }

  private async runPhase1(): Promise<Response> {
    try {
      this.updateStatus("phase1", "started", "Loading game...");
      
      // Launch browser (persists in DO state)
      this.browserSession = await this.launchBrowser();
      
      // Navigate and validate
      await this.browserSession.goto(this.gameUrl);
      const screenshot = await this.captureScreenshot("phase1-initial-load");
      
      this.updateStatus("phase1", "completed", "Game loaded successfully");
      return Response.json({ success: true });
    } catch (error) {
      return this.handleError(error, "phase1");
    }
  }

  private updateStatus(phase: string, status: string, message: string) {
    // Log to D1 test_events
    await this.logToD1(phase, status, message);
    
    // Broadcast via WebSocket
    this.broadcastToClients({
      type: "progress",
      phase,
      status,
      message,
      timestamp: Date.now()
    });
  }
}
```

**Benefits:**
- Single source of truth for test state
- Browser session persists across phases (faster, maintains game state)
- Evidence accumulates naturally
- WebSocket updates built-in
- Workflow focuses on orchestration, TestAgent owns execution

**Affects Epics:** Epic 1 (setup), Epic 2 (implementation), Epic 3 (WebSocket integration)

---

## Pattern 2: Event-Driven Progress Streaming (WebSocket)

**Purpose:** Enable real-time dashboard updates without polling by streaming test progress events from TestAgent to browser.

**Components:**
- **TestAgent WebSocket Handler**: Maintains list of connected clients
- **Event Schema**: Standardized progress event format
- **Dashboard WebSocket Client**: Auto-reconnecting listener

**Event Schema:**
```typescript
interface TestProgressEvent {
  testId: string;
  phase: "load" | "discovery" | "exploration" | "evaluation";
  status: "started" | "in_progress" | "completed" | "failed";
  progress: number; // 0-100
  message: string; // Human-readable status
  timestamp: number;
  evidence?: {
    screenshotUrl?: string;
    action?: string;
  };
}
```

**Communication Flow:**
1. Dashboard submits URL → Workflow starts → TestAgent DO created
2. Dashboard opens WebSocket connection to TestAgent via Worker proxy:
   ```typescript
   const ws = new WebSocket(`wss://dashboard.gameeval.com/ws/${testId}`);
   ```
3. TestAgent broadcasts events during execution:
   - Phase transitions: `{ phase: "discovery", status: "started", message: "Discovering controls..." }`
   - Progress updates: `{ progress: 45, message: "Testing WASD movement" }`
   - Evidence captures: `{ evidence: { screenshotUrl: "...", action: "click-play-button" } }`
4. Dashboard updates UI in real-time (no polling)
5. On disconnect: Dashboard reconnects automatically (test state persists in DO)

**Implementation Notes:**
- TestAgent maintains array of WebSocket clients
- Events are fire-and-forget (not queued if no listeners)
- Rate limit: Max 1 event per 5 seconds to avoid spam
- Final results persist in D1 regardless of WebSocket status

**Affects Epics:** Epic 2 (TestAgent events), Epic 3 (Dashboard UI)

---

## Pattern 3: Workflow-Orchestrated Multi-Phase Testing with Error Recovery

**Purpose:** Coordinate 4-phase test execution with automatic retries and adaptive error handling.

**Workflow Structure:**
```typescript
// GameTestPipeline workflow (src/workflows/gameTestPipeline.ts)
export default {
  async fetch(request: WorkflowRequest, env: Env): Promise<Response> {
    const { testRunId, gameUrl, inputSchema } = await request.json();

    // Step 1: Launch TestAgent DO
    const testAgentId = env.TEST_AGENT.idFromString(testRunId);
    const testAgent = env.TEST_AGENT.get(testAgentId);

    try {
      // Step 2: Phase 1 (30s timeout)
      await withTimeout(30000, async () => {
        const result = await testAgent.fetch("/phase1", { method: "POST" });
        if (!result.ok) throw new Error("Phase 1 failed");
      });

      // Step 3: Phase 2 (45s timeout)
      await withTimeout(45000, async () => {
        const result = await testAgent.fetch("/phase2", { method: "POST" });
        if (!result.ok) throw new Error("Phase 2 failed");
      });

      // Step 4: Phase 3 (5min adaptive timeout)
      await withTimeout(300000, async () => {
        const result = await testAgent.fetch("/phase3", { method: "POST" });
        if (!result.ok) throw new Error("Phase 3 failed");
      });

      // Step 5: Phase 4 (60s timeout)
      await withTimeout(60000, async () => {
        const result = await testAgent.fetch("/phase4", { method: "POST" });
        if (!result.ok) throw new Error("Phase 4 failed");
      });

      return Response.json({ success: true });
    } catch (error) {
      // Workflow auto-retries with exponential backoff
      // TestAgent receives error context for adaptive strategies
      await testAgent.fetch("/error", {
        method: "POST",
        body: JSON.stringify({ error: error.message })
      });
      throw error; // Triggers workflow retry
    }
  }
};
```

**Error Handling Strategy:**
- **Workflow Level**: Automatic retry with exponential backoff (2 retries per phase)
- **TestAgent Level**: Receives error context, tries alternative strategies
  - Example: If clicking fails, try keyboard navigation
  - Example: If game doesn't respond, try different start sequence
- **Graceful Degradation**: If Phase 1-2 fail, skip to Phase 4 with partial evidence
- **User-Friendly Messages**: All errors translated to actionable feedback

**Retry Flow:**
```
Phase 2 fails → Workflow retries (attempt 2)
    → TestAgent receives error context: "Control discovery failed"
    → TestAgent tries alternative: Use inputSchema if provided
    → If success: Continue to Phase 3
    → If fail again: Workflow retries (attempt 3)
        → TestAgent tries: Simpler element detection
        → If fail after 3 attempts: Skip to Phase 4 with partial data
```

**Affects Epics:** Epic 1 (Workflow setup), Epic 2 (TestAgent error handling)
