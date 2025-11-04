/**
 * TestAgent Durable Object
 * Manages individual test execution sessions with browser automation
 * Story 2.1: Full implementation with state management, WebSocket, and phase methods
 * 
 * Types: DurableObject, DurableObjectState, Env are provided by wrangler types
 * via worker-configuration.d.ts (auto-generated from wrangler.toml)
 */
import { insertTestEvent } from '../shared/helpers/d1';
import { uploadScreenshot, uploadLog } from '../shared/helpers/r2';
import { Phase, LogType } from '../shared/constants';
import type { TestAgentState, EvidenceMetadata } from '../shared/types';

export class TestAgent implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  
  // TestAgent instance properties (restored from DO storage on each fetch)
  private testRunId: string = '';
  private gameUrl: string = '';
  private inputSchema?: string;
  
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
   * Phase 1: Load & Validation (empty implementation)
   */
  private async runPhase1(): Promise<Response> {
    try {
      await this.updateStatus(Phase.PHASE1, 'Phase 1 started (implementation pending)');
      
      return Response.json({
        success: false,
        message: 'Phase 1 not yet implemented',
      });
    } catch (error) {
      return this.handleError(error, Phase.PHASE1);
    }
  }

  /**
   * Phase 2: Control Discovery (empty implementation)
   */
  private async runPhase2(): Promise<Response> {
    try {
      await this.updateStatus(Phase.PHASE2, 'Phase 2 started (implementation pending)');
      
      return Response.json({
        success: false,
        message: 'Phase 2 not yet implemented',
      });
    } catch (error) {
      return this.handleError(error, Phase.PHASE2);
    }
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

