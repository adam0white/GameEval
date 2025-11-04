/**
 * GameEval QA Pipeline - Dashboard Worker
 * Main entry point for the autonomous game testing pipeline
 */
import { STATUS_CODES } from './shared/constants';

// Export the TestAgent Durable Object for Cloudflare Workers runtime
export { TestAgent } from './agents/TestAgent';

// Export the GameTestPipeline Workflow for Cloudflare Workers runtime
export { GameTestPipeline } from './workflows/GameTestPipeline';

// Import test runners (only in dev/test environments)
import { runBrowserIntegrationTests } from '../tests/browser-integration.test';
import { runPhase1IntegrationTests } from '../tests/phase1-integration.test';

/**
 * Main fetch handler for the Dashboard Worker
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle root endpoint - health check
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response('GameEval QA Pipeline - Ready', {
        status: STATUS_CODES.OK,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // DEV ONLY: Run integration tests
    if (url.pathname === '/test' && request.method === 'GET') {
      console.log('\n========================================');
      console.log('GameEval Integration Tests');
      console.log('========================================\n');

      try {
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
    }

    // DEV ONLY: Proxy to TestAgent DO for local testing
    // Format: /test-agent/{testRunId}/{endpoint}
    // Example: /test-agent/test-123/init
    if (url.pathname.startsWith('/test-agent/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length < 3) {
        return new Response('Usage: /test-agent/{testRunId}/{endpoint}', {
          status: 400,
        });
      }

      const testRunId = parts[1];
      const endpoint = '/' + parts.slice(2).join('/');

      // Get TestAgent DO instance using idFromName (accepts any string)
      // Note: In production, workflow uses idFromString with proper UUIDs
      const doId = env.TEST_AGENT.idFromName(testRunId);
      const testAgent = env.TEST_AGENT.get(doId);

      // Forward request to DO
      return testAgent.fetch(new Request(`http://testAgent${endpoint}`, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      }));
    }

    // All other routes return 404
    return new Response('Not Found', {
      status: STATUS_CODES.NOT_FOUND,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
} satisfies ExportedHandler<Env>;

