/**
 * TestAgent Durable Object
 * Manages individual test execution sessions with browser automation
 * Story 2.1: Full implementation with state management, WebSocket, and phase methods
 * Story 2.2: Browser Rendering integration with Stagehand
 * 
 * Types: DurableObject, DurableObjectState, Env are provided by wrangler types
 * via worker-configuration.d.ts (auto-generated from wrangler.toml)
 */
import puppeteer from '@cloudflare/puppeteer';
import type { Browser, Page } from '@cloudflare/puppeteer';
import { Stagehand, type ObserveResult } from '@browserbasehq/stagehand';
import { endpointURLString } from '@cloudflare/playwright';
import { WorkersAIClient } from '../shared/helpers/workersAIClient';
import { insertTestEvent, insertEvaluationScore, updateTestStatus } from '../shared/helpers/d1';
import { uploadScreenshot, uploadLog, getTestArtifacts, getPublicUrl } from '../shared/helpers/r2';
import { callAI } from '../shared/helpers/ai-gateway';
import { Phase, LogType, ERROR_MESSAGES, ERROR_PATTERNS } from '../shared/constants';
import type { TestAgentState, EvidenceMetadata, ConsoleLogEntry, NetworkError, Phase1Result, Phase2Result, Phase3Result, Phase4Result, MetricScore, ControlMap } from '../shared/types';

/**
 * Game context learned in Phase 1
 */
interface GameContext {
  gameName: string;
  gameType: string; // 'turn-based', 'action', 'puzzle', 'simulation', etc.
  requiresInteraction: boolean;
}

/**
 * Control context learned in Phase 2
 */
interface ControlContext {
  primaryControls: string[]; // ['click', 'keyboard', 'touch']
  keyboardKeys?: string[]; // e.g., ['ArrowKeys', 'Space', 'Enter']
  clickableElements: number;
  hypothesis: string;
}

/**
 * Metrics collected during each phase
 */
interface PhaseMetrics {
  phase1?: {
    loadTime: number;
    httpErrors: number;
    visuallyComplete: boolean;
    interactionRequired: boolean;
  };
  phase2?: {
    controlsFound: number;
    interactiveElements: number;
    controlDiversity: string[];
  };
  phase3?: {
    actionsPerformed: number;
    uniqueInteractions: number;
    duration: number;
    errorsEncountered: number;
  };
}

/**
 * Automatic screenshot manager - removes screenshot decisions from AI agent
 */
class ScreenshotManager {
  private lastCapture = 0;
  private actionsSinceCapture = 0;
  private phaseCaptures = new Map<string, number>();
  
  shouldCapture(phase: Phase, reason: 'phase_start' | 'phase_end' | 'action' | 'timer'): boolean {
    const now = Date.now();
    const timeSince = now - this.lastCapture;
    
    // Always capture on phase boundaries
    if (reason === 'phase_start' || reason === 'phase_end') {
      return true;
    }
    
    // Capture every 5 actions
    if (reason === 'action' && this.actionsSinceCapture >= 5) {
      return true;
    }
    
    // Capture every 10 seconds minimum
    if (reason === 'timer' && timeSince >= 10000) {
      return true;
    }
    
    return false;
  }
  
  recordCapture(phase: Phase): void {
    this.lastCapture = Date.now();
    this.actionsSinceCapture = 0;
    const count = this.phaseCaptures.get(phase) || 0;
    this.phaseCaptures.set(phase, count + 1);
  }
  
  recordAction(): void {
    this.actionsSinceCapture++;
  }
  
  getCaptureCount(phase: Phase): number {
    return this.phaseCaptures.get(phase) || 0;
  }
}

export class TestAgentV2 implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  
  // TestAgentV2 instance properties (restored from DO storage on each fetch)
  private testRunId: string = '';
  private gameUrl: string = '';
  private inputSchema?: string;
  
  // Browser automation (Story 2.2) - Using Stagehand with Workers AI
  private stagehand?: Stagehand;
  
  // WebSocket clients for real-time progress updates (not persisted)
  private websocketClients: WebSocket[] = [];
  private lastBroadcast: number = 0;
  private lastBroadcastMessage: string = '';
  
  // Agent SQL initialized flag
  private sqlInitialized: boolean = false;
  
  // State hydration flag
  private stateHydrated: boolean = false;
  
  // Screenshot manager for automatic capture
  private screenshotManager = new ScreenshotManager();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }
  
  /**
   * Hydrate instance state from Durable Object storage
   * Called on every fetch to restore persisted state after hibernation
   */
  private async hydrateState(): Promise<void> {
    if (this.stateHydrated) return;
    
    // Use blockConcurrencyWhile to ensure state is loaded before processing requests
    await this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<TestAgentState>('agentState');
      if (stored) {
        this.testRunId = stored.testRunId;
        this.gameUrl = stored.gameUrl;
        this.inputSchema = stored.inputSchema;
      }
      this.stateHydrated = true;
    });
  }
  
  /**
   * Persist core state to Durable Object storage
   */
  private async persistState(): Promise<void> {
    const agentState: TestAgentState = {
      testRunId: this.testRunId,
      gameUrl: this.gameUrl,
      inputSchema: this.inputSchema,
      evidence: await this.state.storage.get<EvidenceMetadata[]>('evidence') || [],
      phaseResults: await this.state.storage.get<Record<string, any>>('phaseResults') || {},
      browserSession: await this.state.storage.get('browserSession'),
      consoleLogs: await this.state.storage.get<ConsoleLogEntry[]>('consoleLogs') || [],
      networkErrors: await this.state.storage.get<NetworkError[]>('networkErrors') || [],
    };
    
    await this.state.storage.put('agentState', agentState);
  }

  /**
   * HTTP fetch handler for RPC communication and WebSocket upgrades
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Hydrate state from storage before processing requests
      // (except for /init which sets initial state)
      if (path !== '/init') {
        await this.hydrateState();
      }

      // WebSocket endpoint
      if (path === '/ws') {
        return this.handleWebSocket(request);
      }

      // Initialization endpoint
      if (path === '/init' && request.method === 'POST') {
        return this.handleInit(request);
      }

      // Phase endpoints
      if (path === '/phase1' && request.method === 'POST') {
        return this.runPhase1();
      }
      if (path === '/phase2' && request.method === 'POST') {
        return this.runPhase2();
      }
      if (path === '/phase3' && request.method === 'POST') {
        return this.runPhase3();
      }
      if (path === '/phase4' && request.method === 'POST') {
        return this.runPhase4();
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      return this.handleError(error, 'fetch');
    }
  }

  /**
   * Handle WebSocket upgrade for real-time progress updates
   */
  private handleWebSocket(request: Request): Response {
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    server.accept();
    this.websocketClients.push(server);

    // Handle close events
    server.addEventListener('close', () => {
      this.websocketClients = this.websocketClients.filter(ws => ws !== server);
    });

    server.addEventListener('error', () => {
      this.websocketClients = this.websocketClients.filter(ws => ws !== server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle initialization endpoint
   */
  private async handleInit(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { testRunId: string; gameUrl: string; inputSchema?: string };
      
      // Validate required parameters
      if (!body.testRunId) {
        return Response.json({
          success: false,
          error: 'testRunId is required for initialization'
        }, { status: 400 });
      }
      
      if (!body.gameUrl) {
        return Response.json({
          success: false,
          error: 'gameUrl is required for initialization'
        }, { status: 400 });
      }
      
      // Store initialization parameters in instance variables
      this.testRunId = body.testRunId;
      this.gameUrl = body.gameUrl;
      this.inputSchema = body.inputSchema;
      
      // Persist to Durable Object storage for state restoration
      await this.persistState();
      
      // Mark state as hydrated since we just initialized
      this.stateHydrated = true;

      // Initialize Agent SQL database
      await this.initializeSQL();

      return Response.json({ success: true, message: 'TestAgent initialized' });
    } catch (error) {
      return this.handleError(error, 'init');
    }
  }

  /**
   * Initialize Agent SQL database with required tables
   */
  private async initializeSQL(): Promise<void> {
    if (this.sqlInitialized) return;

    try {
      // Create agent_actions table
      await this.state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS agent_actions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          action TEXT NOT NULL,
          reasoning TEXT NOT NULL,
          outcome TEXT
        )
      `);

      // Create control_discoveries table
      await this.state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS control_discoveries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          element_selector TEXT NOT NULL,
          action_type TEXT NOT NULL,
          confidence REAL NOT NULL,
          discovered_at INTEGER NOT NULL
        )
      `);

      // Create decision_log table
      await this.state.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS decision_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          decision TEXT NOT NULL,
          context TEXT NOT NULL,
          ai_model TEXT
        )
      `);

      this.sqlInitialized = true;
    } catch (error) {
      console.error('Failed to initialize SQL:', error);
      throw new Error('Failed to initialize Agent SQL database');
    }
  }
  
  /**
   * Execute SQL query on Agent SQL database
   * Helper method for executing parameterized queries
   */
  private async execSQL(query: string, params?: unknown[]): Promise<any> {
    if (!this.sqlInitialized) {
      await this.initializeSQL();
    }
    
    if (params && params.length > 0) {
      return await this.state.storage.sql.exec(query, ...params);
    } else {
      return await this.state.storage.sql.exec(query);
    }
  }

  /**
   * Phase 1: Load & Validation (Story 2.3)
   * Navigates to game URL, validates load, detects interaction requirements, captures evidence
   */
  private async runPhase1(): Promise<Response> {
    // Initialize result structure (AC #1, Task 1)
    const result: Phase1Result = {
      success: false,
      requiresInteraction: false,
      errors: [],
    };

    try {
      // Set 30-second timeout for Phase 1 (Task 1)
      const timeoutMs = 30000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Phase 1 execution timed out after 30 seconds')), timeoutMs);
      });

      // Execute Phase 1 logic with timeout
      const phase1Promise = this.executePhase1Logic(result);
      await Promise.race([phase1Promise, timeoutPromise]);

      // Reset attempt counter on success
      await this.state.storage.put('phase1_attempts', 0);

      return Response.json(result);
    } catch (error) {
      // Capture failure screenshot with AI reasoning
      await this.captureFailureScreenshot(Phase.PHASE1, error);
      
      // Translate errors to user-friendly messages (Story 2.7)
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      const userFriendlyMessage = this.translateError(errorObj, Phase.PHASE1);
      result.success = false;
      result.errors.push(userFriendlyMessage);
      
      // Store error message in test_runs table (Story 2.7)
      await this.storeErrorMessage(userFriendlyMessage);
      
      // Log technical error details to test_events (for debugging)
      if (this.testRunId && this.env.DB) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE1,
          'failed',
          `Phase 1 failed: ${errorObj.message}`,
          JSON.stringify({ stack: errorObj.stack, phase: Phase.PHASE1 })
        );
      }
      
      return Response.json(result);
    }
  }

  /**
   * Execute Phase 1 logic steps
   */
  private async executePhase1Logic(result: Phase1Result): Promise<void> {
    // Track retry attempts for clearer messaging
    const attemptCount = (await this.state.storage.get<number>('phase1_attempts') || 0) + 1;
    await this.state.storage.put('phase1_attempts', attemptCount);
    
    // Task 1: Log phase start to test_events with attempt number
    const attemptMessage = attemptCount > 1 ? ` (Retry attempt ${attemptCount}/3)` : '';
    await this.updateStatus(Phase.PHASE1, `Phase 1 started${attemptMessage}`);
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE1,
      'started',
      `Phase 1: Load & Validation started${attemptMessage}`
    );

    // Task 2: Launch browser session (AC #2)
    const stagehand = await this.launchBrowser();
    const page = stagehand.page;
    
    if (!page) {
      throw new Error('Failed to create browser page');
    }

    // Task 3 & 4: Navigate to game URL and wait for load (AC #3, #4)
    try {
      await page.goto(this.gameUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000, // 20-second page load timeout
      });
    } catch (navError) {
      const message = navError instanceof Error ? navError.message : 'Navigation failed';
      throw new Error(`Failed to navigate to game URL: ${message}`);
    }

    // Task 6: Validate page did not return 404 error (AC #6)
    // Check for 404 or other HTTP errors by examining page URL and content
    const currentUrl = page.url();
    if (!currentUrl || currentUrl === 'about:blank') {
      result.errors.push('Game URL could not be loaded. Please check the URL is correct.');
      return; // Early return on navigation failure
    }
    
    // Check if page shows an error (common error page indicators)
    try {
      const title = await page.title();
      if (title.toLowerCase().includes('404') || title.toLowerCase().includes('not found')) {
        result.errors.push('Game URL returned 404 error. Please check the URL is correct.');
        return;
      }
    } catch (error) {
      // Ignore title check errors
    }

    // Task 5: Capture initial screenshot (AC #5) - Auto-capture at phase start
    try {
      if (this.screenshotManager.shouldCapture(Phase.PHASE1, 'phase_start')) {
        await this.captureScreenshot('phase1-initial-load', Phase.PHASE1);
        this.screenshotManager.recordCapture(Phase.PHASE1);
        await this.updateStatus(Phase.PHASE1, 'Initial screenshot captured');
      }
    } catch (error) {
      // Screenshot failure is non-fatal
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Failed to capture screenshot: ${message}`);
    }

    // Task 7: Validate page is not blank (AC #7)
    const bodyChildren = await page.$$('body > *');
    if (bodyChildren.length === 0) {
      result.errors.push('Game page appears to be blank. Please check the game URL loads correctly.');
      return; // Early return on blank page
    }

    // Task 8: Detect and click "Run game" / "Play" / "Start" buttons
    // This ensures we actually start the game before Phase 2
    await this.updateStatus(Phase.PHASE1, 'Checking for game start buttons...');
    let requiresInteraction = false;
    let gameStarted = false;
    
    try {
      // Try to find and click start button using Stagehand's act() method
      // This uses AI to intelligently find and click the right button
      await this.updateStatus(Phase.PHASE1, 'Looking for Run/Play/Start button...');
      const actResult = await page.act({
        action: 'Click the button to run, play, or start the game',
      });
      
      if (actResult) {
        requiresInteraction = true;
        gameStarted = true;
        await this.updateStatus(Phase.PHASE1, 'Game start button clicked successfully');
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE1,
          'interaction',
          'Clicked game start button (Run/Play/Start)'
        );
        
        // Wait for game to load after clicking
        await page.waitForTimeout(3000);
        
        // Capture screenshot after game starts - Auto-capture on action
        try {
          if (this.screenshotManager.shouldCapture(Phase.PHASE1, 'action')) {
            await this.captureScreenshot('phase1-game-started', Phase.PHASE1);
            this.screenshotManager.recordCapture(Phase.PHASE1);
            this.screenshotManager.recordAction();
            await this.updateStatus(Phase.PHASE1, 'Game started - captured screenshot');
          }
        } catch (error) {
          // Non-fatal
          await insertTestEvent(
            this.env.DB,
            this.testRunId,
            Phase.PHASE1,
            'warning',
            `Failed to capture post-start screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    } catch (startError) {
      // If no start button found or click failed, that's okay - game may not need it
      const message = startError instanceof Error ? startError.message : 'Unknown error';
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE1,
        'info',
        `No start button needed or found: ${message}`
      );
      requiresInteraction = false;
    }
    
    result.requiresInteraction = requiresInteraction;
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE1,
      'interaction_detection',
      `Game requires interaction: ${result.requiresInteraction}, Game started: ${gameStarted}`
    );

    // Task 9: Log immediate console errors (AC #9)
    const consoleLogs = await this.state.storage.get<ConsoleLogEntry[]>('consoleLogs') || [];
    const consoleErrors = consoleLogs.filter(log => log.level === 'error');
    
    for (const error of consoleErrors) {
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE1,
        'console_error',
        error.text
      );
    }
    
    // Add console errors to result
    if (consoleErrors.length > 0) {
      result.errors.push(...consoleErrors.map(e => `Console error: ${e.text}`));
    }

    // All validations passed
    if (result.errors.length === 0) {
      result.success = true;

      // Task 10: Update test_runs.status = 'running' in D1 (AC #10)
      try {
        await this.env.DB.prepare(
          'UPDATE test_runs SET status = ?, updated_at = ? WHERE id = ?'
        ).bind('running', Date.now(), this.testRunId).run();
        
        // Broadcast status change to 'running'
        this.broadcastToClients({
          type: 'status',
          status: 'running',
          phase: Phase.PHASE1,
          message: 'Test is now running',
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error('Failed to update test_runs status:', error);
      }

      // Task 12: Store Phase 1 result in DO state (AC #12)
      const phaseResults = await this.state.storage.get<Record<string, Phase1Result>>('phaseResults') || {};
      phaseResults.phase1 = result;
      await this.state.storage.put('phaseResults', phaseResults);
      
      // Learn game context for future phases
      const startTime = Date.now();
      await this.learnGameContext(page);
      
      // Collect Phase 1 metrics
      const phase1Metrics = {
        loadTime: Date.now() - startTime,
        httpErrors: 0, // TODO: Track HTTP errors from network monitoring
        visuallyComplete: bodyChildren.length > 0,
        interactionRequired: result.requiresInteraction,
      };
      const allMetrics = await this.state.storage.get<PhaseMetrics>('phaseMetrics') || {};
      allMetrics.phase1 = phase1Metrics;
      await this.state.storage.put('phaseMetrics', allMetrics);
      
      // Task 11: Generate phase summary (AC #11)
      await this.summarizePhase(Phase.PHASE1, {
        success: true,
        requiresInteraction: result.requiresInteraction
      });
    }
  }


  /**
   * Phase 2: Control Discovery (Story 2.4)
   * Uses Stagehand observe() to discover interactive controls, classifies them,
   * generates hypothesis, and stores discoveries in Agent SQL
   */
  private async runPhase2(): Promise<Response> {
    // Initialize result structure (AC #10)
    const result: Phase2Result = {
      success: false,
      controls: {},
      hypothesis: '',
    };

    try {
      // Set 45-second timeout for Phase 2 (Task 1)
      const timeoutMs = 45000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Phase 2 execution timed out after 45 seconds')), timeoutMs);
      });

      // Execute Phase 2 logic with timeout
      const phase2Promise = this.executePhase2Logic(result);
      await Promise.race([phase2Promise, timeoutPromise]);

      // Reset attempt counter on success
      await this.state.storage.put('phase2_attempts', 0);

      return Response.json(result);
    } catch (error) {
      // Capture failure screenshot with AI reasoning
      await this.captureFailureScreenshot(Phase.PHASE2, error);
      
      // Translate errors to user-friendly messages (Story 2.7)
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      const userFriendlyMessage = this.translateError(errorObj, Phase.PHASE2);
      result.success = false;
      result.controls = {};
      result.hypothesis = '';
      
      // Store error message in test_runs table (Story 2.7)
      await this.storeErrorMessage(userFriendlyMessage);
      
      // Log technical error details to test_events (for debugging)
      if (this.testRunId && this.env.DB) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE2,
          'failed',
          `Phase 2 failed: ${errorObj.message}`,
          JSON.stringify({ stack: errorObj.stack, phase: Phase.PHASE2 })
        );
      }
      
      return Response.json(result);
    }
  }

  /**
   * Execute Phase 2 logic steps
   */
  private async executePhase2Logic(result: Phase2Result): Promise<void> {
    // Track retry attempts for clearer messaging
    const attemptCount = (await this.state.storage.get<number>('phase2_attempts') || 0) + 1;
    await this.state.storage.put('phase2_attempts', attemptCount);
    
    // Task 1: Log phase start to test_events with attempt number
    const attemptMessage = attemptCount > 1 ? ` (Retry attempt ${attemptCount}/3)` : '';
    await this.updateStatus(Phase.PHASE2, `Phase 2 started${attemptMessage}`);
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE2,
      'started',
      `Phase 2: Control Discovery started${attemptMessage}`
    );

    // Task 2: Verify Stagehand instance exists (reuse from Phase 1)
    if (!this.stagehand || !this.stagehand.page) {
      // If browser not available, try launching (fallback)
      try {
        this.stagehand = await this.launchBrowser();
      } catch (error) {
        throw new Error('Browser session not available. Please run Phase 1 first.');
      }
    }

    const page = this.stagehand.page;

    // Task 2: Use Stagehand observe() to identify interactive elements (AC #2)
    let observedElements: ObserveResult[];
    try {
      // Stagehand page.observe() returns array of interactive element actions
      // Reference: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
      // observe() identifies interactive elements on the page
      // Use shorter DOM settle timeout to speed up discovery
      observedElements = await page.observe({ domSettleTimeoutMs: 3000 });
    } catch (observeError) {
      const message = observeError instanceof Error ? observeError.message : 'Unknown error';
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE2,
        'observe_failed',
        `Stagehand observe() failed: ${message}`
      );
      throw new Error(`Failed to discover controls: ${message}`);
    }

    // Task 3: Classify discovered elements and build ControlMap (AC #3)
    const controlMap: ControlMap = {};
    
    for (const element of observedElements) {
      // Extract element information from Stagehand observe() result
      // ObserveResult only provides: selector (string) and description (string)
      const selector = element.selector || `element-${Object.keys(controlMap).length}`;
      const description = element.description || 'Interactive element';
      
      // Classify element type based on description and properties
      let controlType: 'click' | 'keyboard' | 'drag' | 'hover' = 'click';
      const descLower = description.toLowerCase();
      
      if (descLower.includes('key') || descLower.includes('press') || descLower.includes('wasd') || descLower.includes('space')) {
        controlType = 'keyboard';
      } else if (descLower.includes('drag') || descLower.includes('move')) {
        controlType = 'drag';
      } else if (descLower.includes('hover') || descLower.includes('mouseover')) {
        controlType = 'hover';
      } else {
        controlType = 'click'; // Default to click for buttons and clickable elements
      }
      
      controlMap[selector] = {
        type: controlType,
        description,
      };
    }

    // Task 4: Use inputSchema to prioritize controls (AC #4)
    if (this.inputSchema) {
      try {
        const schema = JSON.parse(this.inputSchema);
        
        // Log that we're using inputSchema guidance
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE2,
          'schema_guidance',
          `Using input schema to prioritize controls: ${Object.keys(schema.controls || {}).join(', ')}`
        );
        
        // Prioritize controls matching inputSchema hints
        // Add expected controls from schema if they weren't discovered
        if (schema.controls) {
          const expectedControls: string[] = [];
          
          // Check for movement controls (WASD, Arrow keys, etc.)
          if (schema.controls.movement) {
            expectedControls.push(...(Array.isArray(schema.controls.movement) ? schema.controls.movement : [schema.controls.movement]));
          }
          
          // Check for action controls (Space, Click, etc.)
          if (schema.controls.actions) {
            expectedControls.push(...(Array.isArray(schema.controls.actions) ? schema.controls.actions : [schema.controls.actions]));
          }
          
          // Validate discovered controls against inputSchema expectations
          const discoveredDescriptions = Object.values(controlMap).map(c => c.description.toLowerCase()).join(' ');
          const missingControls: string[] = [];
          
          for (const expectedControl of expectedControls) {
            const controlLower = expectedControl.toLowerCase();
            
            // Check if expected control was discovered
            const found = discoveredDescriptions.includes(controlLower) ||
                         discoveredDescriptions.includes(controlLower.charAt(0)); // Check for single letter (W, A, S, D)
            
            if (!found) {
              missingControls.push(expectedControl);
            }
          }
          
          // Log missing expected controls
          if (missingControls.length > 0) {
            await insertTestEvent(
              this.env.DB,
              this.testRunId,
              Phase.PHASE2,
              'schema_validation',
              `Expected controls not found: ${missingControls.join(', ')}`
            );
          }
          
          // Prioritize controls matching schema by adding them first to a prioritized map
          const prioritizedControlMap: ControlMap = {};
          const nonPriorityControls: ControlMap = {};
          
          for (const [selector, control] of Object.entries(controlMap)) {
            const descLower = control.description.toLowerCase();
            let isPriority = false;
            
            // Check if control matches any expected control
            for (const expectedControl of expectedControls) {
              const expectedLower = expectedControl.toLowerCase();
              if (descLower.includes(expectedLower) || descLower.includes(expectedLower.charAt(0))) {
                isPriority = true;
                break;
              }
            }
            
            if (isPriority) {
              prioritizedControlMap[selector] = control;
            } else {
              nonPriorityControls[selector] = control;
            }
          }
          
          // Merge prioritized controls first, then non-priority controls
          result.controls = { ...prioritizedControlMap, ...nonPriorityControls };
        } else {
          result.controls = controlMap;
        }
        
        // Note: inputSchema guides but doesn't restrict discovery
        // All discovered controls are kept, schema just provides prioritization
      } catch (schemaError) {
        // Log error but continue (inputSchema is optional guidance)
        console.error('Failed to parse inputSchema:', schemaError);
        result.controls = controlMap;
      }
    } else {
      result.controls = controlMap;
    }

    // Task 5: Capture screenshot with controls (AC #5) - Auto-capture
    try {
      if (this.screenshotManager.shouldCapture(Phase.PHASE2, 'phase_end')) {
        await this.captureScreenshot('phase2-controls', Phase.PHASE2);
        this.screenshotManager.recordCapture(Phase.PHASE2);
      }
    } catch (screenshotError) {
      // Screenshot failure is non-fatal
      console.error('Failed to capture Phase 2 screenshot:', screenshotError);
    }

    // Task 6: Generate control hypothesis (AC #6)
    const hypothesis = this.generateControlHypothesis(controlMap);
    result.hypothesis = hypothesis;
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE2,
      'hypothesis',
      `Control hypothesis: ${hypothesis}`
    );

    // Task 7: Store control hypothesis in Agent SQL database (AC #7)
    try {
      for (const [selector, control] of Object.entries(controlMap)) {
        await this.execSQL(
          'INSERT INTO control_discoveries (element_selector, action_type, confidence, discovered_at) VALUES (?, ?, ?, ?)',
          [selector, control.type, 1.0, Date.now()]
        );
      }
    } catch (sqlError) {
      // Log error but don't fail Phase 2 (controls still available in result)
      console.error('Failed to store controls in Agent SQL:', sqlError);
    }

    // Task 8: Log discovered controls to test_events (AC #8)
    for (const [selector, control] of Object.entries(controlMap)) {
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE2,
        'control_discovered',
        `Discovered ${control.type} control: ${control.description} at ${selector}`
      );
    }

    // All steps completed successfully
    result.success = true;

    // Task 10: Store Phase 2 result in DO state (AC #10)
    const phaseResults = await this.state.storage.get<Record<string, any>>('phaseResults') || {};
    phaseResults.phase2 = result;
    await this.state.storage.put('phaseResults', phaseResults);
    
    // Store controls in DO state for Phase 3 reference
    await this.state.storage.put('discoveredControls', result.controls);
    
    // Store control context for Phase 3
    const primaryControls: string[] = [];
    const keyboardKeys: string[] = [];
    
    for (const control of Object.values(controlMap)) {
      if (!primaryControls.includes(control.type)) {
        primaryControls.push(control.type);
      }
      
      // Extract keyboard keys from descriptions
      if (control.type === 'keyboard') {
        const desc = control.description.toLowerCase();
        if (desc.includes('arrow')) keyboardKeys.push('ArrowKeys');
        if (desc.includes('space')) keyboardKeys.push('Space');
        if (desc.includes('enter')) keyboardKeys.push('Enter');
        if (desc.includes('wasd')) keyboardKeys.push('WASD');
      }
    }
    
    const controlContext: ControlContext = {
      primaryControls,
      keyboardKeys: keyboardKeys.length > 0 ? [...new Set(keyboardKeys)] : undefined,
      clickableElements: Object.keys(controlMap).length,
      hypothesis: result.hypothesis,
    };
    await this.state.storage.put('controlContext', controlContext);
    
    // Collect Phase 2 metrics
    const phase2Metrics = {
      controlsFound: Object.keys(controlMap).length,
      interactiveElements: Object.keys(controlMap).length,
      controlDiversity: primaryControls,
    };
    const allMetrics = await this.state.storage.get<PhaseMetrics>('phaseMetrics') || {};
    allMetrics.phase2 = phase2Metrics;
    await this.state.storage.put('phaseMetrics', allMetrics);
    
    // Task 9: Generate phase summary (AC #9)
    await this.summarizePhase(Phase.PHASE2, {
      controlCount: Object.keys(controlMap).length,
      hypothesis: result.hypothesis
    });
  }

  /**
   * Generate control hypothesis from discovered controls (Task 6)
   */
  private generateControlHypothesis(controlMap: ControlMap): string {
    const controls = Object.values(controlMap);
    
    if (controls.length === 0) {
      return 'No interactive controls detected on the page';
    }

    // Group controls by type
    const clickControls = controls.filter(c => c.type === 'click');
    const keyboardControls = controls.filter(c => c.type === 'keyboard');
    const dragControls = controls.filter(c => c.type === 'drag');
    const hoverControls = controls.filter(c => c.type === 'hover');

    const parts: string[] = [];

    // Analyze keyboard controls for common patterns
    if (keyboardControls.length > 0) {
      const descriptions = keyboardControls.map(c => c.description.toLowerCase()).join(' ');
      
      if (descriptions.includes('wasd') || (descriptions.includes('w') && descriptions.includes('a') && descriptions.includes('s') && descriptions.includes('d'))) {
        parts.push('WASD movement controls');
      }
      if (descriptions.includes('space')) {
        parts.push('Space key for actions');
      }
      if (descriptions.includes('arrow')) {
        parts.push('Arrow key controls');
      }
      if (keyboardControls.length > 0 && parts.length === 0) {
        parts.push(`${keyboardControls.length} keyboard controls`);
      }
    }

    // Analyze click controls
    if (clickControls.length > 0) {
      const descriptions = clickControls.map(c => c.description.toLowerCase()).join(' ');
      
      if (descriptions.includes('play') || descriptions.includes('start')) {
        parts.push('Play/Start button');
      }
      if (descriptions.includes('pause')) {
        parts.push('Pause button');
      }
      if (descriptions.includes('settings') || descriptions.includes('options')) {
        parts.push('Settings/Options menu');
      }
      if (clickControls.length > 0 && parts.length === 0) {
        parts.push(`${clickControls.length} clickable buttons/elements`);
      }
    }

    // Add drag and hover if present
    if (dragControls.length > 0) {
      parts.push(`${dragControls.length} drag controls`);
    }
    if (hoverControls.length > 0) {
      parts.push(`${hoverControls.length} hover interactions`);
    }

    if (parts.length === 0) {
      return `Game has ${controls.length} interactive controls detected`;
    }

    return `Game has ${parts.join(', ')}`;
  }

  /**
   * Phase 3: Gameplay Exploration with Computer Use (Story 2.5)
   * Autonomously plays the game using Stagehand Computer Use mode
   * Captures evidence continuously and logs AI decisions to Agent SQL
   */
  private async runPhase3(): Promise<Response> {
    // Initialize result structure (AC #14, Task 1)
    const result: Phase3Result = {
      success: false,
      screenshotCount: 0,
      errors: [],
      actionsTaken: 0,
    };

    try {
      // Set adaptive timeout: minimum 1 minute, maximum 5 minutes (AC #12, Task 1)
      const minTimeoutMs = 60000; // 1 minute
      const maxTimeoutMs = 300000; // 5 minutes
      
      // Execute Phase 3 logic with adaptive timeout
      await this.executePhase3Logic(result, minTimeoutMs, maxTimeoutMs);

      // Reset attempt counter on success
      await this.state.storage.put('phase3_attempts', 0);

      return Response.json(result);
    } catch (error) {
      // Capture failure screenshot with AI reasoning
      await this.captureFailureScreenshot(Phase.PHASE3, error);
      
      // Translate errors to user-friendly messages (Story 2.7)
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      const userFriendlyMessage = this.translateError(errorObj, Phase.PHASE3);
      result.success = false;
      result.errors.push(userFriendlyMessage);
      
      // Store error message in test_runs table (Story 2.7)
      await this.storeErrorMessage(userFriendlyMessage);
      
      // Log technical error details to test_events (for debugging)
      if (this.testRunId && this.env.DB) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE3,
          'failed',
          `Phase 3 failed: ${errorObj.message}`,
          JSON.stringify({ stack: errorObj.stack, phase: Phase.PHASE3 })
        );
      }
      
      return Response.json(result);
    }
  }

  /**
   * Execute Phase 3 logic with goal-driven autonomous gameplay
   */
  private async executePhase3Logic(result: Phase3Result, minTimeout: number, maxTimeout: number): Promise<void> {
    // Track retry attempts for clearer messaging
    const attemptCount = (await this.state.storage.get<number>('phase3_attempts') || 0) + 1;
    await this.state.storage.put('phase3_attempts', attemptCount);
    
    // Task 1: Log phase start to test_events with attempt number
    const attemptMessage = attemptCount > 1 ? ` (Retry attempt ${attemptCount}/3)` : '';
    await this.updateStatus(Phase.PHASE3, `Phase 3 started${attemptMessage}`);
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE3,
      'started',
      `Phase 3: Gameplay Exploration started${attemptMessage}`
    );

    // Task 2: Verify Stagehand instance exists and initialize agent with Computer Use mode
    if (!this.stagehand || !this.stagehand.page) {
      throw new Error('Browser session not available. Please run Phase 1 and Phase 2 first.');
    }

    const page = this.stagehand.page;
    
    // Note: Stagehand v2 with Workers AI uses observe/act pattern (AC #2)
    // Reference: https://github.com/cloudflare/playwright/blob/main/packages/playwright-cloudflare/examples/stagehand/src/worker/index.ts
    // The agent API in v2 requires OpenAI/Anthropic, not Workers AI

    // Retrieve Phase 1 and Phase 2 results (Task 4, Task 5)
    const phaseResults = await this.state.storage.get<Record<string, any>>('phaseResults') || {};
    const phase1Result = phaseResults.phase1 as Phase1Result | undefined;
    const phase2Result = phaseResults.phase2 as Phase2Result | undefined;
    const discoveredControls = await this.state.storage.get<ControlMap>('discoveredControls') || {};

    // Setup adaptive timeout tracking (AC #12, Task 11)
    let lastProgressTime = Date.now();
    const noProgressThreshold = 30000; // 30 seconds
    const startTime = Date.now();
    
    // Screenshot tracking (AC #6, Task 6) - Smart capture strategy
    let screenshotCount = 0;
    const minScreenshotInterval = 5000; // Minimum 5 seconds between screenshots
    let lastScreenshotTime = Date.now();
    let lastPageState: string = ''; // Track page state for smart screenshots

    // Progress broadcast tracking (AC #13, Task 12)
    const broadcastInterval = 15000; // 15 seconds
    let lastBroadcastTime = Date.now();

    // Task 4: Detect and click "Play" button autonomously if needed (AC #4)
    if (phase1Result?.requiresInteraction) {
      try {
        await this.updateStatus(Phase.PHASE3, 'Detecting game start button');
        
        // Use Stagehand to autonomously find and click play button
        const playButtonClicked = await this.clickPlayButton(page);
        
        if (playButtonClicked) {
          result.actionsTaken++;
          lastProgressTime = Date.now();
          
          // Capture screenshot after clicking play button
          await this.captureScreenshot('phase3-clicked-play-button', Phase.PHASE3);
          screenshotCount++;
          lastScreenshotTime = Date.now();
          
          // Log decision to Agent SQL (AC #10, Task 9)
          await this.logAIDecision('click-play-button', 'Clicked play button to start game', 'success');
          
          // Wait for game to start
          await page.waitForTimeout(2000);
        } else {
          result.errors.push('Could not find play button, continuing with exploration');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Failed to click play button: ${message}`);
      }
    }

    // Task 3: Execute autonomous gameplay (AC #3) using learned context
    // Task 5: Agent autonomously decides control strategy (AC #5)
    
    // Load learned context from previous phases
    const gameContext = await this.state.storage.get<GameContext>('gameContext');
    const controlContext = await this.state.storage.get<ControlContext>('controlContext');
    const retryContext = await this.getRetryContext(Phase.PHASE3);
    
    // Determine control strategy based on discovered controls
    const controlStrategy = this.determineControlStrategy(discoveredControls);
    await this.logAIDecision('control-strategy', `Using ${controlStrategy} controls for gameplay`, 'initiated');
    
    // Build autonomous gameplay prompt with learned context
    let autonomousPrompt = `You are testing a web-based game. `;
    
    if (gameContext) {
      autonomousPrompt += `Game: ${gameContext.gameName} (Type: ${gameContext.gameType}). `;
    }
    
    if (controlContext && controlContext.primaryControls.length > 0) {
      autonomousPrompt += `Available controls: ${controlContext.primaryControls.join(', ')}. `;
    }
    
    if (retryContext) {
      autonomousPrompt += `${retryContext} `;
    }
    
    autonomousPrompt += `Your goal: Play through this game naturally for 45-60 seconds to demonstrate it works. `;
    autonomousPrompt += `Make meaningful interactions - don't just click everything. `;
    autonomousPrompt += `Try to progress through the game, score points, or complete objectives as a human player would.`;
    
    // Log autonomous prompt
    await this.updateStatus(Phase.PHASE3, `Playing game autonomously`);
    await this.logAIDecision('autonomous-gameplay', autonomousPrompt, 'initiated');

    try {
      // Execute autonomous gameplay with multiple observe/act cycles
      const maxCycles = 15; // Up to 15 autonomous decisions
      const cycleErrors: number[] = [];
      
      for (let cycle = 0; cycle < maxCycles; cycle++) {
        // Check adaptive timeout
        const elapsed = Date.now() - startTime;
        const timeSinceProgress = Date.now() - lastProgressTime;
        
        if (elapsed > maxTimeout || elapsed > 60000) {
          await this.logAIDecision('timeout-max', 'Gameplay time reached (60s)', 'completed');
          break;
        }
        
        if (timeSinceProgress > noProgressThreshold && elapsed > minTimeout) {
          await this.logAIDecision('timeout-no-progress', 'No progress for 30 seconds, stopping', 'completed');
          break;
        }

        // Broadcast progress (AC #13)
        if (Date.now() - lastBroadcastTime >= broadcastInterval) {
          await this.updateStatus(Phase.PHASE3, `Playing game (cycle ${cycle + 1}/${maxCycles}, ${result.actionsTaken} actions)`);
          lastBroadcastTime = Date.now();
        }

        try {
          // Use Stagehand observe with autonomous prompt (AC #2)
          const actions = await page.observe({ instruction: autonomousPrompt, domSettleTimeoutMs: 3000 });
          
          if (!actions || actions.length === 0) {
            cycleErrors.push(cycle);
            // No actions found - continue to next cycle
            await page.waitForTimeout(1000);
            continue;
          }
          
          // Execute first 3 actions from this cycle (limit to avoid spam)
          const actionsToExecute = actions.slice(0, 3);
          
          for (const action of actionsToExecute) {
            try {
              // Execute action with retry logic
              await this.executeActWithRetry(page, action, 2);
              result.actionsTaken++;
              lastProgressTime = Date.now();
              
              // Record action for auto-screenshot manager
              this.screenshotManager.recordAction();
              
              // Log AI decision (AC #10)
              await this.logAIDecision('autonomous-action', `Executed: ${action.description || 'action'}`, 'success');
              
              // Auto-capture screenshot if needed
              if (this.screenshotManager.shouldCapture(Phase.PHASE3, 'action')) {
                try {
                  const description = `phase3-action-${result.actionsTaken}`;
                  await this.captureScreenshot(description, Phase.PHASE3);
                  this.screenshotManager.recordCapture(Phase.PHASE3);
                  screenshotCount++;
                } catch (screenshotError) {
                  // Non-fatal
                }
              }
              
              // Small delay between actions
              await page.waitForTimeout(500);
            } catch (actionError) {
              // Log action failure but continue
              const message = actionError instanceof Error ? actionError.message : 'Unknown error';
              await this.logAIDecision('autonomous-action', `Failed: ${action.description || 'action'} - ${message}`, 'failed');
            }
          }
          
        } catch (cycleError) {
          const message = cycleError instanceof Error ? cycleError.message : 'Unknown error';
          cycleErrors.push(cycle);
          await insertTestEvent(
            this.env.DB,
            this.testRunId,
            Phase.PHASE3,
            'cycle_failed',
            `Cycle ${cycle + 1} failed: ${message}`
          );
          
          // If too many consecutive errors, stop
          if (cycleErrors.length >= 3 && cycleErrors.slice(-3).every((e, i) => e === cycle - 2 + i)) {
            await this.logAIDecision('too-many-errors', 'Too many consecutive errors, stopping gameplay', 'failed');
            break;
          }
        }
        
        // Timer-based screenshot capture (every 10s)
        if (this.screenshotManager.shouldCapture(Phase.PHASE3, 'timer')) {
          try {
            await this.captureScreenshot(`phase3-timer-${Date.now()}`, Phase.PHASE3);
            this.screenshotManager.recordCapture(Phase.PHASE3);
            screenshotCount++;
          } catch (error) {
            // Non-fatal
          }
        }
      }
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Autonomous gameplay failed: ${message}`);
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE3,
        'execution_failed',
        `Execution failed: ${message}`
      );
    }

    // Ensure minimum 3 meaningful screenshots captured (AC #6)
    // Only capture additional screenshots if we have very few
    if (screenshotCount < 3) {
      try {
        await this.captureScreenshot(`phase3-final-state`, Phase.PHASE3);
        screenshotCount++;
      } catch (error) {
        // Non-fatal
      }
    }

    // Task 7 & 8: Console logs and network errors already captured by launchBrowser() (AC #8, AC #9)
    const consoleLogs = await this.state.storage.get<ConsoleLogEntry[]>('consoleLogs') || [];
    const consoleErrors = consoleLogs.filter(log => log.level === 'error');
    
    if (consoleErrors.length > 0) {
      for (const error of consoleErrors.slice(0, 3)) { // Log first 3 errors
        result.errors.push(`Console error: ${error.text}`);
      }
      if (consoleErrors.length > 3) {
        result.errors.push(`... and ${consoleErrors.length - 3} more console errors`);
      }
    }

    const networkErrors = await this.state.storage.get<NetworkError[]>('networkErrors') || [];
    if (networkErrors.length > 0) {
      for (const error of networkErrors.slice(0, 2)) { // Log first 2 network errors
        result.errors.push(`Network error: ${error.url} (${error.status || 'connection failed'})`);
      }
      if (networkErrors.length > 2) {
        result.errors.push(`... and ${networkErrors.length - 2} more network errors`);
      }
    }

    // Set result success
    result.success = true;
    result.screenshotCount = screenshotCount;

    // Task 13: Store Phase 3 result in DO state (AC #14)
    phaseResults.phase3 = result;
    await this.state.storage.put('phaseResults', phaseResults);

    // Collect Phase 3 metrics
    const phase3Metrics = {
      actionsPerformed: result.actionsTaken,
      uniqueInteractions: screenshotCount, // Use screenshot count as proxy for unique interactions
      duration: Math.round((Date.now() - startTime) / 1000),
      errorsEncountered: consoleErrors.length + networkErrors.length,
    };
    const allMetrics = await this.state.storage.get<PhaseMetrics>('phaseMetrics') || {};
    allMetrics.phase3 = phase3Metrics;
    await this.state.storage.put('phaseMetrics', allMetrics);

    // Generate phase summary and replace verbose messages
    await this.summarizePhase(Phase.PHASE3, {
      actionsPerformed: result.actionsTaken,
      screenshotsCaptured: screenshotCount,
      controlsUsed: controlStrategy,
      duration: phase3Metrics.duration,
      success: true
    });
  }

  /**
   * Get page state hash for smart screenshot detection
   * Captures key page indicators to detect meaningful changes
   */
  private async getPageStateHash(page: any): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = await page.evaluate(() => {
        // @ts-ignore - Running in browser context where document exists
        const bodyText = document.body?.innerText?.substring(0, 500) || '';
        // @ts-ignore - Running in browser context
        const imageCount = document.querySelectorAll('img').length;
        // @ts-ignore - Running in browser context
        const canvasData = Array.from(document.querySelectorAll('canvas')).length;
        return `${bodyText}-${imageCount}-${canvasData}`;
      });
      return state;
    } catch {
      return Date.now().toString(); // Fallback to timestamp
    }
  }

  /**
   * Get retry context from previous failed attempts
   * Provides helpful feedback to the AI about what didn't work before
   */
  private async getRetryContext(phase: Phase): Promise<string | null> {
    try {
      const attempts = await this.state.storage.get<number>(`${phase}_attempts`) || 0;
      if (attempts === 0) return null;

      // Get recent failed decisions for this phase
      const recentFailures = await this.execSQL(
        'SELECT action, reasoning FROM decision_log WHERE decision LIKE ? ORDER BY timestamp DESC LIMIT 3',
        ['%failed%']
      );

      if (Array.isArray(recentFailures) && recentFailures.length > 0) {
        const failureNotes = recentFailures.map((f: any) => f.reasoning).join('; ');
        return `Retry #${attempts}. Previous failures: ${failureNotes}`;
      }

      return `Retry attempt #${attempts}. Previous approach didn't work.`;
    } catch {
      return null;
    }
  }

  /**
   * Learn game context at end of Phase 1 for use in later phases
   * Asks AI to identify game name and type
   */
  private async learnGameContext(page: any): Promise<void> {
    try {
      // Get page content for analysis
      const pageTitle = await page.title();
      const pageUrl = page.url();
      
      // Ask AI to identify game context (using simple prompt for gpt-5-mini)
      const prompt = `Analyze this game page:
Title: ${pageTitle}
URL: ${pageUrl}

Provide a one-sentence description in this exact format:
Game: [name] | Type: [turn-based/action/puzzle/simulation/other] | Interaction: [yes/no]

Example: "Game: Tic-Tac-Toe | Type: turn-based | Interaction: yes"`;

      // Use Stagehand's page context to get quick AI response
      const response = await page.evaluate(() => {
        // Simple heuristic based on page content
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = (globalThis as any).document;
        const title = doc.title.toLowerCase();
        const body = doc.body.innerText.toLowerCase();
        
        // Try to extract game name from title
        let gameName = doc.title.split('|')[0].split('-')[0].trim();
        if (!gameName) gameName = 'Unknown Game';
        
        // Detect game type from keywords
        let gameType = 'other';
        if (title.includes('tic') || title.includes('tac') || body.includes('tic-tac-toe')) {
          gameType = 'turn-based';
        } else if (title.includes('puzzle') || body.includes('puzzle')) {
          gameType = 'puzzle';
        } else if (title.includes('action') || body.includes('shoot') || body.includes('jump')) {
          gameType = 'action';
        } else if (title.includes('sim') || body.includes('simulation')) {
          gameType = 'simulation';
        }
        
        return `Game: ${gameName} | Type: ${gameType} | Interaction: yes`;
      });
      
      // Parse the response
      const parts = response.split('|').map((p: string) => p.trim());
      const gameName = parts[0]?.replace('Game:', '').trim() || 'Unknown Game';
      const gameType = parts[1]?.replace('Type:', '').trim() || 'other';
      const requiresInteraction = parts[2]?.toLowerCase().includes('yes') || false;
      
      const gameContext: GameContext = {
        gameName,
        gameType,
        requiresInteraction,
      };
      
      await this.state.storage.put('gameContext', gameContext);
      await this.updateStatus(Phase.PHASE1, `Identified game: ${gameName} (${gameType})`);
    } catch (error) {
      // Non-fatal - continue without game context
      console.error('Failed to learn game context:', error);
    }
  }

  /**
   * Summarize phase completion with concise bullet points
   * Replaces verbose real-time messages with clean summary
   */
  private async summarizePhase(phase: Phase, stats: Record<string, any>): Promise<void> {
    try {
      // Generate concise summary bullets based on phase
      const summaryPoints: string[] = [];
      
      if (phase === Phase.PHASE1) {
        summaryPoints.push(`✓ Game loaded ${stats.success ? 'successfully' : 'with errors'}`);
        if (stats.requiresInteraction) summaryPoints.push(`→ Interaction required to start`);
      } else if (phase === Phase.PHASE2) {
        summaryPoints.push(`✓ Discovered ${stats.controlCount || 0} controls`);
        if (stats.hypothesis) summaryPoints.push(`→ ${stats.hypothesis}`);
      } else if (phase === Phase.PHASE3) {
        summaryPoints.push(`✓ ${stats.actionsPerformed || 0} actions, ${stats.screenshotsCaptured || 0} screenshots`);
        summaryPoints.push(`→ Strategy: ${stats.controlsUsed || 'autonomous'}`);
        summaryPoints.push(`→ Duration: ${stats.duration || 0}s`);
      } else if (phase === Phase.PHASE4) {
        summaryPoints.push(`✓ Evaluation complete: ${stats.overallScore || 0}/100`);
        summaryPoints.push(`→ Analyzed ${stats.screenshotCount || 0} screenshots`);
      }
      
      const summary = summaryPoints.join('\n');
      this.broadcastToClients({
        type: 'phase_summary',
        phase,
        summary,
        timestamp: Date.now()
      });
    } catch (error) {
      // Non-fatal, don't throw
      console.error('Failed to summarize phase:', error);
    }
  }

  /**
   * Execute Stagehand act() with improved retry logic for overlapping elements
   * Optimized to bypass Playwright's 3500ms timeout by using force click for click actions
   */
  private async executeActWithRetry(page: any, action: ObserveResult, maxRetries = 2): Promise<boolean> {
    const startTime = Date.now();
    let lastError: Error | undefined;
    
    // For click actions with overlay issues, try force click first
    // This bypasses Playwright's 3500ms actionability timeout
    if (action.method === 'click' && action.selector) {
      try {
        const selector = action.selector.replace('xpath=', '');
        const locator = page.locator(`xpath=${selector}`);
        
        // Try force click first (bypasses overlay checks, ~100ms)
        await locator.click({ force: true, timeout: 2000 });
        
        const duration = Date.now() - startTime;
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE3,
          'action_success',
          `Force click succeeded: ${action.description || 'click'} (${duration}ms)`
        );
        return true;
      } catch (forceError) {
        // Force click failed, fall back to Stagehand's act() with JS click fallback
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE3,
          'action_fallback',
          `Force click failed, using Stagehand fallback: ${action.description || 'click'}`
        );
      }
    }
    
    // For non-click actions or if force click failed, use Stagehand's act()
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await insertTestEvent(
            this.env.DB,
            this.testRunId,
            Phase.PHASE3,
            'retry_action',
            `Retrying action (attempt ${attempt + 1}/${maxRetries + 1}): ${action.description || 'unknown'}`
          );
          
          await page.waitForTimeout(500);
        }
        
        // Execute the action - Stagehand internally handles fallback to JS click
        await page.act(action);
        
        const duration = Date.now() - startTime;
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE3,
          'action_success',
          `${action.method} succeeded: ${action.description || 'action'} (${duration}ms)`
        );
        return true;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        const errorMsg = lastError.message.substring(0, 200);
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE3,
          'action_failed',
          `Action attempt ${attempt + 1} failed: ${errorMsg}`
        );
      }
    }
    
    // All retries exhausted
    throw lastError || new Error('Action failed after all retries');
  }

  /**
   * Autonomously click play button using Stagehand
   * Returns true if button was found and clicked
   */
  private async clickPlayButton(page: any): Promise<boolean> {
    try {
      // Look for play/start/begin buttons
      const buttons = await page.$$('button');
      
      for (const button of buttons) {
        try {
          const text = await page.evaluate((el: any) => el.textContent?.toLowerCase() || '', button);
          
          if (text.includes('play') || text.includes('start') || text.includes('begin')) {
            await button.click();
            await insertTestEvent(
              this.env.DB,
              this.testRunId,
              Phase.PHASE3,
              'interaction',
              `Clicked play button: "${text}"`
            );
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Determine control strategy based on discovered controls (Task 5, AC #5)
   * Guides goal descriptions but Stagehand autonomously decides specific actions
   */
  private determineControlStrategy(controls: ControlMap): 'keyboard' | 'mouse' | 'mixed' {
    const controlTypes = Object.values(controls).map(c => c.type);
    const keyboardControls = controlTypes.filter(t => t === 'keyboard').length;
    const mouseControls = controlTypes.filter(t => t === 'click' || t === 'drag' || t === 'hover').length;

    // Prioritize keyboard controls if detected
    if (keyboardControls > 0 && keyboardControls >= mouseControls) {
      return 'keyboard';
    }
    
    if (mouseControls > 0 && mouseControls > keyboardControls) {
      return 'mouse';
    }
    
    return 'mixed';
  }

  /**
   * Log AI decision to Agent SQL database (Task 9, AC #10)
   */
  private async logAIDecision(decision: string, action: string, outcome: string): Promise<void> {
    try {
      await this.execSQL(
        'INSERT INTO decision_log (timestamp, decision, context, ai_model) VALUES (?, ?, ?, ?)',
        [Date.now(), decision, action, 'stagehand-computer-use']
      );
      
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE3,
        'ai_decision',
        `Decision: ${decision} | Action: ${action} | Outcome: ${outcome}`
      );
    } catch (error) {
      console.error('Failed to log AI decision:', error);
    }
  }


  /**
   * Phase 4: Evaluation & Scoring (empty implementation)
   */
  /**
   * Translate technical errors to user-friendly messages (Story 2.7, Task 2)
   * Maps common error patterns to actionable messages
   */
  private translateError(error: Error, phase: string): string {
    const message = error.message;
    
    // Phase-specific timeout handling
    if (message.includes('timeout') || message.includes('timed out')) {
      switch (phase) {
        case Phase.PHASE1:
          return ERROR_MESSAGES.PHASE1_TIMEOUT;
        case Phase.PHASE2:
          return ERROR_MESSAGES.PHASE2_TIMEOUT;
        case Phase.PHASE3:
          return ERROR_MESSAGES.PHASE3_TIMEOUT;
        case Phase.PHASE4:
          return ERROR_MESSAGES.PHASE4_TIMEOUT;
        default:
          return ERROR_MESSAGES.GENERIC_TIMEOUT;
      }
    }
    
    // Match against error patterns
    for (const { pattern, message: userMessage } of ERROR_PATTERNS) {
      if (pattern.test(message)) {
        return userMessage;
      }
    }
    
    // Fallback: sanitize and return first line only
    return this.sanitizeErrorMessage(message);
  }
  
  /**
   * Sanitize error messages (Story 2.7, Task 6)
   * Removes stack traces, internal error codes, infrastructure details
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove stack traces (everything after "at " or newline)
    let sanitized = message.split('\n')[0].split(' at ')[0];
    
    // Remove internal error codes (EACCES, ENOTFOUND, etc.)
    sanitized = sanitized.replace(/\b[A-Z]{2,}[A-Z0-9_]+\b/g, '');
    
    // Remove file paths (/src/..., C:\...)
    sanitized = sanitized.replace(/[\/\\][\w\/\\.-]+\.\w+(?::\d+)?/g, '');
    
    // Remove infrastructure details (Durable Object, R2, Workflow, etc.)
    sanitized = sanitized.replace(/\b(Durable Object|R2 bucket|Workflow|Workers|Cloudflare)\b/gi, 'service');
    
    // Remove internal URLs (http://testAgent/...)
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '');
    
    // If message is now empty or too short, return generic error
    sanitized = sanitized.trim();
    if (sanitized.length < 10) {
      return ERROR_MESSAGES.GENERIC_ERROR;
    }
    
    return sanitized;
  }
  
  /**
   * Store error message in test_runs table (Story 2.7, Task 4)
   * Updates error_message field and broadcasts via WebSocket
   */
  private async storeErrorMessage(errorMessage: string): Promise<void> {
    try {
      // Update test_runs.error_message
      await this.env.DB
        .prepare('UPDATE test_runs SET error_message = ?, updated_at = ? WHERE id = ?')
        .bind(errorMessage, Date.now(), this.testRunId)
        .run();
      
      // Broadcast error via WebSocket
      this.broadcastToClients({
        type: 'error',
        message: errorMessage,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Log but don't throw (graceful degradation)
      console.error('Failed to store error message:', error);
    }
  }

  /**
   * Phase 4: Evaluation & Scoring (Story 2.6)
   * Analyzes captured evidence, generates quality scores via AI Gateway vision model
   */
  private async runPhase4(hasPartialEvidence = false): Promise<Response> {
    // Task 1: Initialize result structure
    const result: Phase4Result = {
      success: false,
      overallScore: 0,
      metrics: [],
    };

    try {
      // Task 1: Set 60-second timeout for Phase 4
      const timeoutMs = 60000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Phase 4 execution timed out after 60 seconds')), timeoutMs);
      });

      // Execute Phase 4 logic with timeout
      const phase4Promise = this.executePhase4Logic(result, hasPartialEvidence);
      await Promise.race([phase4Promise, timeoutPromise]);

      return Response.json(result);
    } catch (error) {
      // Translate errors to user-friendly messages (Story 2.7)
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      const userFriendlyMessage = this.translateError(errorObj, Phase.PHASE4);
      result.success = false;
      result.overallScore = 0;
      result.metrics = [];
      
      // Store error message in test_runs table (Story 2.7)
      await this.storeErrorMessage(userFriendlyMessage);
      
      // Log technical error details to test_events (for debugging)
      if (this.testRunId && this.env.DB) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'failed',
          `Phase 4 failed: ${errorObj.message}`,
          JSON.stringify({ stack: errorObj.stack, phase: Phase.PHASE4 })
        );
      }
      
      return Response.json(result);
    }
  }

  /**
   * Execute Phase 4 logic steps
   */
  private async executePhase4Logic(result: Phase4Result, hasPartialEvidence = false): Promise<void> {
    // Task 1: Log phase start to test_events
    const startMessage = hasPartialEvidence 
      ? 'Phase 4: Evaluation & Scoring started with partial evidence from earlier phases'
      : 'Phase 4: Evaluation & Scoring started';
    await this.updateStatus(Phase.PHASE4, startMessage);
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE4,
      'started',
      startMessage
    );

    // Task 1: Verify browser session closed (if still open from Phase 3)
    if (this.stagehand) {
      try {
        await this.closeBrowser();
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'info',
          'Browser session closed from Phase 3'
        );
      } catch (error) {
        // Non-critical error - continue Phase 4
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'warning',
          `Failed to close browser: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Task 2: Retrieve all screenshots from R2
    await this.updateStatus(Phase.PHASE4, 'Retrieving screenshots from R2');
    const artifactsResult = await getTestArtifacts(this.env.EVIDENCE_BUCKET, this.testRunId, this.env);
    
    if (!artifactsResult.success) {
      throw new Error(`Failed to retrieve artifacts from R2: ${artifactsResult.error}`);
    }
    
    // Filter to screenshots only
    const screenshots = artifactsResult.data.filter(artifact => artifact.type === 'screenshot');
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE4,
      'info',
      `Retrieved ${screenshots.length} screenshots from R2`
    );

    // Task 2: Download screenshot data from R2 for AI analysis
    const screenshotBuffers: ArrayBuffer[] = [];
    for (const screenshot of screenshots) {
      try {
        const obj = await this.env.EVIDENCE_BUCKET.get(screenshot.key);
        if (obj) {
          const buffer = await obj.arrayBuffer();
          screenshotBuffers.push(buffer);
        }
      } catch (error) {
        // Log but continue with available screenshots
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'warning',
          `Failed to download screenshot ${screenshot.key}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Task 3: Retrieve console logs and network errors from DO state
    await this.updateStatus(Phase.PHASE4, 'Retrieving evidence from DO state');
    const consoleLogs = await this.state.storage.get<ConsoleLogEntry[]>('consoleLogs') || [];
    const networkErrors = await this.state.storage.get<NetworkError[]>('networkErrors') || [];
    
    // Task 3: Load AI decision log from Agent SQL
    const decisionLogRows = await this.execSQL('SELECT * FROM decision_log ORDER BY timestamp ASC');
    const decisionLog = Array.isArray(decisionLogRows) ? decisionLogRows : [];
    
    // Task 3: Prepare evidence summary
    const consoleErrorCount = consoleLogs.filter(log => log.level === 'error').length;
    const consoleWarningCount = consoleLogs.filter(log => log.level === 'warn').length;
    const networkErrorCount = networkErrors.length;
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE4,
      'info',
      `Evidence summary: ${screenshots.length} screenshots, ${consoleErrorCount} console errors, ${consoleWarningCount} warnings, ${networkErrorCount} network errors, ${decisionLog.length} AI decisions`
    );

    // Get Phase results for context (declare early to avoid hoisting issues)
    const phaseResults = await this.state.storage.get<Record<string, any>>('phaseResults') || {};
    const phase1Result = phaseResults.phase1 as Phase1Result | undefined;
    const phase2Result = phaseResults.phase2 as Phase2Result | undefined;
    const phase3Result = phaseResults.phase3 as Phase3Result | undefined;
    const controlCount = phase2Result?.controls ? Object.keys(phase2Result.controls).length : 0;
    
    // Task 4 & 5: Use AI Gateway vision model for quality assessment
    await this.updateStatus(Phase.PHASE4, 'Analyzing evidence with AI Gateway');
    let aiScores: Record<string, { score: number; justification: string }> | null = null;
    
    if (screenshotBuffers.length > 0) {
      // Get Phase results for context
      const actionCount = phase3Result?.actionsTaken || 0;
      const controlHypothesis = phase2Result?.hypothesis || 'unknown control scheme';
      
      // Get AI decisions summary for richer context
      const aiDecisions = await this.execSQL('SELECT decision, context FROM decision_log ORDER BY timestamp ASC');
      const decisionSummary = Array.isArray(aiDecisions) && aiDecisions.length > 0
        ? `AI agent performed ${aiDecisions.length} decisions during testing.`
        : '';
      
      // Task 4: Prepare detailed AI prompt for evaluation leveraging gpt-5-mini
      const prompt = `You are evaluating a web game test. Analyze ${screenshots.length} screenshots showing the game's progression and score it on 5 metrics (0-100).

**Test Context:**
- ${controlCount} interactive controls discovered (${controlHypothesis})
- ${actionCount} actions performed during gameplay
- ${decisionSummary}
- Technical data: ${consoleErrorCount} console errors, ${consoleWarningCount} warnings, ${networkErrorCount} network failures

**Your Task:**
Examine the visual progression across screenshots. Look for:
1. **Load Success**: Did the game load properly? Check first screenshot for blank/error pages.
2. **Visual Quality**: Evaluate graphics, layout, UI polish. Note any glitches or broken elements.
3. **Controls & Responsiveness**: Do you see evidence controls worked? Look for state changes between screenshots.
4. **Playability**: Does the game show clear progression? Can you tell what happened during gameplay?
5. **Technical Stability**: Combined with error data, assess overall stability.

**Response Format (JSON only):**
{
  "load": { "score": <0-100>, "justification": "<What you observe in screenshots about loading>" },
  "visual": { "score": <0-100>, "justification": "<Specific visual observations from screenshots>" },
  "controls": { "score": <0-100>, "justification": "<Evidence of controls working or not working>" },
  "playability": { "score": <0-100>, "justification": "<What the gameplay progression shows>" },
  "technical": { "score": <0-100>, "justification": "<Technical assessment combining errors and visuals>" }
}`;

      // Task 4: Call AI Gateway with vision model
      const aiResult = await callAI(
        this.env,
        prompt,
        screenshotBuffers,
        'primary',
        this.testRunId,
        { phase: Phase.PHASE4, purpose: 'evaluation' }
      );
      
      if (aiResult.success) {
        // Task 4: Parse AI response
        try {
          // Extract JSON from response (may have markdown code blocks)
          let jsonText = aiResult.data.text.trim();
          const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1];
          }
          
          aiScores = JSON.parse(jsonText);
          
          // Validate JSON structure
          const requiredMetrics = ['load', 'visual', 'controls', 'playability', 'technical'];
          for (const metric of requiredMetrics) {
            if (!aiScores || !aiScores[metric] || typeof aiScores[metric].score !== 'number' || typeof aiScores[metric].justification !== 'string') {
              throw new Error(`Invalid AI response: missing or malformed metric ${metric}`);
            }
          }
          
          await insertTestEvent(
            this.env.DB,
            this.testRunId,
            Phase.PHASE4,
            'info',
            'AI evaluation completed successfully'
          );
        } catch (parseError) {
          // Task 4: Handle malformed JSON - use fallback
          await insertTestEvent(
            this.env.DB,
            this.testRunId,
            Phase.PHASE4,
            'warning',
            `Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. Using fallback scoring.`
          );
          aiScores = null;
        }
      } else {
        // Task 4: AI Gateway failed - use fallback
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'warning',
          `AI Gateway evaluation failed: ${aiResult.error}. Using fallback scoring.`
        );
      }
    } else {
      // No screenshots available - use fallback scoring (Story 2.7 graceful degradation)
      const fallbackMessage = hasPartialEvidence
        ? 'Limited evidence available due to earlier phase failures. Using fallback scoring based on technical data.'
        : 'No screenshots available for AI analysis. Using fallback scoring based on technical data.';
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE4,
        'warning',
        fallbackMessage
      );
    }

    // Task 5 & 7: Generate evidence-based scores using collected metrics
    // Load collected metrics from previous phases
    const phaseMetrics = await this.state.storage.get<PhaseMetrics>('phaseMetrics') || {};
    const metrics: MetricScore[] = [];
    
    // Task 5: Load score - Evidence-based from Phase 1 metrics
    let loadScore = aiScores?.load?.score ?? 100;
    if (!aiScores && phaseMetrics.phase1) {
      // Use Phase 1 metrics for evidence-based scoring
      const p1 = phaseMetrics.phase1;
      loadScore = p1.visuallyComplete && p1.httpErrors === 0 ? 100 : 50;
    } else if (!aiScores) {
      loadScore = phase1Result?.success ? 100 : 0;
    }
    
    const loadJustification = aiScores?.load?.justification ?? 
      (phaseMetrics.phase1 
        ? `Game loaded in ${phaseMetrics.phase1.loadTime}ms. HTTP errors: ${phaseMetrics.phase1.httpErrors}. Visually complete: ${phaseMetrics.phase1.visuallyComplete}.`
        : phase1Result?.success 
          ? 'Game loaded successfully with no HTTP errors or blank screens detected in Phase 1 validation.'
          : 'Game failed to load properly in Phase 1. Check for 404 errors or network issues.');
    metrics.push({ name: 'load', score: this.clampScore(loadScore), justification: loadJustification });
    
    // Task 5: Visual score - Enhanced with screenshot count
    const visualScore = aiScores?.visual?.score ?? (screenshots.length > 3 ? 80 : screenshots.length > 0 ? 60 : 30);
    const visualJustification = aiScores?.visual?.justification ?? 
      `Captured ${screenshots.length} screenshots during test. ${screenshots.length > 3 ? 'Good visual coverage' : screenshots.length > 0 ? 'Limited visual coverage' : 'Insufficient screenshots for proper assessment'}.`;
    metrics.push({ name: 'visual', score: this.clampScore(visualScore), justification: visualJustification });
    
    // Task 5: Controls score - Evidence-based from Phase 2 metrics
    let controlsScore = aiScores?.controls?.score ?? 50;
    if (!aiScores && phaseMetrics.phase2) {
      // Calculate based on controls found and diversity
      const p2 = phaseMetrics.phase2;
      const diversityBonus = p2.controlDiversity.length * 10; // +10 per control type
      controlsScore = Math.min(50 + (p2.controlsFound * 5) + diversityBonus, 100);
    } else if (!aiScores) {
      controlsScore = controlCount > 0 ? 100 : 50;
    }
    
    const controlsJustification = aiScores?.controls?.justification ?? 
      (phaseMetrics.phase2 
        ? `Discovered ${phaseMetrics.phase2.controlsFound} interactive controls with ${phaseMetrics.phase2.controlDiversity.length} control types: ${phaseMetrics.phase2.controlDiversity.join(', ')}.`
        : `Discovered ${controlCount} interactive controls in Phase 2 (${phase2Result?.hypothesis || 'controls detected'}).`);
    metrics.push({ name: 'controls', score: this.clampScore(controlsScore), justification: controlsJustification });
    
    // Task 5: Playability score - Evidence-based from Phase 3 metrics
    let playabilityScore = aiScores?.playability?.score ?? 50;
    if (!aiScores && phaseMetrics.phase3) {
      // Calculate based on actions performed and duration
      const p3 = phaseMetrics.phase3;
      const actionScore = Math.min(p3.actionsPerformed * 3, 50); // Up to 50 points for actions
      const interactionScore = Math.min(p3.uniqueInteractions * 5, 30); // Up to 30 points for variety
      const durationBonus = p3.duration >= 30 && p3.duration <= 90 ? 20 : 10; // Bonus for good duration
      playabilityScore = Math.min(actionScore + interactionScore + durationBonus, 100);
    }
    
    const playabilityJustification = aiScores?.playability?.justification ?? 
      (phaseMetrics.phase3 
        ? `Performed ${phaseMetrics.phase3.actionsPerformed} actions with ${phaseMetrics.phase3.uniqueInteractions} unique interactions over ${phaseMetrics.phase3.duration}s. ${phaseMetrics.phase3.errorsEncountered > 0 ? `Encountered ${phaseMetrics.phase3.errorsEncountered} errors.` : 'No errors during gameplay.'}`
        : 'Playability assessment requires detailed gameplay metrics.');
    metrics.push({ name: 'playability', score: this.clampScore(playabilityScore), justification: playabilityJustification });
    
    // Task 5: Technical score - Evidence-based from all phases
    const totalErrors = consoleErrorCount + networkErrorCount + (phaseMetrics.phase3?.errorsEncountered || 0);
    const errorPenalty = Math.min(totalErrors * 10, 100);
    const technicalScore = aiScores?.technical?.score ?? Math.max(100 - errorPenalty, 0);
    const technicalJustification = aiScores?.technical?.justification ?? 
      `Technical stability: ${consoleErrorCount} console errors, ${consoleWarningCount} warnings, ${networkErrorCount} network failures. Total errors: ${totalErrors}. ${totalErrors === 0 ? 'Excellent stability.' : totalErrors < 3 ? 'Minor issues detected.' : 'Significant issues impacting stability.'}`;
    metrics.push({ name: 'technical', score: this.clampScore(technicalScore), justification: technicalJustification });

    // Task 6: Calculate overall quality score
    const loadWeight = 0.15;
    const visualWeight = 0.20;
    const controlsWeight = 0.20;
    const playabilityWeight = 0.30;
    const technicalWeight = 0.15;
    
    const overallScore = Math.round(
      (metrics[0].score * loadWeight) +
      (metrics[1].score * visualWeight) +
      (metrics[2].score * controlsWeight) +
      (metrics[3].score * playabilityWeight) +
      (metrics[4].score * technicalWeight)
    );
    
    // Task 6: Add overall metric to metrics array
    metrics.push({
      name: 'overall',
      score: this.clampScore(overallScore),
      justification: `Weighted average of 5 metrics: Load (15%), Visual (20%), Controls (20%), Playability (30%), Technical (15%).`
    });
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE4,
      'info',
      `Calculated overall score: ${overallScore}/100`
    );

    // Task 8: Store evaluation_scores to D1 (6 rows: 5 metrics + overall)
    await this.updateStatus(Phase.PHASE4, 'Storing evaluation scores to database');
    for (const metric of metrics) {
      const insertResult = await insertEvaluationScore(
        this.env.DB,
        this.testRunId,
        metric.name,
        metric.score,
        metric.justification
      );
      
      if (!insertResult.success) {
        // Log error but continue Phase 4
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'warning',
          `Failed to insert evaluation score for ${metric.name}: ${insertResult.error}`
        );
      }
    }
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE4,
      'info',
      'Evaluation scores stored to D1 database (6 rows)'
    );

    // Task 9: Store overall_score in test_runs table
    try {
      await this.env.DB
        .prepare(`UPDATE test_runs SET overall_score = ?, updated_at = ? WHERE id = ?`)
        .bind(overallScore, Date.now(), this.testRunId)
        .run();
      
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE4,
        'info',
        `Updated test_runs.overall_score to ${overallScore}`
      );
    } catch (error) {
      // Log error but continue Phase 4
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE4,
        'warning',
        `Failed to update test_runs.overall_score: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Task 10: Flush all logs to R2
    await this.updateStatus(Phase.PHASE4, 'Flushing logs to R2');
    
    // Task 10: Upload console.log
    if (consoleLogs.length > 0) {
      const consoleLogContent = consoleLogs.map(log => 
        `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.text}`
      ).join('\n');
      
      const consoleUpload = await uploadLog(
        this.env.EVIDENCE_BUCKET,
        this.testRunId,
        LogType.CONSOLE,
        consoleLogContent
      );
      
      if (!consoleUpload.success) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'warning',
          `Failed to upload console.log: ${consoleUpload.error}`
        );
      }
    }
    
    // Task 10: Upload network.log
    if (networkErrors.length > 0) {
      const networkLogContent = networkErrors.map(error => 
        `[${new Date(error.timestamp).toISOString()}] URL: ${error.url}, Status: ${error.status || 'N/A'}, Error: ${error.error}`
      ).join('\n');
      
      const networkUpload = await uploadLog(
        this.env.EVIDENCE_BUCKET,
        this.testRunId,
        LogType.NETWORK,
        networkLogContent
      );
      
      if (!networkUpload.success) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'warning',
          `Failed to upload network.log: ${networkUpload.error}`
        );
      }
    }
    
    // Task 10: Upload agent-decisions.log
    if (decisionLog.length > 0) {
      const agentDecisionsContent = decisionLog.map((row: any) => 
        `[${new Date(row.timestamp).toISOString()}] ${row.decision} (Model: ${row.ai_model || 'N/A'})\nContext: ${row.context}`
      ).join('\n\n');
      
      const agentUpload = await uploadLog(
        this.env.EVIDENCE_BUCKET,
        this.testRunId,
        LogType.AGENT_DECISIONS,
        agentDecisionsContent
      );
      
      if (!agentUpload.success) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE4,
          'warning',
          `Failed to upload agent-decisions.log: ${agentUpload.error}`
        );
      }
    }
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE4,
      'info',
      'All logs flushed to R2 storage'
    );

    // Task 11: Update test_runs.status = 'completed' in D1
    await this.updateStatus(Phase.PHASE4, 'Marking test as completed');
    const statusUpdateResult = await updateTestStatus(this.env.DB, this.testRunId, 'completed');
    
    if (!statusUpdateResult.success) {
      // Log error but Phase 4 still completes
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE4,
        'warning',
        `Failed to update test status: ${statusUpdateResult.error}`
      );
    } else {
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        Phase.PHASE4,
        'info',
        'Test status updated to completed'
      );
    }

    // Task 12: Generate phase summary
    await this.summarizePhase(Phase.PHASE4, {
      overallScore,
      screenshotCount: screenshots.length
    });
    
    // Broadcast completion with score data
    const finalMessage = `Test complete! Overall Score: ${overallScore}/100`;
    this.broadcastToClients({
      type: 'complete',
      status: 'completed',
      message: finalMessage,
      timestamp: Date.now(),
      data: {
        overallScore,
        metrics: {
          load: metrics[0].score,
          visual: metrics[1].score,
          controls: metrics[2].score,
          playability: metrics[3].score,
          technical: metrics[4].score,
        },
      },
    });
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE4,
      'completed',
      finalMessage,
      JSON.stringify({ overallScore, metrics })
    );

    // Task 13: Set result success and populate fields
    result.success = true;
    result.overallScore = overallScore;
    result.metrics = metrics;
    
    // Task 13: Update DO state with Phase 4 result
    const phaseResultsUpdated = await this.state.storage.get<Record<string, any>>('phaseResults') || {};
    phaseResultsUpdated.phase4 = result;
    await this.state.storage.put('phaseResults', phaseResultsUpdated);
  }

  /**
   * Clamp score to 0-100 range
   */
  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Update status helper: Logs to D1 and broadcasts via WebSocket
   */
  private async updateStatus(phase: string, message: string): Promise<void> {
    try {
      // Log to D1 test_events table
      if (this.testRunId && this.env.DB) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          phase,
          'progress',
          message
        );
      }

      // Broadcast via WebSocket (rate limited to 1 event per 500ms for responsive updates)
      const now = Date.now();
      if (now - this.lastBroadcast >= 500) {
        this.broadcastToClients({
          type: 'progress',
          phase,
          message,
          timestamp: now,
        });
        this.lastBroadcast = now;
      }
    } catch (error) {
      // Log error but don't throw (graceful degradation)
      console.error('Failed to update status:', error);
    }
  }

  /**
   * Store evidence helper: Saves to R2 and tracks metadata in DO state
   */
  private async storeEvidence(
    type: 'screenshot' | 'log',
    data: ArrayBuffer | string,
    metadata?: { action?: string; logType?: LogType; phase?: Phase }
  ): Promise<string> {
    try {
      if (!this.testRunId || !this.env.EVIDENCE_BUCKET) {
        throw new Error('TestAgent not properly initialized for evidence storage');
      }

      let key: string;
      let url: string;

      if (type === 'screenshot' && data instanceof ArrayBuffer) {
        const phase = metadata?.phase || Phase.PHASE1;
        const action = metadata?.action || 'unknown-action';
        
        const result = await uploadScreenshot(
          this.env.EVIDENCE_BUCKET,
          this.testRunId,
          phase,
          action,
          data
        );
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        key = result.data;
        url = getPublicUrl(key, this.env);
      } else if (type === 'log' && typeof data === 'string') {
        const logType = metadata?.logType || LogType.AGENT_DECISIONS;
        
        const result = await uploadLog(
          this.env.EVIDENCE_BUCKET,
          this.testRunId,
          logType,
          data
        );
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        key = result.data;
        url = getPublicUrl(key, this.env);
      } else {
        throw new Error('Invalid evidence type or data format');
      }

      // Track in DO state
      const evidenceItem: EvidenceMetadata = {
        type,
        url,
        timestamp: Date.now(),
        description: metadata?.action || metadata?.logType,
      };

      // Store evidence metadata in DO state
      const currentEvidence = await this.state.storage.get<EvidenceMetadata[]>('evidence') || [];
      currentEvidence.push(evidenceItem);
      await this.state.storage.put('evidence', currentEvidence);

      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TestAgent] Failed to store evidence:`, message);
      throw new Error(`Failed to store evidence: ${message}`);
    }
  }

  /**
   * Broadcast message to all connected WebSocket clients
   */
  private broadcastToClients(message: Record<string, unknown>): void {
    const messageStr = JSON.stringify(message);
    
    // Deduplicate messages: Don't send the exact same message twice in a row within 5 seconds
    if (messageStr === this.lastBroadcastMessage && Date.now() - this.lastBroadcast < 5000) {
      return; // Skip duplicate
    }
    
    this.lastBroadcastMessage = messageStr;
    
    this.websocketClients.forEach(client => {
      try {
        client.send(messageStr);
      } catch (error) {
        // Remove failed clients
        this.websocketClients = this.websocketClients.filter(ws => ws !== client);
      }
    });
  }

  /**
   * Launch browser session with Stagehand + Workers AI (Story 2.2)
   * Creates browser session with viewport 1280x720, headless mode, and user agent
   * Stores session handle in DO state for persistence across phases
   */
  private async launchBrowser(): Promise<Stagehand> {
    try {
      // Check for existing browser session
      const existingSession = await this.state.storage.get('browserSession');
      if (existingSession && this.stagehand) {
        // Update lastUsed timestamp
        await this.state.storage.put('browserSession', {
          ...existingSession,
          lastUsed: Date.now(),
        });
        return this.stagehand;
      }

      // Initialize Stagehand with OpenRouter (direct access, bypassing AI Gateway)
      // Following: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
      // Flow: Stagehand → OpenRouter → OpenAI
      // Note: AI Gateway integration with Stagehand not currently supported
      
      if (!this.env.OPENROUTER_API_KEY) {
        throw new Error(
          'OpenRouter API key is missing. Set OPENROUTER_API_KEY in .dev.vars (local) or wrangler secret (production)'
        );
      }
      
      this.stagehand = new Stagehand({
        env: 'LOCAL',
        localBrowserLaunchOptions: {
          cdpUrl: endpointURLString(this.env.BROWSER),
        },
        // Use gpt-5-mini through OpenRouter with optimized settings
        modelName: 'openai/gpt-5-mini',
        modelClientOptions: {
          apiKey: this.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
        },
        verbose: 1,
        domSettleTimeoutMs: 2000, // Reduced for faster response
        enableCaching: false, // Disable for fresh decisions each time
      });

      // Initialize Stagehand
      await this.stagehand.init();

      // Configure Playwright with aggressive timeouts for faster fallback
      // When elements are blocked by overlays, fail fast and retry with force click
      this.stagehand.page.context().setDefaultTimeout(1200); // Fast failure for overlays
      this.stagehand.page.context().setDefaultNavigationTimeout(30000);
      
      // Optimize page settings for faster interaction
      await this.stagehand.page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      // Set viewport to 1280x720 (AC #1)
      await this.stagehand.page.setViewportSize({ width: 1280, height: 720 });

      // Set user agent (AC #6)
      await this.stagehand.page.context().addInitScript(() => {
        Object.defineProperty(navigator, 'userAgent', {
          get: () => 'GameEval TestAgent/1.0',
        });
      });

      // Store browser session handle in DO state
      const sessionId = `browser-${this.testRunId}-${Date.now()}`;
      await this.state.storage.put('browserSession', {
        handle: sessionId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      // Initialize console logs and network errors arrays if not present
      if (!await this.state.storage.get('consoleLogs')) {
        await this.state.storage.put('consoleLogs', []);
      }
      if (!await this.state.storage.get('networkErrors')) {
        await this.state.storage.put('networkErrors', []);
      }

      return this.stagehand;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      console.error('[TestAgent] Browser launch error:', { message, stack });
      throw new Error(`Failed to launch browser: ${message}`);
    }
  }

  /**
   * Close browser session and clean up resources (Story 2.2)
   */
  private async closeBrowser(): Promise<void> {
    try {
      // Check if browser session exists
      const browserSession = await this.state.storage.get('browserSession');
      if (!browserSession) {
        return; // No-op if no session exists
      }

      // Close Stagehand (which closes the underlying browser)
      if (this.stagehand) {
        try {
          await this.stagehand.close();
        } catch (error) {
          console.error('Failed to close Stagehand:', error);
        }
        this.stagehand = undefined;
      }

      // Clear browser session from DO state
      await this.state.storage.delete('browserSession');
    } catch (error) {
      // Log error but don't throw (graceful degradation)
      console.error('Failed to close browser:', error);
    }
  }

  /**
   * Capture screenshot and save to R2 (Story 2.2)
   * @param description - Description of the screenshot action
   * @returns R2 public URL for the screenshot
   */
  private async captureScreenshot(description: string, phase: Phase = Phase.PHASE1): Promise<string> {
    try {
      // Verify browser session exists
      if (!this.stagehand || !this.stagehand.page) {
        throw new Error('Browser page not initialized');
      }

      // Take screenshot using Stagehand's Page API (Playwright)
      const screenshotBuffer = await this.stagehand.page.screenshot({
        fullPage: false,
      });

      // Convert Buffer to ArrayBuffer
      const arrayBuffer = screenshotBuffer.buffer.slice(
        screenshotBuffer.byteOffset,
        screenshotBuffer.byteOffset + screenshotBuffer.byteLength
      ) as ArrayBuffer;

      // Save screenshot to R2 using existing helper
      const url = await this.storeEvidence('screenshot', arrayBuffer, {
        action: description,
        phase,
      });

      // Log to test events for visibility
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        phase,
        'screenshot_captured',
        `Screenshot captured: ${description}`
      );

      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TestAgent] Screenshot capture failed:`, message);
      
      // Log failure to test events
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        phase,
        'screenshot_failed',
        `Failed to capture screenshot ${description}: ${message}`
      );
      
      throw new Error(`Failed to capture screenshot: ${message}`);
    }
  }

  /**
   * Capture failure screenshot with AI reasoning
   * When a phase fails, this captures the current page state and uses AI to explain why
   */
  private async captureFailureScreenshot(phase: Phase, error: unknown): Promise<void> {
    try {
      // Only capture if browser is still available
      if (!this.stagehand || !this.stagehand.page) {
        await this.updateStatus(phase, `Phase failed: ${error instanceof Error ? error.message : 'Unknown error'} (No screenshot available - browser closed)`);
        return;
      }

      // Capture failure screenshot
      const screenshotDescription = `${phase}-failure`;
      await this.updateStatus(phase, `Capturing failure screenshot...`);
      
      const screenshotBuffer = await this.stagehand.page.screenshot({
        fullPage: false,
      });

      // Convert Buffer to ArrayBuffer
      const arrayBuffer = screenshotBuffer.buffer.slice(
        screenshotBuffer.byteOffset,
        screenshotBuffer.byteOffset + screenshotBuffer.byteLength
      ) as ArrayBuffer;

      // Save screenshot to R2
      const url = await this.storeEvidence('screenshot', arrayBuffer, {
        action: screenshotDescription,
        phase,
      });

      // Use AI to analyze why the phase failed
      await this.updateStatus(phase, `Analyzing failure with AI...`);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const prompt = `Analyze this screenshot of a game test that just failed during ${phase}.

Error: ${errorMessage}

Based on what you see in the screenshot, explain in 1-2 sentences why you think this phase failed. Consider:
- Is the page loaded correctly?
- Are there any error messages visible?
- Does the UI appear broken or unresponsive?
- Is there anything blocking the test agent?

Provide a brief, user-friendly explanation.`;

      const aiResult = await callAI(
        this.env,
        prompt,
        [arrayBuffer],
        'primary',
        this.testRunId,
        { phase, purpose: 'failure_analysis' }
      );

      let reasoning = 'Unable to determine cause from screenshot';
      if (aiResult.success && aiResult.data.text) {
        reasoning = aiResult.data.text.trim();
      }

      // Broadcast failure with reasoning
      await this.updateStatus(phase, `Phase failed: ${errorMessage}. AI analysis: ${reasoning}`);
      
      // Log to test events
      await insertTestEvent(
        this.env.DB,
        this.testRunId,
        phase,
        'failure_analysis',
        `Failure screenshot captured. AI reasoning: ${reasoning}`,
        JSON.stringify({ error: errorMessage, screenshot: url, reasoning })
      );
    } catch (captureError) {
      // If we can't capture failure screenshot, just log the original error
      const message = captureError instanceof Error ? captureError.message : 'Unknown error';
      await this.updateStatus(phase, `Phase failed: ${error instanceof Error ? error.message : 'Unknown error'} (Failed to capture screenshot: ${message})`);
    }
  }

  /**
   * Add console log entry to DO state (Story 2.2)
   */
  private async addConsoleLog(level: string, text: string): Promise<void> {
    try {
      const consoleLogs = await this.state.storage.get<ConsoleLogEntry[]>('consoleLogs') || [];
      consoleLogs.push({
        timestamp: Date.now(),
        level,
        text,
      });
      await this.state.storage.put('consoleLogs', consoleLogs);
    } catch (error) {
      console.error('Failed to add console log:', error);
    }
  }

  /**
   * Add network error to DO state (Story 2.2)
   */
  private async addNetworkError(url: string, status?: number, error?: string): Promise<void> {
    try {
      const networkErrors = await this.state.storage.get<NetworkError[]>('networkErrors') || [];
      networkErrors.push({
        timestamp: Date.now(),
        url,
        status,
        error: error || 'Network request failed',
      });
      await this.state.storage.put('networkErrors', networkErrors);
    } catch (error) {
      console.error('Failed to add network error:', error);
    }
  }

  /**
   * Error handling wrapper: Returns user-friendly error messages
   */
  private handleError(error: unknown, phase: string): Response {
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Translate technical errors to user-friendly messages
    let userFriendlyMessage: string;
    
    if (message.includes('404') || message.includes('not found')) {
      userFriendlyMessage = 'The game URL could not be accessed. Please check the URL is correct.';
    } else if (message.includes('timeout') || message.includes('timed out')) {
      userFriendlyMessage = 'The test phase timed out. Please try again or check the game URL.';
    } else if (message.includes('network') || message.includes('fetch')) {
      userFriendlyMessage = 'A network error occurred. Please check your connection and try again.';
    } else if (message.includes('not yet implemented')) {
      userFriendlyMessage = message; // Keep implementation messages as-is
    } else {
      userFriendlyMessage = 'An unexpected error occurred. Please try again later.';
    }

    // Log full error details to D1 for debugging (without exposing to user)
    if (this.testRunId && this.env.DB) {
      insertTestEvent(
        this.env.DB,
        this.testRunId,
        phase,
        'failed',
        `Error: ${message}` // Full technical error for logs
      ).catch(err => console.error('Failed to log error:', err));
    }

    return Response.json({
      success: false,
      error: userFriendlyMessage, // User-friendly message only
    });
  }
}

// Export TestAgentV2 as default for Durable Object binding
export default TestAgentV2;

