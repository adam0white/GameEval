# 6. Technical Architecture

## 6.1 Core Technology Stack (Cloudflare Developer Platform)

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
  - Dynamic routing with automatic model selection and fallback
  - Reference: https://developers.cloudflare.com/ai-gateway/
- **AI Model Selection**: Start with Workers AI (Llama Vision, Gemini Flash) for testing; if insufficient capability, switch to frontier models (GPT-4o, Claude 3.5 Sonnet) from the start
- **Fallback Strategy**: AI Gateway automatically routes to backup model if primary fails, ensuring graceful degradation
- **Composable AI Architecture**: Flexible model selection allowing mix-and-match of AI providers based on task requirements

**Storage:**
- **R2 Object Storage**: Screenshots, logs (zero egress fees)
- **D1 SQL Database**: Test metadata, results, scores (queryable for historical trends)
- **Agent SQL Storage**: Built-in per-agent SQL database (part of Agents SDK)
- **Workers KV** (optional, post-MVP): For high-volume, low-latency dashboard caching

**Security:**
- **Firewall for AI** (recommended): Prevent prompt injection attacks and PII leakage in AI interactions
- **RPC-only architecture**: No exposed API endpoints; all internal communication via service bindings

## 6.2 Architecture Pattern: Workflows + Agents SDK

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

## 6.3 Service Communication Pattern

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

## 6.4 Data Models

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

## 6.5 Stagehand Integration

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
