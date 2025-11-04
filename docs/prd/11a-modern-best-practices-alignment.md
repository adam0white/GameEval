# 11a. Modern Best Practices Alignment

**Composable AI Architecture:**
- Flexible model selection: Workers AI for cost efficiency, frontier models for capability
- AI Gateway provides unified interface across all providers
- Dynamic routing and automatic fallback ensure reliability

**Security-First Approach:**
- Firewall for AI prevents prompt injection and PII leakage (post-MVP, Story 4.6)
- RPC-only architecture minimizes attack surface
- No exposed API endpoints; all internal communication via service bindings

**Performance Optimization:**
- Workers KV for high-volume, low-latency caching (post-MVP, Story 5.5)
- AI Gateway caching reduces latency and costs
- R2 zero egress fees for evidence storage
- D1 for fast queryable metadata

**Modern Cloudflare Patterns:**
- Agents SDK with Durable Objects for stateful AI agents
- Workflows for orchestration with automatic retries
- Built-in SQL storage per agent for ephemeral reasoning
- WebSocket via service bindings for real-time updates

**References:**
- AI Gateway: https://developers.cloudflare.com/ai-gateway/
- Agents SDK: https://developers.cloudflare.com/agents/
- Stagehand: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
- Workers KV: https://developers.cloudflare.com/kv/
- Reference Architectures: https://developers.cloudflare.com/reference-architecture/

---
