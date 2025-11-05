# Story 3.3: WebSocket Connection for Live Updates

Status: ready-for-dev

## Story

As a game developer,
I want to see real-time updates as the AI tests my game,
so that I understand what's happening without manual refresh.

## Business Context

Story 3.3 enhances the Dashboard Worker (Story 3.2) by replacing polling-based updates with real-time WebSocket connections to the TestAgent Durable Object. This story enables instant UI updates when test progress changes, eliminating the 3-second polling delay and providing a more responsive user experience. The Dashboard Worker connects to the TestAgent DO via WebSocket using RPC service bindings, forwarding progress messages from TestAgent to the frontend. When WebSocket is unavailable, the dashboard automatically falls back to polling (Story 3.2) to ensure functionality. This story implements the Event-Driven Progress Streaming pattern from the architecture, enabling real-time phase transitions, progress messages, action updates, and completion notifications.

**Value:** Provides instant feedback to users as tests execute, enabling developers to monitor test progress in real-time without waiting for polling intervals. Without this feature, users would experience a 3-second delay on every status update, significantly reducing the perceived responsiveness of the system. This story transforms the dashboard from a periodically-refreshed status display into a live-updating test monitoring interface.

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.3]  
[Source: docs/epic-3-tech-context.md, Story 3.3: WebSocket Connection for Live Updates Flow]

## Acceptance Criteria

1. **Dashboard connects to TestAgent DO via WebSocket (using Agents SDK WebSocket API)**: Dashboard Worker establishes WebSocket connection to TestAgent DO when test run is active
2. **Connection established through RPC call to Dashboard Worker: `connectToTest(testRunId)`**: Frontend calls RPC method to initiate WebSocket connection, Dashboard Worker proxies connection to TestAgent DO
3. **TestAgent broadcasts updates via WebSocket**: Phase transitions ("Starting Phase 2..."), Progress messages ("Discovering controls..."), Action updates ("Testing WASD movement"), Completion ("Test complete! Score: 78/100")
4. **Dashboard receives WebSocket messages and updates UI instantly**: Frontend receives WebSocket messages and updates test run cards without polling delay
5. **Status badge updates in real-time (no polling delay)**: Status badge colors change immediately when test status changes (queued → running → completed/failed)
6. **Progress messages shown in expandable "Live Feed" section per test**: Each test run card displays expandable live feed section showing real-time progress messages
7. **WebSocket reconnects automatically if connection drops**: Frontend implements automatic reconnection with exponential backoff if WebSocket connection fails
8. **Fallback to polling if WebSocket unavailable**: Dashboard falls back to 3-second polling (Story 3.2) if WebSocket connection cannot be established

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.3 Acceptance Criteria]  
[Source: docs/epic-3-tech-context.md, Story 3.3: WebSocket Connection for Live Updates]

## Tasks / Subtasks

### Task 1: Implement WebSocket Connection Handler in Dashboard Worker (AC: 1, 2)

- [ ] Add WebSocket upgrade route handler in `src/workers/dashboard.ts` for `/ws?testId={testRunId}` path
- [ ] Extract `testRunId` from query parameter
- [ ] Validate `testRunId` is valid UUID format
- [ ] Get TestAgent DO instance: `env.TEST_AGENT.idFromString(testRunId)` and `env.TEST_AGENT.get(testAgentId)`
- [ ] Connect to TestAgent DO WebSocket via RPC: `testAgent.fetch("https://dummy-host/ws", { headers: { Upgrade: "websocket" } })`
- [ ] Handle WebSocket upgrade response from TestAgent DO
- [ ] Create WebSocketPair for client-server connection
- [ ] Forward messages from TestAgent DO to frontend client
- [ ] Forward messages from frontend client to TestAgent DO (if needed)
- [ ] Handle WebSocket close events gracefully
- [ ] Handle WebSocket error events gracefully
- [ ] Test WebSocket connection establishes successfully
- [ ] Test WebSocket connection fails gracefully if TestAgent DO not found
- [ ] Test WebSocket connection fails gracefully if testRunId invalid

### Task 2: Add RPC Method for WebSocket Connection (AC: 2)

- [ ] Add `connectToTest(testRunId)` RPC method handler in Dashboard Worker
- [ ] Add route handler for WebSocket upgrade: `GET /ws?testId={testRunId}`
- [ ] Validate testRunId parameter
- [ ] Return WebSocket upgrade response
- [ ] Test RPC method with valid testRunId
- [ ] Test RPC method with invalid testRunId (error handling)

### Task 3: Implement Frontend WebSocket Client (AC: 4, 5, 6)

- [ ] Add JavaScript function `connectWebSocket(testRunId)` to establish WebSocket connection
- [ ] Create WebSocket connection: `new WebSocket(\`wss://${window.location.host}/ws?testId=${testRunId}\`)`
- [ ] Handle WebSocket `onopen` event: Log connection established
- [ ] Handle WebSocket `onmessage` event: Parse JSON message and update UI
- [ ] Handle WebSocket `onerror` event: Log error, fallback to polling
- [ ] Handle WebSocket `onclose` event: Attempt reconnection with exponential backoff
- [ ] Implement exponential backoff: 1s, 2s, 4s, 8s, max 30s
- [ ] Update status badge immediately when WebSocket message received (no polling delay)
- [ ] Update progress indicator immediately when phase changes
- [ ] Add expandable "Live Feed" section to test run card
- [ ] Append progress messages to live feed section as they arrive
- [ ] Format live feed messages with timestamps and styling
- [ ] Test WebSocket connection establishes successfully
- [ ] Test WebSocket messages update UI instantly
- [ ] Test status badge updates in real-time
- [ ] Test live feed displays progress messages

### Task 4: Implement WebSocket Message Parsing and UI Updates (AC: 3, 4, 5)

- [ ] Define WebSocket message format: `{ type: 'status'|'progress'|'complete', phase?: string, status?: string, message: string, timestamp: number }`
- [ ] Parse WebSocket message JSON in frontend
- [ ] Update status badge based on message type and status:
  - `type: 'status', status: 'queued'` → Gray badge
  - `type: 'status', status: 'running'` → Blue badge
  - `type: 'status', status: 'completed'` → Green badge
  - `type: 'status', status: 'failed'` → Red badge
- [ ] Update progress indicator based on phase:
  - `phase: 'phase1'` → "Phase 1/4"
  - `phase: 'phase2'` → "Phase 2/4"
  - `phase: 'phase3'` → "Phase 3/4"
  - `phase: 'phase4'` → "Phase 4/4"
- [ ] Append progress messages to live feed section
- [ ] Add CSS transitions for smooth status badge color changes
- [ ] Test status badge updates correctly for all status types
- [ ] Test progress indicator updates correctly for all phases
- [ ] Test live feed displays all message types

### Task 5: Implement Automatic WebSocket Reconnection (AC: 7)

- [ ] Track WebSocket connection state (connected/disconnected)
- [ ] Detect WebSocket close event (`onclose` handler)
- [ ] Implement reconnection logic with exponential backoff:
  - First attempt: 1 second delay
  - Second attempt: 2 seconds delay
  - Third attempt: 4 seconds delay
  - Fourth attempt: 8 seconds delay
  - Maximum delay: 30 seconds
- [ ] Limit reconnection attempts: Maximum 10 attempts
- [ ] Stop reconnection attempts if test is completed or failed
- [ ] Show reconnection indicator in UI while attempting to reconnect
- [ ] Log reconnection attempts to console (for debugging)
- [ ] Test automatic reconnection on connection drop
- [ ] Test reconnection stops after test completion
- [ ] Test reconnection stops after maximum attempts

### Task 6: Implement Polling Fallback (AC: 8)

- [ ] Detect WebSocket connection failure (cannot establish connection)
- [ ] Fallback to polling: Use `listTests()` RPC method every 3 seconds (from Story 3.2)
- [ ] Show indicator in UI when using polling fallback
- [ ] Attempt WebSocket reconnection periodically (every 30 seconds) while using polling
- [ ] Switch to WebSocket when connection successfully established
- [ ] Test fallback to polling when WebSocket unavailable
- [ ] Test switch from polling to WebSocket when connection established
- [ ] Test polling continues if WebSocket never connects

### Task 7: Add WebSocket Type Definitions (AC: 1, 2)

- [ ] Add `WebSocketMessage` interface to `src/shared/types.ts`
- [ ] Define interface with fields: `type: 'status' | 'progress' | 'complete' | 'error'`, `phase?: string`, `status?: string`, `message: string`, `timestamp: number`, `data?: any`
- [ ] Export interface for use in Dashboard Worker and frontend
- [ ] Test TypeScript compilation with new type

### Task 8: Update Test Run Card UI for Live Feed (AC: 6)

- [ ] Add expandable "Live Feed" section to test run card HTML structure
- [ ] Add CSS styles for live feed container (scrollable, max-height, background)
- [ ] Add CSS styles for live feed messages (timestamp, message text, styling)
- [ ] Add toggle button to expand/collapse live feed section
- [ ] Default state: Live feed collapsed
- [ ] On WebSocket message: Append message to live feed (if expanded)
- [ ] Auto-scroll to bottom of live feed when new messages arrive
- [ ] Test live feed displays correctly
- [ ] Test live feed expands/collapses correctly
- [ ] Test live feed auto-scrolls to bottom

### Task 9: Add Integration Testing

- [ ] Test complete flow: Submit test → WebSocket connects → Messages received → UI updates in real-time
- [ ] Test WebSocket connection for multiple concurrent tests
- [ ] Test status badge updates in real-time (no polling delay)
- [ ] Test progress messages appear in live feed
- [ ] Test WebSocket reconnection on connection drop
- [ ] Test fallback to polling if WebSocket unavailable
- [ ] Test switch from polling to WebSocket when connection established
- [ ] Test error handling (invalid testRunId, TestAgent DO not found)

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-006**: WebSocket for Real-Time Updates, Polling as Fallback - Dashboard uses Agents SDK WebSocket API for real-time updates, with 3-second polling as fallback if WebSocket unavailable. Rate limit WebSocket messages (max 1 per 5 seconds) to avoid spam.
- **Pattern 2: Event-Driven Progress Streaming (WebSocket)**: TestAgent broadcasts events during execution (phase transitions, progress updates, action updates, completion). Dashboard connects to TestAgent DO WebSocket via RPC service binding, forwards messages to frontend. Events are fire-and-forget (not queued if no listeners).
- **ADR-001**: Monorepo with RPC-Only Architecture - Dashboard Worker uses RPC service bindings exclusively, no REST API endpoints exposed. WebSocket connection established via RPC call to TestAgent DO.
- **TestAgent Durable Object WebSocket**: TestAgent DO maintains array of WebSocket clients, broadcasts messages via `broadcastToClients()` method. WebSocket connection handled in `handleWebSocket()` method (from Story 2.1).
- **WebSocket Connection Pattern**: Dashboard Worker proxies WebSocket connection to TestAgent DO. Frontend connects to Dashboard Worker WebSocket endpoint, Dashboard Worker forwards to TestAgent DO via RPC.

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-006]  
[Source: docs/architecture/novel-pattern-designs.md, Pattern 2: Event-Driven Progress Streaming (WebSocket)]  
[Source: docs/epic-3-tech-context.md, Story 3.3: WebSocket Connection for Live Updates Flow]  
[Source: docs/prd/6-technical-architecture.md, Section 6.3 Service Communication Pattern]

### Source Tree Components to Touch

- **`src/workers/dashboard.ts`**: Add WebSocket upgrade handler, add `connectToTest()` RPC method, update `getHTML()` to include WebSocket client JavaScript (MODIFIED)
  - WebSocket upgrade handler: Handle `/ws?testId={testRunId}` path, connect to TestAgent DO WebSocket via RPC, create WebSocketPair, forward messages
  - `connectToTest()` RPC method: Validate testRunId, get TestAgent DO, establish WebSocket connection
  - Frontend JavaScript: Add WebSocket client, message parsing, UI updates, reconnection logic, polling fallback
- **`src/shared/types.ts`**: Add `WebSocketMessage` interface (MODIFIED)
  - `WebSocketMessage` interface: Define structure for WebSocket messages between TestAgent and Dashboard
- **`src/agents/TestAgent.ts`**: TestAgent already has WebSocket support (`handleWebSocket()`, `broadcastToClients()`) - no changes needed (VERIFY)

### Testing Standards Summary

- **Unit Testing**: Test WebSocket upgrade handler with valid/invalid testRunId, test message parsing, test UI update logic
- **Integration Testing**: Test Dashboard Worker connects to TestAgent DO WebSocket, test messages forwarded correctly, test UI updates in real-time, test reconnection logic, test polling fallback
- **Manual Testing**: Test WebSocket connection in browser, verify messages update UI instantly, test status badge updates in real-time, test live feed displays messages, test reconnection on connection drop, test fallback to polling
- **Error Handling Tests**: Test WebSocket connection failures, test invalid testRunId, test TestAgent DO not found, test network failures during reconnection

[Source: docs/epic-3-tech-context.md, Test Strategy Summary section]

### Project Structure Notes

- Dashboard Worker follows existing project structure: `src/workers/dashboard.ts` (modify existing file from Story 3.2)
- WebSocket connection follows RPC pattern: Dashboard Worker proxies connection to TestAgent DO via service binding
- Types follow existing pattern: shared types in `src/shared/types.ts`
- TestAgent DO WebSocket already implemented (Story 2.1) - no changes needed to TestAgent
- Frontend WebSocket client inline in Dashboard Worker HTML (no separate static directory needed)

[Source: docs/architecture/project-structure.md]

### Learnings from Previous Story

**From Story 3.2 (Test Run List with Real-Time Status) (Status: ready-for-dev)**

- **Dashboard Worker Structure**: Story 3.2 extended `src/workers/dashboard.ts` with `listTests()` RPC method and test list UI - Story 3.3 should extend this existing file, not create new files
- **RPC Method Pattern**: Story 3.2 established pattern for RPC methods: route handler in `fetch()` method, separate function for business logic, error handling with `sanitizeErrorMessage()` - Story 3.3 should follow same pattern for `connectToTest()`
- **Polling Pattern**: Story 3.2 implemented polling every 3 seconds using `setInterval()` - Story 3.3 should replace polling with WebSocket but keep polling as fallback
- **Frontend JavaScript Patterns**: Story 3.2 established frontend JavaScript patterns for test list rendering, status badge updates, progress indicators - Story 3.3 should enhance these patterns with real-time WebSocket updates
- **Test Run Card Component**: Story 3.2 created test run card HTML structure and CSS styles - Story 3.3 should add "Live Feed" section to existing card structure
- **Type Definitions**: Story 3.2 added `TestRunSummary` interface to `src/shared/types.ts` - Story 3.3 should add `WebSocketMessage` interface to same file
- **Error Handling**: Story 3.2 implemented error handling for D1 queries and polling failures - Story 3.3 should implement error handling for WebSocket connection failures and reconnection attempts

[Source: docs/stories/3-2-test-run-list-with-real-time-status.md#Dev-Agent-Record]

### References

- **Cloudflare Workers WebSocket Documentation**: https://developers.cloudflare.com/workers/runtime-apis/websockets/
- **Cloudflare Durable Objects WebSocket Documentation**: https://developers.cloudflare.com/durable-objects/api/websockets/
- **MDN WebSocket API**: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- [Source: docs/architecture/architecture-decision-records-adrs.md, ADR-006]  
[Source: docs/architecture/novel-pattern-designs.md, Pattern 2: Event-Driven Progress Streaming (WebSocket)]  
[Source: docs/epic-3-tech-context.md, Story 3.3: WebSocket Connection for Live Updates Flow]  
[Source: docs/prd/4-functional-requirements.md, FR-1.3 Dashboard Real-Time Updates]  
[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.3 Technical Notes]

## Dev Agent Record

### Context Reference

- `docs/stories/3-3-websocket-connection-for-live-updates.context.xml`

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- 2025-01-27: Story drafted (Adam)

