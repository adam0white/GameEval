# Epic 1 Technical Context: Core Test Infrastructure

**Epic ID:** epic-1  
**Epic Title:** Core Test Infrastructure  
**Generated:** 2025-11-04  
**Status:** Ready for Implementation

---

## 1. Overview and Scope

Epic 1 establishes the foundational Cloudflare platform infrastructure required for the GameEval autonomous game testing pipeline. This epic creates the scaffolding for all test execution, including data persistence (D1 + R2), workflow orchestration, AI Gateway configuration, and service bindings between components.

**Objectives:**
- Initialize Cloudflare Workers project with complete service bindings (Workflows, D1, R2, Browser Rendering, AI Gateway)
- Establish D1 database schema for test metadata, scores, and event tracking
- Configure R2 object storage with structured path patterns for screenshots and logs
- Implement Workflow-based orchestration for the 4-phase test pipeline with retry logic
- Configure AI Gateway as unified entry point for all AI requests with automatic failover

**In Scope:**
- Project initialization and TypeScript configuration
- D1 schema design and migration scripts
- R2 bucket setup with helper functions
- Workflow skeleton with 5 steps (Launch Agent + 4 phases)
- AI Gateway configuration with Workers AI primary and frontier model fallback
- Basic project structure: `/src/workers`, `/src/agents`, `/src/workflows`, `/src/shared`

**Out of Scope:**
- TestAgent Durable Object implementation (Epic 2)
- Dashboard UI/UX implementation (Epic 3)
- Browser automation logic (Epic 2)
- Actual test execution logic (Epic 2)

---

## 2. System Architecture Alignment

### 2.1 Architecture Pattern
Epic 1 implements the foundation of the **Workflows + Agents SDK** pattern:
- **Dashboard Worker** serves as entry point (Story 1.1)
- **GameTestPipeline Workflow** orchestrates test execution (Story 1.4)
- **TestAgent Durable Objects** will be invoked via RPC bindings (skeleton only in this epic)
- **RPC-only architecture**: No exposed HTTP APIs, all internal communication via service bindings

### 2.2 Core Components

**Workers Layer:**
- Dashboard Worker (`src/index.ts`) handles:
  - HTTP requests at root path
  - Future: URL submissions, WebSocket connections
  - RPC binding to Workflows

**Orchestration Layer:**
- GameTestPipeline Workflow (`src/workflows/gameTestPipeline.ts`):
  - 5-step structure: Launch Agent → Phase 1-4
  - Per-phase timeouts: 30s, 45s, 5min, 60s
  - Automatic retry: 2 retries per phase with exponential backoff
  - Updates test_runs.status in D1 at each transition

**Data Layer:**
- D1 Database: Test metadata, scores, events
- R2 Object Storage: Screenshots (`tests/{test_id}/screenshots/`), logs (`tests/{test_id}/logs/`)
- Agent SQL: Per-DO storage (future, Epic 2)

**AI Layer:**
- AI Gateway as primary entry point for all AI requests
- Routing: Workers AI (Llama Vision/Gemini Flash) → Fallback to GPT-4o/Claude 3.5 Sonnet
- Features: Request caching (15-min TTL), cost tracking, automatic failover

### 2.3 Service Bindings Architecture

```
Dashboard Worker (src/index.ts)
    ↓ [RPC binding]
GameTestPipeline Workflow (src/workflows/gameTestPipeline.ts)
    ↓ [RPC binding]
TestAgent Durable Object (src/agents/TestAgent.ts) [skeleton in Epic 1]
    ↓ [HTTP via AI Gateway]
Workers AI / OpenAI / Anthropic
```

All bindings configured in `wrangler.toml`.

---

## 3. Detailed Design

### 3.1 Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|---|---|---|---|---|
| **Dashboard Worker** (`src/index.ts`) | Entry point, serves HTTP requests | HTTP GET/POST requests | HTML response or Workflow trigger | Story 1.1 |
| **GameTestPipeline Workflow** (`src/workflows/gameTestPipeline.ts`) | Orchestrate 4-phase test execution | `testRunId: string, gameUrl: string, inputSchema?: JSON` | Test completion status | Story 1.4 |
| **D1 Helpers** (`src/shared/helpers/d1.ts`) | Query test metadata | SQL queries | Query results | Story 1.2 |
| **R2 Helpers** (`src/shared/helpers/r2.ts`) | Upload/retrieve artifacts | `testId, buffer, metadata` | R2 URL | Story 1.3 |
| **AI Gateway Wrapper** (`src/shared/helpers/ai-gateway.ts`) | Route AI requests | `prompt, images, model` | AI response | Story 1.5 |
| **TestAgent DO** (`src/agents/TestAgent.ts`) | Test execution agent (skeleton) | Phase method calls | Phase results | Epic 2 |

### 3.2 Data Models

**D1 Schema (Story 1.2):**

```sql
-- test_runs table
CREATE TABLE test_runs (
  id TEXT PRIMARY KEY,              -- UUID (e.g., "550e8400-e29b-41d4-a716-446655440000")
  url TEXT NOT NULL,                -- Game URL
  input_schema TEXT,                -- Optional JSON describing game controls
  status TEXT NOT NULL,             -- 'queued' | 'running' | 'completed' | 'failed'
  overall_score INTEGER,            -- 0-100 or NULL
  created_at INTEGER NOT NULL,      -- Unix timestamp (milliseconds)
  updated_at INTEGER NOT NULL,      -- Unix timestamp
  completed_at INTEGER              -- Unix timestamp or NULL
);

CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_created_at ON test_runs(created_at DESC);

-- evaluation_scores table
CREATE TABLE evaluation_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_run_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,        -- 'load' | 'visual' | 'controls' | 'playability' | 'technical' | 'overall'
  score INTEGER NOT NULL,            -- 0-100
  justification TEXT NOT NULL,       -- 2-3 sentence explanation
  created_at INTEGER NOT NULL,
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id)
);

CREATE INDEX idx_evaluation_scores_test_run_id ON evaluation_scores(test_run_id);

-- test_events table
CREATE TABLE test_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_run_id TEXT NOT NULL,
  phase TEXT NOT NULL,              -- 'phase1' | 'phase2' | 'phase3' | 'phase4'
  event_type TEXT NOT NULL,         -- 'started' | 'progress' | 'completed' | 'failed' | 'control_discovered'
  description TEXT NOT NULL,        -- Human-readable event description
  timestamp INTEGER NOT NULL,       -- Unix timestamp
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id)
);

CREATE INDEX idx_test_events_test_run_id ON test_events(test_run_id);
CREATE INDEX idx_test_events_timestamp ON test_events(timestamp DESC);
```

**R2 Storage Structure (Story 1.3):**

```
gameeval-evidence/
├── tests/
│   ├── {test-uuid}/
│   │   ├── screenshots/
│   │   │   ├── 1699104800000-phase1-initial-load.png
│   │   │   ├── 1699104830000-phase2-controls.png
│   │   │   └── ...
│   │   └── logs/
│   │       ├── console.log
│   │       ├── network.log
│   │       └── agent-decisions.log
```

**Shared TypeScript Types (`src/shared/types.ts`):**

```typescript
export interface TestRun {
  id: string;
  url: string;
  inputSchema?: InputSchema;
  status: 'queued' | 'running' | 'completed' | 'failed';
  overallScore?: number;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface InputSchema {
  controls?: {
    movement?: string[];
    actions?: string[];
    special?: string[];
  };
  objectives?: string;
  ui_elements?: string[];
}

export interface EvaluationScore {
  testRunId: string;
  metricName: 'load' | 'visual' | 'controls' | 'playability' | 'technical' | 'overall';
  score: number;
  justification: string;
  createdAt: number;
}

export interface TestEvent {
  testRunId: string;
  phase: 'phase1' | 'phase2' | 'phase3' | 'phase4';
  eventType: 'started' | 'progress' | 'completed' | 'failed' | 'control_discovered';
  description: string;
  timestamp: number;
}

export interface PhaseResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

export interface WorkflowInput {
  testRunId: string;
  gameUrl: string;
  inputSchema?: InputSchema;
}
```

### 3.3 APIs and Interfaces

**Dashboard Worker HTTP Endpoints:**

```typescript
// src/index.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/') {
      return new Response('GameEval QA Pipeline - Ready', { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  }
};
```

**Workflow RPC Interface:**

```typescript
// src/workflows/gameTestPipeline.ts
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

export class GameTestPipeline extends WorkflowEntrypoint<Env, WorkflowInput> {
  async run(event: WorkflowEvent<WorkflowInput>, step: WorkflowStep): Promise<void> {
    const { testRunId, gameUrl, inputSchema } = event.payload;
    
    // Step 1: Launch TestAgent DO
    await step.do('launch-agent', async () => {
      // Create TestAgent DO instance
    });
    
    // Step 2: Phase 1 - Load & Validation (30s timeout)
    await step.do('phase-1', { timeout: '30 seconds' }, async () => {
      // Call TestAgent.runPhase1()
    });
    
    // Step 3: Phase 2 - Control Discovery (45s timeout)
    await step.do('phase-2', { timeout: '45 seconds' }, async () => {
      // Call TestAgent.runPhase2()
    });
    
    // Step 4: Phase 3 - Gameplay Exploration (5min timeout)
    await step.do('phase-3', { timeout: '5 minutes' }, async () => {
      // Call TestAgent.runPhase3()
    });
    
    // Step 5: Phase 4 - Evaluation & Scoring (60s timeout)
    await step.do('phase-4', { timeout: '60 seconds' }, async () => {
      // Call TestAgent.runPhase4()
    });
  }
}
```

**D1 Helper Functions:**

```typescript
// src/shared/helpers/d1.ts
export async function getTestById(db: D1Database, testId: string): Promise<TestRun | null>;
export async function listRecentTests(db: D1Database, limit: number): Promise<TestRun[]>;
export async function updateTestStatus(db: D1Database, testId: string, status: string): Promise<void>;
export async function insertTestEvent(db: D1Database, event: TestEvent): Promise<void>;
```

**R2 Helper Functions:**

```typescript
// src/shared/helpers/r2.ts
export async function uploadScreenshot(
  bucket: R2Bucket,
  testId: string,
  phase: string,
  action: string,
  buffer: ArrayBuffer
): Promise<string>;

export async function uploadLog(
  bucket: R2Bucket,
  testId: string,
  logType: 'console' | 'network' | 'agent-decisions',
  content: string
): Promise<void>;

export async function getTestArtifacts(
  bucket: R2Bucket,
  testId: string
): Promise<{ screenshots: string[]; logs: string[] }>;
```

**AI Gateway Wrapper:**

```typescript
// src/shared/helpers/ai-gateway.ts
export async function callAI(
  env: Env,
  prompt: string,
  images?: string[],
  modelPreference?: 'workers-ai' | 'openai' | 'anthropic'
): Promise<string>;

export async function getAICosts(testRunId: string): Promise<number>;
```

### 3.4 Workflow Sequencing

**GameTestPipeline Workflow Execution Flow:**

```
User submits URL via Dashboard Worker (future Epic 3)
    ↓
Dashboard Worker creates test_run record in D1 (status: 'queued')
    ↓
Dashboard Worker triggers GameTestPipeline Workflow via RPC binding
    ↓
Workflow Step 1: Launch TestAgent DO
    - Generate DO ID from test UUID
    - Initialize TestAgent instance
    - Update test_runs.status = 'running'
    ↓
Workflow Step 2: Phase 1 - Load & Validation (30s timeout)
    - Call TestAgent.runPhase1() via RPC
    - TestAgent navigates to game URL
    - Log event: { phase: 'phase1', event_type: 'started', ... }
    - On success: Log event: { ..., event_type: 'completed' }
    - On failure: Retry 2x with exponential backoff
    ↓
Workflow Step 3: Phase 2 - Control Discovery (45s timeout)
    - Call TestAgent.runPhase2() via RPC
    - TestAgent identifies interactive elements
    - Log event: { phase: 'phase2', event_type: 'started', ... }
    - On success: Log event: { ..., event_type: 'completed' }
    ↓
Workflow Step 4: Phase 3 - Gameplay Exploration (5min timeout)
    - Call TestAgent.runPhase3() via RPC
    - TestAgent autonomously explores game
    - Log event: { phase: 'phase3', event_type: 'started', ... }
    - On success: Log event: { ..., event_type: 'completed' }
    ↓
Workflow Step 5: Phase 4 - Evaluation & Scoring (60s timeout)
    - Call TestAgent.runPhase4() via RPC
    - TestAgent analyzes evidence and scores
    - Insert evaluation_scores records
    - Update test_runs.status = 'completed', overall_score
    - Log event: { phase: 'phase4', event_type: 'completed', ... }
    ↓
Workflow completes
    ↓
Dashboard displays results (future Epic 3)
```

**Error Recovery Flow:**

```
Phase fails with error
    ↓
Workflow catches error
    ↓
Workflow retries phase (max 2 retries, exponential backoff)
    ↓
If retries exhausted:
    - Update test_runs.status = 'failed'
    - Insert test_event: { event_type: 'failed', description: user_friendly_error }
    - Workflow completes with failure
```

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target | Justification |
|---|---|---|
| Workflow creation latency | < 100ms | User submits URL and gets test ID immediately |
| D1 query latency (single test) | < 50ms | Dashboard needs real-time status updates |
| R2 upload latency (screenshot) | < 200ms | Multiple uploads during Phase 3 must not block |
| Phase 1 timeout | 30 seconds | Load validation should complete quickly |
| Phase 2 timeout | 45 seconds | Control discovery typically fast for DOM-based games |
| Phase 3 timeout | 5 minutes | Adaptive gameplay exploration, most tests complete in 2-3 min |
| Phase 4 timeout | 60 seconds | AI evaluation with vision model |
| Total workflow duration | < 6 minutes | Maximum end-to-end test execution time |

### 4.2 Security

- **Service Bindings Only**: No exposed HTTP REST APIs; all internal communication via RPC
- **AI Gateway Credentials**: Stored in Cloudflare Secrets (not in code)
- **R2 Public Read**: Screenshots/logs accessible via signed URLs (CORS configured)
- **Input Validation**: Validate game URL format and input schema JSON structure
- **Future**: Firewall for AI to prevent prompt injection (post-MVP)

### 4.3 Reliability

- **Workflow State Persistence**: Cloudflare Workflows automatically persist state across steps
- **Automatic Retries**: 2 retries per phase with exponential backoff (2s, 4s delays)
- **AI Gateway Failover**: Automatic switch to fallback model (GPT-4o/Claude 3.5) if Workers AI fails
- **Error Logging**: All errors logged to test_events with user-friendly descriptions
- **Graceful Degradation**: Failed phases mark test as 'failed' but preserve partial evidence

### 4.4 Observability

- **D1 Event Logging**: All phase transitions and errors logged to test_events table
- **AI Gateway Telemetry**: Request logs, cost tracking, model selection visible in AI Gateway dashboard
- **R2 Evidence**: All screenshots and logs stored for post-test analysis
- **Workflow Execution Logs**: Cloudflare Workflows dashboard shows step-by-step execution
- **Future**: Structured logging with timestamps for debugging (Story-level implementation)

---

## 5. Dependencies and Integrations

### 5.1 External Dependencies

| Dependency | Version | Purpose | Installation |
|---|---|---|---|
| `@cloudflare/workers-types` | `^4.0.0` | TypeScript types for Workers APIs | `npm install --save-dev @cloudflare/workers-types` |
| `@cloudflare/ai` | `^1.0.0` | AI Gateway SDK | `npm install @cloudflare/ai` |
| `stagehand` | Latest | Browser automation (used in Epic 2) | `npm install stagehand` |
| `wrangler` | `^3.78.0` | Cloudflare CLI for deployment | `npm install -g wrangler` |

### 5.2 Cloudflare Services (Bindings)

| Service | Binding Name | Purpose | Configuration in wrangler.toml |
|---|---|---|---|
| D1 Database | `DB` | Test metadata storage | `[[d1_databases]]` |
| R2 Bucket | `EVIDENCE_BUCKET` | Screenshots/logs storage | `[[r2_buckets]]` |
| Workflows | `WORKFLOW` | Test orchestration | `[[workflows]]` |
| Durable Objects | `TEST_AGENT` | TestAgent instances | `[[durable_objects.bindings]]` |
| AI Gateway | `AI` | AI request routing | `[ai]` |
| Browser Rendering | `BROWSER` | Serverless browser (Epic 2) | `[browser]` |

### 5.3 Integration Points

**wrangler.toml Configuration (Story 1.1):**

```toml
name = "gameeval-qa-pipeline"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[d1_databases]]
binding = "DB"
database_name = "gameeval-db"
database_id = "<generated-on-creation>"

[[r2_buckets]]
binding = "EVIDENCE_BUCKET"
bucket_name = "gameeval-evidence"

[[workflows]]
binding = "WORKFLOW"
name = "gameTestPipeline"
script_name = "gameTestPipeline"

[[durable_objects.bindings]]
name = "TEST_AGENT"
class_name = "TestAgent"
script_name = "gameeval-qa-pipeline"

[browser]
binding = "BROWSER"
```

---

## 6. Acceptance Criteria and Traceability

### 6.1 Epic-Level Acceptance Criteria

✅ **AC-1**: Cloudflare Workers project initialized with all service bindings configured  
→ **Spec Section**: 3.1, 5.2  
→ **Components**: Dashboard Worker, wrangler.toml  
→ **Test Idea**: Deploy to Cloudflare, verify bindings accessible in Worker

✅ **AC-2**: D1 database schema created with 3 tables (test_runs, evaluation_scores, test_events)  
→ **Spec Section**: 3.2  
→ **Components**: D1 migrations, d1.ts helpers  
→ **Test Idea**: Run migrations, insert test data, query with helper functions

✅ **AC-3**: R2 bucket configured with structured path patterns for screenshots and logs  
→ **Spec Section**: 3.2, 3.3  
→ **Components**: R2 bucket, r2.ts helpers  
→ **Test Idea**: Upload test screenshot, verify path structure, retrieve via URL

✅ **AC-4**: Workflow orchestrates 5 steps with per-phase timeouts and retry logic  
→ **Spec Section**: 3.3, 3.4  
→ **Components**: GameTestPipeline Workflow  
→ **Test Idea**: Trigger workflow with test data, observe step execution in dashboard

✅ **AC-5**: AI Gateway configured with Workers AI primary and frontier model fallback  
→ **Spec Section**: 3.3, 5.2  
→ **Components**: AI Gateway binding, ai-gateway.ts wrapper  
→ **Test Idea**: Call `callAI()`, verify request appears in AI Gateway logs

✅ **AC-6**: Project structure follows monorepo pattern with TypeScript strict mode  
→ **Spec Section**: 2.2, 5.1  
→ **Components**: tsconfig.json, package.json, folder structure  
→ **Test Idea**: Run `tsc --noEmit`, verify no type errors

### 6.2 Story-Level Acceptance Criteria Mapping

**Story 1.1**: Project Setup and Cloudflare Configuration  
→ All ACs map to Section 3.1, 5.1, 5.2  
→ Test: `wrangler deploy` succeeds, Worker responds to HTTP GET /

**Story 1.2**: D1 Database Schema and Migrations  
→ All ACs map to Section 3.2, 3.3 (D1 helpers)  
→ Test: Run migrations, execute `getTestById()`, verify results

**Story 1.3**: R2 Storage Setup and Helper Functions  
→ All ACs map to Section 3.2, 3.3 (R2 helpers)  
→ Test: Upload screenshot with `uploadScreenshot()`, retrieve with `getTestArtifacts()`

**Story 1.4**: Workflow Orchestration Setup  
→ All ACs map to Section 3.3, 3.4  
→ Test: Trigger workflow manually, verify D1 status updates, check retry behavior with forced error

**Story 1.5**: AI Gateway Configuration  
→ All ACs map to Section 3.3, 5.2  
→ Test: Call `callAI()` with test prompt, verify model used in AI Gateway dashboard, check cost tracking

---

## 7. Risks, Assumptions, and Questions

### 7.1 Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Workflow timeout limits too aggressive** | Tests may fail prematurely | Medium | Start with conservative timeouts (30s, 45s, 5min, 60s); adjust based on Epic 2 testing |
| **D1 query latency spikes under load** | Dashboard status updates slow | Low | Add caching in Epic 3 (Workers KV), use indexes on status/created_at |
| **R2 upload failures during Phase 3** | Evidence loss | Medium | Implement retry logic in r2.ts helpers, buffer screenshots in TestAgent state |
| **AI Gateway failover delays** | Phase 4 timeouts | Low | AI Gateway handles failover automatically, but monitor latency in production |
| **Service binding configuration errors** | Deployment failures | Medium | Validate wrangler.toml config, test bindings in dev environment before production |

### 7.2 Assumptions

- **Assumption 1**: Cloudflare Workflows support 6-minute maximum duration for test execution
  - **Validation**: Confirmed in Cloudflare Workflows documentation (10-minute limit)
- **Assumption 2**: D1 database can handle 10 concurrent writes (status updates across multiple tests)
  - **Validation**: D1 supports eventual consistency; risk mitigated by low write volume in MVP
- **Assumption 3**: R2 public read access sufficient for dashboard viewing (no CDN required)
  - **Validation**: R2 supports public URLs with CORS; CDN can be added post-MVP if needed
- **Assumption 4**: Workers AI vision models sufficient for Phase 4 evaluation
  - **Validation**: AI Gateway fallback to GPT-4o/Claude 3.5 if Workers AI insufficient
- **Assumption 5**: 30-day R2 retention sufficient for MVP
  - **Validation**: Post-MVP lifecycle policies can extend retention if user feedback requires

### 7.3 Questions for Stakeholders

- **Q1**: Should we expose AI Gateway cost tracking to users in dashboard? (Post-MVP consideration)
- **Q2**: What is acceptable P95 latency for test execution? (Currently targeting <6 min P99)
- **Q3**: Do we need multi-region deployment for R2/D1? (Currently single-region for MVP)

---

## 8. Test Strategy

### 8.1 Unit Testing

**Scope**: D1 helpers, R2 helpers, AI Gateway wrapper  
**Framework**: `vitest` (if testing required) or manual testing via Wrangler dev mode  
**Key Tests**:
- `getTestById()` returns correct test record
- `uploadScreenshot()` creates file with correct path pattern
- `callAI()` routes request through AI Gateway

**Coverage Goal**: Not required for MVP (focus on integration testing)

### 8.2 Integration Testing

**Scope**: Workflow orchestration, service bindings  
**Approach**: Manual testing in Cloudflare dashboard + `wrangler dev` local environment  
**Key Tests**:
1. **Dashboard Worker Binding Test**:
   - Deploy Worker
   - `curl https://<worker-url>/` → verify 200 response
2. **D1 Integration Test**:
   - Run migrations: `wrangler d1 migrations apply gameeval-db`
   - Insert test record via SQL console
   - Query with `getTestById()` via Worker
3. **R2 Integration Test**:
   - Upload test image via `uploadScreenshot()`
   - Verify object exists in R2 dashboard
   - Access via public URL
4. **Workflow Integration Test**:
   - Trigger GameTestPipeline manually: `wrangler workflows trigger gameTestPipeline --data '{"testRunId":"test-123","gameUrl":"https://example.com"}'`
   - Observe step execution in Workflows dashboard
   - Verify D1 status updates after each step
5. **AI Gateway Integration Test**:
   - Call `callAI("Test prompt")` via Worker endpoint
   - Check AI Gateway logs for request
   - Verify response returned

### 8.3 End-to-End Testing

**Scope**: Full workflow execution (with skeleton TestAgent)  
**Approach**: Manual test with mock TestAgent responses  
**Test Scenario**:
1. Deploy all components
2. Trigger Workflow with test data
3. Mock TestAgent.runPhase1-4() to return success
4. Verify:
   - test_runs.status transitions: queued → running → completed
   - test_events logged for each phase
   - No errors in Workflow execution logs

**Success Criteria**: Workflow completes without errors, D1 records updated correctly

---

## 9. Story Implementation Order

Epic 1 stories have the following dependency graph:

```
Story 1.1 (Project Setup)
    ↓
    ├─ Story 1.2 (D1 Schema) ─┐
    ├─ Story 1.3 (R2 Setup)   ├─ Can run in parallel
    └─ Story 1.5 (AI Gateway) ┘
    ↓
Story 1.4 (Workflow Orchestration) [requires 1.1 + 1.2]
```

**Recommended Implementation Order:**
1. **Story 1.1** (1-2 hours): Initialize project, configure wrangler.toml, create basic Worker
2. **Stories 1.2, 1.3, 1.5 in parallel** (2-3 hours each):
   - 1.2: Create D1 migrations, implement helper functions
   - 1.3: Create R2 bucket, implement upload/retrieval helpers
   - 1.5: Configure AI Gateway, implement request wrapper
3. **Story 1.4** (2-3 hours): Implement Workflow with 5-step structure, integrate D1 updates

**Total Estimated Time**: 8-12 hours (Days 1-3 as per PRD Phase 1)

---

## 10. Next Steps After Epic 1

✅ **Epic 1 Complete**: Core infrastructure ready  
→ **Next Epic: Epic 2 - AI Test Agent & Browser Automation**

**Epic 2 will implement:**
- TestAgent Durable Object with 4-phase execution logic
- Stagehand integration for browser automation
- Computer Use mode for autonomous gameplay exploration
- Evidence capture (screenshots, console logs, network requests)
- Phase 4 evaluation logic with AI Gateway

**Prerequisites for Epic 2:**
- All Epic 1 stories completed and deployed
- D1 database accessible via binding
- R2 bucket accepting uploads
- Workflow successfully triggering TestAgent DO methods (even if skeleton)

---

**Document Status:** ✅ Ready for Story Drafting  
**Epic Status:** Backlog → **Contexted**  
**Next Action:** Run `create-story` workflow to draft Story 1.1

