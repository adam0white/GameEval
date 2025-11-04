# 10. Design Decisions

**DD-1: Rate Limiting Strategy** ✅ DECIDED
- **Decision:** Deferred to post-MVP; will use Cloudflare's native rate limiting feature
- **Rationale:** Avoid building custom rate limiting that will be replaced; use Cloudflare's proven solution instead
- **Implementation:** Post-MVP (Epic 4); configure via Cloudflare Dashboard or Workers Rate Limiting API

**DD-2: User Interaction Handling** ✅ DECIDED
- **Decision:** Agent autonomously detects and handles games requiring interaction to start
- **Rationale:** Leverages Stagehand's Computer Use mode capabilities, no special cases needed
- **Implementation:** TestAgent in Phase 2 uses visual observation to detect "Play" buttons and click autonomously (FR-2.5)

**DD-3: Control Input Support** ✅ DECIDED
- **Decision:** Support both keyboard and mouse controls; agent decides which to use
- **Rationale:** Stagehand Computer Use mode handles both natively; input schema can guide when provided
- **Implementation:** TestAgent evaluates game context and uses appropriate input method; input schema (FR-1.1.1) provides explicit guidance

**DD-4: AI Model Fallback Strategy** ✅ DECIDED
- **Decision:** Use AI Gateway for automatic failover; frontier models available if Workers AI insufficient
- **Rationale:** Start with Workers AI for cost efficiency, but switch to frontier models (GPT-4o, Claude 3.5) if capability needed
- **Implementation:** AI Gateway configured with fallback chain; all errors fail gracefully with user-friendly messages (FR-2.5)

**DD-5: Dashboard Filtering/Sorting** ✅ DECIDED
- **Decision:** Deferred to post-MVP (Phase 5)
- **Rationale:** Nice-to-have but not essential for core value delivery; simple list view sufficient for MVP
- **Implementation:** Basic list view in Phase 3 MVP; filtering/sorting added in Phase 5 (NG-10)

**DD-6: Analytics and Usage Tracking** ✅ DECIDED
- **Decision:** Skipped for MVP
- **Rationale:** All test data stored in D1; analytics can be added post-launch using existing data
- **Implementation:** D1 schema supports future analytics; deferred to Phase 5 (NG-9)

**DD-7: AI Model Selection** ✅ DECIDED
- **Decision:** Test Workers AI first; switch to frontier models from start if capability insufficient
- **Rationale:** Cost vs capability trade-off; use best model for autonomous agent quality
- **Implementation:** Model selection in Phase 1; AI Gateway provides unified interface regardless of provider

**DD-8: RPC Architecture (No Exposed APIs)** ✅ DECIDED
- **Decision:** All internal communication via RPC service bindings; no exposed HTTP API endpoints
- **Rationale:** Simpler security model, better performance, native Cloudflare pattern for Workers-to-Workers communication
- **Implementation:** Dashboard Worker uses RPC methods only; user input accepted via dashboard UI, all backend communication via service bindings

---
