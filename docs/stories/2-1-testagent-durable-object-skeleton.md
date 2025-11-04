# Story 2.1: TestAgent Durable Object Skeleton

**Story ID:** 2.1  
**Epic:** Epic 2 - AI Test Agent & Browser Automation  
**Status:** done  
**Created:** 2025-01-27  
**Completed:** 2025-11-04  

---

## Story

**As a** developer,  
**I want** a TestAgent Durable Object with state management and lifecycle hooks,  
**So that** I have the foundation for AI-powered test execution.

---

## Business Context

Story 2.1 establishes the core TestAgent Durable Object that will serve as the stateful execution engine for all game testing. This builds on Epic 1's infrastructure foundation (D1, R2, Workflows, AI Gateway) to create the persistent agent that orchestrates the 4-phase test pipeline.

The TestAgent Durable Object uses the Cloudflare Agents SDK pattern, providing built-in state persistence, WebSocket communication, and per-agent SQL storage. This foundation enables subsequent stories to implement browser automation, control discovery, gameplay exploration, and AI-powered evaluation.

**Value:** Enables autonomous test execution with persistent state across all phases, real-time progress updates, and graceful error handling. Without this foundation, the TestAgent cannot maintain game state, accumulate evidence, or provide live feedback to users.

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.1]  
[Source: docs/epic-2-tech-context.md, Services and Modules section]  
[Source: docs/architecture/novel-pattern-designs.md, Pattern 1]

---

## Acceptance Criteria

1. **Durable Object class created**: `src/agents/TestAgent.ts` implements DurableObject interface with proper TypeScript types
2. **DO constructor accepts**: testRunId (string), gameUrl (string), inputSchema (optional JSON string)
3. **State storage initialized**: Built-in SQL database initialized with tables: `agent_actions`, `control_discoveries`, `decision_log`
4. **WebSocket handler**: WebSocket endpoint at `/ws` for real-time progress updates to dashboard
5. **Methods defined**: Empty implementations for `runPhase1()`, `runPhase2()`, `runPhase3()`, `runPhase4()` methods
6. **Helper method `updateStatus()`**: Logs to D1 test_events table and broadcasts via WebSocket to connected clients
7. **Helper method `storeEvidence()`**: Saves evidence (screenshots, logs) to R2 and tracks metadata in DO state
8. **Error handling wrapper**: All phase methods wrapped in try-catch blocks that return user-friendly error messages
9. **DO instantiation**: TestAgent can be instantiated by Workflow with test run UUID as DO ID using `env.TEST_AGENT.idFromString(testRunId)`

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.1 Acceptance Criteria]  
[Source: docs/epic-2-tech-context.md, Acceptance Criteria section]  
[Source: docs/architecture/novel-pattern-designs.md, Pattern 1 Implementation Guide]

---

## Tasks / Subtasks

### Task 1: Create TestAgent Durable Object Class (AC: 1, 2)

- [x] Create `src/agents/TestAgent.ts` file
- [x] Import required types: `DurableObject`, `DurableObjectState`, `Env` from `@cloudflare/workers-types`
- [x] Define `TestAgent` class implementing `DurableObject` interface
- [x] Add constructor that accepts `state: DurableObjectState` and `env: Env`
- [x] Add instance properties: `testRunId: string`, `gameUrl: string`, `inputSchema?: string`
- [x] Initialize instance properties from constructor or from request body (for initialization endpoint)
- [x] Add `fetch()` method to handle HTTP and WebSocket requests
- [x] Add TypeScript types for TestAgent state structure

### Task 2: Initialize Agent SQL Database (AC: 3)

- [x] Create SQL schema for `agent_actions` table:
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `timestamp INTEGER NOT NULL`
  - `action TEXT NOT NULL`
  - `reasoning TEXT NOT NULL`
  - `outcome TEXT`
- [x] Create SQL schema for `control_discoveries` table:
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `element_selector TEXT NOT NULL`
  - `action_type TEXT NOT NULL`
  - `confidence REAL NOT NULL`
  - `discovered_at INTEGER NOT NULL`
- [x] Create SQL schema for `decision_log` table:
  - `id INTEGER PRIMARY KEY AUTOINCREMENT`
  - `timestamp INTEGER NOT NULL`
  - `decision TEXT NOT NULL`
  - `context TEXT NOT NULL`
  - `ai_model TEXT`
- [x] Initialize tables in constructor or on first use (lazy initialization)
- [x] Add helper method to execute SQL queries: `execSQL(query: string, params?: any[])`

### Task 3: Implement WebSocket Handler (AC: 4)

- [x] Add route handler for `/ws` endpoint in `fetch()` method
- [x] Upgrade HTTP request to WebSocket connection
- [x] Maintain array of connected WebSocket clients: `websocketClients: WebSocket[]`
- [x] Add `broadcastToClients(message: object)` helper method
- [x] Implement WebSocket message format: `{ type: string, phase?: string, status?: string, message: string, timestamp: number }`
- [x] Handle WebSocket close events (remove from clients array)
- [x] Add rate limiting: Max 1 event per 5 seconds to prevent spam

### Task 4: Define Phase Methods (Empty Implementations) (AC: 5)

- [x] Add `runPhase1()` method: `async runPhase1(): Promise<Response>`
- [x] Add `runPhase2()` method: `async runPhase2(): Promise<Response>`
- [x] Add `runPhase3()` method: `async runPhase3(): Promise<Response>`
- [x] Add `runPhase4()` method: `async runPhase4(): Promise<Response>`
- [x] Each method returns `Response.json({ success: false, message: "Not yet implemented" })`
- [x] Add route handlers in `fetch()`: `/phase1`, `/phase2`, `/phase3`, `/phase4`

### Task 5: Implement `updateStatus()` Helper Method (AC: 6)

- [x] Create `updateStatus(phase: string, message: string): Promise<void>` method
- [x] Log to D1 test_events table:
  - Use `insertTestEvent()` from `src/shared/helpers/d1.ts`
  - event_type: `progress` or `phase_started` or `phase_completed`
  - description: message parameter
  - phase: phase parameter
  - test_run_id: this.testRunId
- [x] Broadcast via WebSocket:
  - Call `broadcastToClients()` with message format
  - Include phase, status, message, timestamp
- [x] Handle errors gracefully (log but don't throw)

### Task 6: Implement `storeEvidence()` Helper Method (AC: 7)

- [x] Create `storeEvidence(type: 'screenshot' | 'log', data: unknown, metadata?: object): Promise<string>` method
- [x] Save to R2 bucket:
  - Use `uploadToR2()` helper from `src/shared/helpers/r2.ts`
  - Path pattern: `tests/{testRunId}/screenshots/{timestamp}-{description}.png` or `tests/{testRunId}/logs/{type}.log`
  - Return R2 URL for stored object
- [x] Track in DO state:
  - Add `evidence` array to DO state structure
  - Store metadata: { type, url, timestamp, description }
- [x] Return R2 URL for stored evidence

### Task 7: Implement Error Handling Wrapper (AC: 8)

- [x] Wrap all phase methods in try-catch blocks
- [x] Create `handleError(error: Error, phase: string): Promise<Response>` method
- [x] Translate technical errors to user-friendly messages:
  - "Game failed to load (404)" → "The game URL could not be accessed. Please check the URL is correct."
  - "Timeout in Phase X" → "The test phase timed out. Please try again or check the game URL."
  - "Internal error" → "An unexpected error occurred. Please try again later."
- [x] Log full error details to D1 test_events (for debugging)
- [x] Return Response.json with user-friendly error message
- [x] Never expose stack traces or internal error codes

### Task 8: Configure DO Binding and Workflow Integration (AC: 9)

- [x] Verify `TEST_AGENT` binding in `wrangler.toml`:
  - `[[durable_objects.bindings]]` with `name = "TEST_AGENT"`
  - `class_name = "TestAgent"`
- [x] Add `export { TestAgent }` from `src/agents/TestAgent.ts`
- [x] Add `export default TestAgent` for DO export
- [x] Verify Workflow can instantiate: `env.TEST_AGENT.idFromString(testRunId)`
- [x] Add initialization endpoint `/init` to accept testRunId, gameUrl, inputSchema
- [x] Store initialization parameters in DO state

### Task 9: Add TypeScript Types and Interfaces

- [x] Define `TestAgentState` interface in `src/shared/types.ts`:
  - `testRunId: string`
  - `gameUrl: string`
  - `inputSchema?: string`
  - `evidence: EvidenceMetadata[]`
  - `phaseResults: Record<string, PhaseResult>`
- [x] Define `EvidenceMetadata` interface:
  - `type: 'screenshot' | 'log'`
  - `url: string`
  - `timestamp: number`
  - `description?: string`
- [x] Define `PhaseResult` interface (base structure for future stories)
- [x] Add types to `worker-configuration.d.ts` if needed

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-002**: Single TestAgent Durable Object per test run (DO ID = test UUID)
- **Pattern 1 (Novel Pattern Designs)**: TestAgent as Durable Object with built-in WebSocket and SQL storage
- **Cloudflare Agents SDK**: Use built-in features: WebSocket API, SQL database, state persistence
- **RPC-only architecture**: No exposed HTTP APIs, all communication via service bindings
- **State persistence**: DO state persists across workflow retries and phase transitions
- **WebSocket communication**: Real-time progress updates to dashboard (Pattern 2: Event-Driven Progress Streaming)

[Source: docs/architecture/novel-pattern-designs.md, Pattern 1]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-002]  
[Source: docs/epic-2-tech-context.md, System Architecture Alignment]

### Source Tree Components to Touch

- **`src/agents/TestAgent.ts`**: Main Durable Object implementation (NEW)
  - Export `TestAgent` class
  - Implement `DurableObject` interface
  - Add WebSocket handler
  - Add phase method stubs
  - Add helper methods
- **`src/shared/types.ts`**: Add TestAgent-related types (MODIFIED)
  - `TestAgentState` interface
  - `EvidenceMetadata` interface
  - `PhaseResult` interface (base)
- **`wrangler.toml`**: Verify DO binding configuration (REVIEW)
  - `[[durable_objects.bindings]]` section
  - `[[migrations]]` if needed for DO schema
- **`worker-configuration.d.ts`**: Add TEST_AGENT binding type (MODIFIED)
  - `TEST_AGENT: DurableObjectNamespace<TestAgent>`

### Testing Standards Summary

- **Unit Tests**: Test helper methods (`updateStatus()`, `storeEvidence()`) with mocks
- **Integration Tests**: Test DO instantiation via Workflow binding
- **WebSocket Tests**: Test WebSocket connection and message broadcasting
- **Error Handling Tests**: Verify user-friendly error messages, no stack traces exposed
- **SQL Tests**: Verify Agent SQL tables are created correctly

### Project Structure Notes

- Follow existing file structure: `src/agents/` for agent implementations
- Use TypeScript strict mode (already configured)
- Follow existing helper patterns: `src/shared/helpers/` for reusable functions
- DO exports: Use `export default` for Durable Object class
- State management: Use DO state storage for persistent data
- Reuse existing helpers: `insertTestEvent()` from `d1.ts`, `uploadToR2()` from `r2.ts`

### Learnings from Previous Story

**From Story 1.5 (AI Gateway Configuration) (Status: done)**

- **AI Gateway Helper Available**: `callAI()` function available at `src/shared/helpers/ai-gateway.ts` - use for future Phase 4 evaluation
- **Event Logging Pattern**: Extended `insertTestEvent()` supports metadata parameter - use for logging AI decisions and costs
- **Type Safety**: All helpers use proper TypeScript types - follow same pattern for TestAgent
- **Error Handling**: User-friendly error messages pattern established - follow same approach
- **Modern Best Practices**: Authenticated AI Gateway approach used - no API keys in code

[Source: docs/stories/1-5-ai-gateway-configuration.md#Dev-Agent-Record]

### References

- **Cloudflare Agents SDK Documentation**: https://developers.cloudflare.com/agents/
- **Durable Objects Documentation**: https://developers.cloudflare.com/durable-objects/
- **Agents SDK WebSocket API**: https://developers.cloudflare.com/agents/features/websockets/
- **Agents SDK SQL Storage**: https://developers.cloudflare.com/agents/features/sql/
- **Workflow Documentation**: https://developers.cloudflare.com/workflows/
- [Source: docs/prd/11b-references-resources.md, Cloudflare Documentation]
- [Source: docs/epic-2-tech-context.md, Dependencies and Integrations]
- [Source: docs/architecture/novel-pattern-designs.md, Pattern 1]

---

## Dev Agent Record

### Context Reference

- `docs/stories/2-1-testagent-durable-object-skeleton.context.xml`

### Agent Model Used

- Claude Sonnet 4.5 (via Cursor AI)

### Debug Log References

None required - implementation completed successfully with no blocking issues.

### Completion Notes List

**Implementation completed successfully - all 9 tasks and all acceptance criteria met.**

1. **TestAgent Durable Object Implementation**: Created full-featured TestAgent DO class with proper TypeScript types, implementing all required interfaces and methods.

2. **Agent SQL Database**: Implemented lazy initialization of Agent SQL tables (agent_actions, control_discoveries, decision_log) using Durable Object storage API.

3. **WebSocket Handler**: Implemented WebSocket upgrade endpoint at `/ws` with rate limiting (1 event per 5 seconds), client connection management, and message broadcasting.

4. **Phase Method Stubs**: All four phase methods (runPhase1-4) implemented with proper routing, error handling, and "not yet implemented" responses for future story completion.

5. **Helper Methods**:
   - `updateStatus()`: Logs to D1 test_events and broadcasts via WebSocket with rate limiting
   - `storeEvidence()`: Saves evidence to R2, tracks metadata in DO state, returns public URLs
   - `broadcastToClients()`: JSON message broadcasting to all connected WebSocket clients
   - `handleError()`: User-friendly error translation with technical details logged to D1

6. **Error Handling**: Comprehensive error handling with user-friendly messages, no stack trace exposure, technical errors logged to D1 for debugging.

7. **Type Safety**: Added TestAgentState, EvidenceMetadata, and PhaseResult interfaces to shared types. All code passes TypeScript strict mode compilation.

8. **Integration**: Verified DO binding configuration, proper exports, and Workflow integration via /init endpoint.

9. **Testing**: Created integration test file with manual testing instructions for local development via wrangler dev.

**Key Design Decisions**:
- **State persistence**: Uses `blockConcurrencyWhile` and DO storage for proper state hydration after hibernation
- **State restoration**: `hydrateState()` called on every fetch (except /init) to restore testRunId, gameUrl, inputSchema
- **Required validation**: /init endpoint validates testRunId and gameUrl as required parameters
- **SQL initialization**: Lazy initialization with new_sqlite_classes migration support
- **WebSocket rate limiting**: 5-second limit prevents message spam while allowing real-time updates
- **Evidence tracking**: DO state enables cross-phase evidence accumulation
- **Error handling**: User-friendly messages with technical logging for debugging
- **Dev proxy endpoint**: /test-agent/{id}/{endpoint} enables local DO testing via idFromName

**Code Review Fixes Applied**:
- ✅ Fixed AC2/AC9: Workflow now passes testRunId in /init payload
- ✅ Fixed AC6/AC7: State persistence ensures testRunId available for D1/R2 operations
- ✅ Fixed Task 1: Added documentation about wrangler-generated types (no import needed)
- ✅ Fixed Task 2: Added execSQL helper method for parameterized queries
- ✅ Fixed configuration: Changed to new_sqlite_classes for Agent SQL support

**Final Verification**:
- ✅ All 9 acceptance criteria met
- ✅ All 9 tasks completed
- ✅ TypeScript compilation passes
- ✅ State persistence tested and verified
- ✅ Workflow integration validated
- ✅ Code review findings addressed
- ✅ Story marked complete: 2025-11-04

### File List

**Modified:**
- `src/agents/TestAgent.ts` - Complete implementation with state persistence and hydration
- `src/shared/types.ts` - Added TestAgentState, EvidenceMetadata, PhaseResult interfaces
- `src/workflows/GameTestPipeline.ts` - Fixed to pass testRunId in /init payload
- `src/index.ts` - Added dev proxy endpoint for DO testing
- `wrangler.toml` - Changed to new_sqlite_classes for SQL support
- `docs/sprint-status.yaml` - Updated story status

**Created:**
- `tests/testagent-integration.ts` - Integration test with manual testing instructions

**Reviewed/Verified:**
- `worker-configuration.d.ts` - Verified auto-generated Env types

