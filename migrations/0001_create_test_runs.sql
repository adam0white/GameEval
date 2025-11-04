-- Migration 0001: Create test_runs table
-- Story 1.2: D1 Database Schema and Migrations
-- Created: 2025-11-04

CREATE TABLE IF NOT EXISTS test_runs (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  input_schema TEXT,
  status TEXT NOT NULL,
  overall_score INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_created_at ON test_runs(created_at DESC);

