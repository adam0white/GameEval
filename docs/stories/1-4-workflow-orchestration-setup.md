# Story 1.4: Workflow Orchestration Setup

**Story ID:** 1.4  
**Epic:** Epic 1 - Core Test Infrastructure  
**Status:** ready-for-dev  
**Created:** 2025-11-04  

---

## User Story

**As a** developer,  
**I want** a Cloudflare Workflow that orchestrates the 4-phase test pipeline,  
**So that** I can coordinate TestAgent execution with retries and timeouts.

---

## Business Context

Story 1.4 establishes the workflow orchestration layer that coordinates the entire test execution pipeline. This builds on the infrastructure foundation from Stories 1.1-1.3, leveraging D1 for status tracking and TestAgent Durable Objects for execution.

The workflow serves as the central coordinator for the 4-phase test process, ensuring proper sequencing, timeout enforcement, automatic retries, and state persistence. Without this orchestration layer, test phases cannot be coordinated and the system cannot reliably execute end-to-end tests.

**Value:** Enables coordinated, reliable test execution with automatic retry and timeout management, unblocking end-to-end test pipeline implementation.

[Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.4]  
[Source: docs/architecture/technology-stack-details.md, Orchestration Layer section]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-003]

---

## Acceptance Criteria

1. **Workflow file created**: `src/workflows/GameTestPipeline.ts` implements full workflow logic
2. **Workflow accepts inputs**: `testRunId` (UUID), `gameUrl` (string), `inputSchema` (optional JSON)
3. **Workflow has 5 steps**: Launch Agent, Phase 1, Phase 2, Phase 3, Phase 4
4. **Each phase step calls TestAgent DO method** with appropriate timeout using Workflow's step API
5. **Phase 1 timeout**: 30 seconds
6. **Phase 2 timeout**: 45 seconds
7. **Phase 3 timeout**: 5 minutes (adaptive)
8. **Phase 4 timeout**: 60 seconds
9. **Workflow updates test_runs.status in D1** at each phase transition (queued → running → completed/failed)
10. **Workflow logs events to test_events table** for phase starts, completions, and errors
11. **Automatic retry logic**: 2 retries per phase with exponential backoff (using Workflow's built-in retry)
12. **Workflow catches errors and marks test as 'failed'** with user-friendly error message in D1 (no stack traces)

[Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.4 Acceptance Criteria]  
[Source: docs/architecture/novel-pattern-designs.md, Workflow Structure section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.5 Error Handling section]

---

## Tasks and Subtasks

### Task 1: Set Up Workflow Entry Point and Input Types (AC: 1, 2)
- [ ] Update `src/workflows/GameTestPipeline.ts` to extend `WorkflowEntrypoint` from `cloudflare:workers`
- [ ] Define workflow input interface:
  ```typescript
  interface GameTestPipelineInput {
    testRunId: string;  // UUID
    gameUrl: string;
    inputSchema?: string;  // Optional JSON string
  }
  ```
- [ ] Update `run()` method signature to accept `WorkflowEvent<GameTestPipelineInput>` and `WorkflowStep`
- [ ] Extract input parameters from event: `const { testRunId, gameUrl, inputSchema } = event.payload`
- [ ] Add input validation (check testRunId format, gameUrl is valid URL)
- [ ] Return error if validation fails (user-friendly message)

### Task 2: Implement Step 1 - Launch TestAgent DO (AC: 3, 4)
- [ ] Create workflow step: `launchAgentStep` using `step.waitUntil()` or `step.do()`
- [ ] Generate TestAgent DO ID from testRunId: `env.TEST_AGENT.idFromString(testRunId)`
- [ ] Get TestAgent DO instance: `env.TEST_AGENT.get(testAgentId)`
- [ ] Call TestAgent initialization endpoint: `await testAgent.fetch('/init', { method: 'POST', body: JSON.stringify({ gameUrl, inputSchema }) })`
- [ ] Update D1 status to 'running': Call `updateTestStatus(db, testRunId, 'running')`
- [ ] Log event: Call `insertTestEvent(db, testRunId, 'workflow', 'started', 'Test workflow initiated')`
- [ ] Handle errors: Catch and return user-friendly error message
- [ ] Note: TestAgent DO will be implemented in Epic 2, so this step may need to handle "not implemented" gracefully for now

### Task 3: Implement Step 2 - Phase 1: Load & Validation (AC: 4, 5, 9, 10)
- [ ] Create workflow step: `phase1Step` using `step.do()` with timeout
- [ ] Set timeout: 30 seconds (30000ms)
- [ ] Log phase start: `insertTestEvent(db, testRunId, 'phase1', 'started', 'Phase 1: Load & Validation started')`
- [ ] Call TestAgent phase1 endpoint: `await testAgent.fetch('/phase1', { method: 'POST' })`
- [ ] Handle timeout: Workflow automatically handles timeout, but catch and log user-friendly message
- [ ] On success: Log `insertTestEvent(db, testRunId, 'phase1', 'completed', 'Phase 1: Load & Validation completed')`
- [ ] On failure: Log error event with user-friendly description
- [ ] Configure retry: 2 retries with exponential backoff (Workflow's built-in retry)
- [ ] Return phase result or error

### Task 4: Implement Step 3 - Phase 2: Control Discovery (AC: 4, 6, 9, 10)
- [ ] Create workflow step: `phase2Step` using `step.do()` with timeout
- [ ] Set timeout: 45 seconds (45000ms)
- [ ] Log phase start: `insertTestEvent(db, testRunId, 'phase2', 'started', 'Phase 2: Control Discovery started')`
- [ ] Call TestAgent phase2 endpoint: `await testAgent.fetch('/phase2', { method: 'POST' })`
- [ ] Handle timeout: Catch and log user-friendly message
- [ ] On success: Log completion event
- [ ] On failure: Log error event with user-friendly description
- [ ] Configure retry: 2 retries with exponential backoff
- [ ] Return phase result or error

### Task 5: Implement Step 4 - Phase 3: Gameplay Exploration (AC: 4, 7, 9, 10)
- [ ] Create workflow step: `phase3Step` using `step.do()` with timeout
- [ ] Set timeout: 5 minutes (300000ms) - adaptive timeout as specified
- [ ] Log phase start: `insertTestEvent(db, testRunId, 'phase3', 'started', 'Phase 3: Gameplay Exploration started')`
- [ ] Call TestAgent phase3 endpoint: `await testAgent.fetch('/phase3', { method: 'POST' })`
- [ ] Handle timeout: Catch and log user-friendly message
- [ ] On success: Log completion event
- [ ] On failure: Log error event with user-friendly description
- [ ] Configure retry: 2 retries with exponential backoff
- [ ] Return phase result or error
- [ ] Note: Phase 3 is longest phase, may need special handling for partial success scenarios

### Task 6: Implement Step 5 - Phase 4: Evaluation & Scoring (AC: 4, 8, 9, 10)
- [ ] Create workflow step: `phase4Step` using `step.do()` with timeout
- [ ] Set timeout: 60 seconds (60000ms)
- [ ] Log phase start: `insertTestEvent(db, testRunId, 'phase4', 'started', 'Phase 4: Evaluation & Scoring started')`
- [ ] Call TestAgent phase4 endpoint: `await testAgent.fetch('/phase4', { method: 'POST' })`
- [ ] Handle timeout: Catch and log user-friendly message
- [ ] On success: Log completion event
- [ ] On failure: Log error event with user-friendly description
- [ ] Configure retry: 2 retries with exponential backoff
- [ ] Return phase result or error

### Task 7: Implement Error Handling and Final Status Updates (AC: 9, 10, 12)
- [ ] Wrap entire workflow in try/catch block
- [ ] On any phase failure after retries exhausted:
  - Update D1 status: `updateTestStatus(db, testRunId, 'failed')`
  - Log error event: `insertTestEvent(db, testRunId, 'workflow', 'failed', userFriendlyErrorMessage)`
  - Return error response (no stack traces, user-friendly message only)
- [ ] On successful completion of all phases:
  - Update D1 status: `updateTestStatus(db, testRunId, 'completed')`
  - Log completion event: `insertTestEvent(db, testRunId, 'workflow', 'completed', 'Test workflow completed successfully')`
  - Return success response with summary
- [ ] Create helper function: `formatUserFriendlyError(error: Error): string` to translate technical errors
- [ ] Ensure maximum workflow duration: 6 minutes end-to-end (enforced by Workflow runtime)
- [ ] Handle partial failures: If Phase 1-2 fail, still attempt Phase 4 with partial evidence (graceful degradation)

### Task 8: Configure Workflow Retry Logic and Environment Access (AC: 11)
- [ ] Research Cloudflare Workflows retry configuration:
  - Use Workflow's built-in retry mechanism (no custom implementation needed)
  - Configure exponential backoff: 2 retries per phase
  - Verify retry behavior: Workflows automatically retry failed steps
- [ ] Access environment bindings: Workflow can access `env` from `WorkflowEntrypoint` context
- [ ] Verify bindings available:
  - `env.DB` (D1 database)
  - `env.TEST_AGENT` (Durable Object binding)
- [ ] Import D1 helper functions: `import { updateTestStatus, insertTestEvent } from '../shared/helpers/d1'`
- [ ] Test workflow locally: Use `wrangler dev` with workflow testing
- [ ] Document workflow execution patterns in code comments

---

## Dev Notes

### Relevant Architecture Patterns

**Workflow Orchestration Pattern:**
- Cloudflare Workflows provide durable execution with automatic state persistence
- Each `step.do()` call is automatically persisted and retried on failure
- Steps are idempotent by design - safe to retry
- Maximum workflow duration: 6 minutes (enforced by platform)

**Error Handling Pattern:**
- All errors must be translated to user-friendly messages (no stack traces)
- Use `DbResult<T>` pattern from D1 helpers for consistent error handling
- TestAgent receives error context for adaptive retry strategies (ADR-003)
- Workflow catches and logs all errors, then marks test as 'failed' in D1

**Status Update Pattern:**
- Update `test_runs.status` at each major phase transition
- Log all phase starts, completions, and errors to `test_events` table
- Use helper functions from `src/shared/helpers/d1.ts` for consistency

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-003]  
[Source: docs/architecture/novel-pattern-designs.md, Workflow Structure section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.5 Error Handling]

### Source Tree Components

**Files to Create/Modify:**
- `src/workflows/GameTestPipeline.ts` - Implement full workflow logic (currently skeleton)
- `src/shared/helpers/d1.ts` - Already has `updateTestStatus` and `insertTestEvent` helpers (from Story 1.2)
- `src/shared/types.ts` - May need to add workflow-specific types if needed

**Files to Reference:**
- `wrangler.toml` - Workflow binding configuration (already configured)
- `docs/architecture/novel-pattern-designs.md` - Workflow structure examples
- `docs/epics/epic-1-core-test-infrastructure.md` - Story requirements

### Testing Standards

**Unit Testing:**
- Test workflow input validation
- Test error handling and user-friendly message formatting
- Mock D1 database calls and TestAgent DO calls
- Test timeout handling for each phase

**Integration Testing:**
- Test workflow execution end-to-end with real D1 database
- Test retry logic with simulated failures
- Test status updates and event logging
- Verify maximum duration enforcement (6 minutes)

**Testing Approach:**
- Use `wrangler dev` for local workflow testing
- Test with TestAgent DO skeleton (will be implemented in Epic 2)
- Verify D1 status transitions: queued → running → completed/failed
- Verify event logging captures all phase transitions

[Source: docs/architecture/consistency-rules.md, Testing Standards section]

### Project Structure Notes

- **Alignment**: Workflow follows Cloudflare Workers pattern with `WorkflowEntrypoint` class
- **Naming**: File name `GameTestPipeline.ts` matches class name `GameTestPipeline`
- **Imports**: Use relative imports from `../shared/helpers/d1` for D1 helpers
- **Exports**: Workflow class must be exported for binding in `wrangler.toml`

[Source: docs/architecture/project-structure.md, Workflows section]

### References

- **Epic Definition**: [Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.4]
- **Workflow Architecture**: [Source: docs/architecture/technology-stack-details.md, Orchestration Layer]
- **Workflow Pattern**: [Source: docs/architecture/novel-pattern-designs.md, Workflow Structure]
- **Error Handling**: [Source: docs/architecture/architecture-decision-records-adrs.md, ADR-003]
- **Phase Requirements**: [Source: docs/prd/4-functional-requirements.md, FR-2.1-FR-2.4]
- **Timeout Specifications**: [Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.4 Acceptance Criteria]
- **D1 Helpers**: [Source: src/shared/helpers/d1.ts, updateTestStatus, insertTestEvent functions]
- **Workflow Binding**: [Source: wrangler.toml, [[workflows]] section]

---

## Dev Agent Record

### Context Reference

- docs/stories/1-4-workflow-orchestration-setup.context.xml

### Agent Model Used

<!-- To be filled by dev agent during implementation -->

### Debug Log References

<!-- To be filled by dev agent during implementation -->

### Completion Notes List

<!-- To be filled by dev agent during implementation -->

### File List

<!-- To be filled by dev agent during implementation -->

