# 7. Design Considerations

## 7.1 Dashboard UI/UX (Served by Workers)

**Architecture:**
- Single Worker serves both UI and handles URL submissions
- HTML/CSS/JS delivered directly from Worker
- WebSocket connection to agents for real-time updates (built into Agents SDK)
- No separate API endpoints needed

**Layout:**
- Header: "GameEval QA Pipeline" + URL submission form
- Main content: Live-updating list of test runs (newest first)
- Each test run card:
  - Game URL with status badge (Queued / Running / Completed / Failed)
  - Live progress indicator showing current phase
  - Quality score when complete (color-coded)
  - Click to expand detailed report inline

**Test Run Detail (Inline Expansion):**
- Large quality score with breakdown
- Individual metric scores with AI justifications
- Timeline of agent actions with timestamps
- Screenshot gallery with captions
- Expandable console logs / errors

**Real-Time Updates:**
- WebSocket connection to agents provides live phase updates
- Progress bar animates as agent completes actions
- Toast notifications on test completion
- No manual refresh needed

## 7.2 Visual Design

Follow Cloudflare design patterns:
- Clean, minimal interface
- Orange accents for primary actions
- Monospace for URLs and technical data
- Responsive layout (mobile-friendly)

---
