# Implementation Guidance

## Getting Started

**Start with Epic 1** - Multiple stories can run in parallel after Story 1.1:
- Core path: 1.1 → 1.4 (Workflow setup - needs 1.2 for D1)
- Parallel track: 1.1 → 1.2 (Database)
- Parallel track: 1.1 → 1.3 (R2 storage)
- Parallel track: 1.1 → 1.5 (AI Gateway)

**Recommended Agent Allocation for Parallel Work:**
- Agent A: Stories 1.1 → 1.4 (core orchestration path)
- Agent B: Stories 1.2 (database layer)
- Agent C: Stories 1.3 → 1.5 (storage and AI path)

## Critical Success Factors

**Epic 1 Foundation:**
- Don't skip Story 1.1 - everything depends on it
- Test each service binding independently before moving to Epic 2
- Use Wrangler dev for local testing before deploying

**Epic 2 Agent Development:**
- Stories are mostly sequential due to phase dependencies
- Test each phase independently with mock data before integration
- Computer Use mode (Story 2.5) is the most complex - allocate extra time
- Error handling (Story 2.7) should be implemented alongside other stories, not at the end

**Epic 3 MVP Completion:**
- Story 3.5 (example game testing) is critical validation - don't skip
- WebSocket integration (Story 3.3) can be tricky - test thoroughly
- Story 3.6 (deployment) should happen only after 3.5 passes

## Risk Mitigation

**Watch out for:**
- **Stagehand integration complexity:** Computer Use mode may require prompt tuning
- **AI model capability:** Workers AI may not be sufficient - be ready to switch to frontier models
- **Browser Rendering timeouts:** 6-minute workflow limit is tight for some games
- **WebSocket connection stability:** Implement reconnection logic early

**Mitigation strategies:**
- Test Stagehand early with sample games (before Story 2.5)
- Configure AI Gateway with fallback from the start (Story 1.5)
- Monitor workflow execution times and optimize Phase 3
- Use simple polling as WebSocket fallback

## Testing Checkpoints

**After Epic 1:** Can trigger workflow, workflow creates D1 entry, R2 storage accessible
**After Story 2.3:** Browser loads game, screenshot saved to R2
**After Story 2.5:** Agent autonomously plays a simple game
**After Epic 2:** Full test completes end-to-end with quality scores
**After Epic 3:** Dashboard works, WebSocket streams updates, reports display correctly

## MVP Success Metrics

You'll know the MVP is complete when:
- ✅ Can submit any DOM-based game URL and get results within 6 minutes
- ✅ TestAgent autonomously discovers controls and plays games
- ✅ Quality scores are reasonable and justifications make sense
- ✅ Dashboard shows live progress via WebSocket
- ✅ Test reports are comprehensive with screenshots and logs
- ✅ System handles 5+ concurrent tests without issues
- ✅ All communication uses RPC service bindings (no exposed API endpoints)

---
