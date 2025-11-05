/**
 * Dashboard Worker for GameEval QA Pipeline
 * Story 3.1: Dashboard Worker with URL Submission
 * 
 * Serves HTML/CSS/JS directly from Worker with inline assets (no separate static hosting).
 * Implements RPC method submitTest() that validates inputs, generates UUID, triggers Workflow.
 */

import type { SubmitTestRequest, SubmitTestResponse, TestRunSummary } from '../shared/types';
import { listRecentTests, getTestEvents } from '../shared/helpers/d1';

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
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      background: #2a2a2a;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      max-width: 600px;
      width: 100%;
      padding: 40px;
    }

    header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #FF6B35;
    }

    h1 {
      font-size: 2.5em;
      color: #FF6B35;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .tagline {
      font-size: 1.1em;
      color: #b0b0b0;
      font-weight: 300;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 25px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    label {
      font-size: 0.95em;
      color: #d0d0d0;
      font-weight: 500;
    }

    input[type="text"],
    textarea {
      padding: 12px 16px;
      background: #1a1a1a;
      border: 2px solid #3a3a3a;
      border-radius: 6px;
      color: #f0f0f0;
      font-size: 1em;
      font-family: 'Courier New', Monaco, monospace;
      transition: border-color 0.2s ease;
    }

    input[type="text"]:focus,
    textarea:focus {
      outline: none;
      border-color: #FF6B35;
    }

    textarea {
      min-height: 120px;
      resize: vertical;
      font-size: 0.9em;
    }

    .error-message {
      color: #ff4444;
      font-size: 0.9em;
      min-height: 20px;
    }

    button {
      padding: 14px 28px;
      background: #FF6B35;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 1.1em;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 10px;
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

    .loading {
      display: none;
      text-align: center;
      margin-top: 20px;
      color: #FF6B35;
    }

    .loading.active {
      display: block;
    }

    .result {
      display: none;
      margin-top: 30px;
      padding: 20px;
      background: #1a1a1a;
      border-radius: 6px;
      border-left: 4px solid #FF6B35;
    }

    .result.active {
      display: block;
    }

    .result.error {
      border-left-color: #ff4444;
    }

    .result h3 {
      color: #FF6B35;
      margin-bottom: 10px;
    }

    .result.error h3 {
      color: #ff4444;
    }

    .test-id {
      font-family: 'Courier New', Monaco, monospace;
      color: #f0f0f0;
      font-size: 1.1em;
      background: #2a2a2a;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      word-break: break-all;
    }

    /* Test Run List Styles (Story 3.2) */
    .test-list-section {
      margin-top: 60px;
      padding-top: 40px;
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
      font-size: 1.8em;
      margin: 0;
    }

    .test-list-loading {
      color: #b0b0b0;
      font-size: 0.9em;
    }

    .test-list-container {
      max-height: 600px;
      overflow-y: auto;
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

    <div class="loading" id="loading">
      <p>⏳ Starting test...</p>
    </div>

    <div class="result" id="result">
      <h3 id="resultTitle"></h3>
      <p id="resultMessage"></p>
      <div class="test-id" id="testId"></div>
    </div>

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

  <script>
    const form = document.getElementById('testForm');
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');
    const testIdDiv = document.getElementById('testId');
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

      // Reset previous results
      result.classList.remove('active', 'error');
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

      // Show loading state
      submitBtn.disabled = true;
      loading.classList.add('active');

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

        // Display success result
        result.classList.add('active');
        resultTitle.textContent = '✅ Test Started Successfully';
        resultMessage.textContent = 'Your test has been queued for execution. Use the Test ID below to track progress:';
        testIdDiv.textContent = data.testId;
        testIdDiv.style.display = 'block';

        // Reset form
        form.reset();

        // Trigger immediate test list refresh
        pollTestList();
      } catch (error) {
        // Display error result
        result.classList.add('active', 'error');
        resultTitle.textContent = '❌ Error';
        resultMessage.textContent = error.message || 'An unexpected error occurred. Please try again.';
        testIdDiv.style.display = 'none';
      } finally {
        // Hide loading state
        loading.classList.remove('active');
        submitBtn.disabled = false;
      }
    });

    // Test List Polling (Story 3.2)
    const testListContainer = document.getElementById('testListContainer');
    const testListEmpty = document.getElementById('testListEmpty');
    const testListLoading = document.getElementById('testListLoading');
    let pollingInterval = null;

    // Format relative time (e.g., "2 minutes ago")
    function formatRelativeTime(timestamp) {
      const now = Date.now();
      const diffMs = now - timestamp;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffSec < 60) {
        return 'just now';
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
              <span class="test-card-status status-\${test.status}">\${test.status}</span>
            </div>
            <div class="test-card-meta">
              <span class="test-card-progress">\${progressText}</span>
              <span>\${relativeTime}</span>
              \${durationText ? \`<span>\${durationText}</span>\` : ''}
              \${scoreHTML}
            </div>
            <div class="test-card-details" id="details-\${test.id}">
              <p><strong>Test ID:</strong> \${test.id}</p>
              <p><em>Detailed report view will be implemented in Story 3.4</em></p>
            </div>
          </div>
        \`;
      }).join('');

      testListContainer.innerHTML = cardsHTML;

      // Add click handlers for expansion
      const cards = testListContainer.querySelectorAll('.test-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          const testId = card.getAttribute('data-test-id');
          const details = document.getElementById(\`details-\${testId}\`);
          details.classList.toggle('expanded');
        });
      });
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

    // Start polling on page load
    pollTestList();
    pollingInterval = setInterval(pollTestList, 3000);

    // Stop polling when page unloads
    window.addEventListener('beforeunload', () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    });
  </script>
</body>
</html>`;
}

