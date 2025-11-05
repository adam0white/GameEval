# Story 3.5: Quick Start Validation Guide

**For:** Adam  
**Date:** 2025-11-05  
**Estimated Time:** 2-3 hours

---

## Overview

This guide helps you quickly execute the manual validation tests for Story 3.5. All code is complete from previous stories - you just need to test it with real games.

---

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed: `npm install`
- [ ] TypeScript types generated: `npm run types`
- [ ] D1 migrations completed (should be done from Story 1.2)
- [ ] R2 bucket exists (should be done from Story 1.3)

---

## Step 1: Start the Dashboard (5 minutes)

### Option A: Local Development (Recommended for Testing)

```bash
# From project root
npm run dev
```

Dashboard will be available at: **http://localhost:8787**

### Option B: Deploy to Production

```bash
npm run deploy
```

Dashboard will be available at your Cloudflare Workers URL.

---

## Step 2: Find Example Games (15 minutes)

You need **3-5 DOM-based games** (not canvas-based). Here are some suggestions:

### Suggested Game Sources:

1. **itch.io** - Search for "HTML5 games" or "browser games"
   - Filter by: Free, Playable in Browser
   - Look for games with visible UI elements (buttons, text inputs)

2. **CodePen** - Search for "game" or "interactive"
   - Many simple HTML/CSS/JS games with DOM controls

3. **GitHub Pages** - Search for "html5-game" repositories
   - Educational games often use DOM instead of canvas

### Selection Criteria:

✅ **Must Have:**
- Uses DOM elements (buttons, divs, inputs) - not pure canvas
- No login required
- Publicly accessible URL
- Interactive controls (keyboard, mouse, touch)

❌ **Avoid:**
- Canvas-only games (Stagehand can't detect controls)
- Flash/Unity/proprietary engines
- Games requiring authentication
- Games with complex loaders or splash screens

### Game Checklist:

Record your selected games here:

| # | Game URL | Genre | Control Type | Notes |
|---|----------|-------|--------------|-------|
| 1 | | Puzzle | Click/Drag | |
| 2 | | Action | Keyboard (WASD) | Will use input schema |
| 3 | | Strategy | Click/Select | |
| 4 | | Interactive | Text/Choices | |
| 5 | | Educational | Multiple Choice | |

---

## Step 3: Submit First Game (5 minutes)

1. Open dashboard: **http://localhost:8787** (or production URL)
2. You should see a test submission form
3. Enter your first game URL
4. Leave input schema blank for now
5. Click "Submit Test" or equivalent button

**Expected Result:**
- Test run ID appears in the test list
- Status shows "Queued" or "Running"
- Progress indicator shows Phase 1/4

---

## Step 4: Monitor Test Execution (2-3 minutes per game)

Watch the dashboard for real-time updates:

- [ ] **Phase 1:** Game loading (should complete in ~10-30 seconds)
- [ ] **Phase 2:** Control discovery (should complete in ~30-60 seconds)
- [ ] **Phase 3:** Autonomous gameplay (should run for 1-3 minutes)
- [ ] **Phase 4:** Evaluation scoring (should complete in ~30-60 seconds)

**Total test duration:** Approximately 2.5-5 minutes per game

### If WebSocket is working:
- You'll see live progress messages in the dashboard
- Status badge updates in real-time
- Phase transitions appear immediately

### If WebSocket falls back to polling:
- Updates every 3 seconds
- Still functional, just slight delay

---

## Step 5: Verify Results (5 minutes per game)

### Check Dashboard Display:

- [ ] Test run appears in test list
- [ ] Overall quality score displayed (0-100)
- [ ] Click to expand detailed report
- [ ] Verify all sections present:
  - Overall score with color coding
  - 5 metric scores with justifications
  - Timeline of AI actions
  - Screenshot gallery (minimum 5 screenshots)
  - Console errors (if any)
  - Network errors (if any)
  - Test metadata (duration, timestamp, AI model)
- [ ] Click "Export JSON" - download should work
- [ ] Click collapse - report should close

### Check D1 Database:

```bash
# Get test run details
npx wrangler d1 execute gameeval-db --local --command="SELECT test_run_id, game_url, status, overall_score FROM test_runs ORDER BY created_at DESC LIMIT 5;"

# Check specific test run (replace <test_id>)
npx wrangler d1 execute gameeval-db --local --command="SELECT * FROM test_runs WHERE test_run_id = '<test_id>';"

# Check evaluation scores
npx wrangler d1 execute gameeval-db --local --command="SELECT metric_name, score, justification FROM evaluation_scores WHERE test_run_id = '<test_id>';"

# Check test events (phase progression)
npx wrangler d1 execute gameeval-db --local --command="SELECT phase, event_type, created_at FROM test_events WHERE test_run_id = '<test_id>' ORDER BY created_at;"
```

### Check R2 Storage:

```bash
# List screenshots for test (replace <test_id>)
npx wrangler r2 object list gameeval-evidence --prefix="tests/<test_id>/screenshots/"

# List logs
npx wrangler r2 object list gameeval-evidence --prefix="tests/<test_id>/logs/"

# Count screenshots (should be >= 5)
npx wrangler r2 object list gameeval-evidence --prefix="tests/<test_id>/screenshots/" | grep -c ".png"
```

---

## Step 6: Test with Input Schema (10 minutes)

For **Game 2** (action/arcade with keyboard controls):

### Input Schema Example:

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

### Steps:

1. Submit Game 2 URL through dashboard
2. Paste the input schema JSON in the "Input Schema" field (if available in UI)
3. Submit test
4. Monitor Phase 2 - agent should prioritize controls from schema
5. Check D1 to verify schema stored:

```bash
npx wrangler d1 execute gameeval-db --local --command="SELECT test_run_id, input_schema FROM test_runs WHERE game_url LIKE '%<game-2-domain>%';"
```

6. Verify schema appears in dashboard detailed report metadata section

---

## Step 7: Test Error Handling (10 minutes)

Submit these invalid URLs to test error handling:

### Test Case 1: Invalid URL Format
```
URL: not-a-url
Expected: "Invalid URL format. Please provide a valid HTTP or HTTPS URL."
```

### Test Case 2: Non-HTTP Protocol
```
URL: ftp://example.com/game
Expected: User-friendly error message
```

### Test Case 3: Malformed URL
```
URL: http://
Expected: User-friendly error message
```

### Test Case 4: Valid URL but 404
```
URL: https://example.com/nonexistent-game
Expected: "Failed" status with clear error message (not stack trace)
```

### Verify Error Handling:

```bash
# Check failed test runs
npx wrangler d1 execute gameeval-db --local --command="SELECT test_run_id, game_url, status, error_message FROM test_runs WHERE status = 'failed';"
```

**Important:** Error messages should be user-friendly, NOT stack traces!

---

## Step 8: Complete Remaining Games (30-45 minutes)

Repeat Steps 3-5 for Games 3, 4, and 5.

Use the test plan checklist to track results: `docs/validation/test-plan-story-3-5.md`

---

## Step 9: Document Findings (30 minutes)

As you test, document any issues in: `docs/validation/edge-cases-epic-3.md`

### Issue Categories:

**P0 (Critical)** - Blocks MVP launch:
- Data corruption
- Complete system failures
- Security vulnerabilities

**P1 (Major)** - Should fix soon:
- Feature not working as designed
- Poor user experience
- Performance issues

**P2 (Minor)** - Nice to have:
- UI polish
- Edge cases with workarounds
- Non-critical bugs

**P3 (Low)** - Future enhancement:
- Feature requests
- Minor UX improvements
- Optional optimizations

### For Each Issue:

1. Assign Issue ID (e.g., EC3-001, EC3-002)
2. Set Priority (P0-P3)
3. Identify Component (Dashboard Worker, TestAgent, etc.)
4. Write clear description
5. Provide steps to reproduce
6. Document expected vs actual behavior
7. Suggest fix (optional)

---

## Step 10: Mark Story Complete (10 minutes)

Once all validation tests are complete:

1. Update `docs/validation/test-plan-story-3-5.md`:
   - ✅ Check off all completed tasks
   - Fill in all results tables
   - Add sign-off at bottom

2. Update `docs/validation/edge-cases-epic-3.md`:
   - Document all issues found
   - Update executive summary with counts
   - Add recommendations for Epic 4

3. Update story file `docs/stories/3-5-example-game-testing-and-validation.md`:
   - Check off all completed tasks (Tasks 2-10)
   - Add completion notes with findings summary

4. Update `docs/sprint-status.yaml`:
   - Change story status: `in-progress` → `review` or `done`

---

## Troubleshooting

### Dashboard not loading
```bash
# Check if dev server is running
npm run dev

# Check for TypeScript errors
npm run lint
```

### No test runs appearing
- Check browser console for errors
- Verify D1 database has tables:
  ```bash
  npx wrangler d1 execute gameeval-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"
  ```

### Screenshots not displaying
- Check R2 bucket exists:
  ```bash
  npx wrangler r2 bucket list | grep gameeval-evidence
  ```
- Check R2 public URL configured in `wrangler.toml`

### WebSocket not connecting
- Check browser console for WebSocket errors
- Verify Durable Object binding configured
- Try fallback polling (should work automatically)

---

## Time Estimates

| Task | Estimated Time |
|------|----------------|
| Setup & start dashboard | 5 min |
| Find example games | 15 min |
| Test 5 games (5 × 5-10 min) | 30-45 min |
| Test with input schema | 10 min |
| Test error handling | 10 min |
| Verify D1/R2 data | 15 min |
| Document findings | 30 min |
| **Total** | **~2-3 hours** |

---

## Success Criteria

Before marking story complete, verify:

- [ ] 3-5 games tested successfully
- [ ] All 4 phases executed for each game
- [ ] Minimum 5 screenshots per test captured
- [ ] Quality scores generated with justifications
- [ ] Dashboard displays all test data correctly
- [ ] WebSocket real-time updates verified (or polling fallback)
- [ ] Input schema tested with at least 1 game
- [ ] Error handling tested with invalid URLs
- [ ] All issues documented in edge cases file
- [ ] Test plan checklist completed
- [ ] Story file updated with completion notes

---

## Questions?

If you encounter issues or have questions:

1. Check the comprehensive test plan: `docs/validation/test-plan-story-3-5.md`
2. Review setup instructions: `SETUP.md`
3. Check architecture docs: `docs/architecture/`
4. Review story context: `docs/stories/3-5-example-game-testing-and-validation.context.xml`

---

**Good luck with validation! 🎮**

