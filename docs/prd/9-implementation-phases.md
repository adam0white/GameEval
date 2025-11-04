# 9. Implementation Phases

## Phase 1: Core Pipeline (Days 1-3)
- Set up Cloudflare Workers project
- Implement Workflow for 4-phase test pipeline (orchestration layer)
- Implement TestAgent Durable Object (Agents SDK)
- Integrate Stagehand with Browser Rendering
- Implement Phase 1-2 in TestAgent (Load & Control Discovery)
- Basic evidence capture (screenshots to R2)
- D1 database setup
- Configure AI Gateway with Workers AI or frontier model

**Success Criteria:** Can trigger workflow, TestAgent launches, browser loads game, discovers controls, captures screenshots to R2

## Phase 2: AI Agent & Evaluation (Days 3-4)
- Implement Phase 3 in TestAgent (Gameplay Exploration with Stagehand Computer Use)
- Implement Phase 4 in TestAgent (Evaluation & Scoring with 5 metrics)
- Implement agent retry logic and graceful error handling with user-friendly messages
- Console log and network request capture during gameplay
- Agent decision logging to SQL database
- Input schema integration (optional parameter)

**Success Criteria:** Full 4-phase pipeline completes, TestAgent autonomously explores games, generates scores with justifications, handles failures gracefully

## Phase 3: Dashboard & Real-Time Updates (Days 4-5) **[MVP COMPLETE]**
- Build dashboard Worker (serves UI + handles submissions)
- Implement WebSocket connections to agents for real-time updates
- Test report detail view with inline screenshots and logs
- URL submission triggers workflow
- Rate limiting enforcement (10 tests/hour project-wide)
- **Test with example games** built with the target game engine (DOM-based UI)
- Validate input schema integration with sample games

**Success Criteria:** Users can submit URLs, see live progress via WebSocket, view complete reports inline. System reliably tests DOM-based games with autonomous agent exploration. **MVP FUNCTIONALITY COMPLETE.**

---

## Post-MVP: Phase 4: Polish & Optimization (Days 6+)
- Advanced error handling and edge cases
- Cost optimization (AI Gateway caching, model selection tuning)
- Load testing with 10+ concurrent requests
- UI polish and responsive design
- Documentation and deployment guide

**Success Criteria:** System handles 10 concurrent tests reliably, dashboard is production-ready, comprehensive documentation

## Post-MVP: Phase 5: Advanced Features (Future)
- **Dashboard Enhancements**: Filtering, sorting, search functionality
- **Parallel Testing**: Batch submit multiple URLs, test in parallel
- **Multi-Model Comparison**: Run same test with different AI models, compare results
- **Historical Trends**: Query D1 for game improvement over time
- **Analytics**: Usage tracking, popular game domains, test patterns
- **Advanced Features**: Custom test duration, model selection UI, export reports

---
