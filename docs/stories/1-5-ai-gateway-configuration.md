# Story 1.5: AI Gateway Configuration

**Story ID:** 1.5  
**Epic:** Epic 1 - Core Test Infrastructure  
**Status:** ready-for-dev  
**Created:** 2025-11-04  

---

## User Story

**As a** developer,  
**I want** AI Gateway configured with Workers AI and frontier model fallback,  
**So that** all AI requests route through unified gateway with observability.

---

## Business Context

Story 1.5 establishes the AI infrastructure layer that routes all AI requests through Cloudflare AI Gateway. This builds on the project foundation from Story 1.1, providing unified observability, cost tracking, automatic failover, and caching for all AI interactions.

The AI Gateway serves as the central routing layer for TestAgent decisions and evaluation logic, ensuring reliability through automatic failover from Workers AI to frontier models (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet). Without this gateway, AI calls would be fragmented across providers with no unified observability or cost tracking.

**Value:** Enables reliable, observable, and cost-effective AI usage with automatic failover and caching, unblocking TestAgent AI implementation in Epic 2.

[Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.5]  
[Source: docs/architecture/technology-stack-details.md, AI & LLM section]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-004]

---

## Acceptance Criteria

1. **AI Gateway account and endpoint created**: AI Gateway configured in Cloudflare dashboard with endpoint URL documented
2. **Primary provider configured**: Workers AI (Llama Vision or Gemini Flash) set as primary for vision tasks via `env.AI` binding
3. **Fallback provider configured**: OpenAI GPT-4o or Anthropic Claude 3.5 Sonnet configured for automatic failover through AI Gateway
4. **Automatic failover enabled**: Gateway configured to route to fallback provider if primary fails (rate limits, errors, timeouts)
5. **Request caching enabled**: 15-minute TTL for identical prompts to reduce costs and improve latency
6. **Cost tracking enabled**: Gateway configured to track AI spend per test run with cost metadata available via API
7. **Helper function `callAI()` implemented**: `callAI(prompt, images, modelPreference)` routes through gateway with proper error handling
8. **Helper function `getAICosts()` implemented**: `getAICosts(testRunId)` returns total AI spend for test from D1 database
9. **AI request logging**: All AI requests logged to test_events table with model used, prompt length, token usage, and cost

[Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.5 Acceptance Criteria]  
[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-004]  
[Source: docs/prd/6-technical-architecture.md, AI/LLM section]

---

## Tasks / Subtasks

### Task 1: Create AI Gateway Account and Endpoint (AC: 1)

- [ ] Create AI Gateway in Cloudflare dashboard
- [ ] Note gateway endpoint URL: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/...`
- [ ] Configure gateway name (e.g., `gameeval-ai-gateway`)
- [ ] Document account ID and gateway name for use in code
- [ ] Verify gateway is accessible and ready for configuration

### Task 2: Configure Primary Provider - Workers AI (AC: 2)

- [ ] Verify `[ai]` binding in wrangler.toml is correctly configured (already exists)
- [ ] Test Workers AI binding with simple vision model call (Llama Vision or Gemini Flash)
- [ ] Document model names for vision tasks:
  - `@cf/meta/llama-3.2-11b-vision-instruct` (Llama Vision)
  - `@cf/google/gemini-2.0-flash-exp` (Gemini Flash)
- [ ] Verify model supports image inputs for screenshot analysis
- [ ] Test basic Workers AI call from Worker code

### Task 3: Configure Fallback Provider via AI Gateway (AC: 3)

- [ ] Add OpenAI API key to Workers secrets: `wrangler secret put AI_GATEWAY_OPENAI_API_KEY`
- [ ] Add Anthropic API key to Workers secrets: `wrangler secret put AI_GATEWAY_ANTHROPIC_API_KEY`
- [ ] Configure AI Gateway to route to OpenAI GPT-4o endpoint
- [ ] Configure AI Gateway to route to Anthropic Claude 3.5 Sonnet endpoint
- [ ] Test fallback routing manually (simulate primary failure)
- [ ] Document fallback routing logic in code comments

### Task 4: Enable Automatic Failover Configuration (AC: 4)

- [ ] Configure AI Gateway failover policy: route to fallback on primary failure
- [ ] Test failover scenarios:
  - Primary rate limit (429 error)
  - Primary timeout (>30s)
  - Primary error (500/503)
- [ ] Verify fallback activates automatically
- [ ] Log which provider was used in test_events for debugging
- [ ] Document failover behavior in code

### Task 5: Enable Request Caching (AC: 5)

- [ ] Configure AI Gateway caching: 15-minute TTL for identical prompts
- [ ] Test caching behavior: identical prompts return cached response
- [ ] Verify cache key includes: prompt + model + images hash
- [ ] Document cache behavior in helper function comments
- [ ] Test cache invalidation after 15 minutes

### Task 6: Enable Cost Tracking (AC: 6)

- [ ] Configure AI Gateway to track costs per request
- [ ] Verify cost metadata available in gateway API responses
- [ ] Extract cost information from gateway responses
- [ ] Store cost per request in D1 database (add ai_costs table if needed, or use test_events metadata)
- [ ] Test cost tracking with multiple AI calls

### Task 7: Implement `callAI()` Helper Function (AC: 7)

- [ ] Create `src/shared/helpers/ai-gateway.ts` with `callAI()` function
- [ ] Function signature: `callAI(prompt: string, images?: ArrayBuffer[], modelPreference?: 'primary' | 'fallback'): Promise<AIResponse>`
- [ ] Implement routing logic:
  - Try Workers AI first (via `env.AI` binding)
  - On failure, route to AI Gateway with fallback provider
- [ ] Handle image inputs (base64 encode for vision models)
- [ ] Implement error handling with user-friendly messages
- [ ] Return standardized response: `{ text: string, model: string, cost?: number, cached?: boolean }`
- [ ] Log request to test_events table (if testRunId available)
- [ ] Add TypeScript types for AIResponse and model preferences

### Task 8: Implement `getAICosts()` Helper Function (AC: 8)

- [ ] Create function in `src/shared/helpers/ai-gateway.ts`: `getAICosts(testRunId: string): Promise<number>`
- [ ] Query D1 database for all AI request events for test run
- [ ] Extract cost from test_events metadata or query separate ai_costs table
- [ ] Sum costs and return total
- [ ] Handle missing costs gracefully (return 0 if no data)
- [ ] Add unit tests for cost calculation

### Task 9: Implement AI Request Logging (AC: 9)

- [ ] Extend `insertTestEvent()` to accept optional metadata (model, cost, tokens)
- [ ] Log AI request before calling AI provider:
  - event_type: `ai_request_start`
  - description: `"Calling ${model} with prompt (${promptLength} chars, ${imageCount} images)"`
- [ ] Log AI response after receiving:
  - event_type: `ai_request_complete`
  - description: `"${model} responded (${tokenCount} tokens, $${cost})"`
  - Include model name, token usage, cost in metadata
- [ ] Log AI failures:
  - event_type: `ai_request_failed`
  - description: `"${model} failed: ${errorMessage}, trying fallback"`
- [ ] Update TestEvent type to include optional metadata field (JSON string)

---

## Dev Notes

### Relevant Architecture Patterns and Constraints

- **ADR-004**: All AI requests MUST route through AI Gateway, not directly to providers
- **Workers AI Binding**: Already configured in wrangler.toml as `[ai]` binding = "AI"
- **AI Gateway Endpoint**: `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/openai` or `/anthropic`
- **Secrets Management**: Store API keys in Workers secrets, not in code or environment variables
- **Cost Tracking**: Store costs in D1, either in test_events metadata or separate ai_costs table
- **Caching**: AI Gateway handles caching automatically (15-min TTL)
- **Failover**: Automatic routing to fallback if primary fails (rate limits, errors, timeouts)

[Source: docs/architecture/architecture-decision-records-adrs.md, ADR-004]  
[Source: docs/architecture/technology-stack-details.md, AI & LLM section]

### Source Tree Components to Touch

- **`src/shared/helpers/ai-gateway.ts`**: Main implementation file (currently placeholder)
  - Implement `callAI()` function
  - Implement `getAICosts()` function
  - Add TypeScript types for AI requests/responses
- **`src/shared/types.ts`**: Add AI-related types
  - `AIResponse` interface
  - `ModelPreference` type
  - `AICostMetadata` interface
- **`wrangler.toml`**: Verify AI binding configuration (already exists)
- **`src/shared/helpers/d1.ts`**: May need to extend `insertTestEvent()` for metadata support
- **`migrations/`**: May need migration for ai_costs table if storing separately from test_events

### Testing Standards Summary

- **Unit Tests**: Test `callAI()` with mock Workers AI and AI Gateway responses
- **Integration Tests**: Test actual AI calls to Workers AI (primary) and verify fallback routing
- **Error Handling**: Test all failure scenarios (rate limits, timeouts, errors)
- **Cost Tracking**: Verify costs are correctly extracted and stored
- **Caching**: Test that identical prompts return cached responses
- **Logging**: Verify all AI requests are logged to test_events table

### Project Structure Notes

- Follow existing helper pattern: `src/shared/helpers/ai-gateway.ts`
- Use `DbResult<T>` pattern for database operations (consistent with d1.ts)
- Store secrets via `wrangler secret put` (not in code)
- Type safety: All functions should have proper TypeScript types
- Error messages: User-friendly, no stack traces

### References

- **AI Gateway Documentation**: https://developers.cloudflare.com/ai-gateway/
- **Workers AI Documentation**: https://developers.cloudflare.com/workers-ai/
- **OpenAI API via Gateway**: https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/openai
- **Anthropic API via Gateway**: https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/anthropic
- **Workers AI Vision Models**: @cf/meta/llama-3.2-11b-vision-instruct, @cf/google/gemini-2.0-flash-exp
- [Source: docs/epics/epic-1-core-test-infrastructure.md, Story 1.5 Technical Notes]
- [Source: docs/prd/6-technical-architecture.md, AI/LLM section]

---

## Dev Agent Record

### Context Reference

- docs/stories/1-5-ai-gateway-configuration.context.xml

### Agent Model Used

<!-- To be filled by dev agent -->

### Debug Log References

<!-- Links to relevant debug logs during implementation -->

### Completion Notes List

<!-- Developer notes about implementation decisions, gotchas, or deviations from story -->

### File List

<!-- List of files created/modified during implementation -->

