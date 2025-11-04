# AI Gateway Usage Guide

**Story 1.5: AI Gateway Configuration**

This guide explains how to use the AI Gateway helper functions in the GameEval QA Pipeline.

---

## Overview

All AI requests in this project route through Cloudflare AI Gateway with:

- **Primary Provider**: Workers AI (via `env.AI` binding) - Free, fast, no API keys
- **Fallback Provider**: OpenAI GPT-4o (via authenticated AI Gateway) - Automatic failover
- **Observability**: Cost tracking, caching detection, full request logging
- **Automatic Failover**: Rate limits, timeouts, errors trigger fallback

---

## Quick Start

### Basic Text Request

```typescript
import { callAI } from './shared/helpers/ai-gateway';

const result = await callAI(
  env,
  'What is 2+2? Answer in one sentence.',
  undefined, // no images
  'primary', // try Workers AI first
  testRunId, // for logging (optional)
  { user_id: 'test-user' } // custom metadata (optional)
);

if (result.success) {
  console.log('AI Response:', result.data.text);
  console.log('Model:', result.data.model);
  console.log('Provider:', result.data.provider);
  console.log('Cost:', result.data.cost);
  console.log('Cached:', result.data.cached);
} else {
  console.error('AI Error:', result.error);
}
```

### Vision Request (with Images)

```typescript
import { callAI } from './shared/helpers/ai-gateway';

// Assume you have screenshot as ArrayBuffer
const screenshot: ArrayBuffer = await getScreenshot();

const result = await callAI(
  env,
  'Describe what you see in this screenshot.',
  [screenshot], // array of images
  'primary',
  testRunId,
  { action: 'analyze-screenshot' }
);

if (result.success) {
  console.log('Vision Analysis:', result.data.text);
}
```

### Get AI Costs for Test Run

```typescript
import { getAICosts } from './shared/helpers/ai-gateway';

const costsResult = await getAICosts(env.DB, testRunId);

if (costsResult.success) {
  console.log(`Total AI cost: $${costsResult.data.toFixed(4)}`);
}
```

---

## Architecture

### Request Flow

```
callAI() 
  ↓
Try Workers AI (primary)
  ↓
Success? → Return response
  ↓
Failure? → Try OpenAI via AI Gateway (fallback)
  ↓
Return response or error
```

### Provider Details

**Workers AI (Primary)**
- Models: 
  - Text: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  - Vision: `@cf/meta/llama-3.2-11b-vision-instruct`
- Cost: Free ($0.00)
- Timeout: 30 seconds
- No API keys required (uses `env.AI` binding)

**OpenAI (Fallback)**
- Model: `gpt-4o`
- Cost: ~$2.50/1M input tokens, ~$10/1M output tokens
- Timeout: 45 seconds
- Authenticated via AI Gateway (`ai-gateway-gameeval`)
- Gateway handles caching (15-minute TTL)

---

## Event Logging

All AI requests are automatically logged to the `test_events` table:

1. **Start Event** (`ai_request_start`)
   ```
   Calling Workers AI @cf/meta/llama-3.3-70b-instruct-fp8-fast (42 chars, 0 images)
   ```

2. **Complete Event** (`ai_request_complete`)
   ```
   Workers AI responded (1234ms, $0.00)
   OpenAI responded (2345ms, $0.0023, cached)
   ```

3. **Failed Event** (`ai_request_failed`)
   ```
   Workers AI failed: timeout. Trying OpenAI fallback.
   ```

Metadata includes:
- `provider`: 'workers-ai' | 'openai' | 'anthropic'
- `model`: Model name used
- `latency_ms`: Request latency
- `cost`: Cost in USD
- `cached`: Cache hit/miss
- `tokens`: Input/output token counts
- Custom metadata passed to `callAI()`

---

## Cost Tracking

AI costs are stored in the `test_events` table metadata field as JSON:

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "cost": 0.0023,
  "tokens": {
    "input": 42,
    "output": 150,
    "total": 192
  },
  "cached": false,
  "latency_ms": 2345
}
```

Use `getAICosts()` to aggregate costs per test run:

```typescript
const costsResult = await getAICosts(env.DB, testRunId);
// Returns total cost (e.g., 0.0456)
```

---

## Caching

AI Gateway automatically caches responses for 15 minutes. Cache key includes:
- Prompt text
- Model name
- Images (hash)

Cache hits are indicated in the response:

```typescript
if (result.success && result.data.cached) {
  console.log('Response served from cache!');
}
```

---

## Failover Behavior

Automatic failover triggers on:

1. **Rate Limits** (429 error)
2. **Timeouts** (>30s for primary, >45s for fallback)
3. **Server Errors** (500, 503)

Example flow:

```
callAI() with Workers AI
  ↓
Workers AI: 429 Too Many Requests
  ↓
Log: "Workers AI failed: rate limit. Trying OpenAI fallback."
  ↓
OpenAI via AI Gateway
  ↓
Success!
```

---

## Configuration

### Gateway Name

The authenticated gateway name is hardcoded: `ai-gateway-gameeval`

Located in: `src/shared/helpers/ai-gateway.ts`

```typescript
const AI_GATEWAY_CONFIG = {
  GATEWAY_NAME: 'ai-gateway-gameeval',
  // ...
};
```

### Gateway Endpoint

```
https://gateway.ai.cloudflare.com/v1/ai-gateway-gameeval/openai/chat/completions
```

### Dynamic Routing (Optional)

For advanced routing (A/B testing, budget limits), configure dynamic routes in the Cloudflare dashboard:

1. Go to AI Gateway dashboard
2. Select `ai-gateway-gameeval`
3. Navigate to **Dynamic Routes**
4. Create route with conditions (e.g., user tiers, cost limits)

See: https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/

---

## Testing

### Manual Integration Test

```bash
# Start local dev server
npx wrangler dev

# Test AI Gateway (in another terminal)
# The test file includes manual test function: testAIGateway()
```

Test file: `tests/ai-gateway-test.ts`

Tests:
1. Workers AI text request
2. OpenAI fallback request
3. Cost calculation

---

## Error Handling

All AI functions return `DbResult<T>` for consistent error handling:

```typescript
const result = await callAI(env, prompt);

if (!result.success) {
  // Handle error
  console.error('AI request failed:', result.error);
  // result.error is a user-friendly message (no stack traces)
  return;
}

// Use result.data
const response = result.data;
```

Common errors:
- `"Workers AI request failed: timeout"`
- `"AI Gateway request failed: OpenAI API error (401): Unauthorized"`
- `"Failed to get AI costs: database query error"`

---

## Best Practices

1. **Always pass testRunId** for observability
2. **Use custom metadata** to track request context (user_id, action, etc.)
3. **Check result.success** before using result.data
4. **Monitor costs** with `getAICosts()` after test runs
5. **Leverage caching** by reusing identical prompts
6. **Prefer primary provider** (Workers AI) for cost efficiency

---

## Future Enhancements

- Add Anthropic Claude 3.5 Sonnet fallback
- Implement dynamic routing for advanced use cases
- Add streaming support for long-running requests
- Implement request retry logic with exponential backoff
- Add cost budgets per user/test run with automatic cutoff

---

## References

- **Cloudflare AI Gateway**: https://developers.cloudflare.com/ai-gateway/
- **Workers AI**: https://developers.cloudflare.com/workers-ai/
- **Dynamic Routing**: https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Story 1.5**: `docs/stories/1-5-ai-gateway-configuration.md`

