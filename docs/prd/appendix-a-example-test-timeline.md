# Appendix A: Example Test Timeline

**Example test run for "https://game-example.com/space-shooter":**

```
Test ID: test-a7b3c9d2-4f1e-4a8b-9c2d-5e6f7a8b9c0d

00:00 - Test started, TestAgent DO created
00:02 - Phase 1: TestAgent navigating to URL
00:05 - Phase 1: Page loaded, screenshot captured and stored to R2
00:06 - Phase 1: Detected game canvas, ready for interaction
00:08 - Phase 2: Analyzing UI with Stagehand observe()
00:12 - Phase 2: Identified controls: WASD movement, Space to shoot, Click to start
00:15 - Phase 3: Starting gameplay exploration (Computer Use mode)
00:18 - Phase 3: Clicked "Start Game" button → screenshot saved
00:22 - Phase 3: Testing WASD movement → screenshot saved
00:35 - Phase 3: Testing shoot action (Space key) → screenshot saved
00:50 - Phase 3: Exploring enemy interactions → screenshot saved
01:15 - Phase 3: Attempting level progression → screenshot saved
02:15 - Phase 3: Gameplay session complete (2 min, 8 screenshots captured)
02:18 - Phase 4: Analyzing 8 screenshots with Workers AI vision
02:35 - Phase 4: Reviewing console logs (2 warnings, 0 errors)
02:40 - Phase 4: Generating evaluation scores across 5 metrics
02:48 - Phase 4: Calculating overall quality score
02:50 - Test completed, overall score: 78/100
02:51 - Results stored to D1, TestAgent ready for queries
```

---

---

*End of PRD*

