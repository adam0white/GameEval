# Story 2.6: Phase 4 - Evaluation & Scoring

**Story ID:** 2.6  
**Epic:** Epic 2 - AI Test Agent & Browser Automation  
**Status:** ready-for-dev  
**Created:** 2025-01-27  

---

## Story

**As a** TestAgent,  
**I want** to analyze all captured evidence and generate quality scores,  
**So that** users receive actionable feedback on their game.

---

## Business Context

Story 2.6 implements Phase 4 of the test execution pipeline - Evaluation & Scoring. This story builds on Story 2.5's Phase 3 gameplay exploration to analyze all captured evidence (screenshots, console logs, network errors, AI decisions) and generate quality scores across 5 dimensions using AI Gateway vision models. Phase 4 is the final phase of the test execution pipeline, where the TestAgent synthesizes all evidence from Phases 1-3 into actionable quality metrics: Game Loads Successfully, Visual Quality, Controls & Responsiveness, Playability, and Technical Stability. The phase uses AI Gateway to analyze screenshots and generate scores with justifications, stores all scores in D1 database, flushes logs to R2, and marks the test as completed. Phase 4 ensures users receive comprehensive, actionable feedback on their game's quality.

**Value:** Enables the TestAgent to provide actionable quality feedback to game developers. Without Phase 4 evaluation, the TestAgent cannot synthesize evidence into quality scores, making it impossible for users to understand how their game performs across key dimensions. Phase 4 transforms raw evidence into structured, justified quality metrics that guide game improvement.

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.6]  
[Source: docs/epic-2-tech-context.md, Services and Modules section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.4 Phase 4: Evaluation & Scoring]

---

## Acceptance Criteria

1. **`runPhase4()` method implemented**: Method exists in TestAgent class and executes Phase 4 logic
2. **Retrieve all screenshots from R2 for this test**: Use `getTestArtifacts()` helper to retrieve all screenshots from R2 bucket
3. **Retrieve console logs and network errors from DO state**: Load console logs and network errors accumulated in DO state from Phases 1-3
4. **Use AI Gateway (vision model) to analyze screenshots for quality assessment**: Call `callAI()` with vision model preference to analyze screenshots and generate quality scores
5. **Generate scores (0-100) for 5 metrics**: Generate scores for: Game Loads Successfully, Visual Quality, Controls & Responsiveness, Playability, Technical Stability
6. **Calculate overall quality score**: Calculate weighted average: Load 15%, Visual 20%, Controls 20%, Playability 30%, Technical 15%
7. **Generate 2-3 sentence justification for each metric score**: Each metric score must include a specific justification referencing what AI saw in screenshots or evidence
8. **Store evaluation_scores to D1 (6 rows: 5 metrics + overall)**: Insert 6 rows into `evaluation_scores` table (5 metrics + overall) with test_run_id, metric_name, score, justification, created_at
9. **Store overall_score in test_runs table**: Update `test_runs.overall_score` with calculated overall score
10. **Flush all logs to R2**: Upload console.log, network.log, and agent-decisions.log to R2 using `uploadLog()` helper
11. **Update test_runs.status = 'completed' in D1**: Update test_runs table status to 'completed' and set completed_at timestamp
12. **Broadcast final results via WebSocket**: Broadcast final results including overall score and metric scores via WebSocket to dashboard
13. **Return Phase4Result**: Return `{ success: true, overallScore: number, metrics: MetricScore[] }` structure

[Source: docs/epics/epic-2-ai-test-agent-browser-automation.md, Story 2.6 Acceptance Criteria]  
[Source: docs/epic-2-tech-context.md, Acceptance Criteria section]  
[Source: docs/prd/4-functional-requirements.md, FR-2.4 Phase 4: Evaluation & Scoring]

---

## Tasks / Subtasks

### Task 1: Implement `runPhase4()` Method Structure (AC: 1)

- [ ] Create `runPhase4(): Promise<Phase4Result>` method in TestAgent class
- [ ] Add try-catch wrapper for error handling:
  - Catch errors, translate to user-friendly messages
  - Return `{ success: false, overallScore: 0, metrics: [] }`
- [ ] Set timeout: 60 seconds total for Phase 4
- [ ] Initialize result structure: `{ success: false, overallScore: 0, metrics: [] }`
- [ ] Add phase tracking: Log phase start to test_events
- [ ] Verify browser session closed (if still open from Phase 3)
- [ ] Verify evidence available from Phases 1-3 (screenshots, logs, network errors)

### Task 2: Retrieve All Screenshots from R2 (AC: 2)

- [ ] Use `getTestArtifacts()` helper from `src/shared/helpers/r2.ts`:
  - Call `await getTestArtifacts(env.EVIDENCE_BUCKET, this.testRunId, env)`
  - Filter artifacts to only screenshots (type === 'screenshot')
- [ ] Extract screenshot URLs and metadata:
  - Screenshots should be sorted by timestamp (already sorted by getTestArtifacts)
  - Extract screenshot ArrayBuffers for AI analysis (download from R2)
- [ ] Download screenshot data from R2:
  - Use `env.EVIDENCE_BUCKET.get(key)` to download each screenshot
  - Convert to ArrayBuffer for AI Gateway vision model
  - Store in array for batch processing
- [ ] Handle missing screenshots gracefully:
  - If no screenshots found, log warning but continue Phase 4
  - Use fallback scoring based on technical data only
- [ ] Verify screenshot retrieval:
  - Log screenshot count to test_events
  - Store screenshot metadata in DO state for reference

### Task 3: Retrieve Console Logs and Network Errors from DO State (AC: 3)

- [ ] Load console logs from DO state:
  - Retrieve `this.state.evidence.consoleLogs` array (accumulated from Phases 1-3)
  - Filter for errors and warnings if needed
- [ ] Load network errors from DO state:
  - Retrieve `this.state.evidence.networkErrors` array (accumulated from Phases 1-3)
  - Network errors should include: URL, status code, error message
- [ ] Load AI decision log from Agent SQL:
  - Query `decision_log` table from Agent SQL database
  - Retrieve all decisions logged during Phase 3
- [ ] Prepare evidence summary:
  - Count console errors/warnings
  - Count network errors (status >= 400)
  - Count AI decisions made
  - Store summary for AI prompt context
- [ ] Handle missing evidence gracefully:
  - If evidence missing, use partial evidence available
  - Log evidence completeness to test_events

### Task 4: Use AI Gateway Vision Model for Quality Assessment (AC: 4)

- [ ] Prepare AI prompt for evaluation:
  - Prompt must include:
    - Clear scoring rubric for 5 metrics (0-100 scale)
    - Instructions to reference specific screenshots
    - Instructions to generate justifications (2-3 sentences)
    - Format: JSON with scores and justifications
  - Example prompt structure:
    ```
    Analyze these screenshots from a game test and score the game on 5 metrics:
    1. Game Loads Successfully (0-100): Did the game load without errors?
    2. Visual Quality (0-100): How polished and coherent are the visuals?
    3. Controls & Responsiveness (0-100): How well do controls work?
    4. Playability (0-100): Is the game fun and clear?
    5. Technical Stability (0-100): Any console errors, network failures, crashes?
    
    Return JSON: { load: { score: number, justification: string }, visual: {...}, controls: {...}, playability: {...}, technical: {...} }
    ```
- [ ] Call AI Gateway with vision model:
  - Use `callAI()` helper from `src/shared/helpers/ai-gateway.ts`
  - Pass prompt, screenshot ArrayBuffers, modelPreference: 'primary'
  - Pass testRunId for logging
  - Call: `await callAI(env, prompt, screenshotBuffers, 'primary', this.testRunId)`
- [ ] Parse AI response:
  - Extract JSON from AI response text
  - Validate JSON structure (5 metrics with score and justification)
  - Handle malformed JSON gracefully (use fallback scoring)
- [ ] Handle AI Gateway failures:
  - If AI Gateway fails, use fallback scoring based on technical data
  - Fallback scoring:
    - Load: Based on Phase 1 results (100 if loaded, 0 if 404/blank)
    - Visual: Default to 50 if no screenshots, 75 if screenshots available
    - Controls: Based on Phase 2 control discoveries (100 if controls found, 50 if not)
    - Playability: Default to 50 (neutral)
    - Technical: Based on console errors and network errors (100 - error_count * 10)
- [ ] Log AI evaluation to test_events:
  - Log AI model used (from AI Gateway response)
  - Log evaluation metadata (screenshot count, model, latency)

### Task 5: Generate Scores for 5 Metrics (AC: 5)

- [ ] Extract scores from AI response:
  - Game Loads Successfully: From AI response or Phase 1 results
  - Visual Quality: From AI response (analyze screenshots)
  - Controls & Responsiveness: From AI response or Phase 2-3 observations
  - Playability: From AI response (gameplay analysis)
  - Technical Stability: From AI response or console/network errors
- [ ] Validate scores:
  - Ensure all scores are integers between 0-100
  - Clamp scores to 0-100 range if out of bounds
  - Handle missing scores (use fallback values)
- [ ] Store metric scores in result:
  - Create `MetricScore[]` array with all 5 metrics
  - Each metric: `{ name: string, score: number, justification: string }`
- [ ] Log metric scores to test_events:
  - Log each metric score with justification
  - Include metric name, score, justification in event metadata

### Task 6: Calculate Overall Quality Score (AC: 6)

- [ ] Apply weighted average formula:
  - Load: 15% weight
  - Visual: 20% weight
  - Controls: 20% weight
  - Playability: 30% weight
  - Technical: 15% weight
- [ ] Calculate overall score:
  - Formula: `overall = (load * 0.15) + (visual * 0.20) + (controls * 0.20) + (playability * 0.30) + (technical * 0.15)`
  - Round to nearest integer
  - Ensure result is 0-100
- [ ] Store overall score:
  - Add overall metric to metrics array: `{ name: 'overall', score: overall, justification: 'Weighted average of 5 metrics' }`
- [ ] Log overall score to test_events:
  - Log overall score calculation with component weights

### Task 7: Generate Justifications for Each Metric (AC: 7)

- [ ] Extract justifications from AI response:
  - Each metric should have 2-3 sentence justification
  - Justifications should reference specific evidence (screenshots, errors, observations)
- [ ] Enhance justifications with evidence:
  - If AI justification is generic, enhance with specific evidence:
    - "Game loaded successfully (Phase 1 validation passed)"
    - "Visual quality: Screenshots show [specific observations]"
    - "Controls: Discovered [control count] controls in Phase 2"
    - "Technical: [console error count] console errors, [network error count] network failures"
- [ ] Validate justifications:
  - Ensure each justification is 2-3 sentences
  - Ensure justifications reference evidence (not generic)
  - If justification missing, generate default based on score
- [ ] Store justifications:
  - Include in MetricScore objects
  - Store in evaluation_scores table justification field

### Task 8: Store Evaluation Scores to D1 (AC: 8)

- [ ] Prepare evaluation_scores inserts:
  - Create 6 rows: 5 metrics + overall
  - Each row: `{ test_run_id, metric_name, score, justification, created_at }`
  - Metric names: 'load', 'visual', 'controls', 'playability', 'technical', 'overall'
- [ ] Use D1 helper functions:
  - Use `insertTestEvent()` or direct D1 query
  - Insert all 6 rows in a transaction if possible
- [ ] Insert evaluation_scores:
  ```sql
  INSERT INTO evaluation_scores (test_run_id, metric_name, score, justification, created_at)
  VALUES (?, ?, ?, ?, ?)
  ```
  - Execute for each metric (6 times)
- [ ] Verify inserts:
  - Query evaluation_scores to verify all 6 rows inserted
  - Log success to test_events
- [ ] Handle insert errors:
  - If insert fails, log error but continue Phase 4
  - Return partial result with scores but note D1 insert failure

### Task 9: Store Overall Score in test_runs Table (AC: 9)

- [ ] Update test_runs table:
  - Use D1 helper or direct query
  - Update `test_runs.overall_score` with calculated overall score
  - Update `test_runs.updated_at` with current timestamp
- [ ] Execute update query:
  ```sql
  UPDATE test_runs 
  SET overall_score = ?, updated_at = ?
  WHERE id = ?
  ```
- [ ] Verify update:
  - Query test_runs to verify overall_score updated
  - Log success to test_events
- [ ] Handle update errors:
  - If update fails, log error but continue Phase 4
  - Overall score still available in evaluation_scores table

### Task 10: Flush All Logs to R2 (AC: 10)

- [ ] Prepare log content:
  - Console logs: Format `this.state.evidence.consoleLogs` array as text
  - Network logs: Format `this.state.evidence.networkErrors` array as text
  - Agent decisions: Format `decision_log` entries as text
- [ ] Upload console.log:
  - Use `uploadLog()` helper: `await uploadLog(env.EVIDENCE_BUCKET, this.testRunId, LogType.CONSOLE, consoleLogContent)`
  - Verify upload success
- [ ] Upload network.log:
  - Use `uploadLog()` helper: `await uploadLog(env.EVIDENCE_BUCKET, this.testRunId, LogType.NETWORK, networkLogContent)`
  - Verify upload success
- [ ] Upload agent-decisions.log:
  - Use `uploadLog()` helper: `await uploadLog(env.EVIDENCE_BUCKET, this.testRunId, LogType.AGENT_DECISIONS, agentDecisionsContent)`
  - Verify upload success
- [ ] Handle upload errors:
  - If log upload fails, log error but don't fail Phase 4
  - Logs are evidence (not critical for Phase 4 completion)
- [ ] Log flush completion:
  - Log to test_events that all logs flushed to R2

### Task 11: Update test_runs.status to 'completed' (AC: 11)

- [ ] Update test_runs status:
  - Use D1 helper or direct query
  - Update `test_runs.status = 'completed'`
  - Update `test_runs.completed_at = Date.now()`
  - Update `test_runs.updated_at = Date.now()`
- [ ] Execute update query:
  ```sql
  UPDATE test_runs 
  SET status = 'completed', completed_at = ?, updated_at = ?
  WHERE id = ?
  ```
- [ ] Verify update:
  - Query test_runs to verify status updated
  - Log status transition to test_events
- [ ] Handle update errors:
  - If update fails, log error but Phase 4 still completes
  - Status update is important but not blocking

### Task 12: Broadcast Final Results via WebSocket (AC: 12)

- [ ] Prepare final results message:
  - Include overall score
  - Include all 5 metric scores
  - Include test completion status
  - Format as JSON for dashboard consumption
- [ ] Use existing `updateStatus()` helper method:
  - Call `await this.updateStatus('phase4', finalResultsMessage)`
  - Helper method handles:
    - Logging to D1 test_events
    - Broadcasting via WebSocket to connected dashboard clients
- [ ] Format broadcast message:
  - Example: `"Phase 4 complete - Overall Score: 85/100 (Load: 100, Visual: 80, Controls: 90, Playability: 85, Technical: 75)"`
  - Include JSON metadata with full scores and justifications
- [ ] Handle WebSocket errors gracefully:
  - If broadcast fails, log error but don't fail Phase 4
  - Progress updates are best-effort (not critical for Phase 4 execution)

### Task 13: Return Phase4Result Structure (AC: 13)

- [ ] Set result success:
  - If evaluation completed: `result.success = true`
  - If evaluation failed: `result.success = false` (log error)
- [ ] Populate result fields:
  - `overallScore`: Calculated overall score (0-100)
  - `metrics`: Array of 6 MetricScore objects (5 metrics + overall)
- [ ] Return Phase4Result:
  - `{ success: boolean, overallScore: number, metrics: MetricScore[] }`
- [ ] Update DO state with Phase 4 result:
  - Store in `this.state.phaseResults.phase4 = result`
- [ ] Return result as JSON Response:
  - `return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })`

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-002**: Single TestAgent Durable Object per test run (DO ID = test UUID)
- **ADR-004**: AI Gateway as Primary Entry Point for All AI Requests - Phase 4 evaluation routed through AI Gateway
- **ADR-007**: Data Storage Strategy - D1 for metadata (evaluation_scores, test_runs), R2 for evidence (screenshots, logs)
- **Timeout constraint**: Phase 4 execution must complete within 60 seconds
- **AI Gateway integration**: Use `callAI()` helper with vision model preference for screenshot analysis
- **R2 evidence retrieval**: Use `getTestArtifacts()` helper to retrieve screenshots from R2
- **R2 log flushing**: Use `uploadLog()` helper to flush logs to R2
- **D1 schema**: evaluation_scores table stores 6 rows (5 metrics + overall) with test_run_id, metric_name, score, justification
- **Weighted scoring**: Overall score uses weighted average (Load 15%, Visual 20%, Controls 20%, Playability 30%, Technical 15%)
- **Graceful degradation**: If AI Gateway fails, use fallback scoring based on technical data
- **Evidence completeness**: Phase 4 can run with partial evidence (if Phase 1-3 failed partially)

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-002, ADR-004, ADR-007]  
[Source: docs/architecture/data-architecture.md, D1 Database Schema section]  
[Source: docs/epic-2-tech-context.md, Non-Functional Requirements section]  
[Source: docs/epic-2-tech-context.md, Workflows and Sequencing section]  
[Source: docs/prd/6-technical-architecture.md, 6.3 Service Communication Pattern]

### Source Tree Components to Touch

- **`src/agents/TestAgent.ts`**: Implement `runPhase4()` method (MODIFIED)
  - Phase 4 logic: evidence retrieval, AI evaluation, score calculation, D1 storage, R2 log flushing
  - Browser session closure (if still open from Phase 3)
  - Evidence aggregation from Phases 1-3
  - AI Gateway vision model integration
  - D1 evaluation_scores and test_runs updates
  - WebSocket final results broadcast
- **`src/shared/types.ts`**: Add Phase4Result and MetricScore interfaces (MODIFIED)
  - `interface Phase4Result { success: boolean; overallScore: number; metrics: MetricScore[]; }`
  - `interface MetricScore { name: string; score: number; justification: string; }`
  - Update TestAgent state types if needed
- **`src/shared/helpers/ai-gateway.ts`**: Use existing `callAI()` helper (REVIEW)
  - Verify vision model support (images parameter)
  - Verify model preference 'primary' uses Workers AI vision model
  - Verify fallback to OpenAI GPT-4o vision if Workers AI fails
- **`src/shared/helpers/r2.ts`**: Use existing helpers (REVIEW)
  - `getTestArtifacts()`: Retrieve all screenshots from R2
  - `uploadLog()`: Flush console.log, network.log, agent-decisions.log to R2
  - Verify helpers support Phase 4 requirements
- **`src/shared/helpers/d1.ts`**: Use existing helpers for D1 operations (REVIEW)
  - Verify helpers support evaluation_scores inserts
  - Verify helpers support test_runs updates
  - If helpers missing, add direct D1 queries

### Testing Standards Summary

- **Integration Tests**: Test Phase 4 execution with real evidence
  - Verify screenshots retrieved from R2
  - Verify console logs and network errors retrieved from DO state
  - Verify AI Gateway called with vision model
  - Verify scores generated for 5 metrics + overall
  - Verify evaluation_scores stored to D1 (6 rows)
  - Verify test_runs.status updated to 'completed'
  - Verify logs flushed to R2
  - Verify WebSocket broadcast
- **AI Evaluation Tests**: Test AI Gateway integration:
  - Test with valid screenshots (should generate scores)
  - Test with no screenshots (should use fallback scoring)
  - Test AI Gateway failure (should use fallback scoring)
  - Test malformed AI response (should use fallback scoring)
  - Test vision model selection (Workers AI vs OpenAI fallback)
- **Score Calculation Tests**: Test weighted average:
  - Test overall score calculation with various metric scores
  - Test score clamping (0-100 range)
  - Test missing metric scores (use fallback)
  - Test justification generation
- **Evidence Retrieval Tests**: Test evidence aggregation:
  - Test screenshot retrieval from R2
  - Test console log retrieval from DO state
  - Test network error retrieval from DO state
  - Test AI decision log retrieval from Agent SQL
  - Test partial evidence handling (if Phase 1-3 failed)
- **D1 Storage Tests**: Test database operations:
  - Test evaluation_scores inserts (6 rows)
  - Test test_runs.overall_score update
  - Test test_runs.status update to 'completed'
  - Test D1 insert failures (graceful degradation)
- **R2 Log Flushing Tests**: Test log uploads:
  - Test console.log upload
  - Test network.log upload
  - Test agent-decisions.log upload
  - Test log upload failures (graceful degradation)
- **Error Handling Tests**: Test graceful error handling:
  - Test AI Gateway unavailable
  - Test D1 database unavailable
  - Test R2 bucket unavailable
  - Test missing evidence (partial Phase 1-3 completion)
  - Verify user-friendly error messages

### Project Structure Notes

- Follow existing file structure: `src/agents/` for agent implementations
- Use TypeScript strict mode (already configured)
- Reuse existing helpers: `callAI()`, `getTestArtifacts()`, `uploadLog()`, D1 helpers
- Evidence aggregated from DO state (console logs, network errors) and R2 (screenshots)
- Agent SQL database for decision_log retrieval (per-DO ephemeral storage)
- Phase 4 result stored in DO state for reference after completion
- Logs flushed to R2 incrementally (not batched)
- D1 evaluation_scores table stores all metric scores with justifications

### Learnings from Previous Story

**From Story 2.5 (Phase 3 - Gameplay Exploration with Computer Use) (Status: ready-for-dev)**

- **Browser Session Management**: Browser session may still be open from Phase 3 - close browser session in Phase 4 using `closeBrowser()` helper
- **Screenshot Storage**: Screenshots stored incrementally to R2 during Phase 3 - use `getTestArtifacts()` helper to retrieve all screenshots for Phase 4
- **Console Log Capture**: Console logs accumulated in `this.state.evidence.consoleLogs` during Phase 3 - retrieve for Phase 4 log flushing
- **Network Error Tracking**: Network errors accumulated in `this.state.evidence.networkErrors` during Phase 3 - retrieve for Phase 4 evaluation
- **AI Decision Logging**: AI decisions logged to Agent SQL `decision_log` table during Phase 3 - retrieve for Phase 4 log flushing
- **Status Updates**: `updateStatus(phase, message)` helper method available - use for Phase 4 final results broadcast
- **Phase Result Storage**: Store Phase 4 result in `this.state.phaseResults.phase4` for reference after completion
- **Error Handling Pattern**: User-friendly error messages pattern established - follow same approach for Phase 4 errors
- **Evidence Completeness**: Phase 3 may have captured partial evidence (some screenshots, some logs) - Phase 4 should handle partial evidence gracefully
- **Adaptive Timeout**: Phase 3 uses 1-5 minute adaptive timeout - Phase 4 uses fixed 60-second timeout (shorter, focused on evaluation)

[Source: docs/stories/2-5-phase-3-gameplay-exploration-with-computer-use.md#Dev-Agent-Record]

### References

- **AI Gateway Usage**: https://developers.cloudflare.com/ai-gateway/
- **Workers AI Vision Models**: https://developers.cloudflare.com/workers-ai/models/
- **R2 Storage**: https://developers.cloudflare.com/r2/
- **D1 Database**: https://developers.cloudflare.com/d1/
- [Source: docs/prd/11b-references-resources.md, AI Gateway Resources]  
[Source: docs/epic-2-tech-context.md, AI Gateway Integration section]  
[Source: docs/architecture/technology-stack-details.md, AI Gateway]  
[Source: docs/ai-gateway-usage.md, AI Gateway Integration]  
[Source: docs/architecture/data-architecture.md, D1 Database Schema]  
[Source: docs/architecture/data-architecture.md, R2 Storage Structure]

---

## Dev Agent Record

### Context Reference

- docs/stories/2-6-phase-4-evaluation-scoring.context.xml

### Agent Model Used

<!-- Will be filled by dev agent during implementation -->

### Debug Log References

<!-- Will be filled by dev agent during implementation -->

### Completion Notes List

<!-- Will be filled by dev agent during implementation -->

### File List

<!-- Will be filled by dev agent during implementation -->

