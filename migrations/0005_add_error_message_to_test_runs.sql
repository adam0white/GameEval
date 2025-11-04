-- Migration 0005: Add error_message field to test_runs table
-- Story 2.7: Graceful Error Handling and User-Friendly Messages
-- Stores user-friendly error messages for failed or partially completed tests

ALTER TABLE test_runs ADD COLUMN error_message TEXT;

