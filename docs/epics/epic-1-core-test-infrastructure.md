# Epic 1: Core Test Infrastructure

**Goal:** Establish foundational Cloudflare platform infrastructure and workflow orchestration for autonomous game testing.

**Value:** Creates the scaffolding for all test execution - without this foundation, no tests can run. Sets up data persistence, workflow coordination, and service bindings between components.

**Phase:** 1 (Foundation) - Days 1-3

**Dependencies:** None - this is the foundation epic

---

## Stories

**Story 1.1: Project Setup and Cloudflare Configuration**

As a developer,
I want a configured Cloudflare Workers project with all required services,
So that I have the foundation to build the test pipeline.

**Acceptance Criteria:**
1. Cloudflare Workers project initialized with wrangler.toml configuration
2. Service bindings configured for: Workflows, D1, R2, Browser Rendering, AI Gateway
3. Development environment variables set up (local and remote)
4. Basic Worker responds to HTTP requests at root path
5. Project structure created: `/src/workers`, `/src/agents`, `/src/workflows`, `/src/types`
6. TypeScript configuration with strict mode enabled
7. Package.json with required dependencies: @cloudflare/workers-types, stagehand, etc.

**Prerequisites:** None

**Technical Notes:**
- Use latest Wrangler version for deployment
- Set up separate bindings for dev/staging/production
- Include AI Gateway configuration with fallback routing
- Use RPC service bindings for internal communication (no REST API endpoints)

---

**Story 1.2: D1 Database Schema and Migrations**

As a developer,
I want a complete D1 database schema for test metadata,
So that I can store and query test runs, results, and events.

**Acceptance Criteria:**
1. D1 database created and bound to Workers
2. `test_runs` table with columns: id (UUID), url, input_schema (JSON), status, overall_score, created_at, updated_at, completed_at
3. `evaluation_scores` table with columns: test_run_id, metric_name, score, justification, created_at
4. `test_events` table with columns: id, test_run_id, phase, event_type, description, timestamp
5. Migration scripts in `/migrations` directory
6. Database indexes on: test_runs.status, test_runs.created_at, test_events.test_run_id
7. SQL helper functions for common queries (get_test_by_id, list_recent_tests, etc.)

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use UUIDs for test_run_id (auto-generated)
- input_schema stored as JSON text column
- status enum: 'queued', 'running', 'completed', 'failed'
- metric_name enum: 'load', 'visual', 'controls', 'playability', 'technical', 'overall'

---

**Story 1.3: R2 Storage Setup and Helper Functions**

As a developer,
I want R2 bucket configured with helper functions for evidence storage,
So that I can store screenshots and logs with proper organization.

**Acceptance Criteria:**
1. R2 bucket created and bound to Workers (`gameeval-evidence`)
2. Storage path structure: `tests/{test_id}/screenshots/{timestamp}-{phase}-{action}.png`
3. Storage path structure: `tests/{test_id}/logs/{log_type}.log` (console, network, agent-decisions)
4. Helper function: `uploadScreenshot(testId, phase, action, buffer)` returns R2 URL
5. Helper function: `uploadLog(testId, logType, content)` appends to log file
6. Helper function: `getTestArtifacts(testId)` returns list of all artifacts
7. Proper Content-Type headers set (image/png for screenshots, text/plain for logs)
8. R2 objects have public read access for dashboard viewing

**Prerequisites:** Story 1.1

**Technical Notes:**
- Use R2's conditional PUT for atomic uploads
- Set up CORS for dashboard access
- Consider lifecycle policies for 30-day retention (post-MVP)

---

**Story 1.4: Workflow Orchestration Setup**

As a developer,
I want a Cloudflare Workflow that orchestrates the 4-phase test pipeline,
So that I can coordinate TestAgent execution with retries and timeouts.

**Acceptance Criteria:**
1. Workflow file created: `src/workflows/gameTestPipeline.ts`
2. Workflow accepts inputs: testRunId (UUID), gameUrl (string), inputSchema (optional JSON)
3. Workflow has 5 steps: Launch Agent, Phase 1, Phase 2, Phase 3, Phase 4
4. Each phase step calls TestAgent DO method with appropriate timeout
5. Phase 1 timeout: 30 seconds
6. Phase 2 timeout: 45 seconds
7. Phase 3 timeout: 5 minutes (adaptive)
8. Phase 4 timeout: 60 seconds
9. Workflow updates test_runs.status in D1 at each phase transition
10. Workflow logs events to test_events table
11. Automatic retry logic: 2 retries per phase with exponential backoff
12. Workflow catches errors and marks test as 'failed' with error message in D1

**Prerequisites:** Stories 1.1, 1.2

**Technical Notes:**
- Use Workflow's built-in state persistence
- TestAgent DO ID = test run UUID (1:1 mapping)
- Maximum workflow duration: 6 minutes end-to-end
- Error messages must be user-friendly (no stack traces)

---

**Story 1.5: AI Gateway Configuration**

As a developer,
I want AI Gateway configured with Workers AI and frontier model fallback,
So that all AI requests route through unified gateway with observability.

**Acceptance Criteria:**
1. AI Gateway account and endpoint created
2. Primary provider: Workers AI (Llama Vision or Gemini Flash for vision tasks)
3. Fallback provider: OpenAI GPT-4o or Anthropic Claude 3.5 Sonnet
4. Gateway configured for automatic failover on primary failure
5. Request caching enabled (15-minute TTL for identical prompts)
6. Cost tracking enabled per test run
7. Helper function: `callAI(prompt, images, modelPreference)` routes through gateway
8. Helper function: `getAICosts(testRunId)` returns total AI spend for test
9. Logging of all AI requests to test_events table

**Prerequisites:** Story 1.1

**Technical Notes:**
- Store AI Gateway credentials in Workers secrets
- Log model used in test_events for debugging
- Gateway endpoint format: `https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/...`
- Consider model selection UI in dashboard (post-MVP)

---

**Epic 1 Summary:**
- **Total Stories:** 5
- **Can run in parallel:** Stories 1.2, 1.3, 1.5 after Story 1.1 completes; Story 1.4 needs 1.1 and 1.2
- **Estimated Duration:** Days 1-3
- **Deliverable:** Complete infrastructure foundation ready for TestAgent implementation

---
