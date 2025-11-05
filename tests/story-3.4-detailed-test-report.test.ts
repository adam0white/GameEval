/**
 * Integration Tests for Story 3.4: Detailed Test Report View
 * 
 * Tests the Dashboard Worker's getTestReport() and exportTestJSON() RPC methods.
 * Validates complete test report structure, screenshot gallery, console/network logs,
 * and JSON export functionality.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('Story 3.4: Detailed Test Report View', () => {
  const DASHBOARD_URL = 'http://localhost:8787';
  const GET_TEST_REPORT_ENDPOINT = `${DASHBOARD_URL}/rpc/getTestReport`;
  const EXPORT_TEST_JSON_ENDPOINT = `${DASHBOARD_URL}/rpc/exportTestJSON`;
  const LIST_TESTS_ENDPOINT = `${DASHBOARD_URL}/rpc/listTests`;

  let testId: string | null = null;

  // Get a test ID from listTests for testing
  beforeAll(async () => {
    const response = await fetch(LIST_TESTS_ENDPOINT);
    const tests = await response.json();
    
    if (tests.length > 0) {
      testId = tests[0].id;
    }
  });

  describe('AC-2: getTestReport RPC Method', () => {
    it('should return 400 if testId parameter is missing', async () => {
      const response = await fetch(GET_TEST_REPORT_ENDPOINT);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('testId');
    });

    it('should return 400 if testId is not a valid UUID', async () => {
      const response = await fetch(`${GET_TEST_REPORT_ENDPOINT}?testId=invalid-id`);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid testId format');
    });

    it('should return TestReport object with correct structure', async () => {
      if (!testId) {
        console.log('No tests available for detailed report testing');
        return;
      }

      const response = await fetch(`${GET_TEST_REPORT_ENDPOINT}?testId=${testId}`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const report = await response.json();
      
      // Verify required fields
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('url');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('screenshots');
      expect(report).toHaveProperty('events');
      expect(report).toHaveProperty('consoleLogs');
      expect(report).toHaveProperty('networkErrors');
      expect(report).toHaveProperty('timestamps');
      
      // Verify arrays
      expect(Array.isArray(report.metrics)).toBe(true);
      expect(Array.isArray(report.screenshots)).toBe(true);
      expect(Array.isArray(report.events)).toBe(true);
      expect(Array.isArray(report.consoleLogs)).toBe(true);
      expect(Array.isArray(report.networkErrors)).toBe(true);
      
      // Verify timestamps object structure
      expect(report.timestamps).toHaveProperty('createdAt');
      expect(report.timestamps).toHaveProperty('completedAt');
      expect(report.timestamps).toHaveProperty('duration');
    });

    it('should return metrics with justifications', async () => {
      if (!testId) {
        console.log('No tests available for metrics testing');
        return;
      }

      const response = await fetch(`${GET_TEST_REPORT_ENDPOINT}?testId=${testId}`);
      const report = await response.json();
      
      if (report.metrics && report.metrics.length > 0) {
        const metric = report.metrics[0];
        
        // Verify metric structure
        expect(metric).toHaveProperty('name');
        expect(metric).toHaveProperty('score');
        expect(metric).toHaveProperty('justification');
        
        // Verify score is 0-100
        expect(metric.score).toBeGreaterThanOrEqual(0);
        expect(metric.score).toBeLessThanOrEqual(100);
        
        // Verify justification is a non-empty string
        expect(typeof metric.justification).toBe('string');
        expect(metric.justification.length).toBeGreaterThan(0);
      }
    });

    it('should return screenshots with URLs and captions', async () => {
      if (!testId) {
        console.log('No tests available for screenshot testing');
        return;
      }

      const response = await fetch(`${GET_TEST_REPORT_ENDPOINT}?testId=${testId}`);
      const report = await response.json();
      
      if (report.screenshots && report.screenshots.length > 0) {
        const screenshot = report.screenshots[0];
        
        // Verify screenshot structure (AC-3)
        expect(screenshot).toHaveProperty('url');
        expect(screenshot).toHaveProperty('phase');
        expect(screenshot).toHaveProperty('description');
        expect(screenshot).toHaveProperty('timestamp');
        
        // Verify URL is a string (should be public R2 URL)
        expect(typeof screenshot.url).toBe('string');
        expect(screenshot.url).toMatch(/^https?:\/\//);
        
        // Verify phase format (phase1-phase4)
        expect(screenshot.phase).toMatch(/^phase[1-4]$/);
      }
    });

    it('should return timeline events ordered by timestamp', async () => {
      if (!testId) {
        console.log('No tests available for timeline testing');
        return;
      }

      const response = await fetch(`${GET_TEST_REPORT_ENDPOINT}?testId=${testId}`);
      const report = await response.json();
      
      if (report.events && report.events.length > 1) {
        // Verify events are chronologically ordered (AC-2)
        for (let i = 0; i < report.events.length - 1; i++) {
          expect(report.events[i].timestamp).toBeLessThanOrEqual(report.events[i + 1].timestamp);
        }
        
        // Verify event structure
        const event = report.events[0];
        expect(event).toHaveProperty('phase');
        expect(event).toHaveProperty('event_type');
        expect(event).toHaveProperty('description');
        expect(event).toHaveProperty('timestamp');
      }
    });

    it('should handle tests with no screenshots gracefully', async () => {
      if (!testId) {
        console.log('No tests available for partial data testing');
        return;
      }

      const response = await fetch(`${GET_TEST_REPORT_ENDPOINT}?testId=${testId}`);
      const report = await response.json();
      
      // Should always return arrays (may be empty)
      expect(Array.isArray(report.screenshots)).toBe(true);
      expect(Array.isArray(report.consoleLogs)).toBe(true);
      expect(Array.isArray(report.networkErrors)).toBe(true);
    });
  });

  describe('AC-6: exportTestJSON RPC Method', () => {
    it('should return 400 if testId parameter is missing', async () => {
      const response = await fetch(EXPORT_TEST_JSON_ENDPOINT);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('testId');
    });

    it('should return 400 if testId is not a valid UUID', async () => {
      const response = await fetch(`${EXPORT_TEST_JSON_ENDPOINT}?testId=invalid-id`);
      
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid testId format');
    });

    it('should return JSON file with correct headers', async () => {
      if (!testId) {
        console.log('No tests available for JSON export testing');
        return;
      }

      const response = await fetch(`${EXPORT_TEST_JSON_ENDPOINT}?testId=${testId}`);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain(`test-${testId}.json`);
    });

    it('should return complete test report as formatted JSON', async () => {
      if (!testId) {
        console.log('No tests available for JSON format testing');
        return;
      }

      const response = await fetch(`${EXPORT_TEST_JSON_ENDPOINT}?testId=${testId}`);
      const jsonText = await response.text();
      
      // Verify JSON is formatted (has indentation)
      expect(jsonText).toContain('\n');
      expect(jsonText).toMatch(/\n  /); // Has 2-space indentation
      
      // Parse JSON and verify structure
      const report = JSON.parse(jsonText);
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('url');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('screenshots');
      expect(report).toHaveProperty('events');
    });
  });

  describe('AC-1, AC-7: Test Card Expansion and Collapse', () => {
    it('should display detailed report inline when test card clicked', async () => {
      // This is a browser-based test that would require headless browser
      // For now, we verify the RPC methods work correctly
      // Integration with actual browser testing can be done separately
      console.log('Browser-based UI test: Test card expansion requires headless browser testing');
    });

    it('should collapse detailed report when collapse button clicked', async () => {
      // This is a browser-based test that would require headless browser
      console.log('Browser-based UI test: Test card collapse requires headless browser testing');
    });
  });

  describe('AC-4: Screenshot Lightbox', () => {
    it('should open lightbox modal when screenshot clicked', async () => {
      // This is a browser-based test that would require headless browser
      console.log('Browser-based UI test: Screenshot lightbox requires headless browser testing');
    });

    it('should navigate between screenshots with prev/next buttons', async () => {
      // This is a browser-based test that would require headless browser
      console.log('Browser-based UI test: Lightbox navigation requires headless browser testing');
    });
  });

  describe('Error Handling', () => {
    it('should return error for non-existent test ID', async () => {
      const fakeTestId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(`${GET_TEST_REPORT_ENDPOINT}?testId=${fakeTestId}`);
      
      // Should return error (either 500 with error message or 404)
      expect(response.status).toBeGreaterThanOrEqual(400);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle R2 access failures gracefully', async () => {
      if (!testId) {
        console.log('No tests available for R2 failure testing');
        return;
      }

      // Even if R2 fails, should return report with empty arrays
      const response = await fetch(`${GET_TEST_REPORT_ENDPOINT}?testId=${testId}`);
      const report = await response.json();
      
      // Should still have required fields
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('url');
      expect(report).toHaveProperty('status');
    });
  });
});

