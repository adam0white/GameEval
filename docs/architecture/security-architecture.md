# Security Architecture

**RPC-Only Architecture:**
- **No exposed HTTP APIs**: All external access through Dashboard Worker
- **Internal communication**: RPC service bindings only
- **WebSocket**: Proxied through Worker, no direct DO access

**Firewall for AI (Recommended for Production):**
- Prevent prompt injection attacks
- Block PII leakage in AI interactions
- Configure AI Gateway rules for content filtering

**Environment Secrets:**
- AI Gateway credentials: `CLOUDFLARE_AI_GATEWAY_TOKEN`
- External AI provider keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- Stored in Wrangler secrets, never in code

**Input Validation:**
- Game URLs: HTTP/HTTPS only, validate format
- Input schema: JSON validation, max 10KB size
- Test ID: UUID format validation

**Rate Limiting (Post-MVP):**
- Per-user test submission limits
- WebSocket connection limits per test
- AI Gateway request rate limits
