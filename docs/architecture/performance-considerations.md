# Performance Considerations

**From NFRs:**

**Concurrency:**
- **Target**: 10+ concurrent tests
- **Implementation**: One TestAgent DO per test, independent execution
- **Scaling**: Durable Objects scale automatically across Cloudflare's network

**Test Duration:**
- **Maximum**: 6 minutes end-to-end (workflow enforced)
- **Phase timeouts**:
  - Phase 1: 30 seconds
  - Phase 2: 45 seconds
  - Phase 3: 1-5 minutes (adaptive)
  - Phase 4: 60 seconds

**Real-Time Updates:**
- **WebSocket rate limit**: Max 1 event per 5 seconds
- **Dashboard polling fallback**: 3-second interval (if WebSocket unavailable)

**Evidence Retention:**
- **Minimum**: 30 days
- **Recommended**: 90 days
- **Implementation**: R2 lifecycle policies (post-MVP)

**Browser Session Reuse:**
- Browser session persists across phases 1-3 (same DO state)
- Reduces overhead, maintains game state
- Single session per TestAgent

**AI Gateway Caching:**
- **Cache TTL**: 15 minutes for identical prompts
- **Cost reduction**: Repeated evaluations served from cache
- **Invalidation**: Automatic after TTL
