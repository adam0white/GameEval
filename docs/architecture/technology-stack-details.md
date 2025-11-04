# Technology Stack Details

## Core Technologies

**Compute Layer:**
- **Cloudflare Workers**: Serverless JavaScript runtime at the edge
  - Dashboard Worker: Serves UI, handles RPC calls
  - Entry point: `src/index.ts`
  - Deployment region: Global edge network (300+ locations)

**Orchestration Layer:**
- **Cloudflare Workflows**: Durable execution engine
  - GameTestPipeline workflow: 5 steps (Launch Agent + 4 phases)
  - Automatic state persistence and retry logic
  - Maximum duration: 6 minutes end-to-end
  - Timeout enforcement per phase

**Agent Layer:**
- **Cloudflare Agents SDK (Durable Objects)**: Stateful serverless agents
  - TestAgent: One instance per test run (DO ID = test UUID)
  - Built-in WebSocket API for real-time updates
  - Per-agent SQL database for decisions/reasoning
  - Strong consistency guarantees

**Browser Automation:**
- **Cloudflare Browser Rendering**: Serverless browser sessions
  - Browser sessions persist across phases 1-3
  - Viewport: 1280x720
  - Console log and network request capture
- **Stagehand**: AI-powered browser control library
  - Computer Use mode: autonomous gameplay
  - `observe()`: DOM element discovery
  - Screenshot capture: programmatic control

**AI & LLM:**
- **Cloudflare AI Gateway**: Unified AI request router
  - Primary: Workers AI (Llama Vision, Gemini Flash)
  - Fallback: OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet
  - Features: Caching (15-min TTL), cost tracking, automatic failover
  - All TestAgent AI calls routed through gateway

**Data Persistence:**
- **D1 (SQLite)**: Relational database for test metadata
  - Tables: `test_runs`, `evaluation_scores`, `test_events`
  - Indexes on: status, created_at, test_run_id
  - Bound to Dashboard Worker and TestAgent DO
- **Agent SQL**: Built-in per-DO SQL database
  - Stores: agent decisions, action history, control discoveries
  - Ephemeral per test (not shared across tests)
- **R2 Object Storage**: Blob storage for artifacts
  - Screenshots: `tests/{test_id}/screenshots/{timestamp}-{phase}-{action}.png`
  - Logs: `tests/{test_id}/logs/{console|network|agent-decisions}.log`
  - Public read access for dashboard viewing
  - Zero egress fees

## Integration Points

**RPC Service Bindings (Internal Communication Only):**

```typescript
// Dashboard Worker → Workflow
env.WORKFLOW.create().run({
  testRunId: uuid,
  gameUrl: url,
  inputSchema: schema
});

// Dashboard Worker → TestAgent DO (WebSocket)
const testAgentId = env.TEST_AGENT.idFromString(testRunId);
const testAgent = env.TEST_AGENT.get(testAgentId);
const ws = await testAgent.fetch("/ws");

// Workflow → TestAgent DO (phase execution)
const testAgent = env.TEST_AGENT.get(testAgentId);
await testAgent.fetch("/phase1", { method: "POST" });
```

**No Exposed HTTP Endpoints:**
- All external access through Dashboard Worker
- All internal communication via RPC service bindings
- WebSocket connections proxied through Worker
- Using context exports for service bindings, refer to https://developers.cloudflare.com/workers/runtime-apis/context/#exports

**AI Request Flow:**
```
TestAgent → AI Gateway → [Workers AI | OpenAI | Anthropic] → Response
                ↓
          (Cached for 15 min)
                ↓
          (Cost tracked per test)
```
