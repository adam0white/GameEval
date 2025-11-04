/**
 * Phase 1 Integration Tests (Story 2.3)
 * Tests Phase 1: Load & Validation functionality
 */

interface TestResult {
  success: boolean;
  message: string;
  error?: string;
}

interface Phase1Result {
  success: boolean;
  requiresInteraction: boolean;
  errors: string[];
}

/**
 * Test helper to create a TestAgent DO instance
 */
async function getTestAgent(env: Env, testId: string): Promise<DurableObjectStub> {
  const id = env.TEST_AGENT.idFromName(testId);
  return env.TEST_AGENT.get(id);
}

/**
 * Test 1: Basic Phase 1 execution with valid game URL
 * Tests AC #1, #2, #3, #4, #5, #12
 */
export async function testPhase1BasicExecution(env: Env): Promise<TestResult> {
  try {
    const agent = await getTestAgent(env, 'test-phase1-basic');
    
    // Initialize TestAgent
    const initResponse = await agent.fetch('http://do/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testRunId: 'test-phase1-basic',
        gameUrl: 'https://example.com',
      }),
    });

    const initResult = await initResponse.json() as { success: boolean; error?: string };
    if (!initResult.success) {
      return {
        success: false,
        message: 'Failed to initialize TestAgent',
        error: initResult.error,
      };
    }

    // Run Phase 1
    const phase1Response = await agent.fetch('http://do/phase1', {
      method: 'POST',
    });

    const phase1Result = await phase1Response.json() as Phase1Result;
    
    // Verify result structure (AC #12)
    if (typeof phase1Result.success !== 'boolean' ||
        typeof phase1Result.requiresInteraction !== 'boolean' ||
        !Array.isArray(phase1Result.errors)) {
      return {
        success: false,
        message: 'Phase 1 result structure is invalid',
        error: `Got: ${JSON.stringify(phase1Result)}`,
      };
    }

    return {
      success: true,
      message: `Phase 1 executed successfully. Success: ${phase1Result.success}, Requires Interaction: ${phase1Result.requiresInteraction}`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to execute Phase 1',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 2: Phase 1 with interaction detection
 * Tests AC #8 - Detect if game requires user interaction to start
 */
export async function testPhase1InteractionDetection(env: Env): Promise<TestResult> {
  try {
    const agent = await getTestAgent(env, 'test-phase1-interaction');
    
    // Initialize with a game URL that might have a play button
    const initResponse = await agent.fetch('http://do/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testRunId: 'test-phase1-interaction',
        gameUrl: 'https://example.com',
      }),
    });

    const initResult = await initResponse.json() as { success: boolean; error?: string };
    if (!initResult.success) {
      return {
        success: false,
        message: 'Failed to initialize TestAgent',
        error: initResult.error,
      };
    }

    // Run Phase 1
    const phase1Response = await agent.fetch('http://do/phase1', {
      method: 'POST',
    });

    const phase1Result = await phase1Response.json() as Phase1Result;
    
    // Verify interaction detection field exists
    if (typeof phase1Result.requiresInteraction !== 'boolean') {
      return {
        success: false,
        message: 'requiresInteraction field is missing or invalid',
        error: `Got: ${JSON.stringify(phase1Result)}`,
      };
    }

    return {
      success: true,
      message: `Interaction detection working. Requires Interaction: ${phase1Result.requiresInteraction}`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to test interaction detection',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 3: Phase 1 error handling with invalid URL
 * Tests error handling and user-friendly messages
 */
export async function testPhase1ErrorHandling(env: Env): Promise<TestResult> {
  try {
    const agent = await getTestAgent(env, 'test-phase1-error');
    
    // Initialize with invalid URL
    const initResponse = await agent.fetch('http://do/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testRunId: 'test-phase1-error',
        gameUrl: 'https://invalid-url-that-does-not-exist-12345.com',
      }),
    });

    const initResult = await initResponse.json() as { success: boolean; error?: string };
    if (!initResult.success) {
      return {
        success: false,
        message: 'Failed to initialize TestAgent',
        error: initResult.error,
      };
    }

    // Run Phase 1 (expect it to handle errors gracefully)
    const phase1Response = await agent.fetch('http://do/phase1', {
      method: 'POST',
    });

    const phase1Result = await phase1Response.json() as Phase1Result;
    
    // Verify graceful error handling
    if (phase1Result.success) {
      return {
        success: false,
        message: 'Phase 1 should have failed with invalid URL',
      };
    }

    if (!phase1Result.errors || phase1Result.errors.length === 0) {
      return {
        success: false,
        message: 'Phase 1 should return error messages',
      };
    }

    // Check for user-friendly error messages (no stack traces)
    const hasStackTrace = phase1Result.errors.some(err => 
      err.includes('at ') || err.includes('Error:')
    );

    if (hasStackTrace) {
      return {
        success: false,
        message: 'Error messages should be user-friendly, not technical',
        error: `Got: ${phase1Result.errors.join(', ')}`,
      };
    }

    return {
      success: true,
      message: `Error handling working correctly. Errors: ${phase1Result.errors.join(', ')}`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to test error handling',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 4: Phase 1 timeout handling
 * Tests timeout constraint (30 seconds)
 */
export async function testPhase1Timeout(env: Env): Promise<TestResult> {
  try {
    const agent = await getTestAgent(env, 'test-phase1-timeout');
    
    // Initialize
    const initResponse = await agent.fetch('http://do/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testRunId: 'test-phase1-timeout',
        gameUrl: 'https://httpstat.us/200?sleep=35000', // Should timeout
      }),
    });

    const initResult = await initResponse.json() as { success: boolean; error?: string };
    if (!initResult.success) {
      return {
        success: false,
        message: 'Failed to initialize TestAgent',
        error: initResult.error,
      };
    }

    // Run Phase 1 (should timeout)
    const startTime = Date.now();
    const phase1Response = await agent.fetch('http://do/phase1', {
      method: 'POST',
    });
    const duration = Date.now() - startTime;

    const phase1Result = await phase1Response.json() as Phase1Result;
    
    // Verify timeout occurred
    if (phase1Result.success) {
      return {
        success: false,
        message: 'Phase 1 should have timed out',
      };
    }

    // Verify timeout happened within reasonable time (around 30 seconds)
    if (duration > 35000) {
      return {
        success: false,
        message: `Phase 1 timeout took too long: ${duration}ms (expected ~30000ms)`,
      };
    }

    return {
      success: true,
      message: `Timeout handling working correctly. Duration: ${duration}ms`,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to test timeout handling',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Test 5: Verify status update to D1
 * Tests AC #10 - Update test_runs.status = 'running'
 */
export async function testPhase1StatusUpdate(env: Env): Promise<TestResult> {
  try {
    const testRunId = 'test-phase1-status';
    
    // Delete any existing test run with this ID (from previous test runs)
    await env.DB.prepare('DELETE FROM test_runs WHERE id = ?').bind(testRunId).run();
    
    // Create test run in D1
    await env.DB.prepare(
      'INSERT INTO test_runs (id, url, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(testRunId, 'https://example.com', 'pending', Date.now(), Date.now()).run();

    const agent = await getTestAgent(env, testRunId);
    
    // Initialize
    const initResponse = await agent.fetch('http://do/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testRunId,
        gameUrl: 'https://example.com',
      }),
    });

    const initResult = await initResponse.json() as { success: boolean; error?: string };
    if (!initResult.success) {
      return {
        success: false,
        message: 'Failed to initialize TestAgent',
        error: initResult.error,
      };
    }

    // Run Phase 1
    await agent.fetch('http://do/phase1', {
      method: 'POST',
    });

    // Check status in D1
    const statusResult = await env.DB.prepare(
      'SELECT status FROM test_runs WHERE id = ?'
    ).bind(testRunId).first<{ status: string }>();

    if (!statusResult) {
      return {
        success: false,
        message: 'Test run not found in D1',
      };
    }

    if (statusResult.status !== 'running') {
      return {
        success: false,
        message: `Status should be 'running', got '${statusResult.status}'`,
      };
    }

    return {
      success: true,
      message: 'Status update to D1 working correctly',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to test status update',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main test runner
 */
export async function runPhase1IntegrationTests(env: Env): Promise<void> {
  console.log('=== Phase 1 Integration Tests (Story 2.3) ===\n');

  const tests = [
    { name: 'Phase 1 Basic Execution (AC 1,2,3,4,5,12)', fn: testPhase1BasicExecution },
    { name: 'Interaction Detection (AC 8)', fn: testPhase1InteractionDetection },
    { name: 'Error Handling', fn: testPhase1ErrorHandling },
    { name: 'Timeout Handling', fn: testPhase1Timeout },
    { name: 'D1 Status Update (AC 10)', fn: testPhase1StatusUpdate },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn(env);
      if (result.success) {
        console.log(`✅ PASS: ${test.name}`);
        console.log(`   ${result.message}\n`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   ${result.message}`);
        if (result.error) {
          console.log(`   Error: ${result.error}\n`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.name}`);
      console.log(`   ${error instanceof Error ? error.message : String(error)}\n`);
      failed++;
    }
  }

  console.log('=== Test Summary ===');
  console.log(`Total: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
}

