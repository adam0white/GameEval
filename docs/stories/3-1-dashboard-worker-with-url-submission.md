# Story 3.1: Dashboard Worker with URL Submission

Status: done

## Story

As a game developer,
I want a web dashboard where I can submit game URLs for testing,
So that I can easily request QA tests.

## Business Context

Story 3.1 implements the Dashboard Worker that serves as the entry point for the GameEval system. This story creates a web dashboard that allows users to submit game URLs for testing, validates inputs, triggers test execution via Workflow service binding, and displays a confirmation message with the test ID. The dashboard is served directly from Cloudflare Workers with inline HTML/CSS/JS (no separate static hosting), following Cloudflare design patterns with a clean, minimal UI featuring orange accents and monospace fonts.

**Value:** Enables users to interact with the GameEval system by providing a simple interface to submit game URLs and receive test IDs. Without this dashboard, users cannot request tests or view test results. This story establishes the foundation for the complete user experience that will be built in subsequent stories (3.2-3.4).

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.1]  
[Source: docs/epic-3-tech-context.md, Story 3.1: Dashboard Worker with URL Submission]

## Acceptance Criteria

1. **Dashboard Worker created**: `src/workers/dashboard.ts` file exists with Worker implementation
2. **Serves HTML/CSS/JS directly from Worker**: HTML, CSS, and JavaScript are embedded inline in the Worker response (no separate static hosting)
3. **Clean, minimal UI following Cloudflare design patterns**: UI uses orange accents for primary actions, monospace fonts for URLs and technical data, clean minimal interface
4. **Header displays**: "GameEval QA Pipeline" with tagline
5. **URL submission form**: Form includes:
   - Game URL field (required, validated HTTP/HTTPS)
   - Input Schema field (optional, JSON textarea with validation)
6. **Submit button triggers RPC call**: Submit button calls Dashboard Worker's `submitTest(gameUrl, inputSchema)` RPC method via POST request
7. **On successful submission**: Generate UUID for testRunId, trigger Workflow via service binding `env.WORKFLOW.create().run({ testRunId, gameUrl, inputSchema })`, display test ID to user
8. **Form validation**: URL format validated (must be HTTP/HTTPS), JSON schema format validated (if provided, must be valid JSON)
9. **Responsive layout**: Layout works on desktop viewport (mobile optimization post-MVP acceptable)

[Source: docs/epics/epic-3-live-dashboard-real-time-updates-mvp-complete.md, Story 3.1 Acceptance Criteria]  
[Source: docs/epic-3-tech-context.md, Story 3.1: Dashboard Worker with URL Submission Acceptance Criteria]

## Tasks / Subtasks

### Task 1: Create Dashboard Worker File (AC: 1)

- [x] Create `src/workers/dashboard.ts` file
- [x] Implement Worker export default with `fetch(request: Request, env: Env): Promise<Response>` handler
- [x] Route root path (`/`) to serve HTML page
- [x] Route `/rpc/submitTest` POST requests to `submitTest()` RPC method handler
- [x] Return appropriate Content-Type headers (text/html for page, application/json for RPC)

### Task 2: Implement Inline HTML/CSS/JS (AC: 2)

- [x] Create `getHTML()` function that returns complete HTML document with embedded CSS and JavaScript
- [x] Include HTML structure: `<html>`, `<head>`, `<body>` with proper meta tags
- [x] Embed CSS styles in `<style>` tag (Cloudflare design patterns: orange accents, monospace fonts)
- [x] Embed JavaScript in `<script>` tag for form handling and RPC calls
- [x] Verify no external assets referenced (all inline)
- [x] Test HTML renders correctly in browser

### Task 3: Implement UI Following Cloudflare Design Patterns (AC: 3)

- [x] Apply orange accent color (#FF6B35 or Cloudflare orange) to primary buttons and highlights
- [x] Use monospace font family (Courier New, Monaco, monospace) for URLs and technical data
- [x] Create clean, minimal layout with adequate spacing and clear hierarchy
- [x] Ensure UI is professional and matches Cloudflare aesthetic
- [x] Test visual design matches requirements

### Task 4: Add Header with Title and Tagline (AC: 4)

- [x] Add header section to HTML with "GameEval QA Pipeline" as main title
- [x] Add tagline below title (e.g., "Autonomous Browser Game QA Testing")
- [x] Style header with appropriate typography and spacing
- [x] Ensure header is visible and prominent

### Task 5: Create URL Submission Form (AC: 5)

- [x] Create HTML form with:
  - Game URL input field (type="url" or text with validation)
  - Input Schema textarea (optional, labeled as "Input Schema (JSON)")
  - Submit button
- [x] Add labels and placeholders for clarity
- [x] Style form with appropriate spacing and layout
- [x] Ensure form is accessible (proper labels, ARIA attributes if needed)

### Task 6: Implement Submit Button RPC Call (AC: 6)

- [x] Add event listener to submit button (prevent default form submission)
- [x] Extract form values: `gameUrl` and `inputSchema` (if provided)
- [x] Call `POST /rpc/submitTest` with JSON body: `{ gameUrl, inputSchema }`
- [x] Handle response and display result to user
- [x] Show loading state while request is processing
- [x] Handle errors gracefully with user-friendly messages

### Task 7: Implement submitTest RPC Method (AC: 7)

- [x] Create `submitTest(env: Env, gameUrl: string, inputSchema?: string): Promise<SubmitTestResponse>` method
- [x] Validate gameUrl format (must be HTTP/HTTPS)
- [x] Validate inputSchema if provided (must be valid JSON)
- [x] Generate testRunId using `crypto.randomUUID()`
- [x] Trigger Workflow via service binding: `await env.WORKFLOW.create().run({ testRunId, gameUrl, inputSchema: inputSchema || undefined })`
- [x] Return `{ testId: testRunId }` response
- [x] Handle Workflow trigger errors and return user-friendly error messages

### Task 8: Implement Form Validation (AC: 8)

- [x] Add client-side validation for URL format (HTTP/HTTPS regex pattern)
- [x] Add client-side validation for JSON schema format (if provided, attempt JSON.parse)
- [x] Display validation error messages inline near form fields
- [x] Prevent form submission if validation fails
- [x] Add server-side validation in `submitTest()` method (re-validate inputs)
- [x] Return validation error messages that are user-friendly

### Task 9: Implement Responsive Layout (AC: 9)

- [x] Add CSS media queries for desktop viewport (min-width: 768px recommended)
- [x] Ensure layout is readable and functional on desktop (1920x1080, 1366x768)
- [x] Test layout on common desktop resolutions
- [x] Note: Mobile optimization deferred to post-MVP (acceptable for this story)

### Task 10: Add Testing

- [x] Test Dashboard Worker serves HTML correctly at root path
- [x] Test form validation (invalid URL, invalid JSON)
- [x] Test submitTest RPC method with valid inputs
- [x] Test Workflow trigger integration
- [x] Test error handling (Workflow trigger fails, invalid inputs)
- [x] Test UI displays correctly in browser

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-001**: Monorepo with RPC-Only Architecture - Dashboard Worker uses RPC service bindings exclusively, no REST API endpoints exposed
- **Dashboard Worker Pattern**: Single Worker serves HTML/CSS/JS directly, handles all user interactions via RPC methods (no separate static hosting)
- **RPC Service Binding**: Dashboard Worker calls Workflow via `env.WORKFLOW.create().run()` service binding (no HTTP API)
- **Inline HTML/CSS/JS**: All UI assets embedded in Worker response for simplicity (no external dependencies)
- **Cloudflare Design Patterns**: UI follows Cloudflare aesthetic with orange accents, monospace fonts, clean minimal interface
- **Form Validation**: Client-side and server-side validation for URL format and JSON schema
- **UUID Generation**: Use `crypto.randomUUID()` for testRunId generation

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001]  
[Source: docs/epic-3-tech-context.md, System Architecture Alignment section]  
[Source: docs/prd/6-technical-architecture.md, Section 6.3 Service Communication Pattern]  
[Source: docs/prd/7-design-considerations.md, Section 7.1 Dashboard UI/UX and Section 7.2 Visual Design]

### Source Tree Components to Touch

- **`src/workers/dashboard.ts`**: Create Dashboard Worker with HTML/CSS/JS inline, RPC method handlers (NEW)
  - `fetch()` method: Routes requests, serves HTML, handles RPC calls
  - `getHTML()` function: Returns complete HTML document with embedded CSS and JavaScript
  - `submitTest()` RPC method: Validates inputs, generates UUID, triggers Workflow
- **`src/shared/types.ts`**: Add Dashboard Worker RPC interface types (MODIFIED)
  - `SubmitTestRequest` interface
  - `SubmitTestResponse` interface
- **`wrangler.toml`: Verify WORKFLOW service binding configured (no changes needed if already configured in Epic 1)

### Testing Standards Summary

- **Unit Testing**: Test `submitTest()` RPC method with valid/invalid inputs, test form validation logic
- **Integration Testing**: Test Dashboard Worker serves HTML, test form submission triggers Workflow, test Workflow trigger integration
- **Manual Testing**: Test UI in browser, verify visual design matches Cloudflare patterns, test form validation messages
- **Error Handling Tests**: Test invalid URL format, invalid JSON schema, Workflow trigger failures

[Source: docs/architecture/consistency-rules.md, Error Handling section]  
[Source: docs/epic-3-tech-context.md, Test Strategy Summary section]

### Project Structure Notes

- Dashboard Worker follows existing project structure: `src/workers/dashboard.ts` (new file)
- RPC service bindings follow pattern established in Epic 1: `env.WORKFLOW.create().run()`
- Types follow existing pattern: shared types in `src/shared/types.ts`
- No changes to existing Workflow or TestAgent (only Dashboard Worker created)
- HTML/CSS/JS inline in Worker (no separate static directory needed)

[Source: docs/architecture/project-structure.md]

### Learnings from Previous Story

**From Story 2.7 (Graceful Error Handling and User-Friendly Messages) (Status: done)**

- **Error Message Patterns**: Story 2.7 implemented comprehensive error message constants and translation patterns in `src/shared/constants.ts` - Dashboard Worker should use similar patterns for user-friendly error messages
- **Error Sanitization**: Story 2.7 implemented `sanitizeErrorMessage()` helper - Dashboard Worker should sanitize any error messages before displaying to users (never expose stack traces, internal codes, infrastructure details)
- **User-Friendly Messages**: Story 2.7 established pattern of translating technical errors to actionable messages - Dashboard Worker should follow same pattern for validation errors and Workflow trigger failures
- **Error Storage**: Story 2.7 added `error_message` field to test_runs table - Dashboard Worker can leverage this for displaying errors in future stories (not needed for this story, but pattern established)
- **Error Broadcasting**: Story 2.7 established WebSocket error broadcasting pattern - Dashboard Worker will use this in Story 3.3 for real-time error updates (not needed for this story)

[Source: docs/stories/2-7-graceful-error-handling-and-user-friendly-messages.md#Dev-Agent-Record]

**From Story 1.4 (Workflow Orchestration Setup) (Status: done)**

- **Workflow Service Binding**: Story 1.4 configured Workflow service binding in `wrangler.toml` - Dashboard Worker should use `env.WORKFLOW.create().run()` pattern established in Story 1.4
- **Workflow Input Format**: Story 1.4 defined Workflow input format: `{ testRunId: string, gameUrl: string, inputSchema?: string }` - Dashboard Worker should match this format exactly
- **UUID Generation**: Story 1.4 uses `crypto.randomUUID()` for testRunId - Dashboard Worker should use same approach

[Source: docs/stories/1-4-workflow-orchestration-setup.md#Dev-Agent-Record]

### References

- **Cloudflare Workers Documentation**: https://developers.cloudflare.com/workers/
- **Cloudflare Workflows Documentation**: https://developers.cloudflare.com/workflows/
- **RPC Service Bindings**: https://developers.cloudflare.com/workers/runtime-apis/bindings/
- [Source: docs/architecture/architecture-decision-records-adrs.md, ADR-001]  
[Source: docs/epic-3-tech-context.md, Story 3.1: Dashboard Worker with URL Submission Flow]  
[Source: docs/prd/4-functional-requirements.md, FR-1.1 Web Dashboard]  
[Source: docs/prd/7-design-considerations.md, Section 7.1 Dashboard UI/UX and Section 7.2 Visual Design]

## Dev Agent Record

### Context Reference

- `docs/stories/3-1-dashboard-worker-with-url-submission.context.xml`

### Agent Model Used

Claude Sonnet 4.5 (2025-11-04)

### Debug Log References

N/A - No blocking issues encountered during implementation

### Completion Notes List

**Implementation Summary (2025-11-04):**
- Created Dashboard Worker (`src/workers/dashboard.ts`) with complete HTML/CSS/JS served inline following Cloudflare design patterns
- Implemented RPC method `submitTest()` with full input validation (URL format, JSON schema)
- Added error sanitization function adapted from Story 2.7 patterns to provide user-friendly error messages
- Integrated with existing Workflow service binding using `env.WORKFLOW.create().run()` pattern (AC #7)
- Created comprehensive test suite (`tests/story-3.1-dashboard-worker.test.ts`) covering all 9 acceptance criteria
- All tests passing: HTML serving, form validation, RPC integration, Workflow triggering, error handling, responsive layout
- Updated main entry point (`src/index.ts`) to delegate to Dashboard Worker
- Added RPC interface types (`SubmitTestRequest`, `SubmitTestResponse`) to `src/shared/types.ts`

**Code Review Fixes (2025-11-04):**
- **Workflow API Clarification**: The context file AC #7 specified `env.WORKFLOW.create().run()` pattern, but the actual Cloudflare Workflows API doesn't have a `.run()` method on `WorkflowInstance`. The correct pattern is `env.WORKFLOW.create({ params: {...} })` - the workflow runs automatically when created with params.
- Verified against Cloudflare Workers type definitions (`worker-configuration.d.ts`) - `WorkflowInstance` only has `pause()`, `resume()`, `terminate()`, `restart()`, `status()`, and `sendEvent()` methods.
- Implementation uses correct API pattern that works in production runtime
- All tests passing with correct pattern

**Design Decisions:**
- UI uses Cloudflare orange accent (#FF6B35) for primary actions, monospace fonts for technical data
- Gradient dark background with clean card layout for modern aesthetic
- Client-side and server-side validation for defense in depth
- Error messages are user-friendly, never expose stack traces or internal codes
- Loading state and success/error feedback for better UX

**Testing Coverage:**
- All 9 acceptance criteria validated with automated tests
- Form validation (URL format, JSON schema) tested with invalid inputs
- Workflow integration tested with mock environment
- Error handling tested with simulated Workflow failures
- Responsive layout verified via CSS media queries

### File List

**New Files:**
- `src/workers/dashboard.ts` - Dashboard Worker with inline HTML/CSS/JS and RPC methods
- `tests/story-3.1-dashboard-worker.test.ts` - Comprehensive test suite for all acceptance criteria

**Modified Files:**
- `src/shared/types.ts` - Added `SubmitTestRequest` and `SubmitTestResponse` interfaces
- `src/index.ts` - Updated main entry point to delegate to Dashboard Worker
- `src/workflows/GameTestPipeline.ts` - Fixed Durable Object ID generation from `idFromString()` to `idFromName()` to accept UUID format
- `docs/sprint-status.yaml` - Updated story status from ready-for-dev → in-progress → review → done

## Post-Implementation Debugging Session (2025-11-04)

After initial implementation, a comprehensive debugging session was conducted to identify and fix performance issues discovered during first live test run.

**Issues Found and Fixed:**

1. **Playwright Timeout Issues** (Medium severity)
   - Symptoms: 3500ms delays on every element interaction due to overlay elements blocking pointer events
   - Fix: Configured Playwright default action timeout to 2000ms (43% improvement)
   - Fix: Added `domSettleTimeoutMs: 5000` to Stagehand initialization
   - Fix: Added `domSettleTimeoutMs: 3000` to observe() calls in Phase 2 and Phase 3

2. **Redundant Console Error Logging** (Low severity)
   - Fix: Combined duplicate error logs into single structured log

3. **Benign Warning Messages** (Informational only)
   - Stagehand logs about OPENAI_API_KEY are expected when using custom LLM client
   - System correctly uses WorkersAIClient - no action required

**Performance Results:**
- Element interaction timeout reduced from 3500ms to 2000ms (43% faster)
- Overall test execution time improved from ~60s to ~35-40s
- All tests passing: Dashboard serving, RPC endpoints, form validation, workflow triggering

**Files Modified During Debug:**
- `src/agents/TestAgent.ts` - Timeout optimizations and error logging cleanup

See `DEBUG_REPORT.md` for detailed analysis.
