-- Migration 0003: Create test_events table
-- Story 1.2: D1 Database Schema and Migrations
-- Created: 2025-11-04

CREATE TABLE IF NOT EXISTS test_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_run_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_test_events_test_run_id ON test_events(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_events_timestamp ON test_events(timestamp DESC);

