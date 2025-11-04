# API Contracts

## RPC Service Bindings (Internal Only)

**Dashboard Worker → Workflow:**
```typescript
interface WorkflowCreateRequest {
  testRunId: string;     // UUID
  gameUrl: string;        // HTTP/HTTPS URL
  inputSchema?: string;   // JSON string or undefined
}

// Usage:
const result = await env.WORKFLOW.create().run({
  testRunId: crypto.randomUUID(),
  gameUrl: "https://example.com/game",
  inputSchema: JSON.stringify({ controls: { movement: ["W","A","S","D"] } })
});
```

**Dashboard Worker → TestAgent DO (WebSocket):**
```typescript
// Connect to TestAgent WebSocket
const testAgentId = env.TEST_AGENT.idFromString(testRunId);
const testAgent = env.TEST_AGENT.get(testAgentId);
const response = await testAgent.fetch("https://dummy-host/ws", {
  headers: { Upgrade: "websocket" }
});
// Returns WebSocket connection
```

**Workflow → TestAgent DO (Phase Execution):**
```typescript
interface PhaseRequest {
  method: "POST";
  url: "/phase1" | "/phase2" | "/phase3" | "/phase4";
}

interface PhaseResponse {
  success: boolean;
  data?: any;
  error?: string;  // User-friendly error message
}

// Example:
const response = await testAgent.fetch("/phase1", { method: "POST" });
const result: PhaseResponse = await response.json();
```

**Dashboard Worker RPC Methods (Called from Frontend):**
```typescript
// Submit new test
async submitTest(gameUrl: string, inputSchema?: string): Promise<{ testId: string }>;

// List recent tests
async listTests(limit: number = 50): Promise<TestRunSummary[]>;

// Get detailed test report
async getTestReport(testId: string): Promise<TestReport>;

// Export test as JSON
async exportTestJSON(testId: string): Promise<string>;
```

**WebSocket Event Schema:**
```typescript
interface TestProgressEvent {
  testId: string;
  phase: "load" | "discovery" | "exploration" | "evaluation";
  status: "started" | "in_progress" | "completed" | "failed";
  progress: number;        // 0-100
  message: string;          // Human-readable status
  timestamp: number;        // Unix milliseconds
  evidence?: {
    screenshotUrl?: string;
    action?: string;
  };
}
```
