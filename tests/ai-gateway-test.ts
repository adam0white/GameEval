/**
 * AI Gateway Integration Test
 * Story 1.5: AI Gateway Configuration
 * 
 * Tests the callAI() and getAICosts() helper functions
 */

/// <reference types="../worker-configuration" />

import { callAI, getAICosts } from '../src/shared/helpers/ai-gateway';

/**
 * Manual integration test for AI Gateway
 * 
 * To run:
 * 1. Start local dev: npx wrangler dev
 * 2. Test Workers AI: Should succeed with Workers AI
 * 3. Test fallback: Force fallback to OpenAI
 * 4. Verify costs: Check cost tracking works
 */
async function testAIGateway(env: { AI: Ai; DB: D1Database }) {
  console.log('🧪 Testing AI Gateway Integration...\n');

  // Generate test run ID
  const testRunId = crypto.randomUUID();
  console.log(`Test Run ID: ${testRunId}\n`);

  // Test 1: Workers AI (primary) - text-only
  console.log('📝 Test 1: Workers AI (text-only)');
  const test1Result = await callAI(
    env,
    'What is 2+2? Answer in one word.',
    undefined,
    'primary',
    testRunId,
    { test_name: 'simple-math' }
  );

  if (test1Result.success) {
    console.log('✅ Workers AI succeeded');
    console.log(`   Response: ${test1Result.data.text.substring(0, 100)}`);
    console.log(`   Model: ${test1Result.data.model}`);
    console.log(`   Provider: ${test1Result.data.provider}`);
    console.log(`   Cost: $${test1Result.data.cost}`);
    console.log(`   Cached: ${test1Result.data.cached}`);
  } else {
    const errorMsg = test1Result.success ? 'Unknown error' : test1Result.error;
    console.log('❌ Workers AI failed:', errorMsg);
  }
  console.log('');

  // Test 2: OpenAI fallback (forced) - text-only
  console.log('📝 Test 2: OpenAI fallback (text-only)');
  const test2Result = await callAI(
    env,
    'What is the capital of France? Answer in one word.',
    undefined,
    'fallback',
    testRunId,
    { test_name: 'simple-geography' }
  );

  if (test2Result.success) {
    console.log('✅ OpenAI succeeded');
    console.log(`   Response: ${test2Result.data.text.substring(0, 100)}`);
    console.log(`   Model: ${test2Result.data.model}`);
    console.log(`   Provider: ${test2Result.data.provider}`);
    console.log(`   Cost: $${test2Result.data.cost?.toFixed(4)}`);
    console.log(`   Cached: ${test2Result.data.cached}`);
    console.log(`   Tokens: ${JSON.stringify(test2Result.data.tokens)}`);
  } else {
    const errorMsg = test2Result.success ? 'Unknown error' : test2Result.error;
    console.log('❌ OpenAI failed:', errorMsg);
  }
  console.log('');

  // Test 3: Get total AI costs
  console.log('📝 Test 3: Get total AI costs');
  const costsResult = await getAICosts(env.DB, testRunId);

  if (costsResult.success) {
    console.log('✅ Cost calculation succeeded');
    console.log(`   Total cost: $${costsResult.data.toFixed(4)}`);
  } else {
    const errorMsg = costsResult.success ? 'Unknown error' : costsResult.error;
    console.log('❌ Cost calculation failed:', errorMsg);
  }
  console.log('');

  console.log('🎉 AI Gateway integration test complete!');
}

// Export for manual testing
export { testAIGateway };

