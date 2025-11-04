# Consistency Rules

## Naming Conventions

**Database (D1):**
- **Tables**: snake_case, plural
  - ✅ `test_runs`, `evaluation_scores`, `test_events`
  - ❌ `TestRuns`, `EvaluationScore`
- **Columns**: snake_case
  - ✅ `test_run_id`, `created_at`, `overall_score`
  - ❌ `testRunId`, `createdAt`
- **Foreign keys**: `{table_singular}_id`
  - ✅ `test_run_id`
  - ❌ `testRunId`, `test_id`

**TypeScript:**
- **Interfaces**: PascalCase, descriptive
  - ✅ `TestProgressEvent`, `PhaseResult`
- **Variables**: camelCase
  - ✅ `testRunId`, `browserSession`
- **Constants**: SCREAMING_SNAKE_CASE
  - ✅ `MAX_PHASE_DURATION`, `DEFAULT_TIMEOUT`
- **Functions**: camelCase, verb-first
  - ✅ `runPhase1()`, `captureScreenshot()`, `updateStatus()`

**R2 Storage:**
- **Paths**: lowercase, hyphen-separated
  - ✅ `tests/{test-id}/screenshots/{timestamp}-phase1-initial-load.png`
  - ❌ `Tests/{TestId}/Screenshots/...`
- **Timestamps**: ISO 8601 or Unix milliseconds
  - ✅ `1699104823456-phase3-gameplay.png`

## Code Organization

**Imports:**
```typescript
// External dependencies first
import { DurableObject } from "@cloudflare/workers-types";

// Shared types and helpers
import { TestProgressEvent, PhaseResult } from "../shared/types";
import { uploadScreenshot } from "../shared/helpers/r2";

// Local imports last
import { validateGameUrl } from "./validation";
```

**Error Handling:**
- **User-facing errors**: Use `UserFriendlyError` class
  ```typescript
  throw new UserFriendlyError(
    "The game URL could not be accessed. Please check the URL is correct.",
    originalError
  );
  ```
- **Internal errors**: Log full details to D1 `test_events`, show friendly message to user
- **Never expose**: Stack traces, internal error codes, infrastructure details

**Logging Strategy:**
- **Test events**: Log all significant actions to D1 `test_events` table
  ```typescript
  await logTestEvent(testRunId, "phase2", "control_discovered", "Found 8 interactive elements");
  ```
- **AI decisions**: Log to Agent SQL database
  ```typescript
  await this.state.sql.exec(
    "INSERT INTO decision_log (timestamp, decision, reasoning) VALUES (?, ?, ?)",
    [Date.now(), "click-play-button", "Detected game requires interaction to start"]
  );
  ```
- **Console logs**: Captured from browser session, stored in R2
- **Observability**: Workers Observability enabled for all Workers and DO

## Error Handling

**Strategy: Workflow Auto-Retry + TestAgent Awareness**

**Workflow Level:**
- Automatic retry with exponential backoff (2 retries per phase)
- Timeout enforcement per phase
- Maximum workflow duration: 6 minutes

**TestAgent Level:**
- Receives error context from workflow
- Tries alternative strategies on retry:
  - Example: If control discovery fails, use inputSchema if provided
  - Example: If clicking fails, try keyboard navigation
- Graceful degradation: Continue to next phase with partial data
- All errors translated to user-friendly messages

**Example Flow:**
```typescript
// Workflow retry logic (automatic)
try {
  await testAgent.fetch("/phase2");
} catch (error) {
  // Workflow retries automatically
  // TestAgent receives error context on next attempt
  await testAgent.fetch("/retry-context", {
    body: JSON.stringify({ phase: "phase2", error: error.message })
  });
  // Retry attempt 2...
}

// TestAgent adaptive strategy
async runPhase2Retry(errorContext: string): Promise<PhaseResult> {
  if (errorContext.includes("control discovery failed")) {
    // Try alternative: use inputSchema if provided
    if (this.inputSchema) {
      return await this.discoverControlsFromSchema();
    }
  }
  // ... other adaptive strategies
}
```

## Logging Strategy

**Test Execution Logging:**
- **D1 test_events**: All significant actions and phase transitions
  - Phase starts/completes
  - Control discoveries
  - Error occurrences
  - AI model used
- **Agent SQL**: Per-test reasoning and decisions
  - AI decision log: timestamp, decision, reasoning, outcome
  - Action history: clicks, keyboard inputs, scrolling
  - Control discoveries: element selectors, action types
- **R2 Logs**: Evidence files
  - `console.log`: Browser console output
  - `network.log`: Failed network requests
  - `agent-decisions.log`: AI model prompts and responses

**Game-Specific Logging:**
- **Dynamic based on game**: AI agent decides what's relevant
- **Console errors**: Always captured if present
- **Network failures**: Logged if status >= 400
- **Performance issues**: Noted in evaluation if detected

**Workers Observability:**
```toml
# wrangler.toml
[observability]
enabled = true
head_sampling_rate = 1  # 100% sampling for all requests
```
