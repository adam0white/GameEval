# Story 2.2: Browser Rendering Integration and Stagehand Setup

**Story ID:** 2.2  
**Epic:** Epic 2 - AI Test Agent & Browser Automation  
**Status:** ready-for-dev  
**Created:** 2025-01-27  

---

## Story

**As a** developer,  
**I want** Stagehand integrated with Cloudflare Browser Rendering,  
**So that** the TestAgent can control a browser session.

---

## Business Context

Story 2.2 integrates Stagehand with Cloudflare Browser Rendering to enable browser automation within the TestAgent Durable Object. This story builds on Story 2.1's TestAgent foundation to add browser session management, console log capture, network monitoring, and screenshot capabilities. The browser session will persist across phases 1-3, maintaining game state and enabling efficient test execution.

**Value:** Enables the TestAgent to interact with browser games, capture evidence, and prepare for autonomous gameplay exploration in subsequent stories. Without browser integration, the TestAgent cannot validate game loading, discover controls, or execute gameplay.

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.2]  
[Source: docs/epic-2-tech-context.md, Services and Modules section]  
[Source: docs/architecture/novel-pattern-designs.md, Pattern 1]

---

## Acceptance Criteria

1. **Browser Rendering service binding configured**: TestAgent DO has access to `env.BROWSER` binding for Browser Rendering service
2. **Stagehand library initialized**: Stagehand instance created with Browser Rendering connection and configured for Computer Use mode
3. **Helper method `launchBrowser()`**: Creates browser session, configures viewport and user agent, returns Stagehand instance
4. **Browser session persists in DO state**: Browser session handle stored in DO state and reused across phases 1-3
5. **Helper method `closeBrowser()`**: Cleanly terminates browser session, releases resources
6. **Browser configuration**: Headless mode enabled, viewport 1280x720, user agent string set to 'GameEval TestAgent/1.0'
7. **Console log capture enabled**: Console logs from browser session streamed to DO state, accumulated in memory
8. **Network request monitoring enabled**: Failed network requests (status >= 400 or connection failures) tracked in DO state
9. **Screenshot capture function**: `captureScreenshot(description: string)` method saves screenshots to R2 using existing helper functions

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.2 Acceptance Criteria]  
[Source: docs/epic-2-tech-context.md, Acceptance Criteria section]  
[Source: docs/architecture/technology-stack-details.md, Browser Automation section]

---

## Tasks / Subtasks

### Task 1: Configure Browser Rendering Service Binding (AC: 1)

- [ ] Verify `BROWSER` binding in `wrangler.toml`:
  - `[[browser_rendering.bindings]]` with `name = "BROWSER"`
- [ ] Add `BROWSER` binding type to `worker-configuration.d.ts`:
  - `BROWSER: BrowserRenderingService`
- [ ] Verify binding accessible in TestAgent constructor via `env.BROWSER`
- [ ] Test binding access in TestAgent (log binding availability)

### Task 2: Install and Initialize Stagehand Library (AC: 2)

- [ ] Install Stagehand package: `npm install stagehand`
- [ ] Import Stagehand in `src/agents/TestAgent.ts`:
  - `import { Stagehand } from 'stagehand'`
- [ ] Add instance property: `browserSession?: BrowserSession` to store browser session
- [ ] Add instance property: `stagehand?: Stagehand` to store Stagehand instance
- [ ] Configure Stagehand initialization options:
  - `mode: 'computer-use'` for autonomous gameplay
  - `model: 'gpt-4o'` or via AI Gateway (reference to Story 2.5 for Computer Use mode)

### Task 3: Implement `launchBrowser()` Helper Method (AC: 3, 6)

- [ ] Create `launchBrowser(): Promise<Stagehand>` method
- [ ] Launch browser using `env.BROWSER.launch()`:
  - `headless: true`
  - `viewport: { width: 1280, height: 720 }`
  - `userAgent: 'GameEval TestAgent/1.0'`
- [ ] Create new page: `const page = await browser.newPage()`
- [ ] Initialize Stagehand with page:
  - `const stagehand = new Stagehand(page, { mode: 'computer-use', model: 'gpt-4o' })`
- [ ] Store browser session handle in DO state:
  - `this.state.storage.put('browserSession', { handle: browserSessionHandle, createdAt: Date.now() })`
- [ ] Store Stagehand instance in instance property: `this.stagehand = stagehand`
- [ ] Return Stagehand instance
- [ ] Handle errors gracefully (return user-friendly error message)

### Task 4: Implement Browser Session Persistence (AC: 4)

- [ ] Check for existing browser session in DO state before launching:
  - `const existingSession = await this.state.storage.get('browserSession')`
- [ ] If session exists and is valid, reuse it:
  - Retrieve browser session handle from state
  - Reinitialize Stagehand with existing session
  - Return existing Stagehand instance
- [ ] If session doesn't exist or is invalid, create new session:
  - Call `launchBrowser()` to create new session
- [ ] Store session metadata in DO state:
  - `browserSession: { handle: string, createdAt: number, lastUsed: number }`
- [ ] Update `lastUsed` timestamp on each phase access

### Task 5: Implement `closeBrowser()` Helper Method (AC: 5)

- [ ] Create `closeBrowser(): Promise<void>` method
- [ ] Check if browser session exists:
  - If no session, return early (no-op)
- [ ] Close browser session:
  - `await browser.close()` or equivalent cleanup
- [ ] Clear browser session from DO state:
  - `await this.state.storage.delete('browserSession')`
- [ ] Clear Stagehand instance: `this.stagehand = undefined`
- [ ] Clear browser session instance property: `this.browserSession = undefined`
- [ ] Handle errors gracefully (log but don't throw)

### Task 6: Enable Console Log Capture (AC: 7)

- [ ] Set up console log listener in `launchBrowser()`:
  - `page.on('console', (msg) => { ... })`
- [ ] Capture console messages:
  - Log level: `log`, `warn`, `error`, `info`, `debug`
  - Message text and timestamp
- [ ] Store console logs in DO state:
  - Array: `consoleLogs: Array<{ timestamp: number, level: string, text: string }>`
- [ ] Accumulate logs in memory during phases 1-3
- [ ] Add helper method: `addConsoleLog(level: string, text: string): void`
- [ ] Note: Console logs will be flushed to R2 at end of Phase 3 (Story 2.5)

### Task 7: Enable Network Request Monitoring (AC: 8)

- [ ] Set up network request listener in `launchBrowser()`:
  - `page.on('requestfailed', (request) => { ... })`
  - `page.on('response', (response) => { ... })`
- [ ] Track failed requests:
  - Status code >= 400
  - Connection failures (requestfailed event)
  - URL, status code, error message
- [ ] Store network errors in DO state:
  - Array: `networkErrors: Array<{ timestamp: number, url: string, status?: number, error: string }>`
- [ ] Add helper method: `addNetworkError(url: string, status?: number, error: string): void`
- [ ] Note: Network errors will be included in Phase 4 evaluation (Story 2.6)

### Task 8: Implement `captureScreenshot()` Method (AC: 9)

- [ ] Create `captureScreenshot(description: string): Promise<string>` method
- [ ] Verify browser session exists:
  - If no session, throw error: "Browser session not initialized"
- [ ] Take screenshot using browser session:
  - `const screenshotBuffer = await page.screenshot({ type: 'png', fullPage: false })`
- [ ] Save screenshot to R2 using existing helper:
  - Use `uploadScreenshot()` from `src/shared/helpers/r2.ts`
  - Parameters: `testId: this.testRunId`, `phase: currentPhase`, `action: description`, `buffer: screenshotBuffer`
- [ ] Return R2 object key or public URL
- [ ] Track screenshot in DO state:
  - Add to `evidence.screenshots` array with metadata
- [ ] Handle errors gracefully (return user-friendly error message)

### Task 9: Update TypeScript Types and Interfaces

- [ ] Add browser session types to `src/shared/types.ts`:
  - `BrowserSessionHandle` interface (if needed)
  - `ConsoleLogEntry` interface: `{ timestamp: number, level: string, text: string }`
  - `NetworkError` interface: `{ timestamp: number, url: string, status?: number, error: string }`
- [ ] Update `TestAgentState` interface:
  - `browserSession?: { handle: string, createdAt: number, lastUsed: number }`
  - `consoleLogs: ConsoleLogEntry[]`
  - `networkErrors: NetworkError[]`
- [ ] Add Stagehand types import if available:
  - `import type { Stagehand } from 'stagehand'`

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-002**: Single TestAgent Durable Object per test run (DO ID = test UUID)
- **Pattern 1 (Novel Pattern Designs)**: Browser session persists in DO state across phases 1-3
- **Browser Rendering Service**: Serverless browser sessions via Cloudflare Browser Rendering service
- **Stagehand Documentation**: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
- **RPC-only architecture**: No exposed HTTP APIs, all communication via service bindings
- **State persistence**: Browser session handle stored in DO state, survives workflow retries

[Source: docs/architecture/novel-pattern-designs.md, Pattern 1]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-002]  
[Source: docs/epic-2-tech-context.md, System Architecture Alignment]  
[Source: docs/prd/6-technical-architecture.md, Stagehand Integration]

### Source Tree Components to Touch

- **`src/agents/TestAgent.ts`**: Add browser session management methods (MODIFIED)
  - `launchBrowser()` method
  - `closeBrowser()` method
  - `captureScreenshot()` method
  - Console log and network error listeners
  - Browser session persistence logic
- **`src/shared/types.ts`**: Add browser-related types (MODIFIED)
  - `ConsoleLogEntry` interface
  - `NetworkError` interface
  - Update `TestAgentState` interface
- **`wrangler.toml`**: Verify Browser Rendering binding configuration (REVIEW)
  - `[[browser_rendering.bindings]]` section
- **`worker-configuration.d.ts`**: Add BROWSER binding type (MODIFIED)
  - `BROWSER: BrowserRenderingService`
- **`package.json`**: Add Stagehand dependency (MODIFIED)
  - `"stagehand": "latest"` in dependencies

### Testing Standards Summary

- **Integration Tests**: Test browser session launch and Stagehand initialization
- **Persistence Tests**: Verify browser session persists across phase calls
- **Console Log Tests**: Navigate to page with console.log(), verify logs captured
- **Network Error Tests**: Navigate to page with failed request (404), verify error tracked
- **Screenshot Tests**: Call `captureScreenshot()`, verify screenshot saved to R2
- **Error Handling Tests**: Verify user-friendly error messages, no stack traces exposed

### Project Structure Notes

- Follow existing file structure: `src/agents/` for agent implementations
- Use TypeScript strict mode (already configured)
- Reuse existing helpers: `uploadScreenshot()` from `src/shared/helpers/r2.ts`
- Browser session stored in DO state for persistence across phases
- Console logs accumulated in memory, flushed to R2 at end of Phase 3 (Story 2.5)
- Network errors tracked in DO state, included in Phase 4 evaluation (Story 2.6)

### Learnings from Previous Story

**From Story 2.1 (TestAgent Durable Object Skeleton) (Status: in-progress)**

- **TestAgent Structure**: TestAgent class exists at `src/agents/TestAgent.ts` with DO foundation - add browser methods to this class
- **DO State Management**: Use `this.state.storage` for persistent browser session storage
- **Helper Method Pattern**: Follow pattern established by `updateStatus()` and `storeEvidence()` for new helper methods
- **R2 Helper Functions**: `uploadScreenshot()` function available at `src/shared/helpers/r2.ts` - use for screenshot storage
- **Error Handling Pattern**: User-friendly error messages pattern established - follow same approach
- **Type Safety**: All helpers use proper TypeScript types - follow same pattern for browser-related types

[Source: docs/stories/2-1-testagent-durable-object-skeleton.md#Dev-Agent-Record]

### References

- **Cloudflare Browser Rendering Documentation**: https://developers.cloudflare.com/browser-rendering/
- **Stagehand Documentation**: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
- **Stagehand Computer Use Guide**: https://docs.stagehand.dev/v3/best-practices/computer-use
- [Source: docs/prd/11b-references-resources.md, Cloudflare Documentation]  
[Source: docs/epic-2-tech-context.md, Dependencies and Integrations]  
[Source: docs/architecture/technology-stack-details.md, Browser Automation]

---

## Dev Agent Record

### Context Reference

- `docs/stories/2-2-browser-rendering-integration-and-stagehand-setup.context.xml`

### Agent Model Used

<!-- Will be filled by dev agent during implementation -->

### Debug Log References

<!-- Will be filled by dev agent during implementation -->

### Completion Notes List

<!-- Will be filled by dev agent during implementation -->

### File List

<!-- Will be filled by dev agent during implementation -->

