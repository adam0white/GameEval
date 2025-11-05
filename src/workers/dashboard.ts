/**
 * Dashboard Worker for GameEval QA Pipeline
 * Story 3.1: Dashboard Worker with URL Submission
 * 
 * Serves HTML/CSS/JS directly from Worker with inline assets (no separate static hosting).
 * Implements RPC method submitTest() that validates inputs, generates UUID, triggers Workflow.
 */

import type { SubmitTestRequest, SubmitTestResponse } from '../shared/types';

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

    /* Responsive layout for desktop */
    @media (min-width: 768px) {
      .container {
        padding: 50px;
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
  </script>
</body>
</html>`;
}

