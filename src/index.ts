/**
 * GameEval QA Pipeline - Dashboard Worker
 * Main entry point for the autonomous game testing pipeline
 */
import { STATUS_CODES } from './shared/constants';

// Export the TestAgent Durable Object for Cloudflare Workers runtime
export { TestAgent } from './agents/TestAgent';

// Export the GameTestPipeline Workflow for Cloudflare Workers runtime
export { GameTestPipeline } from './workflows/GameTestPipeline';

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

