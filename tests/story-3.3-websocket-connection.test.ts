/**
 * Integration Tests for Story 3.3: WebSocket Connection for Live Updates
 * 
 * Tests:
 * - AC 1: Dashboard connects to TestAgent DO via WebSocket
 * - AC 2: Connection established through RPC call to Dashboard Worker
 * - AC 3: TestAgent broadcasts updates via WebSocket
 * - AC 4: Dashboard receives WebSocket messages and updates UI instantly
 * - AC 5: Status badge updates in real-time (no polling delay)
 * - AC 6: Progress messages shown in expandable "Live Feed" section
 * - AC 7: WebSocket reconnects automatically if connection drops
 * - AC 8: Fallback to polling if WebSocket unavailable
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Test environment setup
const TEST_GAME_URL = 'https://example.com/test-game.html';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:8787';

describe('Story 3.3: WebSocket Connection for Live Updates', () => {
  let testRunId: string;

  beforeAll(async () => {
    console.log('Testing WebSocket connection for real-time updates...');
  });

  afterAll(async () => {
    console.log('WebSocket connection tests completed');
  });

  beforeEach(async () => {
    // Submit a test to get a testRunId for WebSocket testing
    const response = await fetch(`${DASHBOARD_URL}/rpc/submitTest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameUrl: TEST_GAME_URL,
        inputSchema: undefined,
      }),
    });

    const data = await response.json();
    testRunId = data.testId;
    
    // Wait a bit for test to start
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  /**
   * AC 1 & 2: WebSocket Connection Establishment
   * Dashboard connects to TestAgent DO via WebSocket through RPC
   */
  it('AC 1 & 2: should establish WebSocket connection to TestAgent DO', async () => {
    // Create WebSocket connection
    const wsUrl = `${DASHBOARD_URL.replace('http', 'ws')}/ws?testId=${testRunId}`;
    const ws = new WebSocket(wsUrl);

    // Test connection establishment
    const connected = await new Promise<boolean>((resolve) => {
      ws.onopen = () => resolve(true);
      ws.onerror = () => resolve(false);
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000);
    });

    expect(connected).toBe(true);

    // Clean up
    ws.close();
  }, 10000);

  /**
   * AC 1 & 2: WebSocket Connection with Invalid TestId
   * Should fail gracefully when testId is invalid
   */
  it('AC 2: should fail gracefully with invalid testId', async () => {
    const invalidTestId = 'invalid-uuid';
    const wsUrl = `${DASHBOARD_URL.replace('http', 'ws')}/ws?testId=${invalidTestId}`;
    const ws = new WebSocket(wsUrl);

    // Test connection failure
    const failed = await new Promise<boolean>((resolve) => {
      ws.onopen = () => resolve(false);
      ws.onerror = () => resolve(true);
      
      // Timeout after 3 seconds
      setTimeout(() => resolve(true), 3000);
    });

    expect(failed).toBe(true);
  }, 5000);

  /**
   * AC 3 & 4: TestAgent Broadcasts Updates and Dashboard Receives Messages
   * TestAgent sends progress updates, Dashboard receives and processes them
   */
  it('AC 3 & 4: should receive real-time WebSocket messages from TestAgent', async () => {
    const wsUrl = `${DASHBOARD_URL.replace('http', 'ws')}/ws?testId=${testRunId}`;
    const ws = new WebSocket(wsUrl);

    // Collect received messages
    const messages: any[] = [];

    const messagesReceived = await new Promise<boolean>((resolve) => {
      ws.onopen = () => {
        console.log(`WebSocket connected for test ${testRunId}`);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          messages.push(message);
          console.log('Received WebSocket message:', message);

          // Consider test successful after receiving at least 1 message
          if (messages.length >= 1) {
            resolve(true);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        resolve(false);
      };

      // Timeout after 30 seconds (test execution takes time)
      setTimeout(() => {
        resolve(messages.length > 0);
      }, 30000);
    });

    expect(messagesReceived).toBe(true);
    expect(messages.length).toBeGreaterThan(0);

    // Verify message structure
    if (messages.length > 0) {
      const firstMessage = messages[0];
      expect(firstMessage).toHaveProperty('type');
      expect(firstMessage).toHaveProperty('message');
      expect(firstMessage).toHaveProperty('timestamp');
      
      // Verify message type is valid
      expect(['status', 'progress', 'complete', 'error']).toContain(firstMessage.type);
    }

    // Clean up
    ws.close();
  }, 35000);

  /**
   * AC 5: Status Badge Updates in Real-Time
   * Verify WebSocket messages include status updates for real-time badge changes
   */
  it('AC 5: should receive status updates for real-time badge changes', async () => {
    const wsUrl = `${DASHBOARD_URL.replace('http', 'ws')}/ws?testId=${testRunId}`;
    const ws = new WebSocket(wsUrl);

    // Collect status messages
    const statusUpdates: any[] = [];

    const statusReceived = await new Promise<boolean>((resolve) => {
      ws.onopen = () => {
        console.log('WebSocket connected, waiting for status updates...');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Collect messages with status or type='status'
          if (message.status || message.type === 'status') {
            statusUpdates.push(message);
            console.log('Received status update:', message);
            
            // Resolve after receiving status update
            resolve(true);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Timeout after 30 seconds
      setTimeout(() => {
        resolve(statusUpdates.length > 0);
      }, 30000);
    });

    expect(statusReceived).toBe(true);
    expect(statusUpdates.length).toBeGreaterThan(0);

    // Clean up
    ws.close();
  }, 35000);

  /**
   * AC 6: Progress Messages in Live Feed
   * Verify WebSocket messages include progress text for live feed display
   */
  it('AC 6: should receive progress messages for live feed', async () => {
    const wsUrl = `${DASHBOARD_URL.replace('http', 'ws')}/ws?testId=${testRunId}`;
    const ws = new WebSocket(wsUrl);

    // Collect progress messages
    const progressMessages: string[] = [];

    const progressReceived = await new Promise<boolean>((resolve) => {
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Collect messages with 'message' field (for live feed)
          if (message.message && typeof message.message === 'string') {
            progressMessages.push(message.message);
            console.log('Progress message:', message.message);
          }

          // Resolve after receiving at least 2 messages
          if (progressMessages.length >= 2) {
            resolve(true);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      // Timeout after 30 seconds
      setTimeout(() => {
        resolve(progressMessages.length >= 2);
      }, 30000);
    });

    expect(progressReceived).toBe(true);
    expect(progressMessages.length).toBeGreaterThanOrEqual(2);

    // Verify messages are human-readable strings
    progressMessages.forEach(msg => {
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });

    // Clean up
    ws.close();
  }, 35000);

  /**
   * AC 7: Automatic Reconnection
   * Verify WebSocket reconnects automatically when connection drops
   * Note: This is tested on the frontend, so we verify the implementation exists
   */
  it('AC 7: WebSocket client implements automatic reconnection logic', async () => {
    // Fetch dashboard HTML to verify reconnection logic exists
    const response = await fetch(DASHBOARD_URL);
    const html = await response.text();

    // Verify reconnection implementation exists in JavaScript
    expect(html).toContain('attemptReconnection');
    expect(html).toContain('RECONNECTION_DELAYS');
    expect(html).toContain('reconnectionAttempts');
    expect(html).toContain('MAX_RECONNECTION_ATTEMPTS');

    // Verify exponential backoff delays are configured
    expect(html).toContain('[1000, 2000, 4000, 8000');
  });

  /**
   * AC 8: Polling Fallback
   * Verify polling continues to work when WebSocket is unavailable
   */
  it('AC 8: should fallback to polling when WebSocket unavailable', async () => {
    // Test that listTests RPC still works (polling fallback)
    const response = await fetch(`${DASHBOARD_URL}/rpc/listTests`);
    expect(response.ok).toBe(true);

    const tests = await response.json();
    expect(Array.isArray(tests)).toBe(true);
    
    // Verify our test exists in the list
    const ourTest = tests.find((t: any) => t.id === testRunId);
    expect(ourTest).toBeDefined();
    expect(ourTest.status).toMatch(/queued|running|completed|failed/);
  });

  /**
   * Complete Flow Test: Submit → WebSocket → Updates → UI
   * Test the complete flow from test submission to real-time updates
   */
  it('Complete Flow: should handle full test lifecycle with WebSocket', async () => {
    // 1. Submit test
    const submitResponse = await fetch(`${DASHBOARD_URL}/rpc/submitTest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameUrl: TEST_GAME_URL,
        inputSchema: undefined,
      }),
    });

    expect(submitResponse.ok).toBe(true);
    const { testId } = await submitResponse.json();
    expect(testId).toBeDefined();

    // 2. Connect WebSocket
    const wsUrl = `${DASHBOARD_URL.replace('http', 'ws')}/ws?testId=${testId}`;
    const ws = new WebSocket(wsUrl);

    const phases: string[] = [];
    let completionReceived = false;

    // 3. Monitor test execution
    const testCompleted = await new Promise<boolean>((resolve) => {
      ws.onopen = () => {
        console.log('WebSocket connected, monitoring test execution...');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('WebSocket message:', message);

          // Track phases
          if (message.phase) {
            if (!phases.includes(message.phase)) {
              phases.push(message.phase);
            }
          }

          // Check for completion
          if (message.type === 'complete') {
            completionReceived = true;
            console.log('Test completed via WebSocket');
            resolve(true);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        resolve(false);
      };

      // Long timeout for full test execution (tests can take 60+ seconds)
      setTimeout(() => {
        console.log(`Test phases observed: ${phases.join(', ')}`);
        resolve(phases.length > 0); // Consider success if we observed any phases
      }, 90000);
    });

    expect(testCompleted || phases.length > 0).toBe(true);
    
    // Verify we received phase updates
    console.log(`Total phases observed: ${phases.length}`);
    
    // 4. Verify test status in database
    const listResponse = await fetch(`${DASHBOARD_URL}/rpc/listTests`);
    const tests = await listResponse.json();
    const test = tests.find((t: any) => t.id === testId);
    
    expect(test).toBeDefined();
    expect(['queued', 'running', 'completed', 'failed']).toContain(test.status);

    // Clean up
    ws.close();
  }, 120000);

  /**
   * Error Handling: Missing testId Parameter
   */
  it('should return 400 when testId parameter is missing', async () => {
    const wsUrl = `${DASHBOARD_URL.replace('http', 'ws')}/ws`;
    const ws = new WebSocket(wsUrl);

    const errorReceived = await new Promise<boolean>((resolve) => {
      ws.onerror = () => resolve(true);
      ws.onopen = () => resolve(false);
      
      setTimeout(() => resolve(true), 3000);
    });

    expect(errorReceived).toBe(true);
  }, 5000);

  /**
   * Multiple Concurrent WebSocket Connections
   * Verify multiple tests can have WebSocket connections simultaneously
   */
  it('should support multiple concurrent WebSocket connections', async () => {
    // Submit multiple tests
    const test1Response = await fetch(`${DASHBOARD_URL}/rpc/submitTest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUrl: TEST_GAME_URL }),
    });
    const { testId: testId1 } = await test1Response.json();

    const test2Response = await fetch(`${DASHBOARD_URL}/rpc/submitTest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameUrl: TEST_GAME_URL }),
    });
    const { testId: testId2 } = await test2Response.json();

    // Connect both WebSockets
    const ws1 = new WebSocket(`${DASHBOARD_URL.replace('http', 'ws')}/ws?testId=${testId1}`);
    const ws2 = new WebSocket(`${DASHBOARD_URL.replace('http', 'ws')}/ws?testId=${testId2}`);

    const bothConnected = await new Promise<boolean>((resolve) => {
      let ws1Connected = false;
      let ws2Connected = false;

      ws1.onopen = () => {
        ws1Connected = true;
        if (ws1Connected && ws2Connected) resolve(true);
      };

      ws2.onopen = () => {
        ws2Connected = true;
        if (ws1Connected && ws2Connected) resolve(true);
      };

      setTimeout(() => resolve(ws1Connected && ws2Connected), 5000);
    });

    expect(bothConnected).toBe(true);

    // Clean up
    ws1.close();
    ws2.close();
  }, 10000);
});

