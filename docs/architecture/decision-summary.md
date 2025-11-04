# Decision Summary

| Category | Decision | Version | Affects Epics | Rationale |
| -------- | -------- | ------- | ------------- | --------- |
| Language | TypeScript | 5.x latest | All | Type safety critical for Durable Object state management |
| Runtime | Cloudflare Workers | Latest | All | Serverless, global edge deployment, zero infrastructure |
| Orchestration | Cloudflare Workflows | Latest | Epic 1, 2 | Durable execution with automatic retries and state persistence |
| Agents | Cloudflare Agents SDK (Durable Objects) | Latest | Epic 2 | Stateful TestAgent with WebSocket and built-in SQL |
| Browser | Cloudflare Browser Rendering | Latest | Epic 2 | Serverless browser sessions for autonomous gameplay |
| Automation | Stagehand | Latest | Epic 2 | AI-powered browser control with Computer Use mode |
| AI Gateway | Cloudflare AI Gateway | Latest | Epic 1, 2 | Unified AI routing with caching, failover, observability |
| AI Models | Workers AI (primary), OpenAI/Anthropic (fallback) | Latest | Epic 2 | Cost-effective with automatic frontier model fallback |
| Database | Cloudflare D1 (SQL) | Latest | Epic 1, 3 | Test metadata, results, cross-test queries |
| Agent Storage | Agent SQL (per-DO) | Latest | Epic 2 | Per-test reasoning, decisions, ephemeral state |
| Object Storage | Cloudflare R2 | Latest | Epic 1, 2, 3 | Screenshots, logs, evidence (zero egress) |
| Communication | RPC Service Bindings | Latest | All | Internal-only, no exposed HTTP APIs |
| WebSockets | Agents SDK WebSocket API | Latest | Epic 2, 3 | Real-time progress updates to dashboard |
| Deployment | Wrangler CLI | 4.x latest | All | Direct deploy to prod/staging, no CI/CD overhead |
| Monitoring | Workers Observability | Latest | All | Built-in logging, tracing, error tracking |
