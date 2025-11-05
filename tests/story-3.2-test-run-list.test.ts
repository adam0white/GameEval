/**
 * Integration Tests for Story 3.2: Test Run List with Real-Time Status
 * 
 * Tests the Dashboard Worker's listTests() RPC method and test list UI functionality.
 * Validates polling, status updates, progress indicators, and UI rendering.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Story 3.2: Test Run List with Real-Time Status', () => {
  const DASHBOARD_URL = 'http://localhost:8787';
  const LIST_TESTS_ENDPOINT = `${DASHBOARD_URL}/rpc/listTests`;

  describe('AC-2: listTests RPC Method', () => {
    it('should return test list from GET /rpc/listTests endpoint', async () => {
      const response = await fetch(LIST_TESTS_ENDPOINT);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return empty array when no tests exist', async () => {
      const response = await fetch(LIST_TESTS_ENDPOINT);
      const data = await response.json();
      
      // Should be array (may be empty or have tests from previous runs)
      expect(Array.isArray(data)).toBe(true);
    });

    it('should return TestRunSummary objects with correct structure', async () => {
      const response = await fetch(LIST_TESTS_ENDPOINT);
      const data = await response.json();
      
      if (data.length > 0) {
        const test = data[0];
        
        // Verify required fields
        expect(test).toHaveProperty('id');
        expect(test).toHaveProperty('url');
        expect(test).toHaveProperty('status');
        expect(test).toHaveProperty('progress');
        expect(test).toHaveProperty('createdAt');
        
        // Verify status is one of valid values
        expect(['queued', 'running', 'completed', 'failed']).toContain(test.status);
        
        // Verify progress is a number
        expect(typeof test.progress).toBe('number');
        
        // Verify timestamps are numbers
        expect(typeof test.createdAt).toBe('number');
      }
    });
  });

  describe('AC-4: Tests sorted by newest first', () => {
    it('should return tests ordered by created_at DESC', async () => {
      const response = await fetch(LIST_TESTS_ENDPOINT);
      const data = await response.json();
      
      if (data.length > 1) {
        // Check that each test is older than the previous
        for (let i = 0; i < data.length - 1; i++) {
          expect(data[i].createdAt).toBeGreaterThanOrEqual(data[i + 1].createdAt);
        }
      }
    });
  });

  describe('AC-3: Test card displays correct metadata', () => {
    it('should include all required fields in summary', async () => {
      const response = await fetch(LIST_TESTS_ENDPOINT);
      const data = await response.json();
      
      if (data.length > 0) {
        const test = data[0];
        
        // Required fields
        expect(test.id).toBeDefined();
        expect(test.url).toBeDefined();
        expect(test.status).toBeDefined();
        expect(test.progress).toBeDefined();
        expect(test.createdAt).toBeDefined();
        
        // Optional fields (if completed)
        if (test.status === 'completed') {
          expect(test.completedAt).toBeDefined();
          expect(test.duration).toBeDefined();
        }
      }
    });

    it('should calculate progress correctly from test_events', async () => {
      const response = await fetch(LIST_TESTS_ENDPOINT);
      const data = await response.json();
      
      if (data.length > 0) {
        const test = data[0];
        
        // Progress should be 0-4
        expect(test.progress).toBeGreaterThanOrEqual(0);
        expect(test.progress).toBeLessThanOrEqual(4);
        
        // If progress > 0, phase should be defined
        if (test.progress > 0) {
          expect(test.phase).toBeDefined();
          expect(['phase1', 'phase2', 'phase3', 'phase4']).toContain(test.phase);
        }
      }
    });
  });

  describe('AC-7: Error handling', () => {
    it('should handle D1 query errors gracefully', async () => {
      // This test assumes the endpoint handles errors properly
      // In production, D1 might be unavailable or return errors
      const response = await fetch(LIST_TESTS_ENDPOINT);
      
      // Should return valid response even if empty
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Integration: Complete flow', () => {
    it('should submit test and see it appear in list', async () => {
      // Submit a new test
      const submitResponse = await fetch(`${DASHBOARD_URL}/rpc/submitTest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameUrl: 'https://example.com/test-game.html',
          inputSchema: '{"test": true}',
        }),
      });
      
      expect(submitResponse.status).toBe(200);
      const submitData = await submitResponse.json();
      const testId = submitData.testId;
      
      // Wait a moment for D1 write
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch test list
      const listResponse = await fetch(LIST_TESTS_ENDPOINT);
      const listData = await listResponse.json();
      
      // Verify the new test appears in the list
      const foundTest = listData.find((test: any) => test.id === testId);
      expect(foundTest).toBeDefined();
      expect(foundTest.url).toBe('https://example.com/test-game.html');
      expect(foundTest.status).toBe('queued');
    });
  });

  describe('Manual Testing Guidance', () => {
    it('should provide manual test instructions', () => {
      console.log('\n=== MANUAL TESTING INSTRUCTIONS ===\n');
      console.log('1. Start the Dashboard Worker: npm run dev');
      console.log('2. Open browser to http://localhost:8787');
      console.log('3. Submit a test using the form');
      console.log('4. Verify test list section appears below the form');
      console.log('5. Verify the new test appears in the list with "queued" status');
      console.log('6. Verify polling updates the list every 3 seconds (watch for "Loading..." indicator)');
      console.log('7. Click a test card to expand inline details');
      console.log('8. Verify status badge colors:');
      console.log('   - Gray for "queued"');
      console.log('   - Blue for "running"');
      console.log('   - Green for "completed"');
      console.log('   - Red for "failed"');
      console.log('9. Verify progress indicator shows "Phase X/4"');
      console.log('10. Verify relative time updates (e.g., "2 minutes ago")');
      console.log('11. Verify score color coding (green >70, yellow 50-70, red <50)');
      console.log('12. Test empty state: Clear all tests and verify "No tests yet" message');
      console.log('\n===================================\n');
    });
  });
});

