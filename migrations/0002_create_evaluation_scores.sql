-- Migration 0002: Create evaluation_scores table
-- Story 1.2: D1 Database Schema and Migrations
-- Created: 2025-11-04

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_run_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  justification TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Index for efficient querying by test_run_id
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_test_run_id ON evaluation_scores(test_run_id);

