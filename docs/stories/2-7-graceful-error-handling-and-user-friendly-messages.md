# Story 2.7: Graceful Error Handling and User-Friendly Messages

Status: ready-for-dev

## Story

As a TestAgent,
I want to handle all failures gracefully with helpful error messages,
so that users understand what went wrong without seeing stack traces.

## Business Context

Story 2.7 implements comprehensive error handling across all TestAgent phases, ensuring that technical failures are translated into user-friendly messages that guide users toward resolution. This story builds on the error handling foundation from Story 2.1, extending it to all phases (2.3-2.6) with phase-specific error translation, graceful degradation strategies, and consistent error message patterns.

The story ensures that regardless of where failures occur (Phase 1-4), users receive actionable feedback instead of technical stack traces. When phases fail, the TestAgent and Workflow coordinate to skip ahead with partial evidence or provide limited evaluation, ensuring users always receive some feedback on their game.

**Value:** Enables users to understand test failures and take corrective action. Without graceful error handling, users would see cryptic technical errors that don't help them improve their games or diagnose issues. Error handling ensures the TestAgent provides value even when tests partially fail.

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.7]  
[Source: docs/epic-2-tech-context.md, Error Handling Flow section]  
[Source: docs/architecture/consistency-rules.md, Error Handling section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.5 Error Handling & Agent Resilience]

## Acceptance Criteria

1. **Wrap all phase methods in try-catch blocks**: All phase methods (runPhase1-4) have comprehensive try-catch error handling
2. **Translate technical errors to user-friendly messages**: Common error patterns mapped to actionable messages:
   - "Game failed to load (404)" → "The game URL could not be accessed. Please check the URL is correct."
   - "Timeout in Phase 3" → "The AI agent couldn't make progress playing the game. The game may require specific interactions we couldn't detect."
   - "AI model unavailable" → "The AI evaluation service is temporarily unavailable. Please try again in a few minutes."
3. **If Phase 1-2 fail: skip to Phase 4 with partial evidence**: Workflow and TestAgent coordinate to run Phase 4 with limited evidence (e.g., only technical errors, no screenshots)
4. **If Phase 3 fails: still run Phase 4 with whatever evidence was captured**: Phase 4 executes even if Phase 3 failed, using available screenshots, logs, and observations
5. **If Phase 4 fails: store partial results with error message**: Evaluation failure still stores available scores and justifications, with error message explaining limitation
6. **All error messages stored in test_runs table and broadcast via WebSocket**: Error messages persisted to D1 test_runs.error_message field and broadcast to dashboard clients
7. **Retry logic delegated to Workflow**: TestAgent reports failure details, Workflow decides retry (not TestAgent's responsibility)
8. **Never expose: stack traces, internal error codes, infrastructure details**: All error messages sanitized before returning to users or storing in user-facing fields

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.7 Acceptance Criteria]  
[Source: docs/epic-2-tech-context.md, Error Handling Flow section]  
[Source: docs/architecture/consistency-rules.md, Error Handling section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.5 Error Handling & Agent Resilience]

## Tasks / Subtasks

### Task 1: Enhance Error Handling in All Phase Methods (AC: 1)

- [ ] Review existing error handling in `runPhase1()` (Story 2.3):
  - Verify try-catch wrapper exists
  - Check error messages are user-friendly
  - Verify errors logged to D1 test_events
- [ ] Review existing error handling in `runPhase2()` (Story 2.4):
  - Verify try-catch wrapper exists
  - Check error messages are user-friendly
  - Verify errors logged to D1 test_events
- [ ] Review existing error handling in `runPhase3()` (Story 2.5):
  - Verify try-catch wrapper exists
  - Check error messages are user-friendly
  - Verify errors logged to D1 test_events
- [ ] Review existing error handling in `runPhase4()` (Story 2.6):
  - Verify try-catch wrapper exists
  - Check error messages are user-friendly
  - Verify errors logged to D1 test_events
- [ ] Standardize error handling pattern across all phases:
  - All phases catch errors, translate via `translateError()`, log to D1, broadcast via WebSocket
  - Return consistent error response format: `{ success: false, message: string, phase: string }`
- [ ] Add phase context to errors:
  - Include phase number in error responses
  - Include phase name in error messages (e.g., "Phase 1 (Load & Validation) failed")

### Task 2: Implement Error Translation Function (AC: 2)

- [ ] Create `translateError(error: Error, phase: string): string` helper method:
  - Map common error patterns to user-friendly messages
  - Handle phase-specific errors
  - Return actionable messages that guide users
- [ ] Implement error pattern mappings:
  - **404 errors**: "The game URL could not be accessed. Please check the URL is correct."
  - **Timeout errors**: Phase-specific messages:
    - Phase 1: "The game took too long to load. Please check if the URL is accessible."
    - Phase 2: "Control discovery timed out. The game may not have interactive elements we can detect."
    - Phase 3: "The AI agent couldn't make progress playing the game. The game may require specific interactions we couldn't detect."
    - Phase 4: "Evaluation timed out. Please try again in a few minutes."
  - **AI Gateway errors**: "The AI evaluation service is temporarily unavailable. Please try again in a few minutes."
  - **Browser errors**: "The browser session encountered an error. The test may need to be restarted."
  - **Network errors**: "Network connection error during test. Please check your internet connection."
  - **Generic errors**: "An unexpected error occurred during [phase name]. Please try again."
- [ ] Add error translation constants:
  - Create `ERROR_MESSAGES` constant object with error patterns and messages
  - Support regex patterns for flexible matching
- [ ] Log original error details to D1 test_events:
  - Store full error message, stack trace (if available), phase, timestamp
  - Use event_type: 'error' for error logging
  - Include technical details in metadata (not user-facing)
- [ ] Verify error messages never expose:
  - Stack traces
  - Internal error codes
  - Infrastructure details (e.g., "Durable Object failed", "R2 bucket error")
  - API endpoint URLs
  - Internal service names

### Task 3: Implement Graceful Degradation for Phase Failures (AC: 3, 4, 5)

- [ ] Enhance Workflow error handling (GameTestPipeline.ts):
  - Modify `executePhase()` to return phase failure status
  - Track which phases succeeded/failed
  - Decide Phase 4 execution based on available evidence
- [ ] Implement Phase 1-2 failure logic:
  - If Phase 1 fails: Skip to Phase 4 with no screenshots (only technical errors if available)
  - If Phase 2 fails: Skip to Phase 4 with Phase 1 screenshots (if available), no control discoveries
  - Set `hasPartialEvidence = true` flag when calling Phase 4
- [ ] Implement Phase 3 failure logic:
  - If Phase 3 fails: Still call Phase 4 with available evidence:
    - Screenshots from Phase 1-2 (if available)
    - Console logs captured before Phase 3 failure (if available)
    - Network errors captured before Phase 3 failure (if available)
    - No gameplay screenshots or AI decision log
  - Set `hasPartialEvidence = true` flag when calling Phase 4
- [ ] Enhance Phase 4 to handle partial evidence:
  - Modify `runPhase4()` to accept `hasPartialEvidence: boolean` parameter
  - If `hasPartialEvidence = true`:
    - Generate limited evaluation based on available evidence
    - Set metrics to "N/A" or 0 if evidence insufficient
    - Add justification: "Evaluation limited due to incomplete test execution"
  - If Phase 4 itself fails: Store partial results:
    - Store whatever scores were calculated before failure
    - Store error message in test_runs.error_message
    - Mark test_runs.status = 'failed' but preserve evidence
- [ ] Add evidence completeness tracking:
  - Track which evidence types are available: screenshots, logs, network errors
  - Log evidence completeness to test_events
  - Include in Phase 4 evaluation context

### Task 4: Store Error Messages in test_runs Table (AC: 6)

- [ ] Add error_message field to test_runs schema (if not exists):
  - Migration: `ALTER TABLE test_runs ADD COLUMN error_message TEXT`
  - Field type: TEXT (nullable)
  - Store user-friendly error message
- [ ] Update test_runs on error:
  - When any phase fails: Store error message in test_runs.error_message
  - When test completes with partial evidence: Store warning message
  - Update test_runs.status appropriately: 'failed' or 'completed_with_errors'
- [ ] Enhance error message storage:
  - Store error message on first failure
  - Update if more critical error occurs
  - Preserve error message even if test partially recovers
- [ ] Verify error message broadcast:
  - Use existing `updateStatus()` helper to broadcast errors via WebSocket
  - Include error message in broadcast payload
  - Format: `{ type: 'error', phase: string, message: string, timestamp: number }`

### Task 5: Delegate Retry Logic to Workflow (AC: 7)

- [ ] Verify TestAgent reports failures clearly:
  - Return `{ success: false, message: string, phase: string }` on error
  - Include error details for Workflow logging (not user-facing)
  - Let Workflow decide retry (don't implement retry in TestAgent)
- [ ] Review Workflow retry configuration (GameTestPipeline.ts):
  - Verify automatic retry logic exists (from Story 1.4)
  - Verify retry configuration: 2 retries per phase, exponential backoff
  - Verify timeout enforcement prevents infinite retries
- [ ] Ensure TestAgent receives error context on retry:
  - When Workflow retries, TestAgent should receive phase context
  - TestAgent can adapt strategy based on previous failure (optional enhancement)
- [ ] Verify Workflow handles retry exhaustion:
  - After retries exhausted, Workflow calls Phase 4 with partial evidence
  - Workflow updates test_runs.status = 'failed' after final attempt
  - Workflow logs retry exhaustion to test_events

### Task 6: Sanitize Error Messages (AC: 8)

- [ ] Create `sanitizeErrorMessage(message: string): string` helper:
  - Remove stack traces (everything after first line or after "at ")
  - Remove internal error codes (e.g., "EACCES", "ENOTFOUND")
  - Remove infrastructure details (e.g., "Durable Object", "R2 bucket", "Workflow")
  - Remove file paths (e.g., "/src/agents/TestAgent.ts:123")
  - Remove internal URLs (e.g., "http://testAgent/phase1")
- [ ] Apply sanitization to all error messages:
  - Before returning to users
  - Before storing in test_runs.error_message
  - Before broadcasting via WebSocket
- [ ] Preserve technical details in logs:
  - Full error details logged to D1 test_events (for debugging)
  - Technical details in metadata field (not user-facing)
  - Stack traces in debug logs (not exposed to users)
- [ ] Test sanitization:
  - Test with various error types (network, timeout, AI Gateway, browser)
  - Verify no stack traces in user-facing messages
  - Verify technical details preserved in logs

### Task 7: Add Error Handling Tests

- [ ] Test error translation:
  - Test each error pattern mapping (404, timeout, AI Gateway, network)
  - Verify user-friendly messages returned
  - Verify technical details logged but not exposed
- [ ] Test graceful degradation:
  - Test Phase 1 failure → Phase 4 with no evidence
  - Test Phase 2 failure → Phase 4 with Phase 1 evidence only
  - Test Phase 3 failure → Phase 4 with Phase 1-2 evidence
  - Test Phase 4 failure → Partial results stored
- [ ] Test error message storage:
  - Verify errors stored in test_runs.error_message
  - Verify errors broadcast via WebSocket
  - Verify errors logged to test_events
- [ ] Test error sanitization:
  - Test with stack traces (verify removed)
  - Test with internal codes (verify removed)
  - Test with infrastructure details (verify removed)
  - Test with file paths (verify removed)

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-003**: Workflow Auto-Retry with TestAgent Error Awareness - Workflow handles retry logic, TestAgent reports failures clearly
- **Error Handling Strategy**: Two-tier approach - Workflow handles retries and timeouts, TestAgent translates errors and provides graceful degradation
- **Graceful Degradation**: Always provide some feedback, even if test partially fails - Phase 4 runs with partial evidence when earlier phases fail
- **User-Friendly Messages**: All errors translated to actionable messages that guide users toward resolution
- **Error Message Patterns**: Consistent error message format across all phases, stored in constants for maintainability
- **Sanitization Requirements**: Never expose stack traces, internal error codes, infrastructure details, or stack traces to users

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-003]  
[Source: docs/architecture/consistency-rules.md, Error Handling section]  
[Source: docs/epic-2-tech-context.md, Error Handling Flow section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.5 Error Handling & Agent Resilience]

### Source Tree Components to Touch

- **`src/agents/TestAgent.ts`**: Enhance error handling in all phase methods (MODIFIED)
  - Add `translateError()` helper method
  - Add `sanitizeErrorMessage()` helper method
  - Add `ERROR_MESSAGES` constants
  - Enhance try-catch blocks in all phase methods
  - Add `hasPartialEvidence` parameter to `runPhase4()`
  - Enhance error logging to D1 test_events
  - Enhance error broadcasting via WebSocket
- **`src/workflows/GameTestPipeline.ts`**: Enhance error handling and graceful degradation (MODIFIED)
  - Enhance `executePhase()` to track phase failures
  - Enhance Phase 4 call to pass `hasPartialEvidence` flag
  - Add logic to skip phases when earlier phases fail
  - Ensure Phase 4 always runs (even with partial evidence)
- **`src/shared/types.ts`**: Add error-related types (MODIFIED)
  - Add `ErrorContext` interface (optional, for future enhancement)
  - Add error response type structure
- **`src/shared/constants.ts`**: Add error message constants (MODIFIED)
  - Add `ERROR_MESSAGES` constant object
  - Add error pattern regexes
- **`migrations/`: Add migration for error_message field (NEW if needed)**
  - Migration: `0005_add_error_message_to_test_runs.sql` (if field doesn't exist)

### Testing Standards Summary

- **Error Handling Tests**: Test error translation, sanitization, and graceful degradation
- **Integration Tests**: Test error handling across all phases with various failure scenarios
- **Graceful Degradation Tests**: Test Phase 4 execution with partial evidence from failed phases
- **Error Message Tests**: Verify user-friendly messages, no stack traces, technical details preserved in logs
- **Workflow Integration Tests**: Test Workflow retry logic and error coordination with TestAgent

### Project Structure Notes

- Follow existing error handling patterns from Story 2.1
- Reuse existing helpers: `updateStatus()`, `insertTestEvent()` from shared helpers
- Error constants in `src/shared/constants.ts` for maintainability
- Error translation logic centralized in TestAgent class
- Graceful degradation logic shared between Workflow and TestAgent

### Learnings from Previous Story

**From Story 2.6 (Phase 4 - Evaluation & Scoring) (Status: ready-for-dev)**

- **Error Handling Pattern**: Story 2.6 implemented error handling in `runPhase4()` - extend same pattern to all phases for consistency
- **AI Gateway Fallback**: Story 2.6 implements fallback scoring if AI Gateway fails - similar pattern can be used for error handling (fallback to technical-only evaluation)
- **Evidence Completeness**: Story 2.6 handles partial evidence in Phase 4 - extend to handle evidence from earlier phase failures
- **User-Friendly Messages**: Story 2.6 generates user-friendly error messages for AI failures - apply same approach to all error types
- **D1 Error Logging**: Story 2.6 logs errors to D1 test_events - continue this pattern for all phase errors
- **WebSocket Error Broadcasting**: Story 2.6 broadcasts errors via WebSocket - extend to all phase failures
- **Graceful Degradation**: Story 2.6 can run with partial evidence - use this capability to handle earlier phase failures

[Source: docs/stories/2-6-phase-4-evaluation-scoring.md#Dev-Agent-Record]

**From Story 2.1 (TestAgent Durable Object Skeleton) (Status: done)**

- **Error Handling Foundation**: Story 2.1 established `handleError()` helper method - enhance with error translation and sanitization
- **User-Friendly Messages**: Story 2.1 implemented basic error translation - extend with comprehensive error pattern mappings
- **WebSocket Error Broadcasting**: Story 2.1 established WebSocket broadcasting pattern - reuse for error messages
- **D1 Error Logging**: Story 2.1 logs errors to D1 test_events - continue this pattern

[Source: docs/stories/2-1-testagent-durable-object-skeleton.md#Dev-Agent-Record]

### References

- **Error Handling Best Practices**: https://developers.cloudflare.com/workers/examples/error-handling/
- **Workflow Retry Logic**: https://developers.cloudflare.com/workflows/
- **Durable Objects Error Handling**: https://developers.cloudflare.com/durable-objects/
- [Source: docs/architecture/consistency-rules.md, Error Handling section]  
[Source: docs/epic-2-tech-context.md, Error Handling Flow section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.5 Error Handling & Agent Resilience]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-003]

---

## Dev Agent Record

### Context Reference

- docs/stories/2-7-graceful-error-handling-and-user-friendly-messages.context.xml

### Agent Model Used

<!-- Will be filled by dev agent during implementation -->

### Debug Log References

<!-- Will be filled by dev agent during implementation -->

### Completion Notes List

<!-- Will be filled by dev agent during implementation -->

### File List

<!-- Will be filled by dev agent during implementation -->
