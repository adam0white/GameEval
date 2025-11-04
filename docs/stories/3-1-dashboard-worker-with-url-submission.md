# Story 3.1: Dashboard Worker with URL Submission

Status: ready-for-dev

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

- [ ] Create `src/workers/dashboard.ts` file
- [ ] Implement Worker export default with `fetch(request: Request, env: Env): Promise<Response>` handler
- [ ] Route root path (`/`) to serve HTML page
- [ ] Route `/rpc/submitTest` POST requests to `submitTest()` RPC method handler
- [ ] Return appropriate Content-Type headers (text/html for page, application/json for RPC)

### Task 2: Implement Inline HTML/CSS/JS (AC: 2)

- [ ] Create `getHTML()` function that returns complete HTML document with embedded CSS and JavaScript
- [ ] Include HTML structure: `<html>`, `<head>`, `<body>` with proper meta tags
- [ ] Embed CSS styles in `<style>` tag (Cloudflare design patterns: orange accents, monospace fonts)
- [ ] Embed JavaScript in `<script>` tag for form handling and RPC calls
- [ ] Verify no external assets referenced (all inline)
- [ ] Test HTML renders correctly in browser

### Task 3: Implement UI Following Cloudflare Design Patterns (AC: 3)

- [ ] Apply orange accent color (#FF6B35 or Cloudflare orange) to primary buttons and highlights
- [ ] Use monospace font family (Courier New, Monaco, monospace) for URLs and technical data
- [ ] Create clean, minimal layout with adequate spacing and clear hierarchy
- [ ] Ensure UI is professional and matches Cloudflare aesthetic
- [ ] Test visual design matches requirements

### Task 4: Add Header with Title and Tagline (AC: 4)

- [ ] Add header section to HTML with "GameEval QA Pipeline" as main title
- [ ] Add tagline below title (e.g., "Autonomous Browser Game QA Testing")
- [ ] Style header with appropriate typography and spacing
- [ ] Ensure header is visible and prominent

### Task 5: Create URL Submission Form (AC: 5)

- [ ] Create HTML form with:
  - Game URL input field (type="url" or text with validation)
  - Input Schema textarea (optional, labeled as "Input Schema (JSON)")
  - Submit button
- [ ] Add labels and placeholders for clarity
- [ ] Style form with appropriate spacing and layout
- [ ] Ensure form is accessible (proper labels, ARIA attributes if needed)

### Task 6: Implement Submit Button RPC Call (AC: 6)

- [ ] Add event listener to submit button (prevent default form submission)
- [ ] Extract form values: `gameUrl` and `inputSchema` (if provided)
- [ ] Call `POST /rpc/submitTest` with JSON body: `{ gameUrl, inputSchema }`
- [ ] Handle response and display result to user
- [ ] Show loading state while request is processing
- [ ] Handle errors gracefully with user-friendly messages

### Task 7: Implement submitTest RPC Method (AC: 7)

- [ ] Create `submitTest(env: Env, gameUrl: string, inputSchema?: string): Promise<SubmitTestResponse>` method
- [ ] Validate gameUrl format (must be HTTP/HTTPS)
- [ ] Validate inputSchema if provided (must be valid JSON)
- [ ] Generate testRunId using `crypto.randomUUID()`
- [ ] Trigger Workflow via service binding: `await env.WORKFLOW.create().run({ testRunId, gameUrl, inputSchema: inputSchema || undefined })`
- [ ] Return `{ testId: testRunId }` response
- [ ] Handle Workflow trigger errors and return user-friendly error messages

### Task 8: Implement Form Validation (AC: 8)

- [ ] Add client-side validation for URL format (HTTP/HTTPS regex pattern)
- [ ] Add client-side validation for JSON schema format (if provided, attempt JSON.parse)
- [ ] Display validation error messages inline near form fields
- [ ] Prevent form submission if validation fails
- [ ] Add server-side validation in `submitTest()` method (re-validate inputs)
- [ ] Return validation error messages that are user-friendly

### Task 9: Implement Responsive Layout (AC: 9)

- [ ] Add CSS media queries for desktop viewport (min-width: 768px recommended)
- [ ] Ensure layout is readable and functional on desktop (1920x1080, 1366x768)
- [ ] Test layout on common desktop resolutions
- [ ] Note: Mobile optimization deferred to post-MVP (acceptable for this story)

### Task 10: Add Testing

- [ ] Test Dashboard Worker serves HTML correctly at root path
- [ ] Test form validation (invalid URL, invalid JSON)
- [ ] Test submitTest RPC method with valid inputs
- [ ] Test Workflow trigger integration
- [ ] Test error handling (Workflow trigger fails, invalid inputs)
- [ ] Test UI displays correctly in browser

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
