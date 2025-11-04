import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import { updateTestStatus, insertTestEvent } from '../shared/helpers/d1';
import { TestStatus, Phase } from '../shared/constants';

/**
 * Input parameters for the GameTestPipeline workflow
 */
export interface GameTestPipelineInput {
  /** UUID for the test run */
  testRunId: string;
  /** URL of the game to test */
  gameUrl: string;
  /** Optional JSON schema for test guidance */
  inputSchema?: string;
}

/**
 * Phase execution result (must be JSON-serializable for Workflows)
 */
interface PhaseResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * GameTestPipeline Workflow
 * Orchestrates the 4-phase game testing process with automatic retry and state persistence
 * 
 * Architecture:
 * - Step 1: Launch TestAgent DO
 * - Step 2-5: Execute test phases (phase1-phase4) with timeouts and retries
 * - Durable execution: Each step persists state automatically
 * - Error handling: User-friendly messages, graceful degradation
 * 
 * @see docs/architecture/novel-pattern-designs.md - Pattern 3
 * @see docs/architecture/architecture-decision-records-adrs.md - ADR-003
 */
export class GameTestPipeline extends WorkflowEntrypoint<Env> {
  /**
   * Main workflow execution entry point
   * Orchestrates all 4 test phases with retry logic and timeout enforcement
   */
  async run(
    event: WorkflowEvent<GameTestPipelineInput>,
    step: WorkflowStep
  ): Promise<{ status: string; message: string; testRunId: string }> {
    const { testRunId, gameUrl, inputSchema } = event.payload;

    // Validate inputs
    const validationError = this.validateInputs(testRunId, gameUrl);
    if (validationError) {
      return {
        status: 'failed',
        message: validationError,
        testRunId,
      };
    }

    try {
      // Step 1: Launch TestAgent DO and initialize
      await step.do('launch-agent', async () => {
        await this.launchAgent(testRunId, gameUrl, inputSchema);
      });

      // Step 2: Phase 1 - Load & Validation (30s timeout)
      const phase1Result = await step.do(
        'phase1-load-validation',
        {
          timeout: '30 seconds',
          retries: {
            limit: 2,
            delay: '1 second',
            backoff: 'exponential',
          },
        },
        async () => {
          const result = await this.executePhase(testRunId, Phase.PHASE1, 'Phase 1: Load & Validation');
          // Return as plain object for serialization
          return { success: result.success, message: result.message || '' };
        }
      ) as PhaseResult;

      // Step 3: Phase 2 - Control Discovery (45s timeout)
      const phase2Result = await step.do(
        'phase2-control-discovery',
        {
          timeout: '45 seconds',
          retries: {
            limit: 2,
            delay: '1 second',
            backoff: 'exponential',
          },
        },
        async () => {
          const result = await this.executePhase(testRunId, Phase.PHASE2, 'Phase 2: Control Discovery');
          return { success: result.success, message: result.message || '' };
        }
      ) as PhaseResult;

      // Step 4: Phase 3 - Gameplay Exploration (5 min timeout, adaptive)
      const phase3Result = await step.do(
        'phase3-gameplay-exploration',
        {
          timeout: '5 minutes',
          retries: {
            limit: 2,
            delay: '2 seconds',
            backoff: 'exponential',
          },
        },
        async () => {
          const result = await this.executePhase(testRunId, Phase.PHASE3, 'Phase 3: Gameplay Exploration');
          return { success: result.success, message: result.message || '' };
        }
      ) as PhaseResult;

      // Step 5: Phase 4 - Evaluation & Scoring (60s timeout)
      // Continue even if earlier phases failed (graceful degradation - Story 2.7)
      const phase4Result = await step.do(
        'phase4-evaluation-scoring',
        {
          timeout: '60 seconds',
          retries: {
            limit: 2,
            delay: '1 second',
            backoff: 'exponential',
          },
        },
        async () => {
          // Determine if we have partial evidence from earlier phases (Story 2.7, AC #3, #4)
          const hasPartialEvidence = phase1Result.success || phase2Result.success || phase3Result.success;
          
          // Log graceful degradation if earlier phases failed
          if (!phase1Result.success || !phase2Result.success || !phase3Result.success) {
            const failedPhases = [];
            if (!phase1Result.success) failedPhases.push('Phase 1');
            if (!phase2Result.success) failedPhases.push('Phase 2');
            if (!phase3Result.success) failedPhases.push('Phase 3');
            
            await insertTestEvent(
              this.env.DB,
              testRunId,
              'workflow',
              'info',
              `Graceful degradation: ${failedPhases.join(', ')} failed, continuing to Phase 4 with partial evidence`
            );
          }
          
          const result = await this.executePhase(
            testRunId, 
            Phase.PHASE4, 
            'Phase 4: Evaluation & Scoring',
            hasPartialEvidence
          );
          return { success: result.success, message: result.message || '' };
        }
      ) as PhaseResult;

      // Check if all phases succeeded (Story 2.7 graceful degradation)
      const allPhasesSucceeded = phase1Result.success && phase2Result.success && 
                                  phase3Result.success && phase4Result.success;

      // Update final status with proper error message handling
      if (allPhasesSucceeded) {
        await updateTestStatus(this.env.DB, testRunId, TestStatus.COMPLETED);
        await insertTestEvent(
          this.env.DB,
          testRunId,
          'workflow',
          'completed',
          'Test workflow completed successfully'
        );
        return {
          status: 'completed',
          message: 'Test completed successfully. All phases executed.',
          testRunId,
        };
      } else {
        // Graceful degradation (Story 2.7, AC #3, #4, #5)
        const failedPhases = [];
        if (!phase1Result.success) failedPhases.push('Phase 1');
        if (!phase2Result.success) failedPhases.push('Phase 2');
        if (!phase3Result.success) failedPhases.push('Phase 3');
        
        const message = phase4Result.success
          ? `Test completed with partial results. ${failedPhases.join(', ')} failed, but evaluation completed with available evidence.`
          : `Test failed. ${failedPhases.join(', ')} and Phase 4 failed.`;

        // Store error message in test_runs table (Story 2.7, AC #6)
        await this.env.DB
          .prepare('UPDATE test_runs SET error_message = ?, updated_at = ? WHERE id = ?')
          .bind(message, Date.now(), testRunId)
          .run();

        await updateTestStatus(this.env.DB, testRunId, TestStatus.FAILED);
        await insertTestEvent(
          this.env.DB,
          testRunId,
          'workflow',
          'failed',
          message
        );

        return {
          status: 'failed',
          message,
          testRunId,
        };
      }
    } catch (error) {
      // Global error handler for unexpected failures (Story 2.7)
      const userFriendlyError = formatUserFriendlyError(error);
      
      // Store error message in test_runs table (Story 2.7, AC #6)
      await this.env.DB
        .prepare('UPDATE test_runs SET error_message = ?, updated_at = ? WHERE id = ?')
        .bind(userFriendlyError, Date.now(), testRunId)
        .run();
      
      await updateTestStatus(this.env.DB, testRunId, TestStatus.FAILED);
      await insertTestEvent(
        this.env.DB,
        testRunId,
        'workflow',
        'failed',
        userFriendlyError,
        JSON.stringify({ originalError: error instanceof Error ? error.message : 'Unknown error' })
      );

      return {
        status: 'failed',
        message: userFriendlyError,
        testRunId,
      };
    }
  }

  /**
   * Validate workflow inputs
   * @returns Error message if validation fails, null if valid
   */
  private validateInputs(testRunId: string, gameUrl: string): string | null {
    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(testRunId)) {
      return 'Invalid test run ID. Must be a valid UUID.';
    }

    // Validate URL format
    try {
      new URL(gameUrl);
    } catch {
      return 'Invalid game URL. Must be a valid HTTP/HTTPS URL.';
    }

    return null;
  }

  /**
   * Launch and initialize TestAgent Durable Object
   * @param testRunId - UUID for test run (also used as DO ID)
   * @param gameUrl - URL of the game to test
   * @param inputSchema - Optional JSON schema for test guidance
   */
  private async launchAgent(
    testRunId: string,
    gameUrl: string,
    inputSchema?: string
  ): Promise<void> {
    try {
      // Generate TestAgent DO ID from test run UUID (1:1 mapping)
      const testAgentId = this.env.TEST_AGENT.idFromString(testRunId);
      const testAgent = this.env.TEST_AGENT.get(testAgentId);

      // Update status to 'running'
      await updateTestStatus(this.env.DB, testRunId, TestStatus.RUNNING);
      await insertTestEvent(
        this.env.DB,
        testRunId,
        'workflow',
        'started',
        'Test workflow initiated'
      );

      // Initialize TestAgent DO
      // Note: TestAgent will be fully implemented in Epic 2
      // For now, gracefully handle "not implemented" response
      const response = await testAgent.fetch('http://testAgent/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRunId, gameUrl, inputSchema }),
      });

      if (!response.ok && response.status !== 501) {
        throw new Error(`TestAgent initialization failed: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to launch TestAgent: ${formatUserFriendlyError(error)}`);
    }
  }

  /**
   * Execute a single test phase with error handling
   * @param testRunId - UUID for test run
   * @param phase - Phase identifier (phase1-phase4)
   * @param phaseName - Human-readable phase name
   * @param isPartialEvidence - Whether this is running with partial evidence from earlier failures
   * @returns PhaseResult indicating success or failure
   */
  private async executePhase(
    testRunId: string,
    phase: Phase,
    phaseName: string,
    isPartialEvidence = false
  ): Promise<PhaseResult> {
    try {
      // Log phase start
      const startMessage = isPartialEvidence
        ? `${phaseName} started with partial evidence from earlier phases`
        : `${phaseName} started`;
      
      await insertTestEvent(
        this.env.DB,
        testRunId,
        phase,
        'started',
        startMessage
      );

      // Get TestAgent DO instance
      const testAgentId = this.env.TEST_AGENT.idFromString(testRunId);
      const testAgent = this.env.TEST_AGENT.get(testAgentId);

      // Call phase endpoint
      const response = await testAgent.fetch(`http://testAgent/${phase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // Handle "not implemented" gracefully (Epic 2 implementation pending)
      if (response.status === 501) {
        await insertTestEvent(
          this.env.DB,
          testRunId,
          phase,
          'completed',
          `${phaseName} completed (implementation pending)`
        );
        return {
          success: true,
          message: 'Phase completed (TestAgent implementation pending)',
        };
      }

      if (!response.ok) {
        throw new Error(`${phaseName} failed: ${response.statusText}`);
      }

      const result = (await response.json()) as Record<string, unknown>;

      // Log phase completion
      await insertTestEvent(
        this.env.DB,
        testRunId,
        phase,
        'completed',
        `${phaseName} completed`
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Log phase failure with user-friendly error
      const userFriendlyError = formatUserFriendlyError(error);
      await insertTestEvent(
        this.env.DB,
        testRunId,
        phase,
        'failed',
        `${phaseName} failed: ${userFriendlyError}`
      );

      return {
        success: false,
        message: userFriendlyError,
      };
    }
  }
}

/**
 * Translate technical errors to user-friendly messages
 * Removes stack traces and technical jargon
 * @param error - Error object or unknown error
 * @returns User-friendly error message
 */
function formatUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    // Map common error patterns to friendly messages
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return 'The operation took too long to complete. Please try again.';
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network connection error. Please check your internet connection and try again.';
    }
    if (error.message.includes('not found') || error.message.includes('404')) {
      return 'The requested resource was not found. Please verify the game URL.';
    }
    if (error.message.includes('unauthorized') || error.message.includes('403')) {
      return 'Access denied. Please check your permissions.';
    }
    if (error.message.includes('TestAgent')) {
      return 'Test agent encountered an error. The test may need to be restarted.';
    }
    
    // Generic error message without stack trace
    return error.message.split('\n')[0] || 'An unexpected error occurred during the test.';
  }
  
  return 'An unexpected error occurred during the test.';
}

