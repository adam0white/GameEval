/**
 * Application constants for the GameEval QA Pipeline
 */

// Error messages for user-friendly error handling (Story 2.7)
export const ERROR_MESSAGES = {
  NOT_FOUND: 'Not Found',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  INVALID_REQUEST: 'Invalid Request',
  
  // Network and HTTP errors
  GAME_NOT_FOUND: 'The game URL could not be accessed. Please check the URL is correct.',
  NETWORK_ERROR: 'Network connection error during test. Please check your internet connection.',
  INVALID_URL: 'Invalid game URL. Please check the URL format is correct.',
  
  // Timeout errors (phase-specific)
  PHASE1_TIMEOUT: 'The game took too long to load. Please check if the URL is accessible.',
  PHASE2_TIMEOUT: 'Control discovery timed out. The game may not have interactive elements we can detect.',
  PHASE3_TIMEOUT: "The AI agent couldn't make progress playing the game. The game may require specific interactions we couldn't detect.",
  PHASE4_TIMEOUT: 'Evaluation timed out. Please try again in a few minutes.',
  GENERIC_TIMEOUT: 'The operation took too long to complete. Please try again.',
  
  // AI Gateway errors
  AI_GATEWAY_ERROR: 'The AI evaluation service is temporarily unavailable. Please try again in a few minutes.',
  AI_MODEL_UNAVAILABLE: 'The AI model is temporarily unavailable. Please try again in a few minutes.',
  
  // Browser errors
  BROWSER_SESSION_ERROR: 'The browser session encountered an error. The test may need to be restarted.',
  BROWSER_LAUNCH_ERROR: 'Failed to launch browser session. Please try again.',
  SCREENSHOT_ERROR: 'Failed to capture screenshots during test execution.',
  
  // Generic fallback
  GENERIC_ERROR: 'An unexpected error occurred during test execution. Please try again.',
} as const;

// Error pattern regexes for error translation (Story 2.7)
export const ERROR_PATTERNS = [
  { pattern: /404|not found/i, message: ERROR_MESSAGES.GAME_NOT_FOUND },
  { pattern: /net::ERR|network|fetch failed/i, message: ERROR_MESSAGES.NETWORK_ERROR },
  { pattern: /invalid url/i, message: ERROR_MESSAGES.INVALID_URL },
  { pattern: /ai gateway|model|anthropic|openai/i, message: ERROR_MESSAGES.AI_GATEWAY_ERROR },
  { pattern: /browser.*error|puppeteer|playwright/i, message: ERROR_MESSAGES.BROWSER_SESSION_ERROR },
  { pattern: /screenshot/i, message: ERROR_MESSAGES.SCREENSHOT_ERROR },
  { pattern: /timeout|timed out/i, message: ERROR_MESSAGES.GENERIC_TIMEOUT },
] as const;

// HTTP status codes
export const STATUS_CODES = {
  OK: 200,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_REQUEST: 400,
} as const;

// Timeouts (in milliseconds)
export const TIMEOUTS = {
  BROWSER_SESSION: 60000, // 60 seconds
  AI_REQUEST: 30000, // 30 seconds
  DATABASE_QUERY: 5000, // 5 seconds
} as const;

// Database table names (Story 1.2)
export const TABLE_NAMES = {
  TEST_RUNS: 'test_runs',
  EVALUATION_SCORES: 'evaluation_scores',
  TEST_EVENTS: 'test_events',
} as const;

// Test run status enum
export enum TestStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Evaluation metric names enum
export enum MetricName {
  LOAD = 'load',
  VISUAL = 'visual',
  CONTROLS = 'controls',
  PLAYABILITY = 'playability',
  TECHNICAL = 'technical',
  OVERALL = 'overall',
}

// Test pipeline phases enum
export enum Phase {
  PHASE1 = 'phase1',
  PHASE2 = 'phase2',
  PHASE3 = 'phase3',
  PHASE4 = 'phase4',
}

// Test event types enum
export enum EventType {
  STARTED = 'started',
  PROGRESS = 'progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CONTROL_DISCOVERED = 'control_discovered',
  // AI Gateway events (Story 1.5)
  AI_REQUEST_START = 'ai_request_start',
  AI_REQUEST_COMPLETE = 'ai_request_complete',
  AI_REQUEST_FAILED = 'ai_request_failed',
}

// R2 Storage paths and types (Story 1.3)

/**
 * Storage path templates for R2 artifacts
 */
export const STORAGE_PATHS = {
  SCREENSHOT: 'tests/{test_id}/screenshots/{timestamp}-{phase}-{action}.png',
  LOG: 'tests/{test_id}/logs/{log_type}.log',
} as const;

/**
 * Log file types for R2 storage
 */
export enum LogType {
  CONSOLE = 'console',
  NETWORK = 'network',
  AGENT_DECISIONS = 'agent-decisions',
}

/**
 * R2 bucket configuration
 */
export const R2_CONFIG = {
  BUCKET_NAME: 'gameeval-evidence',
  BINDING_NAME: 'EVIDENCE_BUCKET',
  PUBLIC_URL_BASE: 'R2_PUBLIC_URL', // Env var for custom domain
} as const;

