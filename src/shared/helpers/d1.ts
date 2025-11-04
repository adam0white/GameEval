/**
 * D1 Database Helper Functions
 * Story 1.2: D1 Database Schema and Migrations
 * 
 * Helper functions for interacting with the D1 database using modern Cloudflare patterns.
 * All functions return DbResult<T> for consistent error handling.
 */

import type { TestRun, EvaluationScore, TestEvent, DbResult } from '../types';
import { TABLE_NAMES } from '../constants';

/**
 * Create a new test run in the database
 * @param db - D1Database instance from env.DB
 * @param id - UUID for the test run (generated with crypto.randomUUID())
 * @param url - URL of the game to test
 * @param inputSchema - Optional JSON schema for test guidance
 * @returns DbResult indicating success or error
 */
export async function createTestRun(
  db: D1Database,
  id: string,
  url: string,
  inputSchema?: string
): Promise<DbResult<void>> {
  try {
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO ${TABLE_NAMES.TEST_RUNS} 
        (id, url, input_schema, status, overall_score, created_at, updated_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, url, inputSchema || null, 'queued', null, now, now, null)
      .run();

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create test run: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get a test run by ID
 * @param db - D1Database instance from env.DB
 * @param id - UUID of the test run
 * @returns DbResult with TestRun or null if not found
 */
export async function getTestById(
  db: D1Database,
  id: string
): Promise<DbResult<TestRun | null>> {
  try {
    const result = await db
      .prepare(`SELECT * FROM ${TABLE_NAMES.TEST_RUNS} WHERE id = ?`)
      .bind(id)
      .first<TestRun>();

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get test run: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * List recent test runs ordered by creation time
 * @param db - D1Database instance from env.DB
 * @param limit - Maximum number of tests to return
 * @returns DbResult with array of TestRun objects
 */
export async function listRecentTests(
  db: D1Database,
  limit: number
): Promise<DbResult<TestRun[]>> {
  try {
    const result = await db
      .prepare(
        `SELECT * FROM ${TABLE_NAMES.TEST_RUNS} 
        ORDER BY created_at DESC 
        LIMIT ?`
      )
      .bind(limit)
      .all<TestRun>();

    return { success: true, data: result.results || [] };
  } catch (error) {
    return {
      success: false,
      error: `Failed to list recent tests: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update test run status
 * @param db - D1Database instance from env.DB
 * @param id - UUID of the test run
 * @param status - New status value
 * @returns DbResult indicating success or error
 */
export async function updateTestStatus(
  db: D1Database,
  id: string,
  status: string
): Promise<DbResult<void>> {
  try {
    const now = Date.now();
    const completedAt = status === 'completed' || status === 'failed' ? now : null;
    
    await db
      .prepare(
        `UPDATE ${TABLE_NAMES.TEST_RUNS} 
        SET status = ?, updated_at = ?, completed_at = ?
        WHERE id = ?`
      )
      .bind(status, now, completedAt, id)
      .run();

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update test status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Insert a test event (log entry during test execution)
 * @param db - D1Database instance from env.DB
 * @param testRunId - UUID of the test run
 * @param phase - Test phase (phase1, phase2, phase3, phase4)
 * @param eventType - Type of event (started, progress, completed, failed, etc.)
 * @param description - Human-readable event description
 * @param metadata - Optional JSON string for additional event metadata (AI requests, etc.)
 * @returns DbResult indicating success or error
 */
export async function insertTestEvent(
  db: D1Database,
  testRunId: string,
  phase: string,
  eventType: string,
  description: string,
  metadata?: string
): Promise<DbResult<void>> {
  try {
    const timestamp = Date.now();
    
    // If metadata is provided, use the 6-parameter query; otherwise use 5-parameter
    if (metadata !== undefined) {
      await db
        .prepare(
          `INSERT INTO ${TABLE_NAMES.TEST_EVENTS} 
          (test_run_id, phase, event_type, description, timestamp, metadata)
          VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(testRunId, phase, eventType, description, timestamp, metadata)
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO ${TABLE_NAMES.TEST_EVENTS} 
          (test_run_id, phase, event_type, description, timestamp)
          VALUES (?, ?, ?, ?, ?)`
        )
        .bind(testRunId, phase, eventType, description, timestamp)
        .run();
    }

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: `Failed to insert test event: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get all events for a test run
 * @param db - D1Database instance from env.DB
 * @param testRunId - UUID of the test run
 * @returns DbResult with array of TestEvent objects ordered by timestamp
 */
export async function getTestEvents(
  db: D1Database,
  testRunId: string
): Promise<DbResult<TestEvent[]>> {
  try {
    const result = await db
      .prepare(
        `SELECT * FROM ${TABLE_NAMES.TEST_EVENTS} 
        WHERE test_run_id = ? 
        ORDER BY timestamp ASC`
      )
      .bind(testRunId)
      .all<TestEvent>();

    return { success: true, data: result.results || [] };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get test events: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Insert an evaluation score for a test run
 * @param db - D1Database instance from env.DB
 * @param testRunId - UUID of the test run
 * @param metricName - Metric being scored (load, visual, controls, etc.)
 * @param score - Score value (0-100)
 * @param justification - Explanation for the score
 * @returns DbResult indicating success or error
 */
export async function insertEvaluationScore(
  db: D1Database,
  testRunId: string,
  metricName: string,
  score: number,
  justification: string
): Promise<DbResult<void>> {
  try {
    const createdAt = Date.now();
    
    await db
      .prepare(
        `INSERT INTO ${TABLE_NAMES.EVALUATION_SCORES} 
        (test_run_id, metric_name, score, justification, created_at)
        VALUES (?, ?, ?, ?, ?)`
      )
      .bind(testRunId, metricName, score, justification, createdAt)
      .run();

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: `Failed to insert evaluation score: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get all evaluation scores for a test run
 * @param db - D1Database instance from env.DB
 * @param testRunId - UUID of the test run
 * @returns DbResult with array of EvaluationScore objects
 */
export async function getEvaluationScores(
  db: D1Database,
  testRunId: string
): Promise<DbResult<EvaluationScore[]>> {
  try {
    const result = await db
      .prepare(
        `SELECT * FROM ${TABLE_NAMES.EVALUATION_SCORES} 
        WHERE test_run_id = ?
        ORDER BY created_at ASC`
      )
      .bind(testRunId)
      .all<EvaluationScore>();

    return { success: true, data: result.results || [] };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get evaluation scores: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

