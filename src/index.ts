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

    // All other routes return 404
    return new Response('Not Found', {
      status: STATUS_CODES.NOT_FOUND,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  },
} satisfies ExportedHandler<Env>;

