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
import { Stagehand } from '@browserbasehq/stagehand';
import { endpointURLString } from '@cloudflare/playwright';
import { WorkersAIClient } from '../shared/helpers/workersAIClient';
import { insertTestEvent } from '../shared/helpers/d1';
import { uploadScreenshot, uploadLog } from '../shared/helpers/r2';
import { Phase, LogType } from '../shared/constants';
import type { TestAgentState, EvidenceMetadata, ConsoleLogEntry, NetworkError, Phase1Result, Phase2Result, ControlMap } from '../shared/types';

export class TestAgent implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  
  // TestAgent instance properties (restored from DO storage on each fetch)
  private testRunId: string = '';
  private gameUrl: string = '';
  private inputSchema?: string;
  
  // Browser automation (Story 2.2) - Using Stagehand with Workers AI
  private stagehand?: Stagehand;
  
  // WebSocket clients for real-time progress updates (not persisted)
  private websocketClients: WebSocket[] = [];
  private lastBroadcast: number = 0;
  
  // Agent SQL initialized flag
  private sqlInitialized: boolean = false;
  
  // State hydration flag
  private stateHydrated: boolean = false;

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

      return Response.json(result);
    } catch (error) {
      // Translate errors to user-friendly messages (Task 1)
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
      result.errors.push(this.translatePhase1Error(message));
      
      // Log error to test_events
      if (this.testRunId && this.env.DB) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE1,
          'failed',
          `Phase 1 failed: ${message}`
        );
      }
      
      return Response.json(result);
    }
  }

  /**
   * Execute Phase 1 logic steps
   */
  private async executePhase1Logic(result: Phase1Result): Promise<void> {
    // Task 1: Log phase start to test_events
    await this.updateStatus(Phase.PHASE1, 'Phase 1 started');
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE1,
      'started',
      'Phase 1: Load & Validation started'
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

    // Task 5: Capture initial screenshot (AC #5)
    try {
      await this.captureScreenshot('phase1-initial-load', Phase.PHASE1);
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

    // Task 8: Detect if game requires user interaction to start (AC #8)
    // Check for play/start/begin buttons using Puppeteer's $$ selector
    const playButtons = await page.$$('button');
    let requiresInteraction = false;
    
    for (const button of playButtons) {
      try {
        const text = await page.evaluate((el: any) => el.textContent?.toLowerCase() || '', button);
        if (text.includes('play') || text.includes('start') || text.includes('begin')) {
          requiresInteraction = true;
          break;
        }
      } catch (e) {
        // Skip buttons that can't be evaluated
        continue;
      }
    }
    
    result.requiresInteraction = requiresInteraction;
    
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE1,
      'interaction_detection',
      `Game requires interaction: ${result.requiresInteraction}`
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
      } catch (error) {
        console.error('Failed to update test_runs status:', error);
      }

      // Task 11: Broadcast progress via WebSocket (AC #11)
      await this.updateStatus(Phase.PHASE1, 'Phase 1 complete - Game loaded successfully');

      // Task 12: Store Phase 1 result in DO state (AC #12)
      const phaseResults = await this.state.storage.get<Record<string, Phase1Result>>('phaseResults') || {};
      phaseResults.phase1 = result;
      await this.state.storage.put('phaseResults', phaseResults);
    }
  }

  /**
   * Translate Phase 1 errors to user-friendly messages
   */
  private translatePhase1Error(message: string): string {
    if (message.includes('timed out') || message.includes('timeout')) {
      return 'Game page did not load within timeout. Please check the URL and try again.';
    }
    if (message.includes('net::ERR') || message.includes('Network')) {
      return 'Network error while loading game. Please check your connection and the game URL.';
    }
    if (message.includes('Invalid URL')) {
      return 'Invalid game URL. Please check the URL format is correct.';
    }
    if (message.includes('browser')) {
      return 'Failed to launch browser session. Please try again.';
    }
    return message;
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

      return Response.json(result);
    } catch (error) {
      // Translate errors to user-friendly messages (Task 1)
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.success = false;
      result.controls = {};
      result.hypothesis = '';
      
      // Log error to test_events
      if (this.testRunId && this.env.DB) {
        await insertTestEvent(
          this.env.DB,
          this.testRunId,
          Phase.PHASE2,
          'failed',
          `Phase 2 failed: ${message}`
        );
      }
      
      return Response.json(result);
    }
  }

  /**
   * Execute Phase 2 logic steps
   */
  private async executePhase2Logic(result: Phase2Result): Promise<void> {
    // Task 1: Log phase start to test_events
    await this.updateStatus(Phase.PHASE2, 'Phase 2 started');
    await insertTestEvent(
      this.env.DB,
      this.testRunId,
      Phase.PHASE2,
      'started',
      'Phase 2: Control Discovery started'
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
    let observedElements: any[];
    try {
      // Stagehand page.observe() returns array of interactive element actions
      // Reference: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
      // observe() identifies interactive elements on the page
      observedElements = await page.observe();
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
      // Stagehand returns actions with selectors and descriptions
      const selector = element.selector || element.locator || `element-${Object.keys(controlMap).length}`;
      const description = element.description || element.text || 'Interactive element';
      
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
        
        // Note: inputSchema guides but doesn't restrict discovery
        // All discovered controls are kept, schema just provides context
      } catch (schemaError) {
        // Log error but continue (inputSchema is optional guidance)
        console.error('Failed to parse inputSchema:', schemaError);
      }
    }

    result.controls = controlMap;

    // Task 5: Capture screenshot with controls (AC #5)
    try {
      await this.captureScreenshot('phase2-controls', Phase.PHASE2);
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

    // Task 9: Broadcast progress via WebSocket (AC #9)
    const controlCount = Object.keys(controlMap).length;
    await this.updateStatus(Phase.PHASE2, `Phase 2 complete - Discovered ${controlCount} controls`);

    // All steps completed successfully
    result.success = true;

    // Task 10: Store Phase 2 result in DO state (AC #10)
    const phaseResults = await this.state.storage.get<Record<string, any>>('phaseResults') || {};
    phaseResults.phase2 = result;
    await this.state.storage.put('phaseResults', phaseResults);
    
    // Store controls in DO state for Phase 3 reference
    await this.state.storage.put('discoveredControls', result.controls);
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
   * Phase 3: Gameplay Exploration (empty implementation)
   */
  private async runPhase3(): Promise<Response> {
    try {
      await this.updateStatus(Phase.PHASE3, 'Phase 3 started (implementation pending)');
      
      return Response.json({
        success: false,
        message: 'Phase 3 not yet implemented',
      });
    } catch (error) {
      return this.handleError(error, Phase.PHASE3);
    }
  }

  /**
   * Phase 4: Evaluation & Scoring (empty implementation)
   */
  private async runPhase4(): Promise<Response> {
    try {
      await this.updateStatus(Phase.PHASE4, 'Phase 4 started (implementation pending)');
      
      return Response.json({
        success: false,
        message: 'Phase 4 not yet implemented',
      });
    } catch (error) {
      return this.handleError(error, Phase.PHASE4);
    }
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

      // Broadcast via WebSocket (rate limited to 1 event per 5 seconds)
      const now = Date.now();
      if (now - this.lastBroadcast >= 5000) {
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
        url = `${this.env.R2_PUBLIC_URL}/${key}`;
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
        url = `${this.env.R2_PUBLIC_URL}/${key}`;
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
      throw new Error(`Failed to store evidence: ${message}`);
    }
  }

  /**
   * Broadcast message to all connected WebSocket clients
   */
  private broadcastToClients(message: Record<string, unknown>): void {
    const messageStr = JSON.stringify(message);
    
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

      // Initialize Stagehand with Workers AI and Cloudflare Browser Rendering
      // Following: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
      const llmClient = new WorkersAIClient(this.env.AI);

      this.stagehand = new Stagehand({
        env: 'LOCAL',
        localBrowserLaunchOptions: {
          cdpUrl: endpointURLString(this.env.BROWSER),
        },
        llmClient,
        verbose: 1,
      });

      // Initialize Stagehand
      await this.stagehand.init();

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
      console.error('[TestAgent] Browser launch error:', error);
      console.error('[TestAgent] Error details:', { message, stack: error instanceof Error ? error.stack : undefined });
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

      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to capture screenshot: ${message}`);
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

// Export TestAgent as default for Durable Object binding
export default TestAgent;

