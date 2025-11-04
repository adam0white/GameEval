/**
 * Test Runner for GameEval Integration Tests
 * Executes all test suites
 */

import { runBrowserIntegrationTests } from './browser-integration.test';
import { runPhase1IntegrationTests } from './phase1-integration.test';

/**
 * Main test runner entry point
 * Called by wrangler dev with --test flag
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Only handle test routes
    if (!url.pathname.startsWith('/test')) {
      return new Response('Not Found', { status: 404 });
    }

    console.log('\n========================================');
    console.log('GameEval Integration Tests');
    console.log('========================================\n');

    try {
      // Run all test suites
      await runBrowserIntegrationTests(env);
      console.log('\n');
      await runPhase1IntegrationTests(env);

      console.log('\n========================================');
      console.log('All Tests Complete');
      console.log('========================================\n');

      return new Response('Tests completed. Check console for results.', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Test runner error:', message);
      
      return new Response(`Test runner error: ${message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  },
};

