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

