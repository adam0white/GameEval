/**
 * GameEval QA Pipeline - Dashboard Worker
 * Main entry point for the autonomous game testing pipeline
 * Story 3.1: Dashboard Worker with URL Submission
 */

// Export the TestAgent Durable Object for Cloudflare Workers runtime
export { TestAgent } from './agents/TestAgent';

// Export the GameTestPipeline Workflow for Cloudflare Workers runtime
export { GameTestPipeline } from './workflows/GameTestPipeline';

// Import Dashboard Worker implementation
import DashboardWorker from './workers/dashboard';

/**
 * Main fetch handler - delegates to Dashboard Worker
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Delegate to Dashboard Worker
    return DashboardWorker.fetch(request, env);
  },
} satisfies ExportedHandler<Env>;

