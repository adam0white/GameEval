/**
 * Application constants for the GameEval QA Pipeline
 */

// Error messages
export const ERROR_MESSAGES = {
  NOT_FOUND: 'Not Found',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  INVALID_REQUEST: 'Invalid Request',
} as const;

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

