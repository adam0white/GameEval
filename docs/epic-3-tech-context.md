# Epic Technical Specification: Live Dashboard & Real-Time Updates

Date: 2025-01-27
Author: Adam
Epic ID: epic-3
Status: Draft

---

## Overview

Epic 3 implements the user-facing dashboard that provides the complete GameEval experience - from URL submission to real-time test monitoring to comprehensive quality reports. This epic completes the MVP end-to-end user experience by building a web dashboard served directly from Cloudflare Workers, enabling real-time WebSocket updates from TestAgent, and delivering detailed test reports with visual evidence. The dashboard architecture follows Cloudflare design patterns with inline HTML/CSS/JS (no separate static hosting), uses RPC service bindings exclusively for all internal communication, and provides a responsive UI that works seamlessly across desktop and mobile devices. Epic 3 transforms GameEval from a backend testing infrastructure into a production-ready product that game developers can use immediately to validate their games.

## Objectives and Scope

**Objectives:**
- Implement Dashboard Worker that serves UI HTML/CSS/JS directly from Worker (no separate static hosting)
- Create clean, minimal UI following Cloudflare design patterns (orange accents, monospace fonts)
- Enable URL submission with form validation and RPC-triggered workflow execution
- Build test run list with real-time status updates (polling for MVP, WebSocket enhancement)
- Integrate WebSocket connection to TestAgent DO for live progress streaming
- Implement detailed test report view with scores, screenshots, logs, and export functionality
- Validate end-to-end system with example games and document deployment process

**In Scope:**
- Dashboard Worker (`src/workers/dashboard.ts`) serving HTML/CSS/JS inline
- RPC service binding methods: `submitTest()`, `listTests()`, `getTestReport()`, `exportTestJSON()`
- Frontend JavaScript for form submission, test list polling, WebSocket connection
- Test run card UI with status badges, progress indicators, expandable details
- Screenshot gallery with lightbox viewer
- Console/network error log display with syntax highlighting
- JSON export functionality
- WebSocket connection to TestAgent DO via RPC service binding
- Production deployment configuration and documentation

**Out of Scope:**
- Separate static asset hosting (using inline HTML/CSS/JS for simplicity)
- Mobile-first responsive design refinements (post-MVP)
- Advanced filtering/sorting of test runs (Epic 5)
- Batch testing UI (Epic 5)
- Historical analytics dashboard (Epic 5)
- Custom domain configuration (optional, acceptable post-MVP)
- Advanced security features like rate limiting (Epic 4)

## System Architecture Alignment

### Architecture Pattern
Epic 3 implements the **Dashboard Worker pattern** (PRD Section 6.1) and **RPC-only communication** (ADR-001):
- **Dashboard Worker**: Single Worker serves HTML/CSS/JS directly, handles all user interactions via RPC methods
- **No REST API Endpoints**: All communication via service bindings (Workflow, TestAgent DO)
- **WebSocket Integration**: TestAgent DO broadcasts progress via Agents SDK WebSocket API, Dashboard connects via RPC
- **Frontend-Backend Unity**: All UI logic in same Worker, no CORS or API versioning concerns

### Integration Points
- **Epic 1 Dependencies**: D1 database queries, R2 bucket access for evidence retrieval, Workflow service binding
- **Epic 2 Dependencies**: TestAgent DO WebSocket connection, RPC calls to TestAgent methods
- **Browser Rendering**: Not directly used (TestAgent handles browser sessions)
- **R2 Evidence Storage**: Dashboard retrieves screenshots and logs via R2 signed URLs or public access

### Communication Flow
```
User submits URL
    ↓
Dashboard Worker RPC method: submitTest()
    ↓
Dashboard Worker calls: env.WORKFLOW.create().run({ testRunId, gameUrl, inputSchema })
    ↓
Workflow triggers TestAgent DO (Epic 2)
    ↓
TestAgent broadcasts progress via WebSocket
    ↓
Dashboard Worker connects to TestAgent WebSocket via RPC
    ↓
Dashboard UI updates in real-time
    ↓
User clicks test run → Dashboard calls getTestReport(testId) RPC method
    ↓
Dashboard queries D1 + R2 → Returns complete test report
```

### Data Query Pattern
- **D1 Queries**: `SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 50` for test list
- **R2 Access**: Screenshots and logs retrieved via signed URLs or public bucket access
- **Join Queries**: `test_runs` + `evaluation_scores` + `test_events` for detailed reports

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|---|---|---|---|---|
| **Dashboard Worker** (`src/workers/dashboard.ts`) | Serve HTML/CSS/JS UI, handle RPC methods, manage WebSocket connections | HTTP requests, WebSocket messages | HTML responses, RPC method results | Story 3.1 |
| **Dashboard UI Handler** (`fetch()` method) | Route requests: serve HTML, handle RPC calls, WebSocket upgrades | HTTP request path | HTML page or JSON response | Story 3.1 |
| **Submit Test Handler** (`submitTest()` RPC) | Validate URL/input schema, generate UUID, trigger Workflow | gameUrl, inputSchema (optional) | { testId: string } | Story 3.1 |
| **List Tests Handler** (`listTests()` RPC) | Query D1 for recent test runs, format for UI | limit (default 50) | TestRunSummary[] | Story 3.2 |
| **Get Test Report Handler** (`getTestReport()` RPC) | Query D1 + R2 for complete test data, join evaluation_scores/test_events | testId | TestReport | Story 3.4 |
| **Export Test JSON Handler** (`exportTestJSON()` RPC) | Serialize complete test report to JSON | testId | JSON string | Story 3.4 |
| **WebSocket Connection Manager** | Connect to TestAgent DO WebSocket, route messages to frontend | testRunId | WebSocket connection | Story 3.3 |
| **Frontend JavaScript** (inline in HTML) | Form validation, test list polling, WebSocket client, UI updates | User interactions, WebSocket messages | DOM updates | Story 3.1, 3.2, 3.3, 3.4 |
| **Test Run Card Component** (frontend) | Display test status, progress, scores, expandable details | TestRunSummary | Rendered card HTML | Story 3.2 |
| **Screenshot Gallery Component** (frontend) | Display screenshots in grid with lightbox viewer | Screenshot URLs | Rendered gallery HTML | Story 3.4 |
| **Report Viewer Component** (frontend) | Display detailed test report with scores, logs, timeline | TestReport | Rendered report HTML | Story 3.4 |

### Data Models and Contracts

**Dashboard Worker RPC Interface Types:**

```typescript
// RPC method: submitTest()
interface SubmitTestRequest {
  gameUrl: string;        // HTTP/HTTPS URL, validated
  inputSchema?: string;   // JSON string, optional, validated
}

interface SubmitTestResponse {
  testId: string;        // UUID
}

// RPC method: listTests()
interface ListTestsRequest {
  limit?: number;        // Default 50
}

interface TestRunSummary {
  id: string;
  url: string;           // Truncated for display
  status: 'queued' | 'running' | 'completed' | 'failed';
  phase?: 'phase1' | 'phase2' | 'phase3' | 'phase4';
  progress: number;       // 0-100
  overallScore?: number; // 0-100 or undefined
  createdAt: number;     // Unix timestamp
  completedAt?: number;  // Unix timestamp or undefined
  duration?: number;     // Milliseconds
}

// RPC method: getTestReport()
interface TestReport {
  id: string;
  url: string;
  inputSchema?: string;
  status: string;
  overallScore: number;
  metrics: MetricScore[];
  screenshots: ScreenshotMetadata[];
  events: TestEvent[];
  consoleLogs: string[];
  networkErrors: NetworkError[];
  timestamps: {
    createdAt: number;
    completedAt: number;
    duration: number;
  };
  aiModel?: string;      // Model used for evaluation
}

interface MetricScore {
  name: 'load' | 'visual' | 'controls' | 'playability' | 'technical' | 'overall';
  score: number;         // 0-100
  justification: string; // 2-3 sentences
}

interface ScreenshotMetadata {
  url: string;          // R2 URL or signed URL
  phase: string;
  description: string;
  timestamp: number;
}

interface TestEvent {
  phase: string;
  eventType: string;
  description: string;
  timestamp: number;
}

interface NetworkError {
  url: string;
  status: number;
  timestamp: number;
}
```

**D1 Query Results (from Epic 1 schema):**

```typescript
// test_runs table (from migrations/0001_create_test_runs.sql)
interface TestRunRow {
  id: string;
  url: string;
  input_schema: string | null;
  status: string;
  overall_score: number | null;
  created_at: number;
  updated_at: number;
  completed_at: number | null;
  error_message: string | null; // From migration 0005
}

// evaluation_scores table (from migrations/0002_create_evaluation_scores.sql)
interface EvaluationScoreRow {
  id: number;
  test_run_id: string;
  metric_name: string;
  score: number;
  justification: string;
  created_at: number;
}

// test_events table (from migrations/0003_create_test_events.sql)
interface TestEventRow {
  id: number;
  test_run_id: string;
  phase: string;
  event_type: string;
  description: string;
  timestamp: number;
  metadata: string | null; // From migration 0004
}
```

**R2 Evidence Structure (from Epic 2):**

```
gameeval-evidence/
  tests/{testId}/
    screenshots/
      {timestamp}-{phase}-{description}.png
    logs/
      console.log
      network.log
      agent-decisions.log
```

### APIs and Interfaces

**Dashboard Worker RPC Methods (Internal Only, No HTTP API):**

```typescript
// Dashboard Worker class structure
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Serve HTML for root path
    if (url.pathname === '/') {
      return new Response(getHTML(), { headers: { 'Content-Type': 'text/html' } });
    }
    
    // RPC method: submitTest
    if (url.pathname === '/rpc/submitTest' && request.method === 'POST') {
      const { gameUrl, inputSchema } = await request.json();
      return Response.json(await this.submitTest(env, gameUrl, inputSchema));
    }
    
    // RPC method: listTests
    if (url.pathname === '/rpc/listTests' && request.method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      return Response.json(await this.listTests(env, limit));
    }
    
    // RPC method: getTestReport
    if (url.pathname === '/rpc/getTestReport' && request.method === 'GET') {
      const testId = url.searchParams.get('testId');
      return Response.json(await this.getTestReport(env, testId));
    }
    
    // RPC method: exportTestJSON
    if (url.pathname === '/rpc/exportTestJSON' && request.method === 'GET') {
      const testId = url.searchParams.get('testId');
      return Response.json(await this.exportTestJSON(env, testId));
    }
    
    // WebSocket connection (for TestAgent DO)
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request, env);
    }
  },
  
  async submitTest(env: Env, gameUrl: string, inputSchema?: string): Promise<SubmitTestResponse>;
  async listTests(env: Env, limit: number): Promise<TestRunSummary[]>;
  async getTestReport(env: Env, testId: string): Promise<TestReport>;
  async exportTestJSON(env: Env, testId: string): Promise<string>;
  async handleWebSocket(request: Request, env: Env): Promise<Response>;
};
```

**Workflow Service Binding (from Epic 1):**

```typescript
// Dashboard Worker calls Workflow
const testRunId = crypto.randomUUID();
await env.WORKFLOW.create().run({
  testRunId,
  gameUrl: validatedUrl,
  inputSchema: inputSchema || undefined
});
```

**TestAgent DO WebSocket Connection (from Epic 2):**

```typescript
// Dashboard Worker connects to TestAgent DO WebSocket
const testAgentId = env.TEST_AGENT.idFromString(testRunId);
const testAgent = env.TEST_AGENT.get(testAgentId);
const response = await testAgent.fetch("https://dummy-host/ws", {
  headers: { Upgrade: "websocket" }
});
const ws = response.webSocket; // WebSocket connection
```

**Frontend JavaScript (Inline in HTML):**

```typescript
// Frontend calls Dashboard Worker RPC methods
async function submitTest(gameUrl: string, inputSchema?: string) {
  const response = await fetch('/rpc/submitTest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameUrl, inputSchema })
  });
  const { testId } = await response.json();
  return testId;
}

async function listTests(limit = 50) {
  const response = await fetch(`/rpc/listTests?limit=${limit}`);
  return await response.json();
}

// WebSocket connection
function connectWebSocket(testRunId: string) {
  const ws = new WebSocket(`wss://${window.location.host}/ws?testId=${testRunId}`);
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    updateUI(update);
  };
}
```

### Workflows and Sequencing

**Story 3.1: Dashboard Worker with URL Submission Flow**

```
User visits dashboard URL
    ↓
Dashboard Worker serves HTML/CSS/JS (inline)
    ↓
User fills form: gameUrl (required), inputSchema (optional)
    ↓
Frontend validates: URL format (HTTP/HTTPS), JSON schema (if provided)
    ↓
Frontend calls: POST /rpc/submitTest { gameUrl, inputSchema }
    ↓
Dashboard Worker validates inputs
    ↓
Dashboard Worker generates: testRunId = crypto.randomUUID()
    ↓
Dashboard Worker calls: env.WORKFLOW.create().run({ testRunId, gameUrl, inputSchema })
    ↓
Dashboard Worker returns: { testId: testRunId }
    ↓
Frontend displays: "Test submitted! Test ID: {testId}"
```

**Story 3.2: Test Run List with Real-Time Status (Polling)**

```
Page loads
    ↓
Frontend calls: GET /rpc/listTests?limit=50
    ↓
Dashboard Worker queries D1:
    SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 50
    ↓
Dashboard Worker calculates: progress, duration, phase from test_events
    ↓
Dashboard Worker returns: TestRunSummary[]
    ↓
Frontend renders: Test run cards sorted by newest first
    ↓
Frontend sets interval: Poll every 3 seconds
    ↓
On each poll: Update cards with latest status, progress, scores
    ↓
CSS transitions: Smooth status badge color changes
```

**Story 3.3: WebSocket Connection for Live Updates**

```
User clicks test run card (or test starts)
    ↓
Frontend calls: connectWebSocket(testRunId)
    ↓
Frontend creates: WebSocket connection to /ws?testId={testRunId}
    ↓
Dashboard Worker receives WebSocket upgrade request
    ↓
Dashboard Worker gets TestAgent DO: env.TEST_AGENT.get(testAgentId)
    ↓
Dashboard Worker connects to TestAgent WebSocket via RPC
    ↓
TestAgent broadcasts: { type: 'status', phase: 'phase2', message: '...' }
    ↓
Dashboard Worker forwards: WebSocket message to frontend
    ↓
Frontend receives: Real-time update
    ↓
Frontend updates: Status badge, progress indicator, live feed
    ↓
If WebSocket drops: Frontend falls back to polling (Story 3.2)
    ↓
Frontend auto-reconnects: WebSocket with exponential backoff
```

**Story 3.4: Detailed Test Report View**

```
User clicks test run card to expand
    ↓
Frontend calls: GET /rpc/getTestReport?testId={testId}
    ↓
Dashboard Worker queries D1:
    - SELECT * FROM test_runs WHERE id = ?
    - SELECT * FROM evaluation_scores WHERE test_run_id = ?
    - SELECT * FROM test_events WHERE test_run_id = ? ORDER BY timestamp
    ↓
Dashboard Worker queries R2:
    - List objects: tests/{testId}/screenshots/*
    - Get logs: tests/{testId}/logs/console.log, network.log
    ↓
Dashboard Worker joins data: TestReport object
    ↓
Dashboard Worker returns: TestReport JSON
    ↓
Frontend renders:
    - Overall score (large, color-coded)
    - 5 metric scores with progress bars and justifications
    - Timeline of events (chronological list)
    - Screenshot gallery (grid layout)
    - Expandable console error log
    - Expandable network error log
    - Test metadata (duration, timestamp, AI model)
    ↓
User clicks screenshot: Opens lightbox with prev/next navigation
    ↓
User clicks "Export JSON": Downloads full TestReport as JSON file
```

**Story 3.5: Example Game Testing and Validation**

```
Developer deploys all components (Epic 1, 2, 3)
    ↓
Developer submits test with example game URL
    ↓
Observe: Dashboard shows test in list, status updates real-time
    ↓
Validate: TestAgent successfully loads game (Phase 1)
    ↓
Validate: Control discovery finds interactive elements (Phase 2)
    ↓
Validate: Agent plays game autonomously (Phase 3)
    ↓
Validate: Screenshots captured (minimum 5)
    ↓
Validate: Quality scores generated with justifications (Phase 4)
    ↓
Validate: Dashboard displays results correctly
    ↓
Validate: WebSocket updates work in real-time
    ↓
Test error handling: Submit invalid URL, verify graceful failure message
    ↓
Document: Edge cases discovered for post-MVP fixes
```

**Story 3.6: Production Deployment and Documentation**

```
Developer configures wrangler.toml: Production bindings
    ↓
Developer sets production secrets: AI Gateway keys, etc.
    ↓
Developer runs: wrangler deploy
    ↓
Validate: Dashboard Worker accessible at production URL
    ↓
Validate: TestAgent DO deployed
    ↓
Validate: Workflow deployed
    ↓
Test: Submit test with example game in production
    ↓
Create: README.md with setup, deployment, environment variables
    ↓
Create: USAGE.md with user guide, troubleshooting
    ↓
Monitor: Production logs for first 24 hours
```

## Non-Functional Requirements

### Performance

| Metric | Target | Justification |
|---|---|---|
| Dashboard load time | < 2 seconds | Initial HTML/CSS/JS should load quickly (inline, no external assets) |
| Test list query latency | < 500ms | D1 query should be fast (LIMIT 50, indexed on created_at) |
| Test report query latency | < 1 second | D1 join queries + R2 list operations should complete quickly |
| Polling interval | 3 seconds | Balance between real-time feel and server load (WebSocket preferred) |
| WebSocket message rate | Max 1 per 5 seconds | Prevent spam, maintain dashboard responsiveness (from Epic 2) |
| Screenshot gallery render | < 2 seconds | Lazy load images, display thumbnails first |
| JSON export generation | < 500ms | Serialization of TestReport should be fast |
| Concurrent dashboard users | 10+ simultaneous | Multiple users viewing different tests should not degrade performance |
| Dashboard responsiveness | Status updates within 5 seconds | Users should see phase changes quickly (PRD TM-4) |

### Security

- **RPC-Only Architecture**: No exposed HTTP REST APIs; all communication via service bindings (ADR-001)
- **Input Validation**: Validate game URL format (HTTP/HTTPS only), input schema JSON structure (max 10KB), test ID UUID format
- **WebSocket Security**: WebSocket connections proxied through Dashboard Worker (no direct DO access from browser)
- **R2 Access Control**: Screenshots/logs have public read access (signed URLs for dashboard viewing) or private with signed URLs
- **Environment Secrets**: All API keys stored in Wrangler secrets, never exposed in code or client-side JavaScript
- **Error Message Sanitization**: Never expose stack traces, internal error codes, infrastructure details in user-facing messages
- **CORS**: Not applicable (same-origin, no cross-origin requests)
- **XSS Prevention**: Sanitize user input (game URLs, input schema) before rendering in HTML
- **Rate Limiting**: Post-MVP (Epic 4) - per-user test submission limits

### Reliability/Availability

- **Dashboard Uptime**: Target >99.5% (PRD UXM-3) - Cloudflare Workers global distribution ensures high availability
- **WebSocket Fallback**: If WebSocket connection fails, dashboard automatically falls back to polling (Story 3.2)
- **WebSocket Reconnection**: Automatic reconnection with exponential backoff if connection drops
- **Graceful Degradation**: If test report query fails, show partial data (test list still works)
- **Error Handling**: All RPC methods catch errors and return user-friendly messages (never expose stack traces)
- **D1 Query Resilience**: Retry failed queries with exponential backoff (max 3 retries)
- **R2 Access Resilience**: If signed URL generation fails, fall back to public access (if configured)
- **Test List Caching**: Cache test list results for 1 second to reduce D1 query load (optional optimization)

### Observability

- **D1 Query Logging**: Log all D1 queries (test list, test report) for debugging and performance monitoring
- **RPC Method Logging**: Log all RPC method calls (submitTest, listTests, getTestReport) with request/response metadata
- **WebSocket Connection Logging**: Log WebSocket connection attempts, disconnections, message counts
- **Error Logging**: Log all errors with context (test ID, user action, error type) for debugging
- **Performance Metrics**: Track dashboard load times, query latencies, WebSocket message rates
- **Cloudflare Analytics**: Optional - use Cloudflare Analytics for usage tracking (post-MVP)
- **Dashboard Usage Metrics**: Track number of test submissions, test report views, WebSocket connections
- **Frontend Error Tracking**: Log JavaScript errors to console (for development debugging)

## Dependencies and Integrations

### External Dependencies

| Dependency | Version | Purpose | Installation |
|---|---|---|---|
| No additional npm packages | - | Dashboard uses only Workers runtime APIs | - |

### Cloudflare Services (Bindings)

| Service | Binding Name | Purpose | Epic Status |
|---|---|---|---|
| D1 Database | `DB` | Query test_runs, evaluation_scores, test_events | ✅ Configured (Epic 1) |
| R2 Bucket | `EVIDENCE_BUCKET` | Retrieve screenshots and logs | ✅ Configured (Epic 1) |
| Workflows | `WORKFLOW` | Trigger test execution | ✅ Configured (Epic 1) |
| Durable Objects | `TEST_AGENT` | Connect to TestAgent DO WebSocket | ✅ Configured (Epic 1) |

### Integration Points

**Epic 1 Dependencies:**
- **D1 Database**: Query test_runs for test list, join with evaluation_scores and test_events for detailed reports
- **R2 Bucket**: List and retrieve screenshots (`tests/{testId}/screenshots/*`), retrieve logs (`tests/{testId}/logs/*`)
- **Workflow Service Binding**: Trigger test execution via `env.WORKFLOW.create().run({ testRunId, gameUrl, inputSchema })`

**Epic 2 Dependencies:**
- **TestAgent DO WebSocket**: Connect to TestAgent DO via RPC to receive real-time progress updates
- **TestAgent State**: TestAgent broadcasts progress via WebSocket, Dashboard forwards to frontend

**No New Dependencies:**
- Dashboard Worker uses only Workers runtime APIs (no npm packages needed)
- HTML/CSS/JS served inline (no separate static hosting)

## Acceptance Criteria (Authoritative)

### Story 3.1: Dashboard Worker with URL Submission
✅ **AC-1**: Dashboard Worker created: `src/workers/dashboard.ts`  
✅ **AC-2**: Serves HTML/CSS/JS directly from Worker (no separate static hosting)  
✅ **AC-3**: Clean, minimal UI following Cloudflare design patterns (orange accents, monospace fonts)  
✅ **AC-4**: Header: "GameEval QA Pipeline" with tagline  
✅ **AC-5**: URL submission form with fields: Game URL (required, validated HTTP/HTTPS), Input Schema (optional, JSON textarea with validation)  
✅ **AC-6**: Submit button triggers RPC call to Dashboard Worker's `submitTest(gameUrl, inputSchema)` method  
✅ **AC-7**: On successful submission: generate UUID, trigger Workflow via service binding, show test ID to user  
✅ **AC-8**: Form validation: URL format, JSON schema format (if provided)  
✅ **AC-9**: Responsive layout: works on desktop (mobile post-MVP)  

### Story 3.2: Test Run List with Real-Time Status
✅ **AC-1**: Test run list displayed below submission form  
✅ **AC-2**: Polls Dashboard Worker's RPC method `listTests()` every 3 seconds for updates (simple polling for MVP)  
✅ **AC-3**: Each test run card shows: Game URL (truncated with tooltip on hover), Status badge (Queued, Running, Completed, Failed) with color coding, Progress indicator showing current phase (1/4, 2/4, 3/4, 4/4), Start time (relative: "2 minutes ago"), Duration (if completed), Overall quality score (if completed, with color: green >70, yellow 50-70, red <50)  
✅ **AC-4**: Test runs sorted by newest first  
✅ **AC-5**: Status badge colors: gray (queued), blue (running), green (completed), red (failed)  
✅ **AC-6**: Click test run card to expand inline for detailed report  
✅ **AC-7**: Loading state while polling  
✅ **AC-8**: Empty state message: "No tests yet. Submit a game URL to get started!"  

### Story 3.3: WebSocket Connection for Live Updates
✅ **AC-1**: Dashboard connects to TestAgent DO via WebSocket (using Agents SDK WebSocket API)  
✅ **AC-2**: Connection established through RPC call to Dashboard Worker: `connectToTest(testRunId)`  
✅ **AC-3**: TestAgent broadcasts updates via WebSocket: Phase transitions ("Starting Phase 2..."), Progress messages ("Discovering controls..."), Action updates ("Testing WASD movement"), Completion ("Test complete! Score: 78/100")  
✅ **AC-4**: Dashboard receives WebSocket messages and updates UI instantly  
✅ **AC-5**: Status badge updates in real-time (no polling delay)  
✅ **AC-6**: Progress messages shown in expandable "Live Feed" section per test  
✅ **AC-7**: WebSocket reconnects automatically if connection drops  
✅ **AC-8**: Fallback to polling if WebSocket unavailable  

### Story 3.4: Detailed Test Report View
✅ **AC-1**: Click test run card to expand inline (no separate page)  
✅ **AC-2**: Expanded view shows: Large overall quality score (0-100) with color coding, 5 individual metric scores with progress bars, AI justification text for each metric (2-3 sentences), Timeline of AI actions with timestamps, Screenshot gallery (grid layout, click to enlarge), Expandable console error log (if errors found), Expandable network error log (if failures found), Test duration and timestamp, AI model used for evaluation  
✅ **AC-3**: Screenshots display with captions: phase and action description  
✅ **AC-4**: Screenshot lightbox: click to view full-size with prev/next navigation  
✅ **AC-5**: Console errors syntax highlighted (if applicable)  
✅ **AC-6**: "Export JSON" button downloads full test report  
✅ **AC-7**: Collapse button to close expanded view  

### Story 3.5: Example Game Testing and Validation
✅ **AC-1**: Test with 3-5 example DOM-based games (provided by user)  
✅ **AC-2**: Validate: TestAgent successfully loads each game  
✅ **AC-3**: Validate: Control discovery finds interactive elements  
✅ **AC-4**: Validate: Agent plays each game autonomously for 1-3 minutes  
✅ **AC-5**: Validate: Minimum 5 screenshots captured per test  
✅ **AC-6**: Validate: Quality scores generated with justifications  
✅ **AC-7**: Validate: Dashboard displays results correctly  
✅ **AC-8**: Validate: WebSocket updates work in real-time  
✅ **AC-9**: Test with input schema provided (for at least 1 game)  
✅ **AC-10**: Test error handling: submit invalid URL, test graceful failures  
✅ **AC-11**: Document any edge cases discovered for post-MVP fixes  

### Story 3.6: Production Deployment and Documentation
✅ **AC-1**: Deploy Dashboard Worker to Cloudflare Workers production  
✅ **AC-2**: Deploy TestAgent DO to production  
✅ **AC-3**: Deploy Workflow to production  
✅ **AC-4**: Configure production bindings: D1, R2, Browser Rendering, AI Gateway  
✅ **AC-5**: Set up production environment variables and secrets  
✅ **AC-6**: Create README.md with: Project overview and architecture, Setup instructions for local development, Deployment guide, Environment variable reference, RPC service binding documentation  
✅ **AC-7**: Create USAGE.md with: How to submit tests via dashboard, How to interpret quality scores, Input schema format and examples, Troubleshooting common issues  
✅ **AC-8**: Configure custom domain (optional, post-MVP acceptable)  
✅ **AC-9**: Test production deployment with example game

## Traceability Mapping

| AC ID | Spec Section | Component(s)/API(s) | Test Idea |
|---|---|---|---|
| **3.1-AC-1** | 3.1 Services | `src/workers/dashboard.ts` | Verify Dashboard Worker file exists |
| **3.1-AC-2** | 3.1 Services | Dashboard Worker fetch() | Verify HTML/CSS/JS served inline, no external assets |
| **3.1-AC-3** | 3.1 Services | HTML template | Verify UI follows Cloudflare design patterns (orange accents, monospace fonts) |
| **3.1-AC-4** | 3.1 Services | HTML template | Verify header displays "GameEval QA Pipeline" with tagline |
| **3.1-AC-5** | 3.3 APIs | HTML form | Verify form has Game URL (required) and Input Schema (optional) fields |
| **3.1-AC-6** | 3.3 APIs | Frontend JavaScript | Verify submit button calls POST /rpc/submitTest |
| **3.1-AC-7** | 3.3 APIs | submitTest() RPC method | Verify UUID generated, Workflow triggered, test ID displayed |
| **3.1-AC-8** | 3.3 APIs | Frontend validation | Verify URL format validation (HTTP/HTTPS), JSON schema validation |
| **3.1-AC-9** | 3.1 Services | CSS responsive design | Verify layout works on desktop viewport |
| **3.2-AC-1** | 3.1 Services | Frontend JavaScript | Verify test run list displayed below form |
| **3.2-AC-2** | 3.3 APIs | Frontend polling | Verify listTests() called every 3 seconds |
| **3.2-AC-3** | 3.1 Services | Test run card component | Verify card displays all required fields (URL, status, progress, time, score) |
| **3.2-AC-4** | 3.3 APIs | listTests() RPC method | Verify D1 query sorts by created_at DESC |
| **3.2-AC-5** | 3.1 Services | CSS status badges | Verify badge colors match specification (gray/blue/green/red) |
| **3.2-AC-6** | 3.1 Services | Frontend JavaScript | Verify clicking card expands detailed report |
| **3.2-AC-7** | 3.1 Services | Frontend JavaScript | Verify loading state shown while polling |
| **3.2-AC-8** | 3.1 Services | Frontend JavaScript | Verify empty state message displayed when no tests |
| **3.3-AC-1** | 3.3 APIs | WebSocket connection | Verify Dashboard connects to TestAgent DO WebSocket |
| **3.3-AC-2** | 3.3 APIs | handleWebSocket() method | Verify connection established via RPC |
| **3.3-AC-3** | 3.3 APIs | TestAgent WebSocket broadcast | Verify TestAgent sends phase transitions, progress messages, action updates, completion |
| **3.3-AC-4** | 3.1 Services | Frontend JavaScript | Verify WebSocket messages update UI instantly |
| **3.3-AC-5** | 3.1 Services | Frontend JavaScript | Verify status badge updates in real-time (no polling delay) |
| **3.3-AC-6** | 3.1 Services | Frontend JavaScript | Verify progress messages shown in expandable "Live Feed" section |
| **3.3-AC-7** | 3.1 Services | Frontend JavaScript | Verify WebSocket reconnects automatically with exponential backoff |
| **3.3-AC-8** | 3.1 Services | Frontend JavaScript | Verify fallback to polling if WebSocket unavailable |
| **3.4-AC-1** | 3.1 Services | Frontend JavaScript | Verify clicking test run card expands inline (no page navigation) |
| **3.4-AC-2** | 3.3 APIs | getTestReport() RPC method | Verify expanded view shows all required elements (score, metrics, timeline, screenshots, logs) |
| **3.4-AC-3** | 3.1 Services | Screenshot gallery component | Verify screenshots display with captions (phase and action description) |
| **3.4-AC-4** | 3.1 Services | Screenshot gallery component | Verify clicking screenshot opens lightbox with prev/next navigation |
| **3.4-AC-5** | 3.1 Services | Console error log component | Verify console errors syntax highlighted (if applicable) |
| **3.4-AC-6** | 3.3 APIs | exportTestJSON() RPC method | Verify "Export JSON" button downloads full test report |
| **3.4-AC-7** | 3.1 Services | Frontend JavaScript | Verify collapse button closes expanded view |
| **3.5-AC-1** | 3.4 Workflows | Manual testing | Test with 3-5 example DOM-based games |
| **3.5-AC-2** | 3.4 Workflows | Manual testing | Validate TestAgent loads each game successfully |
| **3.5-AC-3** | 3.4 Workflows | Manual testing | Validate control discovery finds interactive elements |
| **3.5-AC-4** | 3.4 Workflows | Manual testing | Validate agent plays each game autonomously for 1-3 minutes |
| **3.5-AC-5** | 3.4 Workflows | Manual testing | Validate minimum 5 screenshots captured per test |
| **3.5-AC-6** | 3.4 Workflows | Manual testing | Validate quality scores generated with justifications |
| **3.5-AC-7** | 3.4 Workflows | Manual testing | Validate dashboard displays results correctly |
| **3.5-AC-8** | 3.4 Workflows | Manual testing | Validate WebSocket updates work in real-time |
| **3.5-AC-9** | 3.4 Workflows | Manual testing | Test with input schema provided for at least 1 game |
| **3.5-AC-10** | 3.4 Workflows | Manual testing | Test error handling with invalid URL, verify graceful failure |
| **3.5-AC-11** | 3.4 Workflows | Documentation | Document edge cases discovered for post-MVP fixes |
| **3.6-AC-1** | 3.4 Workflows | Deployment | Deploy Dashboard Worker to production using wrangler deploy |
| **3.6-AC-2** | 3.4 Workflows | Deployment | Deploy TestAgent DO to production |
| **3.6-AC-3** | 3.4 Workflows | Deployment | Deploy Workflow to production |
| **3.6-AC-4** | 3.4 Workflows | Configuration | Configure production bindings (D1, R2, Browser Rendering, AI Gateway) |
| **3.6-AC-5** | 3.4 Workflows | Configuration | Set up production environment variables and secrets |
| **3.6-AC-6** | 3.4 Workflows | Documentation | Create README.md with project overview, setup, deployment, environment variables, RPC documentation |
| **3.6-AC-7** | 3.4 Workflows | Documentation | Create USAGE.md with user guide, score interpretation, input schema examples, troubleshooting |
| **3.6-AC-8** | 3.4 Workflows | Configuration | Configure custom domain (optional, acceptable post-MVP) |
| **3.6-AC-9** | 3.4 Workflows | Manual testing | Test production deployment with example game |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **WebSocket connection fails to establish** | Real-time updates unavailable, fallback to polling | Medium | Implement polling fallback (Story 3.2), auto-reconnect with exponential backoff |
| **D1 query performance degrades with many test runs** | Dashboard slow to load | Medium | Limit query to 50 most recent tests, add caching (1 second TTL), use indexed columns |
| **R2 signed URL generation fails** | Screenshots not viewable | Low | Fall back to public bucket access (if configured), or retry URL generation |
| **WebSocket message rate too high** | Dashboard UI becomes unresponsive | Low | Rate limit WebSocket messages (max 1 per 5 seconds, from Epic 2), batch updates |
| **Frontend JavaScript errors break UI** | Dashboard unusable | Medium | Implement error handling in JavaScript, log errors to console, show user-friendly error messages |
| **Test report query timeout** | Detailed report fails to load | Low | Implement query timeout (5 seconds), show partial data if query incomplete, retry with exponential backoff |
| **Production deployment configuration errors** | Dashboard not accessible | Medium | Test deployment in staging first, validate all bindings configured correctly, document deployment process |

### Assumptions

- **Assumption 1**: Browser supports WebSocket API (modern browsers)
  - **Validation**: Test with Chrome, Firefox, Safari, Edge
  - **Mitigation**: Polling fallback for browsers without WebSocket support
- **Assumption 2**: D1 query performance sufficient for 50 test runs (< 500ms)
  - **Validation**: Test with production data volume
  - **Mitigation**: Add caching, optimize queries, limit results
- **Assumption 3**: R2 bucket accessible from Dashboard Worker (public read or signed URLs)
  - **Validation**: Verify R2 bucket configuration allows Dashboard Worker access
  - **Mitigation**: Configure R2 bucket with public read access or implement signed URL generation
- **Assumption 4**: TestAgent DO WebSocket connection available during test execution
  - **Validation**: Test WebSocket connection during all test phases
  - **Mitigation**: Polling fallback if WebSocket unavailable
- **Assumption 5**: Dashboard UI works on desktop viewport (mobile post-MVP acceptable)
  - **Validation**: Test on common desktop resolutions (1920x1080, 1366x768)
  - **Mitigation**: Basic responsive CSS, mobile optimization deferred to post-MVP

### Questions for Stakeholders

- **Q1**: Should dashboard support filtering/sorting test runs? (Currently shows newest first, limit 50)
- **Q2**: Should dashboard support batch test submission? (Currently one URL at a time)
- **Q3**: What is acceptable dashboard load time? (Currently targeting < 2 seconds)
- **Q4**: Should dashboard support user authentication? (Currently no auth, public access)
- **Q5**: Should dashboard support custom themes or branding? (Currently follows Cloudflare design patterns)

## Post-Review Follow-ups

- Decide whether to retain inline Worker delivery or formally adopt the React + Vite pipeline and update ADR-001 accordingly.
- Adjust build tooling so Cloudflare ASSETS serves `/index.html` from `dist/frontend/index.html` rather than falling back to legacy inline HTML.
- Track completion of the Card/Table toggle, Agent Focus confidence metric, and typography scale updates that the review identified as gaps.

## Test Strategy Summary

### Unit Testing

**Scope**: Dashboard Worker RPC methods, frontend JavaScript functions, data formatting  
**Framework**: Manual testing via Wrangler dev mode (unit tests optional for MVP)  
**Key Tests**:
- `submitTest()` validates URL format, generates UUID, triggers Workflow
- `listTests()` queries D1 correctly, formats TestRunSummary[]
- `getTestReport()` joins D1 tables, retrieves R2 objects, formats TestReport
- `exportTestJSON()` serializes TestReport correctly
- Frontend form validation: URL format, JSON schema format
- Frontend test card rendering: status badges, progress indicators, scores

**Coverage Goal**: Not required for MVP (focus on integration and E2E testing)

### Integration Testing

**Scope**: RPC method execution, D1 queries, R2 access, WebSocket connections, Workflow triggers  
**Approach**: Manual testing in Cloudflare dashboard + `wrangler dev` local environment  
**Key Tests**:

1. **Story 3.1 Integration Test**:
   - Deploy Dashboard Worker
   - Visit dashboard URL
   - Submit test with valid game URL
   - Verify Workflow triggered, test ID displayed
   - Verify test appears in test list

2. **Story 3.2 Integration Test**:
   - Submit test with game URL
   - Verify test appears in list with correct status (queued)
   - Verify polling updates status as test progresses
   - Verify test card shows progress indicator (1/4, 2/4, 3/4, 4/4)
   - Verify status badge colors change correctly
   - Verify test sorted by newest first

3. **Story 3.3 Integration Test**:
   - Submit test with game URL
   - Verify WebSocket connection established
   - Verify WebSocket messages received and UI updates in real-time
   - Verify status badge updates without polling delay
   - Verify progress messages shown in "Live Feed" section
   - Test WebSocket reconnection: disconnect network, verify auto-reconnect
   - Test WebSocket fallback: disable WebSocket, verify polling works

4. **Story 3.4 Integration Test**:
   - Complete test execution (wait for test to finish)
   - Click test run card to expand
   - Verify detailed report shows: overall score, 5 metric scores with justifications, timeline, screenshots, logs
   - Verify screenshot gallery displays with captions
   - Verify clicking screenshot opens lightbox with prev/next navigation
   - Verify console/network error logs expandable
   - Verify "Export JSON" button downloads test report

5. **Error Handling Integration Test**:
   - Submit invalid URL (not HTTP/HTTPS)
   - Verify form validation error message
   - Submit invalid JSON schema
   - Verify JSON validation error message
   - Submit valid URL but test fails (404 game)
   - Verify graceful error message displayed in test card

### End-to-End Testing

**Scope**: Complete user journey from URL submission to viewing detailed report  
**Approach**: Manual test with real browser game URL  
**Test Scenario**:

1. **E2E Test: Complete User Flow**:
   - Deploy all components (Epic 1, 2, 3)
   - Visit dashboard URL
   - Submit test with example game URL
   - Observe: Test appears in list immediately with "queued" status
   - Observe: Status updates to "running" within 5 seconds
   - Observe: WebSocket updates show phase transitions in real-time
   - Observe: Progress indicator updates (1/4 → 2/4 → 3/4 → 4/4)
   - Wait for test completion (2-4 minutes)
   - Observe: Status updates to "completed" with overall score displayed
   - Click test run card to expand
   - Verify: Detailed report shows all sections (scores, screenshots, timeline, logs)
   - Verify: Screenshot gallery displays with captions
   - Verify: Clicking screenshot opens lightbox
   - Verify: "Export JSON" button downloads full report
   - Verify: Console/network error logs expandable (if errors present)

2. **E2E Test: Multiple Concurrent Tests**:
   - Submit 3 tests simultaneously
   - Verify: All 3 tests appear in list
   - Verify: Each test updates independently
   - Verify: WebSocket connections work for all 3 tests
   - Verify: Dashboard remains responsive

3. **E2E Test: Error Handling**:
   - Submit test with 404 game URL (invalid URL)
   - Verify: Test fails gracefully with user-friendly error message
   - Verify: Error message displayed in test card
   - Verify: Dashboard remains functional (can submit new tests)

**Success Criteria**: 
- Complete user flow works end-to-end
- Real-time updates visible via WebSocket
- Detailed reports display all evidence correctly
- Error handling provides actionable feedback
- Dashboard remains responsive with multiple concurrent tests

---

**Document Status:** ✅ Ready for Story Drafting  
**Epic Status:** Backlog → **Contexted**  
**Next Action:** Run `create-story` workflow to draft Story 3.1

