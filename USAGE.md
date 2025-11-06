# GameEval Usage Guide

**How to test browser-based games with GameEval's AI-powered testing pipeline**

## Table of Contents

1. [How to Submit Tests via Dashboard](#how-to-submit-tests-via-dashboard)
2. [How to Interpret Quality Scores](#how-to-interpret-quality-scores)
3. [Input Schema Format and Examples](#input-schema-format-and-examples)
4. [Troubleshooting Common Issues](#troubleshooting-common-issues)
5. [Best Practices](#best-practices)

---

## How to Submit Tests via Dashboard

### Step 1: Access the Dashboard

Visit the GameEval dashboard:
- **Production**: https://gameeval.adamwhite.work
- **Local Development**: http://localhost:8787

### Step 2: Fill Out the Test Submission Form

The dashboard presents a simple form with two fields:

1. **Game URL** (Required)
   - Enter the full URL of the game to test
   - Must be a valid HTTP or HTTPS URL
   - Example: `https://example.com/my-game.html`

2. **Input Schema** (Optional)
   - JSON schema that describes game controls and expected interactions
   - Helps the AI agent discover and prioritize specific controls
   - Leave blank for fully autonomous discovery
   - See [Input Schema Format](#input-schema-format-and-examples) for details

### Step 3: Submit the Test

Click the **"Submit Test"** button to start the test execution.

### Step 4: View Test Progress

After submission:
- A **test ID** is displayed (e.g., `test-1762269046141`)
- The test appears in the **"Recent Test Runs"** list
- Status updates in real-time: `Queued` → `Running` → `Completed`
- Progress indicator shows current phase (Phase 1-4)

### Step 5: View Test Results

Once the test completes (status: `Completed`):
- **Overall Quality Score** displayed (0-100 scale, color-coded)
- Click the test card to expand and view detailed report
- View individual metric scores with AI justifications
- Browse screenshot gallery showing captured game states
- Download complete test report as JSON

### Real-Time Updates

The dashboard uses **WebSockets** for live updates:
- **Live Feed**: Displays test events as they happen (expand with toggle button)
- **Status Updates**: Test status changes automatically without page refresh
- **Progress Tracking**: Phase completion and progress percentage update live
- **Fallback**: Automatically falls back to polling if WebSocket connection fails

---

## How to Interpret Quality Scores

### Overall Quality Score

The **Overall Quality Score** is a weighted average (0-100) of five individual metrics:

| Score Range | Color | Interpretation |
|-------------|-------|----------------|
| **70-100** | 🟢 Green | **Good** - Game is high quality, playable, well-designed |
| **50-69** | 🟡 Yellow | **Fair** - Game has issues but is functional |
| **0-49** | 🔴 Red | **Poor** - Game has significant problems |

### Individual Metric Scores

GameEval evaluates games across five key dimensions:

#### 1. **Load Metric** (Weight: 20%)

**What it measures**: Game loading and initial rendering success

- ✅ **High score (70-100)**: Game loads quickly, all assets render correctly
- ⚠️ **Medium score (50-69)**: Game loads but with delays or missing assets
- ❌ **Low score (0-49)**: Game fails to load or critical rendering errors

**AI justification includes**: Load time, asset loading success, console errors, visual completeness

#### 2. **Visual Metric** (Weight: 20%)

**What it measures**: UI quality, aesthetics, visual design

- ✅ **High score (70-100)**: Professional UI, clear layout, attractive design
- ⚠️ **Medium score (50-69)**: Functional UI but basic styling or layout issues
- ❌ **Low score (0-49)**: Poor visual design, broken layout, illegible text

**AI justification includes**: UI clarity, color scheme, typography, responsive design, visual polish

#### 3. **Controls Metric** (Weight: 20%)

**What it measures**: Control discoverability and interaction quality

- ✅ **High score (70-100)**: Controls are obvious, labeled, and responsive
- ⚠️ **Medium score (50-69)**: Some controls discoverable, others require exploration
- ❌ **Low score (0-49)**: Controls are hidden, broken, or non-functional

**AI justification includes**: Button visibility, labeling, interaction feedback, control responsiveness

#### 4. **Playability Metric** (Weight: 25%)

**What it measures**: Gameplay quality, engagement, fun factor

- ✅ **High score (70-100)**: Engaging gameplay, clear objectives, satisfying mechanics
- ⚠️ **Medium score (50-69)**: Basic gameplay works but lacks depth or has minor issues
- ❌ **Low score (0-49)**: Confusing gameplay, broken mechanics, unplayable

**AI justification includes**: Game mechanics, objective clarity, difficulty balance, engagement level

#### 5. **Technical Metric** (Weight: 15%)

**What it measures**: Performance, errors, technical implementation

- ✅ **High score (70-100)**: No errors, smooth performance, efficient implementation
- ⚠️ **Medium score (50-69)**: Minor errors or performance issues
- ❌ **Low score (0-49)**: Frequent errors, crashes, severe performance problems

**AI justification includes**: Console errors, network errors, frame rate, resource usage

### Understanding AI Justifications

Each metric score includes a **text justification** explaining the AI's reasoning:

```
Load Metric: 85/100
Justification: "Game loaded successfully in 1.2 seconds with all assets 
rendering correctly. Minor delay in loading background music (2s). No 
critical errors in console. Initial game state fully interactive."
```

**Key points**:
- Justifications are **specific** (cite actual observations, timings, errors)
- Justifications explain **why** the score was given
- Justifications highlight **both strengths and weaknesses**

### Score Interpretation Guide

| Overall Score | Recommendation |
|---------------|----------------|
| **90-100** | Excellent - Production ready, high-quality game |
| **70-89** | Good - Minor improvements recommended, generally solid |
| **50-69** | Fair - Significant improvements needed before release |
| **30-49** | Poor - Major issues, requires substantial rework |
| **0-29** | Critical - Game is largely broken, fundamental problems |

### When to Be Concerned

🚨 **Red flags** that warrant immediate attention:

- **Load score < 50**: Game may not work for many users
- **Playability score < 40**: Core gameplay is broken
- **Technical score < 40**: Serious bugs or performance issues
- **Any metric at 0**: Complete failure in that dimension

---

## Input Schema Format and Examples

### What is the Input Schema?

The **Input Schema** is an optional JSON object that describes:
- Expected game controls (buttons, inputs, actions)
- Gameplay objectives or goals
- Expected game states or phases

**Why provide a schema?**
- Helps AI agent **discover controls faster**
- Ensures AI **prioritizes specific interactions**
- Guides AI to **expected gameplay patterns**

**When to skip it?**
- For fully autonomous testing (AI discovers everything)
- When you don't know the game structure
- For exploratory testing

### JSON Schema Format

```json
{
  "controls": [
    {
      "name": "string",           // Control name (e.g., "Play Button")
      "type": "string",           // Control type (e.g., "button", "input", "slider")
      "selector": "string",       // CSS selector or description (optional)
      "action": "string",         // Expected action (e.g., "click", "input text")
      "priority": "high|medium|low" // Discovery priority (optional)
    }
  ],
  "objectives": [
    {
      "description": "string",    // Gameplay objective
      "expectedState": "string"   // Expected game state after objective (optional)
    }
  ],
  "metadata": {
    "gameType": "string",         // Game genre (e.g., "puzzle", "action", "strategy")
    "difficulty": "string",       // Expected difficulty (optional)
    "estimatedPlaytime": "string" // How long to play (e.g., "2 minutes")
  }
}
```

### Example 1: Action Game

```json
{
  "controls": [
    {
      "name": "Start Button",
      "type": "button",
      "selector": "#start-btn",
      "action": "click",
      "priority": "high"
    },
    {
      "name": "Arrow Keys",
      "type": "keyboard",
      "action": "move player",
      "priority": "high"
    },
    {
      "name": "Spacebar",
      "type": "keyboard",
      "action": "jump",
      "priority": "medium"
    }
  ],
  "objectives": [
    {
      "description": "Start the game and complete level 1",
      "expectedState": "Level 1 Complete screen visible"
    }
  ],
  "metadata": {
    "gameType": "platformer",
    "difficulty": "easy",
    "estimatedPlaytime": "3 minutes"
  }
}
```

### Example 2: Puzzle Game

```json
{
  "controls": [
    {
      "name": "Play Button",
      "type": "button",
      "action": "click",
      "priority": "high"
    },
    {
      "name": "Puzzle Tiles",
      "type": "interactive-element",
      "action": "click to swap",
      "priority": "high"
    },
    {
      "name": "Reset Button",
      "type": "button",
      "action": "click",
      "priority": "low"
    }
  ],
  "objectives": [
    {
      "description": "Solve the first puzzle",
      "expectedState": "Success message or next level unlocked"
    }
  ],
  "metadata": {
    "gameType": "puzzle",
    "difficulty": "medium",
    "estimatedPlaytime": "2 minutes"
  }
}
```

### Example 3: Strategy Game

```json
{
  "controls": [
    {
      "name": "Start Game",
      "type": "button",
      "action": "click",
      "priority": "high"
    },
    {
      "name": "Unit Selection",
      "type": "interactive-element",
      "action": "click units on map",
      "priority": "high"
    },
    {
      "name": "Build Menu",
      "type": "menu",
      "action": "open and select building",
      "priority": "medium"
    },
    {
      "name": "End Turn",
      "type": "button",
      "action": "click",
      "priority": "medium"
    }
  ],
  "objectives": [
    {
      "description": "Build initial base and train first unit",
      "expectedState": "At least one unit created"
    },
    {
      "description": "Complete first turn successfully",
      "expectedState": "Turn counter increments"
    }
  ],
  "metadata": {
    "gameType": "turn-based strategy",
    "difficulty": "medium",
    "estimatedPlaytime": "5 minutes"
  }
}
```

### Schema Validation Rules

- **Valid JSON**: Must be properly formatted JSON (use a JSON validator if unsure)
- **Optional**: All fields are optional - provide as much or as little as you want
- **Flexible**: AI adapts schema interpretation to actual game structure
- **Non-blocking**: Invalid schema is logged but doesn't fail the test

### How the AI Uses the Schema

1. **Phase 2 (Control Discovery)**:
   - AI prioritizes controls listed in schema
   - Uses `selector` hints to locate controls faster
   - Validates discovered controls against schema expectations

2. **Phase 3 (Gameplay Exploration)**:
   - AI follows objectives from schema
   - Attempts to reach expected game states
   - Falls back to autonomous exploration if objectives aren't achievable

3. **Phase 4 (Evaluation)**:
   - AI considers schema metadata (game type, difficulty) when scoring
   - Compares actual game behavior to schema expectations
   - Factors schema adherence into quality scores

---

## Troubleshooting Common Issues

### Test Status Stuck on "Queued"

**Symptom**: Test remains in "Queued" status for > 30 seconds

**Possible Causes**:
- Workflow binding not configured correctly
- TestAgent Durable Object not deployed
- Cloudflare Workflows service issue

**Solutions**:
1. Check Cloudflare dashboard → Workflows → Verify `game-test-pipeline` is deployed
2. Check Cloudflare dashboard → Durable Objects → Verify `TestAgentV2` exists
3. View logs: `wrangler tail` to check for errors
4. Redeploy: `npm run deploy`

**When to report**: If issue persists after redeployment

---

### Test Fails Immediately

**Symptom**: Test transitions from "Queued" to "Failed" in < 5 seconds

**Possible Causes**:
- Invalid game URL (404, CORS, HTTPS error)
- Browser Rendering binding not accessible
- Network issues reaching game server

**Solutions**:
1. Verify game URL is accessible in your browser
2. Ensure game URL is HTTP or HTTPS (not file://)
3. Check if game requires authentication or special headers
4. Test with a known-working example game first
5. Check error message in test report for specific details

**Common error messages**:
- `"Game URL must be a valid HTTP or HTTPS URL"` → Fix URL format
- `"Failed to load game"` → Game server unreachable or CORS issue
- `"Browser session failed"` → Browser Rendering service issue

**When to report**: If known-good game URL consistently fails

---

### No Screenshots Captured

**Symptom**: Test completes but screenshot gallery is empty

**Possible Causes**:
- R2 bucket access issue
- TestAgent screenshot capture failing
- Game rendering issue (no visible content)

**Solutions**:
1. Check Cloudflare dashboard → R2 → Verify `gameeval-evidence` bucket exists
2. Check R2 bucket contents for test artifacts
3. Review test events log for screenshot upload failures
4. Verify game has visible content (not blank page)

**When to report**: If multiple tests have no screenshots but test completes successfully

---

### WebSocket Connection Fails

**Symptom**: Live Feed shows "Connection failed" or "Using polling for updates"

**Possible Causes**:
- Network firewall blocking WebSocket connections
- TestAgent Durable Object WebSocket endpoint issue
- Browser security settings

**Impact**:
- **Not critical** - Dashboard automatically falls back to polling
- Updates are slightly delayed (3-second polling instead of real-time)

**Solutions**:
1. Check browser console for WebSocket errors
2. Verify browser allows WebSocket connections
3. Test on different network (e.g., mobile hotspot) to rule out firewall
4. Refresh page and try again

**When to report**: If WebSocket consistently fails across all tests and networks

---

### Quality Scores Not Generated

**Symptom**: Test completes but shows "No score" or overall_score is null

**Possible Causes**:
- AI Gateway request failed
- Phase 4 (Evaluation) did not execute
- Scoring logic error

**Solutions**:
1. Check test events log - verify Phase 4 executed
2. View Cloudflare dashboard logs for AI Gateway errors
3. Verify AI Gateway binding is configured in `wrangler.toml`
4. Check for Phase 4 timeout (60-second limit)

**When to report**: If scores consistently missing despite test completing all phases

---

### Dashboard Shows Error Message

**Symptom**: Red error banner appears in dashboard UI

**Possible Causes**:
- RPC method call failed
- Network error
- Invalid input provided

**Solutions**:
1. **Check browser console** (`F12` → Console tab) for detailed error
2. Read error message - it usually describes the issue:
   - `"Game URL is required"` → Fill in game URL field
   - `"Input schema must be valid JSON"` → Fix JSON syntax
   - `"Failed to load test report"` → Test ID might be invalid
3. Refresh page and try again
4. Clear browser cache if errors persist

**When to report**: If error message is unclear or doesn't help resolve the issue

---

### Test Takes Too Long

**Symptom**: Test runs for > 5 minutes without completing

**Possible Causes**:
- Game is very complex or slow to load
- AI agent stuck in exploration loop
- Phase timeout not enforced correctly

**Expected Timing**:
- **Phase 1 (Load)**: 10-30 seconds
- **Phase 2 (Controls)**: 30-60 seconds
- **Phase 3 (Gameplay)**: 60-120 seconds
- **Phase 4 (Evaluation)**: 30-60 seconds
- **Total**: 2-4 minutes typically

**Solutions**:
1. Wait up to 5 minutes - complex games may take longer
2. Check Live Feed for progress updates
3. If stuck on one phase > 2 minutes, test may be hung
4. Refresh dashboard to check if test actually completed (WebSocket may have disconnected)

**When to report**: If test runs > 10 minutes without completion

---

### How to Check Logs

#### Browser Console Logs

1. Open browser developer tools: `F12` or `Cmd+Option+I` (Mac)
2. Click **Console** tab
3. Look for red errors or warnings
4. Copy error messages for troubleshooting

#### Cloudflare Worker Logs

```bash
# Real-time log streaming
wrangler tail

# Or view in Cloudflare Dashboard:
# Navigate to: Workers & Pages → gameeval-qa-pipeline → Logs
```

#### Test Event Log

1. Expand test card in dashboard
2. Scroll to **"Test Events"** section
3. Review chronological event log with timestamps
4. Look for error events or missing phases

---

### When to Report Issues

**Report critical bugs** if:
- Same issue occurs consistently (> 3 times)
- Issue blocks core functionality (can't submit tests, no results)
- Error messages are confusing or misleading
- Logs show unexpected crashes or exceptions

**Report enhancement requests** if:
- Feature is missing or incomplete
- UX could be improved
- Documentation is unclear

**Contact**: See repository issues or contact development team

---

## Best Practices

### ✅ Recommended Game Types

GameEval works best with:
- **DOM-based games**: HTML buttons, divs, standard elements
- **Text-based games**: Adventure games, interactive fiction
- **Simple action games**: Mouse/keyboard input, clear UI
- **Puzzle games**: Tile-based, match-3, logic puzzles
- **Strategy games**: Turn-based, menu-driven

### ⚠️ Limited Support

GameEval has limitations with:
- **Canvas-based games**: AI cannot "see inside" canvas element (only overall visual)
- **WebGL/3D games**: Limited interaction capabilities
- **Real-time multiplayer**: Requires other players, hard to test in isolation
- **Audio-heavy games**: AI cannot evaluate sound quality

### 📝 Input Schema Recommendations

- **Start simple**: Provide basic controls first, expand later
- **Be specific**: Include CSS selectors if you know them
- **Prioritize**: Mark critical controls as "high" priority
- **Realistic objectives**: Don't expect AI to beat hard levels
- **Test without schema first**: See what AI discovers autonomously

### 🎮 Testing Multiple Games

To test several games efficiently:
1. Submit tests in parallel (no rate limits currently)
2. Use descriptive game URLs (helps identify tests in list)
3. Expand Live Feed only for active tests (reduces WebSocket connections)
4. Export results as JSON for archival/comparison

### 📊 Interpreting Results

- **Compare scores across games**: Identify patterns (e.g., all games score low on "Visual")
- **Read justifications carefully**: Scores alone don't tell full story
- **Check screenshots**: Verify AI "saw" what you expected
- **Review event log**: Understand what AI actually did

### 🔄 Iterative Testing

1. **Initial test**: Run with no input schema (baseline)
2. **Review results**: Identify what AI missed or got wrong
3. **Add schema**: Guide AI to specific controls/objectives
4. **Retest**: Compare new results to baseline
5. **Refine**: Adjust schema based on results

### 🚀 Production Usage

- **Test during development**: Catch issues early
- **Test before release**: Final quality check
- **Test after updates**: Regression testing
- **Test competitors**: Benchmark against other games

---

## Additional Resources

- **README.md**: Full project documentation, setup, deployment
- **Architecture Documentation**: `/docs/architecture/index.md`
- **API Reference**: See README.md → RPC Service Binding Documentation
- **GitHub Issues**: Report bugs, request features
- **Cloudflare Documentation**: https://developers.cloudflare.com/

---

**Happy Testing!** 🎮✨

For questions or support, see [README.md](README.md) or contact the development team.


