# Story 3.5: Example Game Testing and Validation - Test Plan

**Date:** 2025-11-05  
**Story:** 3.5 - Example Game Testing and Validation  
**Tester:** Adam  
**Status:** In Progress

---

## Test Objectives

Validate end-to-end GameEval system with real DOM-based games before MVP launch:
- Test all 4 phases (Load → Control Discovery → Gameplay → Evaluation)
- Verify Dashboard Worker, TestAgent DO, Workflow, D1, R2, Browser Rendering, AI Gateway integration
- Validate WebSocket real-time updates
- Test error handling scenarios
- Document edge cases for Epic 4

---

## Example Game URLs (Task 1)

### Selection Criteria:
- ✅ DOM-based UI (not canvas)
- ✅ Different genres and control schemes
- ✅ Publicly accessible (no login required)
- ✅ Interactive elements (buttons, inputs, clickable divs)

### Candidate Games:

#### Game 1: Simple Puzzle Game
- **URL:** _[To be provided]_
- **Genre:** Puzzle
- **Expected Controls:** Click buttons, drag/drop
- **Input Schema:** No

#### Game 2: Action/Arcade Game
- **URL:** _[To be provided]_
- **Genre:** Action
- **Expected Controls:** Keyboard (arrow keys, WASD, spacebar)
- **Input Schema:** Yes (will provide schema)

#### Game 3: Strategy/Board Game
- **URL:** _[To be provided]_
- **Genre:** Strategy
- **Expected Controls:** Click, hover, select options
- **Input Schema:** No

#### Game 4: Interactive Story/Adventure
- **URL:** _[To be provided]_
- **Genre:** Interactive Fiction
- **Expected Controls:** Click choices, text input
- **Input Schema:** No

#### Game 5: Educational/Quiz Game
- **URL:** _[To be provided]_
- **Genre:** Educational
- **Expected Controls:** Multiple choice buttons, submit
- **Input Schema:** No

---

## Input Schema Example (Task 1, AC 9)

For Game 2 (Action/Arcade), provide this input schema:

```json
{
  "gameType": "action-arcade",
  "controls": {
    "movement": {
      "keys": ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"],
      "description": "WASD or arrow keys for movement"
    },
    "action": {
      "keys": ["Space", "Enter"],
      "description": "Space or Enter to perform action"
    }
  },
  "expectedInteractions": [
    "Navigate through game world using movement keys",
    "Press action key to interact with objects",
    "Avoid obstacles and collect items"
  ],
  "testDuration": "2 minutes"
}
```

---

## Validation Checklist

### ✅ Task 1: Prepare Example Game URLs and Input Schema (AC: 1, 9)

- [ ] Identify 3-5 DOM-based example games (different genres)
- [ ] Verify each game URL is accessible and loads correctly in browser
- [ ] Create input schema JSON for at least one game (Game 2)
- [ ] Document game URLs and input schema in this test plan
- [ ] Verify games use DOM UI elements (not canvas)

### ✅ Task 2: Validate Game Loading (AC: 2)

For **each game**:

- [ ] Submit game URL through dashboard at `http://localhost:8787` (or production URL)
- [ ] Monitor test run status in dashboard
- [ ] Verify Phase 1 completes successfully: game loads, no 404 errors, no blank pages
- [ ] Check test_events table in D1: verify Phase 1 event logged with "load" status
  ```sql
  SELECT * FROM test_events WHERE test_run_id = '<test_id>' AND phase = 1 ORDER BY created_at;
  ```
- [ ] Verify initial screenshot captured in R2 bucket
- [ ] Document any games that fail to load

**Results Table:**

| Game # | URL | Phase 1 Success? | Notes |
|--------|-----|------------------|-------|
| 1 | | ⬜ | |
| 2 | | ⬜ | |
| 3 | | ⬜ | |
| 4 | | ⬜ | |
| 5 | | ⬜ | |

### ✅ Task 3: Validate Control Discovery (AC: 3)

For **each game**:

- [ ] Monitor test run for Phase 2 execution
- [ ] Verify Phase 2 completes successfully: at least one interactive element discovered
- [ ] Check test_events table: verify Phase 2 event logged with control discovery details
  ```sql
  SELECT * FROM test_events WHERE test_run_id = '<test_id>' AND phase = 2 ORDER BY created_at;
  ```
- [ ] Verify screenshot captured showing discovered controls
- [ ] Check console logs in R2: verify control discovery messages
- [ ] Document any games where control discovery fails

**Results Table:**

| Game # | Phase 2 Success? | Controls Found | Screenshot Shows Controls? | Notes |
|--------|------------------|----------------|---------------------------|-------|
| 1 | ⬜ | | ⬜ | |
| 2 | ⬜ | | ⬜ | |
| 3 | ⬜ | | ⬜ | |
| 4 | ⬜ | | ⬜ | |
| 5 | ⬜ | | ⬜ | |

### ✅ Task 4: Validate Autonomous Gameplay (AC: 4)

For **each game**:

- [ ] Monitor test run for Phase 3 execution
- [ ] Verify Phase 3 executes for 1-3 minutes per game
- [ ] Check test_events table: verify multiple Phase 3 events logged (actions, decisions, progress)
  ```sql
  SELECT * FROM test_events WHERE test_run_id = '<test_id>' AND phase = 3 ORDER BY created_at;
  ```
- [ ] Verify agent performs autonomous actions: clicks, keyboard input, navigation
- [ ] Check console logs: verify agent decision-making and action execution
- [ ] Verify test run duration is between 1-3 minutes
  ```sql
  SELECT 
    test_run_id, 
    created_at, 
    completed_at,
    CAST((julianday(completed_at) - julianday(created_at)) * 24 * 60 AS INTEGER) AS duration_minutes
  FROM test_runs 
  WHERE test_run_id = '<test_id>';
  ```
- [ ] Document any games where gameplay exploration fails or times out

**Results Table:**

| Game # | Phase 3 Success? | Duration (min) | Actions Performed | Notes |
|--------|------------------|----------------|-------------------|-------|
| 1 | ⬜ | | | |
| 2 | ⬜ | | | |
| 3 | ⬜ | | | |
| 4 | ⬜ | | | |
| 5 | ⬜ | | | |

### ✅ Task 5: Validate Screenshot Capture (AC: 5)

For **each game**:

- [ ] Check R2 storage: verify screenshots stored under `tests/{testId}/screenshots/` directory
- [ ] Count screenshots: verify at least 5 screenshots per test run
- [ ] Verify screenshot filenames include timestamps
- [ ] Check dashboard detailed report: verify screenshot gallery displays all screenshots
- [ ] Verify screenshot captions show phase and action description
- [ ] Test screenshot lightbox: click to view full-size, navigate prev/next
- [ ] Document any issues with screenshot capture or display

**Results Table:**

| Game # | Screenshot Count | R2 Path Correct? | Dashboard Display? | Lightbox Works? | Notes |
|--------|------------------|------------------|--------------------|-----------------|-------|
| 1 | | ⬜ | ⬜ | ⬜ | |
| 2 | | ⬜ | ⬜ | ⬜ | |
| 3 | | ⬜ | ⬜ | ⬜ | |
| 4 | | ⬜ | ⬜ | ⬜ | |
| 5 | | ⬜ | ⬜ | ⬜ | |

### ✅ Task 6: Validate Quality Score Generation (AC: 6)

For **each game**:

- [ ] Monitor test run for Phase 4 execution
- [ ] Verify Phase 4 completes successfully: overall quality score (0-100) generated
- [ ] Check evaluation_scores table in D1: verify all 5 metric scores stored
  ```sql
  SELECT * FROM evaluation_scores WHERE test_run_id = '<test_id>';
  ```
- [ ] Check evaluation_scores table: verify each metric has justification text (2-3 sentences)
- [ ] Verify test_runs.overall_score updated with weighted average
- [ ] Check dashboard detailed report: verify all scores displayed with progress bars and justifications
- [ ] Document any issues with score generation or justification quality

**Results Table:**

| Game # | Phase 4 Success? | Overall Score | All 5 Metrics? | Justifications? | Dashboard Display? | Notes |
|--------|------------------|---------------|----------------|-----------------|-------------------|-------|
| 1 | ⬜ | | ⬜ | ⬜ | ⬜ | |
| 2 | ⬜ | | ⬜ | ⬜ | ⬜ | |
| 3 | ⬜ | | ⬜ | ⬜ | ⬜ | |
| 4 | ⬜ | | ⬜ | ⬜ | ⬜ | |
| 5 | ⬜ | | ⬜ | ⬜ | ⬜ | |

### ✅ Task 7: Validate Dashboard Display (AC: 7)

For **at least 2 games** (can validate across all):

- [ ] Verify test run appears in dashboard test list immediately after submission
- [ ] Verify status badge updates correctly: Queued → Running → Completed
- [ ] Verify progress indicator shows current phase (1/4, 2/4, 3/4, 4/4)
- [ ] Verify overall quality score displayed in test list (when completed)
- [ ] Click test run card to expand detailed report
- [ ] Verify detailed report shows all sections:
  - [ ] Overall score with color coding
  - [ ] All 5 metric scores with progress bars and justifications
  - [ ] Timeline of AI actions with timestamps
  - [ ] Screenshot gallery with captions
  - [ ] Console error log (if errors found)
  - [ ] Network error log (if failures found)
  - [ ] Test duration and timestamp
  - [ ] AI model used for evaluation
- [ ] Verify "Export JSON" button downloads complete test report
- [ ] Test collapse button closes expanded view
- [ ] Document any UI issues or missing information

**Results:**

| Feature | Works? | Notes |
|---------|--------|-------|
| Test list immediate appearance | ⬜ | |
| Status badge updates | ⬜ | |
| Progress indicator | ⬜ | |
| Quality score display | ⬜ | |
| Detailed report - overall score | ⬜ | |
| Detailed report - metric scores | ⬜ | |
| Detailed report - timeline | ⬜ | |
| Detailed report - screenshots | ⬜ | |
| Detailed report - console errors | ⬜ | |
| Detailed report - network errors | ⬜ | |
| Detailed report - metadata | ⬜ | |
| Export JSON | ⬜ | |
| Collapse button | ⬜ | |

### ✅ Task 8: Validate WebSocket Real-Time Updates (AC: 8)

For **at least 1 game**:

- [ ] Monitor dashboard while test run executes
- [ ] Verify WebSocket connection established (check browser console for connection messages)
- [ ] Verify phase transitions broadcast in real-time: "Starting Phase 2...", "Starting Phase 3...", etc.
- [ ] Verify progress messages appear in Live Feed section
- [ ] Verify status badge updates in real-time without polling delay (no 3-second delay)
- [ ] Verify completion message: "Test complete! Score: {score}/100"
- [ ] Test WebSocket reconnection: simulate connection drop (pause network in DevTools), verify automatic reconnection
- [ ] Test fallback to polling: disable WebSocket (if possible), verify polling still works (3-second updates)
- [ ] Document any WebSocket connection issues or message delays

**Results:**

| Feature | Works? | Notes |
|---------|--------|-------|
| WebSocket connection established | ⬜ | |
| Phase transitions broadcast | ⬜ | |
| Progress messages in Live Feed | ⬜ | |
| Real-time status updates | ⬜ | |
| Completion message | ⬜ | |
| Reconnection after drop | ⬜ | |
| Fallback to polling | ⬜ | |

### ✅ Task 9: Validate Input Schema Handling (AC: 9)

For **Game 2** (with input schema):

- [ ] Submit game URL with input schema JSON through dashboard
- [ ] Verify input schema stored in test_runs.input_schema column in D1
  ```sql
  SELECT test_run_id, game_url, input_schema FROM test_runs WHERE test_run_id = '<test_id>';
  ```
- [ ] Monitor test run: verify agent uses schema to guide control discovery (check console logs)
- [ ] Verify Phase 2 prioritizes controls mentioned in schema
- [ ] Check dashboard detailed report: verify input schema displayed in metadata section
- [ ] Verify schema appears in exported JSON report
- [ ] Document any issues with schema parsing or usage

**Results:**

| Feature | Works? | Notes |
|---------|--------|-------|
| Schema stored in D1 | ⬜ | |
| Schema guides control discovery | ⬜ | |
| Controls prioritized from schema | ⬜ | |
| Schema in dashboard metadata | ⬜ | |
| Schema in exported JSON | ⬜ | |

### ✅ Task 10: Test Error Handling (AC: 10)

Test various invalid URL scenarios:

- [ ] **Test 1:** Submit invalid URL: `not-a-url`
  - [ ] Verify user-friendly error message displayed: "Invalid URL format. Please provide a valid HTTP or HTTPS URL."
  - [ ] Verify test run status shows "Failed" with error message
- [ ] **Test 2:** Submit non-HTTP URL: `ftp://example.com/game`
  - [ ] Verify error message displayed
- [ ] **Test 3:** Submit malformed URL: `http://`
  - [ ] Verify error message displayed
- [ ] **Test 4:** Submit valid URL that returns 404: `https://example.com/nonexistent-game`
  - [ ] Verify graceful error handling: test run shows "Failed" with clear error message
- [ ] Check error message stored in test_runs.error_message column
  ```sql
  SELECT test_run_id, status, error_message FROM test_runs WHERE status = 'failed';
  ```
- [ ] Verify error message appears in dashboard (not stack trace)
- [ ] Document any error handling issues or unclear error messages

**Results Table:**

| Test Case | URL | Error Message Shown? | User-Friendly? | Status = Failed? | Notes |
|-----------|-----|---------------------|----------------|------------------|-------|
| Invalid format | `not-a-url` | ⬜ | ⬜ | ⬜ | |
| Non-HTTP | `ftp://example.com/game` | ⬜ | ⬜ | ⬜ | |
| Malformed | `http://` | ⬜ | ⬜ | ⬜ | |
| 404 error | `https://example.com/nonexistent` | ⬜ | ⬜ | ⬜ | |

---

## Useful Commands

### Check D1 Database (via wrangler)

```bash
# List all test runs
npx wrangler d1 execute gameeval-db --command "SELECT * FROM test_runs ORDER BY created_at DESC LIMIT 10;"

# Check specific test run
npx wrangler d1 execute gameeval-db --command "SELECT * FROM test_runs WHERE test_run_id = '<test_id>';"

# Check test events
npx wrangler d1 execute gameeval-db --command "SELECT * FROM test_events WHERE test_run_id = '<test_id>' ORDER BY created_at;"

# Check evaluation scores
npx wrangler d1 execute gameeval-db --command "SELECT * FROM evaluation_scores WHERE test_run_id = '<test_id>';"
```

### Check R2 Storage (via wrangler)

```bash
# List screenshots for a test
npx wrangler r2 object list gameeval-storage --prefix "tests/<test_id>/screenshots/"

# List console logs
npx wrangler r2 object list gameeval-storage --prefix "tests/<test_id>/logs/"
```

### Local Development

```bash
# Run dashboard worker locally
npm run dev

# Access dashboard
open http://localhost:8787
```

---

## Edge Cases & Issues Tracking

_Document all bugs, edge cases, and unexpected behaviors discovered during validation._

### Critical Issues (P0) - Block MVP Launch

_None yet_

### Major Issues (P1) - Should Fix Soon

_None yet_

### Minor Issues (P2) - Nice to Have

_None yet_

### Low Priority (P3) - Future Enhancement

_None yet_

---

## Test Execution Log

### Session 1: [Date]

- [ ] Started validation testing
- [ ] Prepared example game URLs
- [ ] Submitted Game 1...

_Continue logging test execution progress..._

---

## Sign-off

- [ ] All 11 tasks completed
- [ ] All acceptance criteria validated
- [ ] Edge cases documented in `docs/validation/edge-cases-epic-3.md`
- [ ] Story 3.5 marked complete
- [ ] Ready for Epic 3 retrospective

**Tester:** Adam  
**Completion Date:** _[To be filled]_

