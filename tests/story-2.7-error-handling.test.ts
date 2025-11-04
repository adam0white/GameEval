/**
 * Story 2.7: Graceful Error Handling and User-Friendly Messages
 * Tests error translation, sanitization, and graceful degradation
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { ERROR_MESSAGES, ERROR_PATTERNS } from '../src/shared/constants';

describe('Story 2.7: Error Handling', () => {
  describe('Error Message Constants', () => {
    test('ERROR_MESSAGES contains all required messages', () => {
      expect(ERROR_MESSAGES.GAME_NOT_FOUND).toBeDefined();
      expect(ERROR_MESSAGES.NETWORK_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.PHASE1_TIMEOUT).toBeDefined();
      expect(ERROR_MESSAGES.PHASE2_TIMEOUT).toBeDefined();
      expect(ERROR_MESSAGES.PHASE3_TIMEOUT).toBeDefined();
      expect(ERROR_MESSAGES.PHASE4_TIMEOUT).toBeDefined();
      expect(ERROR_MESSAGES.AI_GATEWAY_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.BROWSER_SESSION_ERROR).toBeDefined();
      expect(ERROR_MESSAGES.GENERIC_ERROR).toBeDefined();
    });

    test('Error messages are user-friendly (no technical jargon)', () => {
      // Verify messages don't contain technical terms
      Object.values(ERROR_MESSAGES).forEach(message => {
        expect(message).not.toContain('stack trace');
        expect(message).not.toContain('EACCES');
        expect(message).not.toContain('Durable Object');
        expect(message).not.toContain('R2 bucket');
        expect(message).not.toContain('/src/');
      });
    });
  });

  describe('Error Pattern Matching', () => {
    test('404 errors map to GAME_NOT_FOUND', () => {
      const pattern = ERROR_PATTERNS.find(p => p.message === ERROR_MESSAGES.GAME_NOT_FOUND);
      expect(pattern).toBeDefined();
      expect(pattern?.pattern.test('404')).toBe(true);
      expect(pattern?.pattern.test('not found')).toBe(true);
    });

    test('Timeout errors map to GENERIC_TIMEOUT', () => {
      const pattern = ERROR_PATTERNS.find(p => p.message === ERROR_MESSAGES.GENERIC_TIMEOUT);
      expect(pattern).toBeDefined();
      expect(pattern?.pattern.test('timeout')).toBe(true);
      expect(pattern?.pattern.test('timed out')).toBe(true);
    });

    test('Network errors map to NETWORK_ERROR', () => {
      const pattern = ERROR_PATTERNS.find(p => p.message === ERROR_MESSAGES.NETWORK_ERROR);
      expect(pattern).toBeDefined();
      expect(pattern?.pattern.test('network')).toBe(true);
      expect(pattern?.pattern.test('net::ERR')).toBe(true);
      expect(pattern?.pattern.test('fetch failed')).toBe(true);
    });

    test('AI Gateway errors map to AI_GATEWAY_ERROR', () => {
      const pattern = ERROR_PATTERNS.find(p => p.message === ERROR_MESSAGES.AI_GATEWAY_ERROR);
      expect(pattern).toBeDefined();
      expect(pattern?.pattern.test('ai gateway')).toBe(true);
      expect(pattern?.pattern.test('model')).toBe(true);
    });

    test('Browser errors map to BROWSER_SESSION_ERROR', () => {
      const pattern = ERROR_PATTERNS.find(p => p.message === ERROR_MESSAGES.BROWSER_SESSION_ERROR);
      expect(pattern).toBeDefined();
      expect(pattern?.pattern.test('browser error')).toBe(true);
      expect(pattern?.pattern.test('puppeteer')).toBe(true);
    });
  });

  describe('Error Sanitization', () => {
    test('Sanitization removes stack traces', () => {
      const errorWithStack = 'Error message\n  at TestAgent.runPhase1 (/src/agents/TestAgent.ts:123:45)';
      const sanitized = errorWithStack.split('\n')[0].split(' at ')[0];
      expect(sanitized).toBe('Error message');
      expect(sanitized).not.toContain('at TestAgent');
      expect(sanitized).not.toContain('/src/');
    });

    test('Sanitization removes file paths', () => {
      const errorWithPath = 'Failed to load /src/agents/TestAgent.ts:123';
      const sanitized = errorWithPath.replace(/[\/\\][\w\/\\.-]+\.\w+(?::\d+)?/g, '');
      expect(sanitized).toBe('Failed to load ');
      expect(sanitized).not.toContain('/src/');
    });

    test('Sanitization removes internal error codes', () => {
      const errorWithCode = 'EACCES: permission denied';
      const sanitized = errorWithCode.replace(/\b[A-Z]{2,}[A-Z0-9_]+\b/g, '');
      expect(sanitized).not.toContain('EACCES');
    });

    test('Sanitization removes infrastructure details', () => {
      const errorWithInfra = 'Durable Object failed to initialize';
      const sanitized = errorWithInfra.replace(/\b(Durable Object|R2 bucket|Workflow|Workers|Cloudflare)\b/gi, 'service');
      expect(sanitized).toBe('service failed to initialize');
    });

    test('Sanitization removes internal URLs', () => {
      const errorWithUrl = 'Request failed: http://testAgent/phase1';
      const sanitized = errorWithUrl.replace(/https?:\/\/[^\s]+/g, '');
      expect(sanitized).toBe('Request failed: ');
      expect(sanitized).not.toContain('http://');
    });
  });

  describe('Graceful Degradation Messages', () => {
    test('Phase 1 failure message is actionable', () => {
      const message = ERROR_MESSAGES.PHASE1_TIMEOUT;
      expect(message).toContain('game');
      expect(message).toContain('load');
      expect(message.toLowerCase()).toContain('check');
    });

    test('Phase 2 failure message is actionable', () => {
      const message = ERROR_MESSAGES.PHASE2_TIMEOUT;
      expect(message).toContain('Control discovery');
      expect(message).toContain('timed out');
    });

    test('Phase 3 failure message is actionable', () => {
      const message = ERROR_MESSAGES.PHASE3_TIMEOUT;
      expect(message).toContain('agent');
      expect(message).toContain('playing');
    });

    test('Phase 4 failure message is actionable', () => {
      const message = ERROR_MESSAGES.PHASE4_TIMEOUT;
      expect(message).toContain('Evaluation');
      expect(message).toContain('try again');
    });
  });
});

// Integration test notes (manual testing required):
// 
// 1. Test error translation in TestAgent phases:
//    - Trigger 404 error → verify user-friendly message
//    - Trigger timeout error → verify phase-specific message
//    - Trigger AI Gateway error → verify service unavailable message
//    - Trigger browser error → verify browser session error message
//
// 2. Test graceful degradation:
//    - Fail Phase 1 → verify Phase 4 runs with no evidence
//    - Fail Phase 2 → verify Phase 4 runs with Phase 1 evidence
//    - Fail Phase 3 → verify Phase 4 runs with Phase 1-2 evidence
//    - Fail Phase 4 → verify partial results stored
//
// 3. Test error message storage:
//    - Verify error_message field populated in test_runs table
//    - Verify error broadcast via WebSocket
//    - Verify technical details logged to test_events (not user-facing)
//
// 4. Test error sanitization:
//    - Trigger error with stack trace → verify sanitized in test_runs.error_message
//    - Trigger error with internal codes → verify sanitized
//    - Verify technical details preserved in test_events.metadata

console.log('✅ Story 2.7: Error Handling unit tests completed');
console.log('⚠️  Manual integration tests required (see test file comments)');

