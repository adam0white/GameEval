# Story 3.5: AI Agent & Workflow Improvements

## Overview
Comprehensive improvements to the AI testing agent, workflow, prompts, and Stagehand management based on production testing feedback. All changes optimize for gpt-5-mini and provide better agency to the LLM.

## Date: 2025-11-06

---

## 1. Smart Screenshot Capture Strategy

### Problem
- Screenshots were taken every 10 seconds regardless of page state
- Forced capture of 5 screenshots led to duplicate, uninformative images
- No screenshots captured during actual gameplay when changes occurred
- Example: 5 duplicate screenshots from phases 1-3, then none during gameplay, then 3 duplicates at end

### Solution
**File**: `src/agents/TestAgent.ts`

- **State-based capture**: Only capture screenshots when page state actually changes
  - Added `getPageStateHash()` method that tracks body text, image count, and canvas elements
  - Screenshots only taken when hash differs from previous capture
  
- **Minimum interval**: Reduced to 5 seconds (from 10s) but only triggers on state change

- **Reduced minimum requirement**: From 5 forced screenshots to 3, and only if truly needed

### Impact
- Eliminates duplicate screenshots
- Captures meaningful game state transitions
- Reduces storage costs and evaluation noise

---

## 2. Smarter Phase 3 Gameplay Prompts

### Problem
- Hard-coded instructions mentioning "WASD or arrow keys" confused the AI
- Too specific for games that don't use those controls (e.g., tic-tac-toe)
- No agency given to LLM to make smart decisions

### Solution
**File**: `src/agents/TestAgent.ts` (Lines 1020-1029)

```typescript
const goals = [
  retryContext 
    ? `Previous attempt notes: ${retryContext}. Try a different approach to interact with the game.`
    : 'Explore and interact with the game naturally. Try clicking on game elements, buttons, or interactive areas.',
  'If you see keyboard-friendly elements (canvas, game board), try using keyboard inputs like arrow keys, Space, or Enter.',
  'Play through a complete game session or interaction cycle to demonstrate the game works end-to-end.',
];
```

**Key Changes**:
- Removed specific WASD mentions
- Natural language instructions giving AI decision-making power
- Adaptive prompts that learn from retries
- Focus on completing full game cycles rather than testing specific inputs

### Impact
- AI can intelligently choose appropriate interaction method based on game type
- Better alignment with gpt-5-mini's strengths
- More natural gameplay patterns

---

## 3. Retry Context Mechanism

### Problem
- When tests failed and retried, AI had no context about what went wrong before
- Repeated same mistakes on retries
- No learning between attempts

### Solution
**File**: `src/agents/TestAgent.ts` (Lines 1200-1223)

Added `getRetryContext()` method:
- Queries Agent SQL for recent failed decisions
- Extracts failure patterns from decision log
- Provides concise context: "Retry #2. Previous failures: keyboard inputs didn't work; element not found"
- Injected into gameplay prompts on retry attempts

**Storage**:
- Tracks attempt count per phase in DO storage
- Leverages existing Agent SQL decision_log table

### Impact
- AI adapts approach on retries
- Reduces repeated failures
- Faster convergence to working solution

---

## 4. Improved Phase 4 Evaluation

### Problem
- Generic evaluation scores with no specificity
- All games scoring almost identically (80/100 with same breakdown)
- AI not actually analyzing captured evidence
- Justifications were templated fallbacks

### Solution
**File**: `src/agents/TestAgent.ts` (Lines 1644-1724)

**Enhanced Evaluation Prompt**:
```typescript
const prompt = `You are evaluating a web game test. Analyze ${screenshots.length} screenshots showing the game's progression and score it on 5 metrics (0-100).

**Test Context:**
- ${controlCount} interactive controls discovered (${controlHypothesis})
- ${actionCount} actions performed during gameplay
- ${decisionSummary}
- Technical data: ${consoleErrorCount} console errors, ${consoleWarningCount} warnings, ${networkErrorCount} network failures

**Your Task:**
Examine the visual progression across screenshots. Look for:
1. **Load Success**: Did the game load properly? Check first screenshot for blank/error pages.
2. **Visual Quality**: Evaluate graphics, layout, UI polish. Note any glitches or broken elements.
3. **Controls & Responsiveness**: Do you see evidence controls worked? Look for state changes between screenshots.
4. **Playability**: Does the game show clear progression? Can you tell what happened during gameplay?
5. **Technical Stability**: Combined with error data, assess overall stability.
```

**Context Enrichment**:
- Includes actual test statistics (control count, actions taken)
- References AI decision log
- Provides technical error counts
- Asks AI to reference specific observations

### Impact
- Evaluations now specific to actual test execution
- Scores vary appropriately based on game behavior
- Justifications reference concrete evidence
- Better use of gpt-5-mini's vision capabilities

---

## 5. Phase Summarization for Reduced Noise

### Problem
- Live feed showed every verbose message
- Hard to see overall progress
- Too much noise during active testing

### Solution
**File**: `src/agents/TestAgent.ts` (Lines 1229-1260)

Added `summarizePhase()` method that generates concise summaries:

**Phase 1 Summary**:
```
✓ Game loaded successfully
→ Interaction required to start
```

**Phase 2 Summary**:
```
✓ Discovered 21 controls
→ Game has Play/Start button
```

**Phase 3 Summary**:
```
✓ 27 actions, 5 screenshots
→ Strategy: mouse
→ Duration: 68s
```

**Phase 4 Summary**:
```
✓ Evaluation complete: 80/100
→ Analyzed 5 screenshots
```

**Implementation**:
- Broadcasts `phase_summary` message type via WebSocket
- Frontend automatically displays summaries in timeline
- Replaces verbose "Phase X complete - ..." messages
- Clean bullet points with key metrics

### Impact
- Cleaner live feed
- Easy to scan progress at a glance
- Key information surfaced without noise

---

## 6. Optimized Stagehand Configuration

### Problem
- Configuration not optimized for gpt-5-mini
- Timeouts too conservative
- Missing performance optimizations

### Solution
**File**: `src/agents/TestAgent.ts` (Lines 2232-2262)

```typescript
this.stagehand = new Stagehand({
  env: 'LOCAL',
  localBrowserLaunchOptions: {
    cdpUrl: endpointURLString(this.env.BROWSER),
  },
  modelName: 'openai/gpt-5-mini',
  modelClientOptions: {
    apiKey: this.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  },
  verbose: 1,
  domSettleTimeoutMs: 2000, // Reduced from 3000ms
  enableCaching: false, // Fresh decisions each time
});

// Configure Playwright with aggressive timeouts
this.stagehand.page.context().setDefaultTimeout(1200); // Fast failure
this.stagehand.page.context().setDefaultNavigationTimeout(30000);

// Optimize page settings
await this.stagehand.page.setExtraHTTPHeaders({
  'Accept-Language': 'en-US,en;q=0.9',
});
```

**Key Changes**:
- Reduced DOM settle timeout: 3000ms → 2000ms for faster responses
- Aggressive element timeout: 1500ms → 1200ms for quick overlay detection
- Disabled caching for fresh AI decisions
- Added HTTP headers for better compatibility

### Impact
- Faster test execution
- Better handling of overlay issues
- More consistent AI behavior

---

## Testing Recommendations

1. **Test with diverse games**:
   - Tic-tac-toe (click-based)
   - Platformers (keyboard-based)
   - Puzzle games (mixed controls)

2. **Validate screenshot quality**:
   - Ensure no duplicates
   - Verify captures at meaningful transitions
   - Check minimum 3 screenshots captured

3. **Check evaluation specificity**:
   - Scores should vary between games
   - Justifications should reference actual gameplay
   - No generic templated responses

4. **Monitor live feed**:
   - Phase summaries should be concise
   - Easy to scan at a glance
   - No excessive noise

---

## Files Modified

1. **src/agents/TestAgent.ts** (Primary changes)
   - Added `getPageStateHash()` method
   - Added `getRetryContext()` method
   - Added `summarizePhase()` method
   - Updated Phase 3 gameplay prompts
   - Enhanced Phase 4 evaluation prompt
   - Optimized Stagehand configuration
   - Updated screenshot capture logic
   - Added phase summaries to all phases

---

## Breaking Changes

None. All changes are backward compatible. Existing tests will benefit from improvements automatically.

---

## Future Enhancements

1. **Advanced retry strategies**: More sophisticated analysis of failure patterns
2. **Game-type detection**: Auto-detect game genre for specialized strategies
3. **Progressive screenshot quality**: Increase screenshot frequency during critical moments
4. **Evaluation templates**: Game-type-specific evaluation criteria
5. **Real-time summarization**: Stream-based phase summaries during execution

---

## Metrics for Success

- **Screenshot Quality**: <3 duplicates per test run
- **Evaluation Variance**: >20 point spread across different games
- **Retry Success**: >50% improvement on retry attempts
- **Live Feed Clarity**: Phase summaries under 100 characters
- **Test Speed**: <10% slowdown from optimizations

---

## Related Documents

- Original issue: Terminal logs & live feed from test run
- Story 3.5: AI Agent & Workflow Improvements
- ADR: Smart Screenshot Capture Strategy
- ADR: Retry Context Mechanism

