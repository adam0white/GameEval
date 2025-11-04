# Epic to Architecture Mapping

| Epic | Primary Components | Storage | Communication |
|------|-------------------|---------|---------------|
| **Epic 1: Core Test Infrastructure** | Dashboard Worker, D1, R2, AI Gateway, Workflow setup | D1 schema, R2 buckets | RPC bindings configuration |
| **Epic 2: AI Test Agent & Browser Automation** | TestAgent Durable Object, Stagehand, Browser Rendering | Agent SQL (per-DO), R2 (evidence) | RPC calls from Workflow to TestAgent DO |
| **Epic 3: Live Dashboard & Real-Time Updates** | Dashboard Worker (UI), WebSocket handler in TestAgent | D1 (queries), R2 (artifact retrieval) | WebSocket (TestAgent → Dashboard), RPC (Dashboard Worker methods) |
| **Epic 4: Polish & Production** | Error handling, monitoring, performance optimization | Retention policies | Enhanced observability |
| **Epic 5: Advanced Features** | Historical analytics, advanced AI models | KV (optional caching) | Additional RPC methods |
