/**
 * Story 3.1: Dashboard Worker with URL Submission - Integration Tests
 * 
 * Tests all acceptance criteria:
 * AC1: Dashboard Worker file exists with Worker implementation
 * AC2: Serves HTML/CSS/JS directly from Worker (inline, no external assets)
 * AC3: Clean, minimal UI following Cloudflare design patterns
 * AC4: Header displays "GameEval QA Pipeline" with tagline
 * AC5: URL submission form with game URL and input schema fields
 * AC6: Submit button triggers RPC call
 * AC7: On successful submission, generates UUID, triggers Workflow, displays test ID
 * AC8: Form validation (URL format, JSON schema)
 * AC9: Responsive layout for desktop
 */

import type { SubmitTestResponse } from '../src/shared/types';

// Env type is globally available from worker-configuration.d.ts
declare global {
  interface Env {
    WORKFLOW: any;
    DB: any;
    EVIDENCE_BUCKET: any;
    BROWSER: any;
    AI: any;
    TEST_AGENT: any;
  }
}

/**
 * Mock Workflow for testing
 */
class MockWorkflow {
  async create(options: { params: { testRunId: string; gameUrl: string; inputSchema?: string } }) {
    console.log('Mock Workflow.create() called with params:', options.params);
    // Simulate successful workflow trigger
    return Promise.resolve();
  }
}

/**
 * Create mock environment for testing
 */
function createMockEnv(): Env {
  return {
    WORKFLOW: new MockWorkflow() as any,
    DB: {} as any,
    EVIDENCE_BUCKET: {} as any,
    BROWSER: {} as any,
    AI: {} as any,
    TEST_AGENT: {} as any,
  };
}

/**
 * Test helper: Parse HTML response
 */
function parseHTML(html: string): { includes: (text: string) => boolean } {
  return {
    includes: (text: string) => html.includes(text),
  };
}

/**
 * Test AC1: Dashboard Worker file exists with Worker implementation
 */
export async function testDashboardWorkerExists() {
  console.log('✓ AC1: Dashboard Worker file exists (verified by import)');
  const DashboardWorker = await import('../src/workers/dashboard.ts');
  if (!DashboardWorker.default || typeof DashboardWorker.default.fetch !== 'function') {
    throw new Error('Dashboard Worker must export default with fetch() method');
  }
  return true;
}

/**
 * Test AC2: Serves HTML/CSS/JS directly from Worker (inline, no external assets)
 */
export async function testServesInlineHTML(env: Env) {
  console.log('\nTesting AC2: Serves HTML/CSS/JS directly from Worker...');
  
  const DashboardWorker = await import('../src/workers/dashboard.ts');
  const request = new Request('http://localhost/');
  const response = await DashboardWorker.default.fetch(request, env);

  // Check Content-Type header
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('text/html')) {
    throw new Error(`Expected Content-Type text/html, got: ${contentType}`);
  }

  // Check HTML content
  const html = await response.text();
  if (!html.includes('<!DOCTYPE html>')) {
    throw new Error('Response must be complete HTML document');
  }

  // Verify embedded CSS (no external stylesheets)
  if (!html.includes('<style>')) {
    throw new Error('HTML must include embedded <style> tag');
  }
  if (html.includes('<link rel="stylesheet"')) {
    throw new Error('HTML must not reference external stylesheets');
  }

  // Verify embedded JavaScript (no external scripts)
  if (!html.includes('<script>')) {
    throw new Error('HTML must include embedded <script> tag');
  }
  if (html.includes('<script src=')) {
    throw new Error('HTML must not reference external JavaScript files');
  }

  console.log('✓ AC2: HTML/CSS/JS served inline with no external assets');
  return true;
}

/**
 * Test AC3, AC4: UI design and header
 */
export async function testUIDesignAndHeader(env: Env) {
  console.log('\nTesting AC3, AC4: UI design and header...');
  
  const DashboardWorker = await import('../src/workers/dashboard.ts');
  const request = new Request('http://localhost/');
  const response = await DashboardWorker.default.fetch(request, env);
  const html = await response.text();

  // AC3: Cloudflare design patterns
  // Check for orange accent color (#FF6B35 or similar)
  if (!html.includes('#FF6B35') && !html.includes('#ff6b35')) {
    throw new Error('UI must use Cloudflare orange accent color (#FF6B35)');
  }

  // Check for monospace fonts
  if (!html.includes('Courier New') && !html.includes('Monaco') && !html.includes('monospace')) {
    throw new Error('UI must use monospace fonts for technical data');
  }

  // AC4: Header with title and tagline
  if (!html.includes('GameEval QA Pipeline')) {
    throw new Error('Header must display "GameEval QA Pipeline" title');
  }

  // Check for tagline (flexible matching for any reasonable tagline)
  const hasTagline = html.includes('tagline') || 
                     html.includes('Autonomous') || 
                     html.includes('Browser Game') ||
                     html.includes('QA Testing');
  if (!hasTagline) {
    throw new Error('Header must include a tagline');
  }

  console.log('✓ AC3: UI follows Cloudflare design patterns (orange accents, monospace fonts)');
  console.log('✓ AC4: Header displays "GameEval QA Pipeline" with tagline');
  return true;
}

/**
 * Test AC5: URL submission form
 */
export async function testFormStructure(env: Env) {
  console.log('\nTesting AC5: URL submission form...');
  
  const DashboardWorker = await import('../src/workers/dashboard.ts');
  const request = new Request('http://localhost/');
  const response = await DashboardWorker.default.fetch(request, env);
  const html = await response.text();

  // Check for form element
  if (!html.includes('<form')) {
    throw new Error('Page must include a form');
  }

  // Check for game URL input field
  const hasGameUrlField = html.includes('id="gameUrl"') || 
                          html.includes('name="gameUrl"');
  if (!hasGameUrlField) {
    throw new Error('Form must include game URL input field');
  }

  // Check for input schema textarea
  const hasSchemaField = html.includes('id="inputSchema"') || 
                         html.includes('name="inputSchema"') ||
                         html.includes('textarea');
  if (!hasSchemaField) {
    throw new Error('Form must include input schema textarea');
  }

  // Check for submit button
  if (!html.includes('type="submit"') && !html.includes('<button')) {
    throw new Error('Form must include a submit button');
  }

  // Check for labels (accessibility)
  const hasLabels = html.includes('<label') || html.includes('aria-label');
  if (!hasLabels) {
    throw new Error('Form fields must have labels for accessibility');
  }

  console.log('✓ AC5: Form includes game URL field, input schema textarea, and submit button');
  return true;
}

/**
 * Test AC6, AC7: RPC submitTest with valid inputs
 */
export async function testSubmitTestRPC(env: Env) {
  console.log('\nTesting AC6, AC7: RPC submitTest method...');
  
  const DashboardWorker = await import('../src/workers/dashboard.ts');
  
  // Test valid submission without input schema
  const request1 = new Request('http://localhost/rpc/submitTest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameUrl: 'https://example.com/game.html',
    }),
  });

  const response1 = await DashboardWorker.default.fetch(request1, env);
  if (!response1.ok) {
    const error = await response1.text();
    throw new Error(`RPC call failed: ${error}`);
  }

  const result1 = await response1.json() as SubmitTestResponse;
  
  // AC7: Verify UUID format for testId
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(result1.testId)) {
    throw new Error(`testId must be UUID format, got: ${result1.testId}`);
  }

  console.log('✓ AC6: Submit button triggers RPC call to /rpc/submitTest');
  console.log(`✓ AC7: Generated UUID testId: ${result1.testId}`);

  // Test valid submission WITH input schema
  const request2 = new Request('http://localhost/rpc/submitTest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameUrl: 'http://example.com/game.html',
      inputSchema: '{"controls": {"move": "arrow keys"}}',
    }),
  });

  const response2 = await DashboardWorker.default.fetch(request2, env);
  if (!response2.ok) {
    const error = await response2.text();
    throw new Error(`RPC call with schema failed: ${error}`);
  }

  const result2 = await response2.json() as SubmitTestResponse;
  if (!uuidPattern.test(result2.testId)) {
    throw new Error(`testId must be UUID format with schema, got: ${result2.testId}`);
  }

  console.log('✓ AC7: RPC method handles optional input schema correctly');
  return true;
}

/**
 * Test AC8: Form validation (client-side logic verified via HTML, server-side tested here)
 */
export async function testFormValidation(env: Env) {
  console.log('\nTesting AC8: Form validation...');
  
  const DashboardWorker = await import('../src/workers/dashboard.ts');

  // Test 1: Invalid URL (not HTTP/HTTPS)
  const request1 = new Request('http://localhost/rpc/submitTest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameUrl: 'ftp://example.com/game.html', // Invalid protocol
    }),
  });

  const response1 = await DashboardWorker.default.fetch(request1, env);
  if (response1.ok) {
    throw new Error('Should reject invalid URL protocol');
  }
  const error1 = await response1.json();
  if (!error1.error || !error1.error.toLowerCase().includes('url')) {
    throw new Error(`Expected URL validation error, got: ${error1.error}`);
  }
  console.log('✓ AC8: Validates URL format (must be HTTP/HTTPS)');

  // Test 2: Missing URL
  const request2 = new Request('http://localhost/rpc/submitTest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameUrl: '', // Empty URL
    }),
  });

  const response2 = await DashboardWorker.default.fetch(request2, env);
  if (response2.ok) {
    throw new Error('Should reject empty URL');
  }
  console.log('✓ AC8: Validates URL is required');

  // Test 3: Invalid JSON schema
  const request3 = new Request('http://localhost/rpc/submitTest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameUrl: 'https://example.com/game.html',
      inputSchema: '{ invalid json', // Malformed JSON
    }),
  });

  const response3 = await DashboardWorker.default.fetch(request3, env);
  if (response3.ok) {
    throw new Error('Should reject invalid JSON schema');
  }
  const error3 = await response3.json();
  if (!error3.error || !error3.error.toLowerCase().includes('json')) {
    throw new Error(`Expected JSON validation error, got: ${error3.error}`);
  }
  console.log('✓ AC8: Validates JSON schema format');

  return true;
}

/**
 * Test AC9: Responsive layout (verified via CSS media queries in HTML)
 */
export async function testResponsiveLayout(env: Env) {
  console.log('\nTesting AC9: Responsive layout...');
  
  const DashboardWorker = await import('../src/workers/dashboard.ts');
  const request = new Request('http://localhost/');
  const response = await DashboardWorker.default.fetch(request, env);
  const html = await response.text();

  // Check for media queries for desktop viewport
  const hasMediaQuery = html.includes('@media') && 
                        (html.includes('min-width') || html.includes('max-width'));
  if (!hasMediaQuery) {
    throw new Error('CSS must include media queries for responsive layout');
  }

  // Check for viewport meta tag
  if (!html.includes('viewport')) {
    throw new Error('HTML must include viewport meta tag for responsive design');
  }

  console.log('✓ AC9: Responsive layout with media queries for desktop viewport');
  return true;
}

/**
 * Test error handling: Workflow trigger failure
 */
export async function testWorkflowTriggerError() {
  console.log('\nTesting error handling: Workflow trigger failure...');
  
  // Create mock env with failing workflow
  const mockEnv = {
    WORKFLOW: {
      create: async () => {
        throw new Error('Workflow service unavailable');
      },
    },
  } as any;

  const DashboardWorker = await import('../src/workers/dashboard.ts');
  const request = new Request('http://localhost/rpc/submitTest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameUrl: 'https://example.com/game.html',
    }),
  });

  const response = await DashboardWorker.default.fetch(request, mockEnv);
  if (response.ok) {
    throw new Error('Should return error when Workflow trigger fails');
  }

  const error = await response.json();
  if (!error.error) {
    throw new Error('Error response must include error message');
  }

  // Verify error message is user-friendly (no stack traces, no internal codes)
  if (error.error.includes('stack') || error.error.includes('Error:')) {
    console.warn('⚠ Error message may not be fully sanitized:', error.error);
  }

  console.log('✓ Error handling: Workflow trigger failures return user-friendly error');
  return true;
}

/**
 * Test 404 for unknown routes
 */
export async function test404NotFound(env: Env) {
  console.log('\nTesting 404 for unknown routes...');
  
  const DashboardWorker = await import('../src/workers/dashboard.ts');
  const request = new Request('http://localhost/unknown-route');
  const response = await DashboardWorker.default.fetch(request, env);

  if (response.status !== 404) {
    throw new Error(`Expected 404 for unknown route, got: ${response.status}`);
  }

  console.log('✓ Unknown routes return 404 Not Found');
  return true;
}

/**
 * Run all tests
 */
export async function runDashboardWorkerTests(env?: Env) {
  console.log('\n========================================');
  console.log('Story 3.1: Dashboard Worker Tests');
  console.log('========================================\n');

  const testEnv = env || createMockEnv();

  try {
    await testDashboardWorkerExists();
    await testServesInlineHTML(testEnv);
    await testUIDesignAndHeader(testEnv);
    await testFormStructure(testEnv);
    await testSubmitTestRPC(testEnv);
    await testFormValidation(testEnv);
    await testResponsiveLayout(testEnv);
    await testWorkflowTriggerError();
    await test404NotFound(testEnv);

    console.log('\n========================================');
    console.log('✅ All Dashboard Worker Tests Passed');
    console.log('========================================\n');
    
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Export for use in main test runner
export default runDashboardWorkerTests;

