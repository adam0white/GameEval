# Data Architecture

## D1 Database Schema

**Table: `test_runs`**
```sql
CREATE TABLE test_runs (
  id TEXT PRIMARY KEY,              -- UUID
  url TEXT NOT NULL,
  input_schema TEXT,                -- JSON or NULL
  status TEXT NOT NULL,             -- 'queued' | 'running' | 'completed' | 'failed'
  overall_score INTEGER,            -- 0-100 or NULL
  created_at INTEGER NOT NULL,      -- Unix timestamp
  updated_at INTEGER NOT NULL,
  completed_at INTEGER              -- Unix timestamp or NULL
);

CREATE INDEX idx_test_runs_status ON test_runs(status);
CREATE INDEX idx_test_runs_created_at ON test_runs(created_at DESC);
```

**Table: `evaluation_scores`**
```sql
CREATE TABLE evaluation_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_run_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,        -- 'load' | 'visual' | 'controls' | 'playability' | 'technical' | 'overall'
  score INTEGER NOT NULL,            -- 0-100
  justification TEXT NOT NULL,       -- 2-3 sentence explanation
  created_at INTEGER NOT NULL,
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id)
);

CREATE INDEX idx_evaluation_scores_test_run_id ON evaluation_scores(test_run_id);
```

**Table: `test_events`**
```sql
CREATE TABLE test_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_run_id TEXT NOT NULL,
  phase TEXT NOT NULL,              -- 'phase1' | 'phase2' | 'phase3' | 'phase4'
  event_type TEXT NOT NULL,         -- 'started' | 'progress' | 'completed' | 'failed' | 'control_discovered' | etc.
  description TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (test_run_id) REFERENCES test_runs(id)
);

CREATE INDEX idx_test_events_test_run_id ON test_events(test_run_id);
CREATE INDEX idx_test_events_timestamp ON test_events(timestamp DESC);
```

## Agent SQL Storage (Per-DO)

**Each TestAgent maintains its own SQL database:**

```sql
-- agent_actions table
CREATE TABLE agent_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  action TEXT NOT NULL,              -- 'click', 'type', 'scroll', 'wait', etc.
  reasoning TEXT NOT NULL,           -- Why the agent chose this action
  outcome TEXT                       -- Result of the action
);

-- control_discoveries table
CREATE TABLE control_discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  element_selector TEXT NOT NULL,
  action_type TEXT NOT NULL,        -- 'click', 'keyboard', 'drag'
  confidence REAL NOT NULL,          -- 0.0 - 1.0
  discovered_at INTEGER NOT NULL
);

-- decision_log table
CREATE TABLE decision_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  decision TEXT NOT NULL,            -- What the agent decided to do
  context TEXT NOT NULL,             -- Information used to make decision
  ai_model TEXT                      -- Model used for this decision
);
```

## R2 Storage Structure

```
gameeval-evidence/
├── tests/
│   ├── {test-uuid-1}/
│   │   ├── screenshots/
│   │   │   ├── 1699104800000-phase1-initial-load.png
│   │   │   ├── 1699104830000-phase2-controls.png
│   │   │   ├── 1699104850000-phase3-click-play-button.png
│   │   │   ├── 1699104870000-phase3-gameplay-wasd.png
│   │   │   └── ...
│   │   └── logs/
│   │       ├── console.log
│   │       ├── network.log
│   │       └── agent-decisions.log
│   ├── {test-uuid-2}/
│   │   └── ...
```

**Object Metadata:**
- **Content-Type**: `image/png` for screenshots, `text/plain` for logs
- **Access**: Public read for dashboard viewing
- **Retention**: 30 days minimum (lifecycle policy post-MVP)

## Input Schema Format (Optional)

```json
{
  "controls": {
    "movement": ["W", "A", "S", "D"],
    "actions": ["Space", "Click"],
    "special": ["E", "Q"]
  },
  "objectives": "Collect items and reach the goal",
  "ui_elements": ["score display", "health bar", "inventory"]
}
```

**Usage:** Provided to TestAgent to guide Phase 2 control discovery and Phase 3 exploration.
