-- Migration 0004: Add metadata column to test_events table
-- Story 1.5: AI Gateway Configuration
-- Created: 2025-11-04
-- Purpose: Support AI request metadata (model, cost, tokens) in event logging

ALTER TABLE test_events ADD COLUMN metadata TEXT;

