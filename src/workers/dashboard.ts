/**
 * Dashboard Worker for GameEval QA Pipeline
 * Story 3.1: Dashboard Worker with URL Submission
 * 
 * Serves HTML/CSS/JS directly from Worker with inline assets (no separate static hosting).
 * Implements RPC method submitTest() that validates inputs, generates UUID, triggers Workflow.
 */

import type { SubmitTestRequest, SubmitTestResponse, TestRunSummary, TestReport, MetricScore } from '../shared/types';
import { listRecentTests, getTestEvents, createTestRun, getTestById, getEvaluationScores } from '../shared/helpers/d1';
import { getTestArtifacts } from '../shared/helpers/r2';
import { LogType } from '../shared/constants';

/**
 * Sanitize error messages (Story 2.7)
 * Removes stack traces, internal error codes, infrastructure details
 * Preserves user-facing error messages for Dashboard Worker
 */
function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  
  // For Dashboard Worker, preserve validation error messages as-is
  // They are already user-friendly and don't contain internal details
  if (message.includes('Game URL') || 
      message.includes('Input schema') || 
      message.includes('valid JSON') ||
      message.includes('HTTP') ||
      message.includes('HTTPS')) {
    return message;
  }
  
  // Remove stack traces (everything after "at " or newline)
  let sanitized = message.split('\n')[0].split(' at ')[0];
  
  // Remove internal error codes (EACCES, ENOTFOUND, etc.) - but not HTTP/HTTPS
  sanitized = sanitized.replace(/\b(?!HTTP|HTTPS)[A-Z]{2,}[A-Z0-9_]+\b/g, '');
  
  // Remove file paths (/src/..., C:\...)
  sanitized = sanitized.replace(/[\/\\][\w\/\\.-]+\.\w+(?::\d+)?/g, '');
  
  // Remove infrastructure details (Durable Object, R2, Workflow, etc.)
  sanitized = sanitized.replace(/\b(Durable Object|R2 bucket|Workflow|Workers|Cloudflare)\b/gi, 'service');
  
  // If message is now empty or too short, return generic error
  sanitized = sanitized.trim();
  if (sanitized.length < 5) {
    return 'An unexpected error occurred. Please try again.';
  }
  
  return sanitized;
}

/**
 * Dashboard Worker entry point
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Route: Serve HTML page at root
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(getHTML(), {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
        },
      });
    }

    // Route: Handle RPC submitTest endpoint
    if (url.pathname === '/rpc/submitTest' && request.method === 'POST') {
      try {
        const body = await request.json() as SubmitTestRequest;
        const result = await submitTest(env, body.gameUrl, body.inputSchema);
        return Response.json(result);
      } catch (error) {
        console.error('RPC submitTest error:', error);
        return Response.json(
          { error: sanitizeErrorMessage(error) },
          { status: 400 }
        );
      }
    }

    // Route: Handle RPC listTests endpoint (Story 3.2)
    if (url.pathname === '/rpc/listTests' && request.method === 'GET') {
      try {
        const result = await listTests(env);
        return Response.json(result);
      } catch (error) {
        console.error('RPC listTests error:', error);
        return Response.json(
          { error: sanitizeErrorMessage(error) },
          { status: 500 }
        );
      }
    }

    // Route: Handle RPC getTestReport endpoint (Story 3.4)
    if (url.pathname === '/rpc/getTestReport' && request.method === 'GET') {
      try {
        const testId = url.searchParams.get('testId');
        if (!testId) {
          return Response.json(
            { error: 'testId query parameter is required' },
            { status: 400 }
          );
        }
        
        // Validate testId is UUID format
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(testId)) {
          return Response.json(
            { error: 'Invalid testId format (must be UUID)' },
            { status: 400 }
          );
        }
        
        const result = await getTestReport(env, testId);
        return Response.json(result);
      } catch (error) {
        console.error('RPC getTestReport error:', error);
        return Response.json(
          { error: sanitizeErrorMessage(error) },
          { status: 500 }
        );
      }
    }

    // Route: Handle RPC exportTestJSON endpoint (Story 3.4)
    if (url.pathname === '/rpc/exportTestJSON' && request.method === 'GET') {
      try {
        const testId = url.searchParams.get('testId');
        if (!testId) {
          return Response.json(
            { error: 'testId query parameter is required' },
            { status: 400 }
          );
        }
        
        // Validate testId is UUID format
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(testId)) {
          return Response.json(
            { error: 'Invalid testId format (must be UUID)' },
            { status: 400 }
          );
        }
        
        const testReport = await getTestReport(env, testId);
        const jsonString = JSON.stringify(testReport, null, 2);
        
        return new Response(jsonString, {
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="test-${testId}.json"`,
          },
        });
      } catch (error) {
        console.error('RPC exportTestJSON error:', error);
        return Response.json(
          { error: sanitizeErrorMessage(error) },
          { status: 500 }
        );
      }
    }

    // Route: Handle RPC connectToTest endpoint (Story 3.3 AC2)
    // Returns WebSocket URL for frontend to connect
    if (url.pathname === '/rpc/connectToTest' && request.method === 'POST') {
      try {
        const body = await request.json() as { testRunId: string };
        const wsUrl = `wss://${url.host}/ws?testId=${body.testRunId}`;
        return Response.json({ wsUrl });
      } catch (error) {
        console.error('RPC connectToTest error:', error);
        return Response.json(
          { error: sanitizeErrorMessage(error) },
          { status: 400 }
        );
      }
    }

    // Route: Handle WebSocket upgrade for real-time updates (Story 3.3)
    if (url.pathname === '/ws' && request.headers.get('Upgrade') === 'websocket') {
      try {
        return await handleWebSocketUpgrade(env, request, url);
      } catch (error) {
        console.error('WebSocket upgrade error:', error);
        return Response.json(
          { error: sanitizeErrorMessage(error) },
          { status: 400 }
        );
      }
    }

    // Route: Serve R2 objects directly (works in both local dev and production)
    // This allows screenshots to work in local dev without requiring R2 public access
    if (url.pathname.startsWith('/r2/')) {
      try {
        const key = url.pathname.substring(4); // Remove '/r2/' prefix
        const obj = await env.EVIDENCE_BUCKET.get(key);
        
        if (!obj) {
          return new Response('File not found', { status: 404 });
        }
        
        const headers = new Headers();
        obj.writeHttpMetadata(headers);
        headers.set('etag', obj.httpEtag);
        headers.set('cache-control', 'public, max-age=31536000'); // Cache for 1 year
        
        return new Response(obj.body, { headers });
      } catch (error) {
        console.error('R2 proxy error:', error);
        return Response.json(
          { error: sanitizeErrorMessage(error) },
          { status: 500 }
        );
      }
    }

    // 404 for all other routes
    return new Response('Not Found', { status: 404 });
  },
};

/**
 * RPC method: Submit test request
 * 
 * Validates gameUrl and inputSchema, generates testRunId UUID, triggers Workflow.
 * 
 * @param env - Environment bindings (WORKFLOW, DB, etc.)
 * @param gameUrl - Game URL to test (required, must be HTTP/HTTPS)
 * @param inputSchema - Optional JSON schema for test guidance
 * @returns Test ID (UUID)
 * @throws Error if validation fails or Workflow trigger fails
 */
async function submitTest(
  env: Env,
  gameUrl: string,
  inputSchema?: string
): Promise<SubmitTestResponse> {
  // Validate gameUrl format (must be HTTP/HTTPS)
  if (!gameUrl || typeof gameUrl !== 'string') {
    throw new Error('Game URL is required');
  }

  const urlPattern = /^https?:\/\/.+/i;
  if (!urlPattern.test(gameUrl)) {
    throw new Error('Game URL must be a valid HTTP or HTTPS URL');
  }

  // Validate inputSchema if provided (must be valid JSON)
  if (inputSchema) {
    if (typeof inputSchema !== 'string') {
      throw new Error('Input schema must be a string');
    }
    try {
      JSON.parse(inputSchema);
    } catch {
      throw new Error('Input schema must be valid JSON');
    }
  }

  // Generate testRunId using crypto.randomUUID()
  const testRunId = crypto.randomUUID();

  // Create test run record in database with 'queued' status
  const createResult = await createTestRun(env.DB, testRunId, gameUrl, inputSchema);
  if (!createResult.success) {
    console.error('Failed to create test run in database:', createResult.error);
    throw new Error('Failed to create test run. Please try again.');
  }

  // Trigger Workflow via service binding
  // Note: Workflow runs automatically when created with params (no separate .run() method exists)
  try {
    await env.WORKFLOW.create({
      params: {
        testRunId,
        gameUrl,
        inputSchema: inputSchema || undefined,
      },
    });
  } catch (error) {
    console.error('Workflow trigger failed:', error);
    throw new Error('Failed to start test. Please try again later.');
  }

  // Return test ID
  return { testId: testRunId };
}

/**
 * RPC method: List recent test runs with status
 * Story 3.2: Test Run List with Real-Time Status
 * 
 * Queries D1 for recent test runs, calculates progress from test_events,
 * and returns summary information for dashboard display.
 * 
 * @param env - Environment bindings (DB, etc.)
 * @returns Array of TestRunSummary objects
 * @throws Error if D1 query fails
 */
async function listTests(env: Env): Promise<TestRunSummary[]> {
  // Query D1 for recent test runs (limit 50)
  const testsResult = await listRecentTests(env.DB, 50);
  
  if (!testsResult.success) {
    throw new Error(testsResult.error);
  }

  const tests = testsResult.data;
  const summaries: TestRunSummary[] = [];

  // Build summary for each test run
  for (const test of tests) {
    // Calculate progress and phase from test_events
    let progress = 0;
    let phase: 'phase1' | 'phase2' | 'phase3' | 'phase4' | undefined;
    
    const eventsResult = await getTestEvents(env.DB, test.id);
    if (eventsResult.success && eventsResult.data.length > 0) {
      // Find the latest phase from events
      const events = eventsResult.data;
      const latestEvent = events[events.length - 1];
      
      // Determine current phase and progress
      const phaseStr = latestEvent.phase.toLowerCase();
      if (phaseStr === 'phase1') {
        phase = 'phase1';
        progress = 1;
      } else if (phaseStr === 'phase2') {
        phase = 'phase2';
        progress = 2;
      } else if (phaseStr === 'phase3') {
        phase = 'phase3';
        progress = 3;
      } else if (phaseStr === 'phase4') {
        phase = 'phase4';
        progress = 4;
      }
    }

    // Calculate duration if completed
    let duration: number | undefined;
    if (test.completed_at) {
      duration = test.completed_at - test.created_at;
    }

    // Map status to valid status types
    let status: 'queued' | 'running' | 'completed' | 'failed';
    if (test.status === 'queued') {
      status = 'queued';
    } else if (test.status === 'running') {
      status = 'running';
    } else if (test.status === 'completed') {
      status = 'completed';
    } else if (test.status === 'failed') {
      status = 'failed';
    } else {
      // Default to queued for unknown statuses
      status = 'queued';
    }

    summaries.push({
      id: test.id,
      url: test.url,
      status,
      phase,
      progress,
      overallScore: test.overall_score ?? undefined,
      createdAt: test.created_at,
      completedAt: test.completed_at ?? undefined,
      duration,
    });
  }

  return summaries;
}

/**
 * RPC method: Get complete test report with all details
 * Story 3.4: Detailed Test Report View
 * 
 * Queries D1 for test_runs, evaluation_scores, test_events tables
 * and R2 for screenshots and logs. Joins all data into TestReport object.
 * 
 * @param env - Environment bindings (DB, EVIDENCE_BUCKET, etc.)
 * @param testId - Test run UUID
 * @returns Complete TestReport object
 * @throws Error if test not found or database/R2 queries fail
 */
async function getTestReport(env: Env, testId: string): Promise<TestReport> {
  // Query test run from D1
  const testResult = await getTestById(env.DB, testId);
  
  if (!testResult.success) {
    throw new Error(testResult.error);
  }
  
  if (!testResult.data) {
    throw new Error('Test not found');
  }
  
  const test = testResult.data;
  
  // Query evaluation scores from D1
  const scoresResult = await getEvaluationScores(env.DB, testId);
  if (!scoresResult.success) {
    throw new Error(scoresResult.error);
  }
  
  // Transform evaluation scores to MetricScore format
  const metrics: MetricScore[] = scoresResult.data.map(score => ({
    name: score.metric_name,
    score: score.score,
    justification: score.justification,
  }));
  
  // Query test events from D1
  const eventsResult = await getTestEvents(env.DB, testId);
  if (!eventsResult.success) {
    throw new Error(eventsResult.error);
  }
  
  // Query artifacts from R2
  const artifactsResult = await getTestArtifacts(env.EVIDENCE_BUCKET, testId, env);
  
  // Handle R2 query failure gracefully (test may not have artifacts yet)
  let screenshots: Array<{ url: string; phase: string; description: string; timestamp: number }> = [];
  let consoleLogs: string[] = [];
  let networkErrors: Array<{ timestamp: number; url: string; status?: number; error: string }> = [];
  
  if (artifactsResult.success) {
    // Extract screenshots
    screenshots = artifactsResult.data
      .filter(artifact => artifact.type === 'screenshot')
      .map(artifact => {
        if (artifact.type !== 'screenshot') {
          throw new Error('Unexpected artifact type');
        }
        return {
          url: artifact.url,
          phase: artifact.metadata.phase,
          description: artifact.metadata.action.replace(/-/g, ' '), // Convert 'click-play-button' to 'click play button'
          timestamp: artifact.metadata.timestamp,
        };
      });
    
    // Extract console logs
    const consoleLogArtifact = artifactsResult.data.find(
      artifact => artifact.type === 'log' && artifact.metadata.logType === LogType.CONSOLE
    );
    
    if (consoleLogArtifact && consoleLogArtifact.type === 'log') {
      try {
        // Fetch console log content from R2
        const consoleLogObj = await env.EVIDENCE_BUCKET.get(consoleLogArtifact.key);
        if (consoleLogObj) {
          const consoleLogText = await consoleLogObj.text();
          consoleLogs = consoleLogText.split('\n').filter(line => line.trim() !== '');
        }
      } catch (error) {
        console.error('Failed to fetch console log:', error);
        // Continue without console logs
      }
    }
    
    // Extract network errors (parse from network log)
    const networkLogArtifact = artifactsResult.data.find(
      artifact => artifact.type === 'log' && artifact.metadata.logType === LogType.NETWORK
    );
    
    if (networkLogArtifact && networkLogArtifact.type === 'log') {
      try {
        // Fetch network log content from R2
        const networkLogObj = await env.EVIDENCE_BUCKET.get(networkLogArtifact.key);
        if (networkLogObj) {
          const networkLogText = await networkLogObj.text();
          // Parse network errors from log (simple line-based parsing)
          // Expected format: "timestamp|url|status|error"
          const lines = networkLogText.split('\n').filter(line => line.trim() !== '');
          networkErrors = lines.map(line => {
            const parts = line.split('|');
            return {
              timestamp: parseInt(parts[0], 10),
              url: parts[1] || 'Unknown URL',
              status: parts[2] ? parseInt(parts[2], 10) : undefined,
              error: parts[3] || 'Network error',
            };
          }).filter(err => !isNaN(err.timestamp)); // Filter out invalid entries
        }
      } catch (error) {
        console.error('Failed to fetch network log:', error);
        // Continue without network errors
      }
    }
  }
  
  // Calculate duration
  let duration: number | null = null;
  if (test.completed_at) {
    duration = test.completed_at - test.created_at;
  }
  
  // Extract AI model from test events metadata (if available)
  let aiModel: string | undefined;
  for (const event of eventsResult.data) {
    if (event.metadata) {
      try {
        const metadata = JSON.parse(event.metadata);
        if (metadata.model) {
          aiModel = metadata.model;
          break; // Use first model found
        }
      } catch {
        // Skip invalid metadata
      }
    }
  }
  
  // Build TestReport object
  const testReport: TestReport = {
    id: test.id,
    url: test.url,
    inputSchema: test.input_schema || undefined,
    status: test.status,
    overallScore: test.overall_score,
    metrics,
    screenshots,
    events: eventsResult.data,
    consoleLogs,
    networkErrors,
    timestamps: {
      createdAt: test.created_at,
      completedAt: test.completed_at,
      duration,
    },
    aiModel,
  };
  
  return testReport;
}

/**
 * Handle WebSocket upgrade request for real-time test updates
 * Story 3.3: WebSocket Connection for Live Updates
 * 
 * Validates testRunId, connects to TestAgent DO via RPC service binding,
 * creates WebSocketPair, and forwards messages between TestAgent and frontend.
 * 
 * @param env - Environment bindings (TEST_AGENT DO binding)
 * @param request - WebSocket upgrade request
 * @param url - Parsed URL with query parameters
 * @returns WebSocket upgrade response
 * @throws Error if testRunId invalid or TestAgent DO connection fails
 */
async function handleWebSocketUpgrade(
  env: Env,
  request: Request,
  url: URL
): Promise<Response> {
  // Extract testId from query parameter
  const testId = url.searchParams.get('testId');
  
  if (!testId) {
    return new Response('Missing testId query parameter', { status: 400 });
  }

  // Validate testId is valid UUID format
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(testId)) {
    return new Response('Invalid testId format (must be UUID)', { status: 400 });
  }

  try {
    // Get TestAgent DO instance using testId as DO name
    // Note: idFromName() accepts any string (including UUIDs with dashes)
    const testAgentId = env.TEST_AGENT.idFromName(testId);
    const testAgent = env.TEST_AGENT.get(testAgentId);

    // Forward the ORIGINAL WebSocket upgrade request to TestAgent DO
    // This preserves all WebSocket handshake headers (Sec-WebSocket-Key, etc.)
    // so the browser can complete the handshake properly
    const testAgentResponse = await testAgent.fetch(request);

    // Check if TestAgent DO returned a WebSocket upgrade response
    if (testAgentResponse.status !== 101) {
      throw new Error('TestAgent DO failed to upgrade WebSocket connection');
    }

    // Return the WebSocket upgrade response from TestAgent DO
    // The webSocket from TestAgent DO is already connected to the client
    return testAgentResponse;
  } catch (error) {
    console.error('WebSocket connection to TestAgent DO failed:', error);
    throw new Error('Failed to establish WebSocket connection. Test may not exist or has completed.');
  }
}

/**
 * Returns complete HTML document with embedded CSS and JavaScript
 * 
 * UI follows Cloudflare design patterns:
 * - Orange accents (#FF6B35) for primary actions
 * - Monospace fonts for URLs and technical data
 * - Clean minimal interface
 */
function getHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GameEval QA Pipeline</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: #f0f0f0;
      min-height: 100vh;
      padding: 20px;
      overflow-y: auto;
    }

    .container {
      background: #2a2a2a;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 30px;
    }

    header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #FF6B35;
    }

    h1 {
      font-size: 1.8em;
      color: #FF6B35;
      margin-bottom: 5px;
      font-weight: 700;
    }

    .tagline {
      font-size: 0.9em;
      color: #b0b0b0;
      font-weight: 300;
    }

    form {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 15px;
      align-items: end;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    label {
      font-size: 0.85em;
      color: #d0d0d0;
      font-weight: 500;
    }

    input[type="text"],
    textarea {
      padding: 8px 12px;
      background: #1a1a1a;
      border: 2px solid #3a3a3a;
      border-radius: 6px;
      color: #f0f0f0;
      font-size: 0.9em;
      font-family: 'Courier New', Monaco, monospace;
      transition: border-color 0.2s ease;
    }

    input[type="text"]:focus,
    textarea:focus {
      outline: none;
      border-color: #FF6B35;
    }

    textarea {
      min-height: 60px;
      resize: vertical;
      font-size: 0.85em;
    }

    .error-message {
      color: #ff4444;
      font-size: 0.9em;
      min-height: 20px;
    }

    button {
      padding: 10px 20px;
      background: #FF6B35;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 0.95em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    button:hover {
      background: #ff8555;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
    }

    button:active {
      transform: translateY(0);
    }

    button:disabled {
      background: #555;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    /* Test Run List Styles (Story 3.2) */
    .test-list-section {
      margin-top: 30px;
      padding-top: 25px;
      border-top: 2px solid #3a3a3a;
    }

    .test-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .test-list-header h2 {
      color: #FF6B35;
      font-size: 1.5em;
      margin: 0;
    }

    .test-list-loading {
      color: #b0b0b0;
      font-size: 0.9em;
    }

    .test-list-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .test-list-empty {
      text-align: center;
      padding: 40px 20px;
      color: #888;
      font-size: 1.1em;
    }

    .test-card {
      background: #1a1a1a;
      border: 2px solid #3a3a3a;
      border-radius: 8px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .test-card:hover {
      border-color: #FF6B35;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 107, 53, 0.2);
    }

    .test-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .test-card-url {
      font-family: 'Courier New', Monaco, monospace;
      color: #f0f0f0;
      font-size: 1em;
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .test-card-url:hover {
      white-space: normal;
      word-break: break-all;
    }

    .test-card-status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .status-queued {
      background: #888;
      color: #fff;
    }

    .status-running {
      background: #4A90E2;
      color: #fff;
    }

    .status-completed {
      background: #4CAF50;
      color: #fff;
    }

    .status-failed {
      background: #F44336;
      color: #fff;
    }

    .test-card-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      align-items: center;
      color: #b0b0b0;
      font-size: 0.9em;
    }

    .test-card-progress {
      color: #FF6B35;
      font-weight: 600;
    }

    .test-card-score {
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .score-high {
      background: #4CAF50;
      color: #fff;
    }

    .score-medium {
      background: #FFC107;
      color: #000;
    }

    .score-low {
      background: #F44336;
      color: #fff;
    }

    .test-card-details {
      display: none;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #3a3a3a;
      color: #d0d0d0;
    }

    .test-card-details.expanded {
      display: block;
    }

    /* Live Feed Styles (Story 3.3) */
    .live-feed-section {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #3a3a3a;
    }

    .live-feed-toggle {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      padding: 8px;
      background: #2a2a2a;
      border-radius: 4px;
      transition: background 0.2s ease;
    }

    .live-feed-toggle:hover {
      background: #333;
    }

    .live-feed-toggle-text {
      font-weight: 600;
      color: #FF6B35;
      font-size: 0.9em;
    }

    .live-feed-toggle-icon {
      font-size: 0.8em;
      color: #b0b0b0;
      transition: transform 0.2s ease;
    }

    .live-feed-toggle.expanded .live-feed-toggle-icon {
      transform: rotate(180deg);
    }

    .live-feed-container {
      display: none;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 10px;
      padding: 10px;
      background: #1a1a1a;
      border-radius: 4px;
      border: 1px solid #3a3a3a;
    }

    .live-feed-container.expanded {
      display: block;
    }

    .live-feed-empty {
      text-align: center;
      color: #888;
      padding: 20px;
      font-size: 0.9em;
    }

    .live-feed-message {
      padding: 8px;
      margin-bottom: 6px;
      border-left: 3px solid #FF6B35;
      background: #222;
      border-radius: 3px;
      font-size: 0.85em;
      line-height: 1.4;
    }

    .live-feed-timestamp {
      color: #888;
      font-size: 0.8em;
      margin-right: 8px;
    }

    .live-feed-text {
      color: #d0d0d0;
    }

    .live-feed-websocket-indicator {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: 8px;
      background: #888;
    }

    .live-feed-websocket-indicator.connected {
      background: #4CAF50;
      animation: pulse 2s infinite;
    }

    .live-feed-websocket-indicator.connecting {
      background: #FFC107;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Detailed Report View Styles (Story 3.4) */
    .detailed-report-loading,
    .detailed-report-error {
      text-align: center;
      padding: 20px;
      color: #b0b0b0;
      font-size: 0.9em;
    }

    .detailed-report-error {
      color: #ff4444;
    }

    .detailed-report-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .report-section {
      background: #222;
      border-radius: 6px;
      padding: 15px;
    }

    .report-section-title {
      font-size: 1.1em;
      font-weight: 600;
      color: #FF6B35;
      margin-bottom: 12px;
      border-bottom: 1px solid #3a3a3a;
      padding-bottom: 8px;
    }

    .overall-score-section {
      text-align: center;
      padding: 20px;
    }

    .overall-score-value {
      font-size: 3em;
      font-weight: 700;
      margin: 10px 0;
    }

    .score-green { color: #4CAF50; }
    .score-yellow { color: #FFC107; }
    .score-red { color: #F44336; }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .metric-item-compact {
      background: #1a1a1a;
      padding: 12px 15px;
      border-radius: 6px;
      border-left: 3px solid #FF6B35;
    }

    .metric-compact-name {
      font-weight: 600;
      color: #f0f0f0;
      text-transform: capitalize;
      font-size: 0.9em;
      margin-bottom: 4px;
    }

    .metric-compact-score {
      font-weight: 700;
      color: #FF6B35;
      font-size: 1.1em;
      margin-bottom: 6px;
    }

    .metric-compact-just {
      font-size: 0.85em;
      color: #b0b0b0;
      line-height: 1.4;
    }

    .timeline-list {
      max-height: 300px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .timeline-event {
      padding: 10px;
      background: #1a1a1a;
      border-left: 3px solid #FF6B35;
      border-radius: 3px;
      font-size: 0.9em;
    }

    .timeline-timestamp {
      color: #888;
      font-size: 0.85em;
      margin-right: 8px;
    }

    .timeline-phase {
      color: #FF6B35;
      font-weight: 600;
      margin-right: 8px;
    }

    .screenshot-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
    }

    .screenshot-item {
      cursor: pointer;
      border-radius: 6px;
      overflow: hidden;
      border: 2px solid #3a3a3a;
      transition: all 0.2s ease;
    }

    .screenshot-item:hover {
      border-color: #FF6B35;
      transform: scale(1.05);
    }

    .screenshot-img {
      width: 100%;
      height: 150px;
      object-fit: cover;
      display: block;
    }

    .screenshot-caption {
      padding: 8px;
      background: #1a1a1a;
      font-size: 0.85em;
      color: #b0b0b0;
    }

    .screenshot-caption-phase {
      color: #FF6B35;
      font-weight: 600;
    }

    /* Lightbox Modal */
    .lightbox-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 10000;
      align-items: center;
      justify-content: center;
    }

    .lightbox-modal.active {
      display: flex;
    }

    .lightbox-content {
      position: relative;
      max-width: 90%;
      max-height: 90%;
    }

    .lightbox-img {
      max-width: 100%;
      max-height: 90vh;
      display: block;
      border-radius: 8px;
    }

    .lightbox-nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 107, 53, 0.8);
      color: #fff;
      border: none;
      padding: 15px 20px;
      font-size: 1.5em;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.2s ease;
    }

    .lightbox-nav-btn:hover {
      background: rgba(255, 107, 53, 1);
    }

    .lightbox-prev {
      left: 20px;
    }

    .lightbox-next {
      right: 20px;
    }

    .lightbox-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 107, 53, 0.8);
      color: #fff;
      border: none;
      padding: 10px 20px;
      font-size: 1.2em;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.2s ease;
    }

    .lightbox-close:hover {
      background: rgba(255, 107, 53, 1);
    }

    .lightbox-caption {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #f0f0f0;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 0.9em;
    }

    .log-section-toggle {
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: #1a1a1a;
      border-radius: 4px;
      transition: background 0.2s ease;
    }

    .log-section-toggle:hover {
      background: #2a2a2a;
    }

    .log-section-toggle-icon {
      transition: transform 0.2s ease;
    }

    .log-section-toggle.expanded .log-section-toggle-icon {
      transform: rotate(180deg);
    }

    .log-section-content {
      display: none;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 10px;
      padding: 10px;
      background: #1a1a1a;
      border-radius: 4px;
      font-family: 'Courier New', Monaco, monospace;
      font-size: 0.85em;
      line-height: 1.6;
    }

    .log-section-content.expanded {
      display: block;
    }

    .log-line {
      padding: 2px 0;
      color: #d0d0d0;
    }

    .log-line-error {
      color: #ff4444;
    }

    .network-error-item {
      padding: 8px;
      margin-bottom: 6px;
      background: #1a1a1a;
      border-left: 3px solid #ff4444;
      border-radius: 3px;
      font-size: 0.9em;
    }

    .network-error-url {
      font-family: 'Courier New', Monaco, monospace;
      color: #f0f0f0;
      word-break: break-all;
    }

    .network-error-status {
      color: #ff4444;
      font-weight: 600;
      margin-right: 8px;
    }

    .export-json-btn {
      padding: 10px 20px;
      background: #FF6B35;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.95em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 10px;
    }

    .export-json-btn:hover {
      background: #ff8555;
      transform: translateY(-2px);
    }

    .close-report-btn {
      padding: 10px 20px;
      background: #3a3a3a;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.95em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 10px;
    }

    .close-report-btn:hover {
      background: #4a4a4a;
      transform: translateY(-2px);
    }

    .report-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 10px;
    }

    .report-metadata {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 0.9em;
      color: #b0b0b0;
    }

    .report-metadata-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .report-metadata-label {
      color: #888;
      font-size: 0.85em;
    }

    .report-metadata-value {
      color: #f0f0f0;
      font-family: 'Courier New', Monaco, monospace;
    }

    /* Responsive layout for desktop */
    @media (min-width: 768px) {
      .container {
        padding: 50px;
        max-width: 900px;
      }

      h1 {
        font-size: 3em;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>GameEval QA Pipeline</h1>
      <p class="tagline">Autonomous Browser Game QA Testing</p>
    </header>

    <form id="testForm">
      <div class="form-group">
        <label for="gameUrl">Game URL *</label>
        <input 
          type="text" 
          id="gameUrl" 
          name="gameUrl" 
          placeholder="https://example.com/game.html"
          required
          aria-label="Game URL"
        >
        <div class="error-message" id="urlError"></div>
      </div>

      <div class="form-group">
        <label for="inputSchema">Input Schema (JSON)</label>
        <textarea 
          id="inputSchema" 
          name="inputSchema" 
          placeholder='{"controls": {"move": "arrow keys", "jump": "space"}}'
          aria-label="Input Schema JSON"
        ></textarea>
        <div class="error-message" id="schemaError"></div>
      </div>

      <button type="submit" id="submitBtn">Start Test</button>
    </form>

    <!-- Test Run List Section (Story 3.2) -->
    <div class="test-list-section">
      <div class="test-list-header">
        <h2>Test Runs</h2>
        <div class="test-list-loading" id="testListLoading">Loading...</div>
      </div>
      <div class="test-list-container" id="testListContainer">
        <div class="test-list-empty" id="testListEmpty">
          No tests yet. Submit a game URL to get started!
        </div>
      </div>
    </div>
  </div>

  <!-- Lightbox Modal for Screenshots (Story 3.4) -->
  <div class="lightbox-modal" id="lightboxModal">
    <button class="lightbox-close" id="lightboxClose">✕</button>
    <button class="lightbox-nav-btn lightbox-prev" id="lightboxPrev">‹</button>
    <div class="lightbox-content">
      <img class="lightbox-img" id="lightboxImg" src="" alt="Screenshot">
      <div class="lightbox-caption" id="lightboxCaption"></div>
    </div>
    <button class="lightbox-nav-btn lightbox-next" id="lightboxNext">›</button>
  </div>

  <script>
    const form = document.getElementById('testForm');
    const submitBtn = document.getElementById('submitBtn');
    const urlError = document.getElementById('urlError');
    const schemaError = document.getElementById('schemaError');
    const gameUrlInput = document.getElementById('gameUrl');
    const inputSchemaTextarea = document.getElementById('inputSchema');

    // Client-side validation for URL format
    function validateURL(url) {
      if (!url || url.trim() === '') {
        return 'Game URL is required';
      }
      const urlPattern = /^https?:\\/\\/.+/i;
      if (!urlPattern.test(url)) {
        return 'Game URL must be a valid HTTP or HTTPS URL';
      }
      return null;
    }

    // Client-side validation for JSON schema format
    function validateSchema(schema) {
      if (!schema || schema.trim() === '') {
        return null; // Optional field
      }
      try {
        JSON.parse(schema);
        return null;
      } catch (e) {
        return 'Input schema must be valid JSON';
      }
    }

    // Real-time validation
    gameUrlInput.addEventListener('blur', () => {
      const error = validateURL(gameUrlInput.value);
      urlError.textContent = error || '';
    });

    inputSchemaTextarea.addEventListener('blur', () => {
      const error = validateSchema(inputSchemaTextarea.value);
      schemaError.textContent = error || '';
    });

    // Form submission handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Reset previous errors
      urlError.textContent = '';
      schemaError.textContent = '';

      // Get form values
      const gameUrl = gameUrlInput.value.trim();
      const inputSchema = inputSchemaTextarea.value.trim();

      // Validate inputs
      const urlValidationError = validateURL(gameUrl);
      const schemaValidationError = validateSchema(inputSchema);

      if (urlValidationError) {
        urlError.textContent = urlValidationError;
        return;
      }

      if (schemaValidationError) {
        schemaError.textContent = schemaValidationError;
        return;
      }

      // Show loading state in button
      const originalButtonText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Starting Test...';
      submitBtn.style.background = '#888';

      try {
        // Call RPC submitTest endpoint
        const response = await fetch('/rpc/submitTest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gameUrl,
            inputSchema: inputSchema || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to submit test');
        }

        // Show success in button
        submitBtn.textContent = '✓ Test Started';
        submitBtn.style.background = '#22c55e';

        // Reset form
        form.reset();

        // Trigger immediate test list refresh
        pollTestList();
        
        // Auto-expand Live Feed for the new test after a short delay (wait for render)
        setTimeout(() => {
          console.log('Auto-expanding Live Feed for test:', data.testId);
          expandedLiveFeeds.add(data.testId);
          const toggle = document.querySelector(\`.live-feed-toggle[data-test-id="\${data.testId}"]\`);
          const container = document.getElementById(\`live-feed-\${data.testId}\`);
          console.log('Found toggle:', !!toggle, 'container:', !!container);
          if (toggle && container) {
            toggle.classList.add('expanded');
            container.classList.add('expanded');
            console.log('Expanded Live Feed, connecting WebSocket...');
            // Connect WebSocket immediately
            if (!webSocketConnections.has(data.testId)) {
              connectWebSocket(data.testId);
            }
          } else {
            console.warn('Could not find Live Feed elements for test:', data.testId);
          }
        }, 500);
        
        // Reset button after 2 seconds
        setTimeout(() => {
          submitBtn.textContent = originalButtonText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 2000);
      } catch (error) {
        // Show error in button
        submitBtn.textContent = '✗ ' + (error.message || 'Error');
        submitBtn.style.background = '#ef4444';
        
        // Reset button after 3 seconds
        setTimeout(() => {
          submitBtn.textContent = originalButtonText;
          submitBtn.style.background = '';
          submitBtn.disabled = false;
        }, 3000);
      }
    });

    // Test List Polling (Story 3.2)
    const testListContainer = document.getElementById('testListContainer');
    const testListEmpty = document.getElementById('testListEmpty');
    const testListLoading = document.getElementById('testListLoading');
    let pollingInterval = null;

    // Format relative time with seconds precision
    function formatRelativeTime(timestamp) {
      const now = Date.now();
      const diffMs = now - timestamp;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 10) {
        return 'just now';
      } else if (diffSec < 60) {
        return \`\${diffSec} seconds ago\`;
      } else if (diffMin < 60) {
        return \`\${diffMin} minute\${diffMin === 1 ? '' : 's'} ago\`;
      } else if (diffHour < 24) {
        return \`\${diffHour} hour\${diffHour === 1 ? '' : 's'} ago\`;
      } else {
        return \`\${diffDay} day\${diffDay === 1 ? '' : 's'} ago\`;
      }
    }

    // Format duration (e.g., "2m 30s")
    function formatDuration(durationMs) {
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;

      if (minutes > 0) {
        return \`\${minutes}m \${remainingSeconds}s\`;
      } else {
        return \`\${seconds}s\`;
      }
    }

    // Get score class based on value
    function getScoreClass(score) {
      if (score > 70) return 'score-high';
      if (score >= 50) return 'score-medium';
      return 'score-low';
    }

    // Track which Live Feeds are expanded (preserve state across re-renders)
    const expandedLiveFeeds = new Set();
    // Track which test details are expanded (preserve state across re-renders)
    const expandedDetails = new Set();
    // Store live feed messages per test (preserve across re-renders)
    const liveFeedContents = new Map(); // testId -> HTML content

    // Render test cards
    function renderTestList(tests) {
      // Hide loading indicator
      testListLoading.style.display = 'none';

      if (tests.length === 0) {
        testListEmpty.style.display = 'block';
        // Clear any existing cards
        const existingCards = testListContainer.querySelectorAll('.test-card');
        existingCards.forEach(card => card.remove());
        return;
      }

      testListEmpty.style.display = 'none';

      // Save scroll position before re-render
      const scrollTop = testListContainer.scrollTop;

      // Save currently expanded Live Feeds AND their contents before re-render
      const liveFeeds = testListContainer.querySelectorAll('.live-feed-container.expanded');
      liveFeeds.forEach(feed => {
        const testId = feed.id.replace('live-feed-', '');
        expandedLiveFeeds.add(testId);
        // Save the entire innerHTML of the feed container
        liveFeedContents.set(testId, feed.innerHTML);
      });

      // Save currently expanded test details before re-render
      const detailsSections = testListContainer.querySelectorAll('.test-card-details.expanded');
      detailsSections.forEach(details => {
        const testId = details.id.replace('details-', '');
        expandedDetails.add(testId);
      });

      // Build HTML for test cards
      const cardsHTML = tests.map(test => {
        const relativeTime = formatRelativeTime(test.createdAt);
        const progressText = test.progress > 0 ? \`Phase \${test.progress}/4\` : 'Not started';
        const durationText = test.duration ? formatDuration(test.duration) : '';
        const scoreHTML = test.overallScore !== undefined && test.overallScore !== null
          ? \`<span class="test-card-score \${getScoreClass(test.overallScore)}">Score: \${test.overallScore}/100</span>\`
          : '';

        return \`
          <div class="test-card" data-test-id="\${test.id}">
            <div class="test-card-header">
              <div class="test-card-url" title="\${test.url}">\${test.url}</div>
              <span class="test-card-status status-\${test.status}" id="status-\${test.id}">\${test.status}</span>
            </div>
            <div class="test-card-meta">
              <span class="test-card-progress" id="progress-\${test.id}">\${progressText}</span>
              <span>\${relativeTime}</span>
              \${durationText ? \`<span>\${durationText}</span>\` : ''}
              \${scoreHTML}
            </div>
            <div class="live-feed-section">
              <div class="live-feed-toggle" data-test-id="\${test.id}" onclick="toggleLiveFeed('\${test.id}')">
                <span class="live-feed-toggle-text">
                  Live Feed
                  <span class="live-feed-websocket-indicator" id="ws-indicator-\${test.id}"></span>
                </span>
                <span class="live-feed-toggle-icon">▼</span>
              </div>
              <div class="live-feed-container" id="live-feed-\${test.id}">
                <!-- Messages will be appended here by WebSocket, oldest at top -->
              </div>
            </div>
            <div class="test-card-details" id="details-\${test.id}">
              <div class="detailed-report-loading" id="report-loading-\${test.id}">
                Loading test report...
              </div>
              <div class="detailed-report-error" id="report-error-\${test.id}" style="display: none;">
                Failed to load test report
              </div>
              <div class="detailed-report-content" id="report-content-\${test.id}" style="display: none;">
                <!-- Detailed report will be rendered here by JavaScript -->
              </div>
            </div>
          </div>
        \`;
      }).join('');

      testListContainer.innerHTML = cardsHTML;

      // Restore expanded state and messages for Live Feeds
      expandedLiveFeeds.forEach(testId => {
        const toggle = document.querySelector(\`.live-feed-toggle[data-test-id="\${testId}"]\`);
        const container = document.getElementById(\`live-feed-\${testId}\`);
        if (toggle && container) {
          toggle.classList.add('expanded');
          container.classList.add('expanded');
          
          // Restore the saved messages
          const savedContent = liveFeedContents.get(testId);
          if (savedContent) {
            container.innerHTML = savedContent;
          }
        }
      });

      // Restore expanded state for test details and re-render cached reports
      expandedDetails.forEach(testId => {
        const details = document.getElementById(\`details-\${testId}\`);
        if (details) {
          details.classList.add('expanded');
          
          // If we have a cached report, re-render it
          const cachedReport = loadedReports.get(testId);
          if (cachedReport) {
            const loadingEl = document.getElementById(\`report-loading-\${testId}\`);
            const contentEl = document.getElementById(\`report-content-\${testId}\`);
            
            if (loadingEl && contentEl) {
              loadingEl.style.display = 'none';
              contentEl.style.display = 'block';
              renderTestReport(testId, cachedReport);
            }
          }
        }
      });

      // Add click handlers for test details expansion
      const cards = testListContainer.querySelectorAll('.test-card');
      cards.forEach(card => {
        card.addEventListener('click', (e) => {
          // Don't toggle if clicking inside detailed report content (but allow Live Feed toggle)
          if (e.target.closest('.detailed-report-content') && !e.target.closest('.live-feed-toggle')) {
            return;
          }
          
          const testId = card.getAttribute('data-test-id');
          const details = document.getElementById(\`details-\${testId}\`);
          const liveFeedToggle = document.querySelector(\`.live-feed-toggle[data-test-id="\${testId}"]\`);
          const liveFeedContainer = document.getElementById(\`live-feed-\${testId}\`);
          
          // Toggle both details AND live feed together
          if (details.classList.contains('expanded')) {
            // Collapse both
            details.classList.remove('expanded');
            expandedDetails.delete(testId);
            if (liveFeedToggle) liveFeedToggle.classList.remove('expanded');
            if (liveFeedContainer) liveFeedContainer.classList.remove('expanded');
            expandedLiveFeeds.delete(testId);
          } else {
            // Expand both
            details.classList.add('expanded');
            expandedDetails.add(testId);
            if (liveFeedToggle) liveFeedToggle.classList.add('expanded');
            if (liveFeedContainer) liveFeedContainer.classList.add('expanded');
            expandedLiveFeeds.add(testId);
            
            // Load test report when expanding (Story 3.4)
            loadTestReport(testId);
            
            // Get test status to determine if we need WebSocket
            const statusElement = document.getElementById(\`status-\${testId}\`);
            const status = statusElement ? statusElement.textContent : null;
            
            // Only connect WebSocket for active tests (queued or running)
            if (status && (status === 'queued' || status === 'running')) {
              if (!webSocketConnections.has(testId)) {
                connectWebSocket(testId);
              }
            } else {
              // For completed/failed tests, load historical events into timeline
              loadHistoricalEvents(testId);
            }
          }
        });
      });

      // Restore scroll position after re-render
      testListContainer.scrollTop = scrollTop;
    }

    // Click-outside handler for closing detailed reports (AC-7)
    document.addEventListener('click', (e) => {
      // Check if click is outside any expanded test card
      const clickedCard = e.target.closest('.test-card');
      const clickedLightbox = e.target.closest('.lightbox-modal');
      
      // Don't close if clicking inside a test card or lightbox
      if (clickedCard || clickedLightbox) {
        return;
      }
      
      // Close all expanded details
      expandedDetails.forEach(testId => {
        const details = document.getElementById(\`details-\${testId}\`);
        if (details) {
          details.classList.remove('expanded');
        }
      });
      expandedDetails.clear();
    });

    // Test Report Loading and Rendering (Story 3.4)
    const loadedReports = new Map(); // Cache loaded reports to avoid re-fetching

    // Load historical events from test_events into timeline (for completed tests)
    async function loadHistoricalEvents(testId) {
      try {
        const response = await fetch(\`/rpc/getTestReport?testId=\${testId}\`);
        if (!response.ok) return;
        
        const testReport = await response.json();
        const container = document.getElementById(\`live-feed-\${testId}\`);
        if (!container || !testReport.events) return;

        // Clear any placeholders
        const placeholder = container.querySelector('.live-feed-placeholder');
        if (placeholder) placeholder.remove();

        // Add historical events in chronological order (oldest to newest)
        const events = [...testReport.events].reverse(); // Reverse since we prepend
        events.forEach(event => {
          const timestamp = new Date(event.timestamp).toLocaleTimeString();
          const messageElement = document.createElement('div');
          messageElement.className = 'live-feed-message';
          
          messageElement.innerHTML = \`
            <span class="live-feed-timestamp">\${timestamp}</span>
            <span class="live-feed-text">\${event.description}</span>
          \`;
          
          container.insertBefore(messageElement, container.firstChild);
        });
        
        // Update toggle text to "Timeline" for completed tests
        const liveFeedToggle = document.querySelector(\`.live-feed-toggle[data-test-id="\${testId}"]\`);
        if (liveFeedToggle) {
          const toggleText = liveFeedToggle.querySelector('.live-feed-toggle-text');
          if (toggleText) {
            // Remove WebSocket indicator
            const wsIndicator = toggleText.querySelector('.live-feed-websocket-indicator');
            if (wsIndicator) wsIndicator.remove();
            // Update text
            toggleText.childNodes[0].textContent = 'Timeline';
          }
        }
      } catch (error) {
        console.error('Failed to load historical events:', error);
      }
    }

    // Load test report from RPC
    async function loadTestReport(testId) {
      // Skip if already loaded
      if (loadedReports.has(testId)) {
        return;
      }

      const loadingEl = document.getElementById(\`report-loading-\${testId}\`);
      const errorEl = document.getElementById(\`report-error-\${testId}\`);
      const contentEl = document.getElementById(\`report-content-\${testId}\`);

      if (!loadingEl || !errorEl || !contentEl) {
        return;
      }

      // Show loading state
      loadingEl.style.display = 'block';
      errorEl.style.display = 'none';
      contentEl.style.display = 'none';

      try {
        const response = await fetch(\`/rpc/getTestReport?testId=\${testId}\`);
        
        if (!response.ok) {
          throw new Error('Failed to load test report');
        }

        const testReport = await response.json();
        
        // Cache the report
        loadedReports.set(testId, testReport);

        // Render the report
        renderTestReport(testId, testReport);

        // Show content, hide loading
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
      } catch (error) {
        console.error('Failed to load test report:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = error.message || 'Failed to load test report';
      }
    }

    // Render complete test report
    function renderTestReport(testId, report) {
      const contentEl = document.getElementById(\`report-content-\${testId}\`);
      if (!contentEl) return;

      // Build HTML for all report sections
      let html = '';

      // Overall Score Section
      if (report.overallScore !== null && report.overallScore !== undefined) {
        const scoreClass = report.overallScore > 70 ? 'score-green' : report.overallScore >= 50 ? 'score-yellow' : 'score-red';
        html += \`
          <div class="report-section overall-score-section">
            <div class="report-section-title">Overall Quality Score</div>
            <div class="overall-score-value \${scoreClass}">\${report.overallScore}/100</div>
          </div>
        \`;
      }

      // Metrics Section - nicely formatted without progress bars
      if (report.metrics && report.metrics.length > 0) {
        html += '<div class="report-section"><div class="report-section-title">Individual Metrics</div><div class="metrics-grid">';
        report.metrics.forEach(metric => {
          // Skip overall metric (already shown above)
          if (metric.name === 'overall') return;
          
          html += \`
            <div class="metric-item-compact">
              <div class="metric-compact-name">\${metric.name}</div>
              <div class="metric-compact-score">\${metric.score}/100</div>
              <div class="metric-compact-just">\${metric.justification}</div>
            </div>
          \`;
        });
        html += '</div></div>';
      }

      // Timeline removed - redundant with Live Feed which shows real-time events

      // Screenshot Gallery Section
      if (report.screenshots && report.screenshots.length > 0) {
        html += '<div class="report-section"><div class="report-section-title">Screenshot Gallery</div><div class="screenshot-gallery">';
        report.screenshots.forEach((screenshot, index) => {
          const fixedUrl = fixLegacyUrl(screenshot.url);
          html += \`
            <div class="screenshot-item" onclick="openLightbox('\${testId}', \${index})">
              <img class="screenshot-img" src="\${fixedUrl}" alt="\${screenshot.description}" loading="lazy">
              <div class="screenshot-caption">
                <span class="screenshot-caption-phase">\${screenshot.phase}:</span>
                \${screenshot.description}
              </div>
            </div>
          \`;
        });
        html += '</div></div>';
      }

      // Console Error Log Section
      if (report.consoleLogs && report.consoleLogs.length > 0) {
        html += \`
          <div class="report-section">
            <div class="report-section-title">Console Errors</div>
            <div class="log-section-toggle" onclick="toggleLogSection('\${testId}-console')">
              <span>View Console Log (\${report.consoleLogs.length} lines)</span>
              <span class="log-section-toggle-icon">▼</span>
            </div>
            <div class="log-section-content" id="log-\${testId}-console">
        \`;
        report.consoleLogs.forEach(line => {
          const isError = line.toLowerCase().includes('error');
          html += \`<div class="log-line \${isError ? 'log-line-error' : ''}">\${escapeHtml(line)}</div>\`;
        });
        html += '</div></div>';
      }

      // Network Error Log Section
      if (report.networkErrors && report.networkErrors.length > 0) {
        html += \`
          <div class="report-section">
            <div class="report-section-title">Network Errors</div>
            <div class="log-section-toggle" onclick="toggleLogSection('\${testId}-network')">
              <span>View Network Errors (\${report.networkErrors.length} errors)</span>
              <span class="log-section-toggle-icon">▼</span>
            </div>
            <div class="log-section-content" id="log-\${testId}-network">
        \`;
        report.networkErrors.forEach(error => {
          html += \`
            <div class="network-error-item">
              <span class="network-error-status">\${error.status || 'ERROR'}</span>
              <span class="network-error-url">\${error.url}</span>
              <div>\${error.error}</div>
            </div>
          \`;
        });
        html += '</div></div>';
      }

      // Metadata Section (AC-2: Test duration and timestamp)
      html += '<div class="report-section"><div class="report-section-title">Test Metadata</div><div class="report-metadata">';
      html += \`
        <div class="report-metadata-item">
          <div class="report-metadata-label">Test ID</div>
          <div class="report-metadata-value">\${report.id}</div>
        </div>
      \`;
      
      // Created timestamp
      const createdDate = new Date(report.timestamps.createdAt);
      html += \`
        <div class="report-metadata-item">
          <div class="report-metadata-label">Created</div>
          <div class="report-metadata-value">\${createdDate.toLocaleString()}</div>
        </div>
      \`;
      
      // Completed timestamp
      if (report.timestamps.completedAt) {
        const completedDate = new Date(report.timestamps.completedAt);
        html += \`
          <div class="report-metadata-item">
            <div class="report-metadata-label">Completed</div>
            <div class="report-metadata-value">\${completedDate.toLocaleString()}</div>
          </div>
        \`;
      }
      
      // Duration
      if (report.timestamps.duration) {
        const duration = formatDuration(report.timestamps.duration);
        html += \`
          <div class="report-metadata-item">
            <div class="report-metadata-label">Duration</div>
            <div class="report-metadata-value">\${duration}</div>
          </div>
        \`;
      }
      
      // AI Model
      if (report.aiModel) {
        html += \`
          <div class="report-metadata-item">
            <div class="report-metadata-label">AI Model</div>
            <div class="report-metadata-value">\${report.aiModel}</div>
          </div>
        \`;
      }
      html += '</div></div>';

      // Action Buttons (Export and Close)
      html += \`
        <div class="report-actions">
          <button class="export-json-btn" onclick="exportTestJSON('\${testId}')">
            Export Test Report JSON
          </button>
          <button class="close-report-btn" onclick="closeDetailedReport('\${testId}')">
            Close Report
          </button>
        </div>
      \`;

      contentEl.innerHTML = html;
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Toggle log section expansion
    function toggleLogSection(logId) {
      const toggle = document.querySelector(\`.log-section-toggle[onclick*="\${logId}"]\`);
      const content = document.getElementById(\`log-\${logId}\`);
      
      if (toggle && content) {
        toggle.classList.toggle('expanded');
        content.classList.toggle('expanded');
      }
    }

    // Fix legacy URLs that have /r2/ prefix on production custom domain
    function fixLegacyUrl(url) {
      if (url && url.includes('evidence.adamwhite.work/r2/')) {
        return url.replace('/r2/', '/');
      }
      return url;
    }

    // Lightbox functionality for screenshot gallery
    let currentLightboxTestId = null;
    let currentLightboxIndex = 0;

    function openLightbox(testId, index) {
      const report = loadedReports.get(testId);
      if (!report || !report.screenshots || !report.screenshots[index]) {
        return;
      }

      currentLightboxTestId = testId;
      currentLightboxIndex = index;

      const modal = document.getElementById('lightboxModal');
      const img = document.getElementById('lightboxImg');
      const caption = document.getElementById('lightboxCaption');

      const screenshot = report.screenshots[index];
      img.src = fixLegacyUrl(screenshot.url);
      caption.textContent = \`\${screenshot.phase}: \${screenshot.description}\`;

      modal.classList.add('active');
    }

    function closeLightbox() {
      const modal = document.getElementById('lightboxModal');
      modal.classList.remove('active');
      currentLightboxTestId = null;
    }

    function navigateLightbox(direction) {
      if (!currentLightboxTestId) return;

      const report = loadedReports.get(currentLightboxTestId);
      if (!report || !report.screenshots) return;

      currentLightboxIndex += direction;

      // Wrap around
      if (currentLightboxIndex < 0) {
        currentLightboxIndex = report.screenshots.length - 1;
      } else if (currentLightboxIndex >= report.screenshots.length) {
        currentLightboxIndex = 0;
      }

      const img = document.getElementById('lightboxImg');
      const caption = document.getElementById('lightboxCaption');
      const screenshot = report.screenshots[currentLightboxIndex];

      img.src = fixLegacyUrl(screenshot.url);
      caption.textContent = \`\${screenshot.phase}: \${screenshot.description}\`;
    }

    // Lightbox event listeners
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev').addEventListener('click', () => navigateLightbox(-1));
    document.getElementById('lightboxNext').addEventListener('click', () => navigateLightbox(1));

    // Close lightbox on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        navigateLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        navigateLightbox(1);
      }
    });

    // Close lightbox when clicking outside image
    document.getElementById('lightboxModal').addEventListener('click', (e) => {
      if (e.target.id === 'lightboxModal') {
        closeLightbox();
      }
    });

    // Export test report as JSON
    function exportTestJSON(testId) {
      window.location.href = \`/rpc/exportTestJSON?testId=\${testId}\`;
    }

    // Close detailed report view (AC-7)
    function closeDetailedReport(testId) {
      const details = document.getElementById(\`details-\${testId}\`);
      if (details) {
        details.classList.remove('expanded');
        expandedDetails.delete(testId);
      }
    }

    // Poll test list
    async function pollTestList() {
      try {
        testListLoading.style.display = 'block';
        const response = await fetch('/rpc/listTests');
        
        if (!response.ok) {
          throw new Error('Failed to fetch test list');
        }

        const tests = await response.json();
        renderTestList(tests);
      } catch (error) {
        console.error('Test list polling error:', error);
        testListLoading.textContent = 'Error loading tests';
        testListLoading.style.display = 'block';
      }
    }

    // Start polling on page load (reduced frequency since WebSocket provides real-time updates)
    pollTestList();
    pollingInterval = setInterval(pollTestList, 10000); // Poll every 10 seconds instead of 3

    // Stop polling when page unloads
    window.addEventListener('beforeunload', () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    });

    // WebSocket Connection Management (Story 3.3)
    const webSocketConnections = new Map(); // testId -> WebSocket
    const reconnectionAttempts = new Map(); // testId -> attempt count
    const reconnectionTimeouts = new Map(); // testId -> timeout ID
    const MAX_RECONNECTION_ATTEMPTS = 10;
    const RECONNECTION_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff up to 30s

    // Toggle live feed visibility - removed, now handled by card click
    function toggleLiveFeed(testId) {
      // Deprecated: Live Feed now expands/collapses with test card click
      // Keeping function for backward compatibility but does nothing
      return;
    }

    // Connect WebSocket for a test
    function connectWebSocket(testId) {
      // Don't reconnect if already connected
      if (webSocketConnections.has(testId)) {
        return;
      }

      const indicator = document.getElementById(\`ws-indicator-\${testId}\`);
      if (indicator) {
        indicator.classList.add('connecting');
      }

      // Add placeholder message immediately (will be removed when first real message arrives)
      addLiveFeedPlaceholder(testId, 'Connecting to test agent...');

      try {
        // Create WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(\`\${protocol}//\${window.location.host}/ws?testId=\${testId}\`);

        ws.onopen = () => {
          console.log(\`WebSocket connected for test \${testId}\`);
          webSocketConnections.set(testId, ws);
          reconnectionAttempts.set(testId, 0); // Reset reconnection attempts

          // Update indicator
          if (indicator) {
            indicator.classList.remove('connecting');
            indicator.classList.add('connected');
          }

          // Update placeholder to waiting state
          addLiveFeedPlaceholder(testId, 'Connected - waiting for updates from agent...');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(testId, message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error(\`WebSocket error for test \${testId}:\`, error);
        };

        ws.onclose = () => {
          console.log(\`WebSocket closed for test \${testId}\`);
          webSocketConnections.delete(testId);

          // Update indicator
          if (indicator) {
            indicator.classList.remove('connected', 'connecting');
          }

          // Attempt reconnection if test is still running
          const statusElement = document.getElementById(\`status-\${testId}\`);
          const status = statusElement ? statusElement.textContent : null;
          
          if (status && (status === 'queued' || status === 'running')) {
            attemptReconnection(testId);
          }
        };
      } catch (error) {
        console.error(\`Failed to create WebSocket for test \${testId}:\`, error);
        
        // Update indicator
        if (indicator) {
          indicator.classList.remove('connecting', 'connected');
        }

        // Fallback to polling (already running)
        addLiveFeedMessage(testId, 'Using polling for updates (WebSocket unavailable)', 'status');
      }
    }

    // Attempt WebSocket reconnection with exponential backoff
    function attemptReconnection(testId) {
      const attempts = reconnectionAttempts.get(testId) || 0;

      if (attempts >= MAX_RECONNECTION_ATTEMPTS) {
        console.log(\`Max reconnection attempts reached for test \${testId}\`);
        addLiveFeedMessage(testId, 'Reconnection failed. Using polling for updates.', 'status');
        return;
      }

      // Calculate delay with exponential backoff
      const delayIndex = Math.min(attempts, RECONNECTION_DELAYS.length - 1);
      const delay = RECONNECTION_DELAYS[delayIndex];

      console.log(\`Reconnecting to test \${testId} in \${delay}ms (attempt \${attempts + 1})\`);

      // Clear any existing timeout
      const existingTimeout = reconnectionTimeouts.get(testId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Schedule reconnection
      const timeoutId = setTimeout(() => {
        reconnectionAttempts.set(testId, attempts + 1);
        reconnectionTimeouts.delete(testId);
        connectWebSocket(testId);
      }, delay);

      reconnectionTimeouts.set(testId, timeoutId);
    }

    // Handle incoming WebSocket message
    function handleWebSocketMessage(testId, message) {
      console.log(\`WebSocket message for test \${testId}:\`, message);

      // Update status badge if status changed
      if (message.type === 'status' && message.status) {
        updateStatusBadge(testId, message.status);
      }

      // Update progress indicator if phase changed
      if (message.phase) {
        updateProgressIndicator(testId, message.phase);
      }

      // Add message to live feed
      if (message.message) {
        addLiveFeedMessage(testId, message.message, message.type);
      }

      // Reload test report if it's currently open (for live updates)
      if (expandedDetails.has(testId)) {
        // Invalidate cached report
        loadedReports.delete(testId);
        // Reload with fresh data
        loadTestReport(testId);
      }

      // Handle completion
      if (message.type === 'complete') {
        // Close WebSocket connection
        const ws = webSocketConnections.get(testId);
        if (ws) {
          ws.close();
          webSocketConnections.delete(testId);
        }

        // Update indicator
        const indicator = document.getElementById(\`ws-indicator-\${testId}\`);
        if (indicator) {
          indicator.classList.remove('connected', 'connecting');
        }
        
        // Convert Live Feed to Timeline by removing placeholder and WebSocket indicator
        const liveFeedToggle = document.querySelector(\`.live-feed-toggle[data-test-id="\${testId}"]\`);
        if (liveFeedToggle) {
          // Change text to "Timeline"
          const toggleText = liveFeedToggle.querySelector('.live-feed-toggle-text');
          if (toggleText) {
            // Remove WebSocket indicator
            const wsIndicator = toggleText.querySelector('.live-feed-websocket-indicator');
            if (wsIndicator) wsIndicator.remove();
            // Update text
            toggleText.childNodes[0].textContent = 'Timeline';
          }
        }
      }
    }

    // Update status badge in real-time
    function updateStatusBadge(testId, status) {
      const statusElement = document.getElementById(\`status-\${testId}\`);
      if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = \`test-card-status status-\${status}\`;
      }
    }

    // Update progress indicator in real-time
    function updateProgressIndicator(testId, phase) {
      const progressElement = document.getElementById(\`progress-\${testId}\`);
      if (progressElement) {
        const phaseNumber = phase.replace('phase', '');
        progressElement.textContent = \`Phase \${phaseNumber}/4\`;
      }
    }

    // Add placeholder message to live feed (replaced when real messages arrive)
    function addLiveFeedPlaceholder(testId, message) {
      const container = document.getElementById(\`live-feed-\${testId}\`);
      if (!container) return;

      // Remove any existing placeholders
      const existingPlaceholder = container.querySelector('.live-feed-placeholder');
      if (existingPlaceholder) {
        existingPlaceholder.remove();
      }

      // Create placeholder element
      const placeholder = document.createElement('div');
      placeholder.className = 'live-feed-placeholder live-feed-message';
      placeholder.style.opacity = '0.6';
      placeholder.style.fontStyle = 'italic';
      
      placeholder.innerHTML = \`
        <span class="live-feed-text">\${message}</span>
      \`;

      container.appendChild(placeholder);
    }

    // Add message to live feed (check for duplicates, keep all messages)
    function addLiveFeedMessage(testId, message, type = 'progress') {
      const container = document.getElementById(\`live-feed-\${testId}\`);
      if (!container) return;

      // Remove placeholder when first real message arrives
      const placeholder = container.querySelector('.live-feed-placeholder');
      if (placeholder) {
        placeholder.remove();
      }

      const timestamp = new Date().toLocaleTimeString();
      
      // Check if this exact message already exists (prevent duplicates)
      const existingMessages = container.querySelectorAll('.live-feed-message:not(.live-feed-placeholder)');
      for (const existing of existingMessages) {
        const existingText = existing.querySelector('.live-feed-text')?.textContent;
        const existingTime = existing.querySelector('.live-feed-timestamp')?.textContent;
        if (existingText === message && existingTime === timestamp) {
          return; // Duplicate, don't add
        }
      }

      // Create message element
      const messageElement = document.createElement('div');
      messageElement.className = 'live-feed-message';
      
      messageElement.innerHTML = \`
        <span class="live-feed-timestamp">\${timestamp}</span>
        <span class="live-feed-text">\${message}</span>
      \`;

      // Prepend to top (newest at top, scrollable)
      container.insertBefore(messageElement, container.firstChild);

      // Keep scroll at top to show newest message
      container.scrollTop = 0;
    }

    // Auto-connect WebSockets for active tests (AC5: no polling delay for status updates)
    function connectActiveTestWebSockets(tests) {
      tests.forEach(test => {
        // Connect for queued or running tests that don't have a connection yet
        if ((test.status === 'queued' || test.status === 'running') && !webSocketConnections.has(test.id)) {
          console.log('Auto-connecting WebSocket for ' + test.status + ' test: ' + test.id);
          connectWebSocket(test.id);
        }
      });
    }

    // Enhance renderTestList to auto-connect WebSockets for active tests
    const originalRenderTestList = renderTestList;
    renderTestList = function(tests) {
      originalRenderTestList(tests);
      // Auto-connect for real-time status updates (AC5)
      connectActiveTestWebSockets(tests);
    };

    // Clean up WebSocket connections and timeouts when page unloads
    window.addEventListener('beforeunload', () => {
      // Close all WebSocket connections
      webSocketConnections.forEach((ws) => {
        ws.close();
      });
      webSocketConnections.clear();

      // Clear all reconnection timeouts
      reconnectionTimeouts.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      reconnectionTimeouts.clear();
    });
  </script>
</body>
</html>`;
}

