/**
 * Phase 2 Integration Tests
 * Story 2.4: Phase 2 - Control Discovery
 * 
 * Manual test scenarios for TestAgent's Phase 2 control discovery functionality
 * 
 * USAGE:
 * 1. Run: npm run dev (starts wrangler dev server)
 * 2. In another terminal, use curl or Postman to test the endpoints
 * 3. Follow test scenarios below
 */

/**
 * Test Configuration
 */
const TEST_GAME_URL = 'https://demo.playwright.dev/movies'; // Known working demo page
const TEST_BASE_URL = 'http://localhost:8787'; // Wrangler dev server

/**
 * TEST SCENARIO 1: AC #1 - runPhase2() method executes without errors
 * 
 * Steps:
 * 1. Initialize TestAgent:
 *    curl -X POST ${TEST_BASE_URL}/test/init \
 *      -H "Content-Type: application/json" \
 *      -d '{"testRunId":"test-1","gameUrl":"${TEST_GAME_URL}"}'
 * 
 * 2. Run Phase 1 (required before Phase 2):
 *    curl -X POST ${TEST_BASE_URL}/test/phase1
 * 
 * 3. Run Phase 2:
 *    curl -X POST ${TEST_BASE_URL}/test/phase2
 * 
 * Expected Result:
 * - HTTP 200 response
 * - JSON body with: { success: boolean, controls: {}, hypothesis: string }
 */

/**
 * TEST SCENARIO 2: AC #2, #3 - Stagehand observe() discovers and classifies controls
 * 
 * Steps:
 * 1. Same as Scenario 1 setup
 * 2. Run Phase 2 and verify response
 * 
 * Expected Result:
 * - result.success === true
 * - result.controls is an object
 * - Each control has: type ('click' | 'keyboard' | 'drag' | 'hover') and description
 * 
 * Verification:
 * - Check that controls object is not empty
 * - Verify each control has both 'type' and 'description' properties
 * - Verify type is one of the allowed values
 */

/**
 * TEST SCENARIO 3: AC #4 - inputSchema prioritization
 * 
 * Steps:
 * 1. Initialize TestAgent with inputSchema:
 *    curl -X POST ${TEST_BASE_URL}/test/init \
 *      -H "Content-Type: application/json" \
 *      -d '{"testRunId":"test-2","gameUrl":"${TEST_GAME_URL}","inputSchema":"{\"controls\":{\"movement\":[\"W\",\"A\",\"S\",\"D\"],\"actions\":[\"Space\"]}}"}'
 * 
 * 2. Run Phase 1:
 *    curl -X POST ${TEST_BASE_URL}/test/phase1
 * 
 * 3. Run Phase 2:
 *    curl -X POST ${TEST_BASE_URL}/test/phase2
 * 
 * Expected Result:
 * - Controls matching inputSchema (WASD, Space) appear first in result.controls
 * - D1 test_events table contains 'schema_guidance' and 'schema_validation' entries
 * - All discovered controls are present (not filtered out)
 */

/**
 * TEST SCENARIO 4: AC #5 - Screenshot capture
 * 
 * Steps:
 * 1. Same as Scenario 1 setup
 * 2. Run Phase 2
 * 3. Check R2 bucket for screenshot
 * 
 * Expected Result:
 * - Screenshot file exists in R2 bucket with pattern: {testRunId}/phase2-{timestamp}-phase2-controls.png
 * - Evidence metadata in DO state includes screenshot entry
 * 
 * Verification:
 * - Query R2 bucket: wrangler r2 object list evidence-bucket
 * - Check for phase2-controls screenshot
 */

/**
 * TEST SCENARIO 5: AC #6 - Control hypothesis generation
 * 
 * Steps:
 * 1. Same as Scenario 1 setup
 * 2. Run Phase 2
 * 3. Inspect result.hypothesis
 * 
 * Expected Result:
 * - result.hypothesis is a non-empty string
 * - Hypothesis describes discovered controls (e.g., "Game has WASD movement controls")
 * - D1 test_events table contains 'hypothesis' event
 */

/**
 * TEST SCENARIO 6: AC #7 - Agent SQL storage
 * 
 * Steps:
 * 1. Same as Scenario 1 setup
 * 2. Run Phase 2
 * 3. Query Agent SQL database (requires DO inspection)
 * 
 * Expected Result:
 * - control_discoveries table contains entries for each discovered control
 * - Each entry has: element_selector, action_type, confidence (1.0), discovered_at
 * 
 * Verification:
 * - Use Wrangler DO SQL inspector or add debug endpoint
 */

/**
 * TEST SCENARIO 7: AC #8 - D1 event logging
 * 
 * Steps:
 * 1. Same as Scenario 1 setup
 * 2. Run Phase 2
 * 3. Query D1 test_events table
 * 
 * Expected Result:
 * - test_events table contains multiple 'control_discovered' entries
 * - Each entry has description like: "Discovered {type} control: {description} at {selector}"
 * 
 * Verification SQL:
 * SELECT * FROM test_events WHERE test_run_id = 'test-1' AND event_type = 'control_discovered';
 */

/**
 * TEST SCENARIO 8: AC #9 - WebSocket broadcasting
 * 
 * Steps:
 * 1. Connect WebSocket client: ws://localhost:8787/test/ws
 * 2. Initialize TestAgent and run Phase 1
 * 3. Run Phase 2
 * 4. Listen for WebSocket messages
 * 
 * Expected Result:
 * - WebSocket receives message: { type: 'progress', phase: 'phase2', message: 'Phase 2 complete - Discovered N controls', timestamp: number }
 */

/**
 * TEST SCENARIO 9: AC #10 - Phase2Result structure
 * 
 * Steps:
 * 1. Same as Scenario 1 setup
 * 2. Run Phase 2
 * 3. Validate response structure
 * 
 * Expected Result:
 * - Response has exact structure: { success: boolean, controls: ControlMap, hypothesis: string }
 * - typeof result.success === 'boolean'
 * - typeof result.controls === 'object'
 * - typeof result.hypothesis === 'string'
 */

/**
 * TEST SCENARIO 10: Error handling - Timeout
 * 
 * Steps:
 * 1. Initialize with very slow page (or use network throttling)
 * 2. Run Phase 2
 * 3. Verify timeout handling
 * 
 * Expected Result:
 * - Phase 2 completes within 45 seconds (timeout)
 * - If timeout occurs, user-friendly error message returned
 */

/**
 * TEST SCENARIO 11: Error handling - No browser session
 * 
 * Steps:
 * 1. Initialize TestAgent (skip Phase 1)
 * 2. Run Phase 2 directly
 * 
 * Expected Result:
 * - Phase 2 either launches browser (fallback) or returns graceful error
 * - Error message is user-friendly (not stack trace)
 */

/**
 * Additional test scenarios (manual testing):
 * 
 * 1. Test with inputSchema provided:
 *    - Initialize TestAgent with inputSchema containing control hints
 *    - Verify controls are prioritized based on schema
 * 
 * 2. Test with keyboard-only game:
 *    - Use game URL with only keyboard controls (no mouse)
 *    - Verify hypothesis mentions keyboard controls
 * 
 * 3. Test with button-based game:
 *    - Use game URL with button controls
 *    - Verify hypothesis mentions buttons/clickable elements
 * 
 * 4. Test control discoveries in Agent SQL:
 *    - Query Agent SQL control_discoveries table
 *    - Verify entries match discovered controls
 * 
 * 5. Test D1 event logging:
 *    - Query D1 test_events table
 *    - Verify control_discovered events exist
 * 
 * 6. Test WebSocket broadcasting:
 *    - Connect WebSocket client before Phase 2
 *    - Verify progress message received
 * 
 * 7. Test screenshot capture:
 *    - Check R2 for phase2-controls screenshot
 *    - Verify screenshot URL in evidence metadata
 */

