# AI Gateway Usage Guide

**Story 1.5: AI Gateway Configuration**

This guide explains how to use the AI Gateway helper functions in the GameEval QA Pipeline.

---

## Overview

All AI requests in this project use a multi-tier fallback strategy:

- **Primary Provider**: OpenRouter (GPT-5-mini via `env.OPENROUTER_API_KEY`) - Fast, capable, cost-effective
- **Secondary Provider**: Workers AI (via `env.AI` binding through AI Gateway) - Free, reliable, no API keys
- **Final Fallback**: OpenAI GPT-4o (via authenticated AI Gateway) - Most capable, automatic failover
- **Observability**: Cost tracking, caching detection, full request logging
- **Automatic Failover**: Connection failures, rate limits, timeouts, errors trigger cascading fallback

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

All AI requests flow through AI Gateway for observability:

**TestAgent (Stagehand):**
```
Stagehand initialization
  ↓
Try OpenRouter (if API key available)
  ↓
Success? → Use OpenRouter for observe/act calls
  ↓
Failure? → Fall back to WorkersAIClient with AI Gateway
  ↓
Return response
```

**Direct AI calls (callAI helper):**
```
callAI() 
  ↓
Try OpenRouter (if API key available and text-only)
  ↓
Success? → Return response
  ↓
Failure or vision request? → Try Workers AI via AI Gateway
  ↓
Success? → Return response
  ↓
Failure? → Try OpenAI via AI Gateway (final fallback)
  ↓
Return response or error
```

### Provider Details

**OpenRouter (Primary)**
- Model: `openai/gpt-5-mini`
- Cost: ~$0.15/1M input tokens, ~$0.60/1M output tokens
- Timeout: 30 seconds
- Requires: `OPENROUTER_API_KEY` in environment/secrets
- Use case: Fast, capable, cost-effective for text requests
- Limitations: Text-only (no vision support)

**Workers AI (Secondary)**
- Models: 
  - Text: `@cf/meta/llama-3.3-70b-instruct-fp8-fast`
  - Vision: `@cf/meta/llama-3.2-11b-vision-instruct`
- Cost: Free ($0.00)
- Timeout: 30 seconds
- No API keys required (uses `env.AI` binding)
- Routes through AI Gateway (`ai-gateway-gameeval`) for observability
- Use case: Cost-free fallback, vision requests

**OpenAI (Final Fallback)**
- Model: `gpt-4o`
- Cost: ~$2.50/1M input tokens, ~$10/1M output tokens
- Timeout: 45 seconds
- Authenticated via AI Gateway (`ai-gateway-gameeval`)
- Gateway handles caching (15-minute TTL)
- Use case: Most capable, guaranteed availability

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

1. **Connection Failures** (network errors, API unavailable)
2. **Rate Limits** (429 error)
3. **Timeouts** (>30s for primary/secondary, >45s for final fallback)
4. **Server Errors** (500, 503)
5. **Missing API Keys** (graceful degradation)

Example flow:

```
callAI() with OpenRouter
  ↓
OpenRouter: Connection timeout
  ↓
Log: "OpenRouter failed: timeout. Trying Workers AI fallback."
  ↓
Workers AI via AI Gateway
  ↓
Workers AI: 429 Too Many Requests
  ↓
Log: "Workers AI failed: rate limit. Trying OpenAI fallback."
  ↓
OpenAI via AI Gateway
  ↓
Success!
```

**Stagehand Initialization Fallback:**

```
Stagehand initialization with OpenRouter
  ↓
OpenRouter: Connection failed (missing API key or network error)
  ↓
Log: "OpenRouter connection failed. Falling back to Workers AI."
  ↓
Stagehand re-initialized with WorkersAIClient
  ↓
All observe/act calls now use Workers AI
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

## Stagehand Integration

Stagehand (used in TestAgent for browser automation) uses a multi-tier fallback strategy:

```typescript
// In TestAgent.ts - Primary: OpenRouter (if available)
if (this.env.OPENROUTER_API_KEY) {
  const stagehand = new Stagehand({
    env: 'LOCAL',
    localBrowserLaunchOptions: { cdpUrl: endpointURLString(this.env.BROWSER) },
    modelName: 'openai/gpt-5-mini',
    modelClientOptions: {
      apiKey: this.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    },
    // ... other options
  });
}
// Fallback: Workers AI through AI Gateway
else {
  const llmClient = new WorkersAIClient(this.env.AI, {
    gateway: {
      id: 'ai-gateway-gameeval'
    }
  });
  
  const stagehand = new Stagehand({
    env: 'LOCAL',
    localBrowserLaunchOptions: { cdpUrl: endpointURLString(this.env.BROWSER) },
    llmClient,
    // ... other options
  });
}
```

**Runtime Fallback:**
If OpenRouter initialization or connection fails at runtime, Stagehand automatically re-initializes with Workers AI through AI Gateway, ensuring continuous operation.

All `observe()` and `act()` calls made by Stagehand provide:
- Full observability of Stagehand's AI usage
- Automatic failover on connection failures
- Cost tracking for browser automation AI calls
- Unified monitoring across all AI providers

Reference: https://developers.cloudflare.com/browser-rendering/platform/stagehand/

## Configuration Variables

The AI fallback system requires the following environment variables:

**Required (minimum configuration):**
- `AI` binding - Workers AI for free, local inference
- `DB` binding - D1 database for logging

**Optional (enhanced capability):**
- `OPENROUTER_API_KEY` - Enables primary OpenRouter provider (GPT-5-mini)
  - Local dev: Add to `.dev.vars`
  - Production: Set via `wrangler secret put OPENROUTER_API_KEY`

**For final fallback:**
- OpenAI API key configured in AI Gateway dashboard (automatic, no code changes needed)

**Graceful Degradation:**
The system works with any combination of these variables. If OpenRouter is unavailable, it falls back to Workers AI. If Workers AI fails, it falls back to OpenAI. The system always provides the best available service.

---

## Future Enhancements

- Add Anthropic Claude 3.5 Sonnet as additional fallback tier
- Implement dynamic routing based on request complexity
- Add streaming support for long-running requests
- Implement request retry logic with exponential backoff
- Add cost budgets per user/test run with automatic cutoff

---

## Complete AI Gateway Integration Status

All AI calls in the system use a multi-tier fallback strategy:

### ✅ OpenRouter Calls (Primary Provider)

1. **Stagehand Browser Automation** (Primary)
   - Location: `src/agents/TestAgent.ts`
   - Model: `openai/gpt-5-mini` via OpenRouter API
   - Used by: TestAgent phases (observe/act calls)
   - Fallback: Runtime detection of connection failures triggers Workers AI fallback
   
2. **Direct AI Helper** (`callAI()` → `callOpenRouter()`)
   - Location: `src/shared/helpers/ai-gateway.ts`
   - Model: `openai/gpt-5-mini` via OpenRouter API
   - Used by: Phase 4 evaluation, any direct text-only AI requests
   - Fallback: Automatic fallback to Workers AI on failure

### ✅ Workers AI Calls (Secondary Provider)

3. **Stagehand Browser Automation** (`WorkersAIClient` - Fallback)
   - Location: `src/shared/helpers/workersAIClient.ts`
   - Routes through: Gateway config passed to `this.binding.run()`
   - Used by: TestAgent phases when OpenRouter unavailable
   
4. **Direct AI Helper** (`callAI()` → `callWorkersAI()`)
   - Location: `src/shared/helpers/ai-gateway.ts`
   - Routes through: Gateway config passed to `env.AI.run()`
   - Used by: Vision requests, OpenRouter fallback, Phase 4 evaluation

### ✅ OpenAI Calls (Final Fallback Provider)

5. **OpenAI Final Fallback** (`callAIGatewayOpenAI()`)
   - Location: `src/shared/helpers/ai-gateway.ts`
   - Routes through: `https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/openai/...`
   - Used by: Automatic final fallback when Workers AI fails

### Gateway Configuration

**Gateway Name**: `ai-gateway-gameeval`  
**Account ID**: `a20259cba74e506296745f9c67c1f3bc`

All requests include provider metadata in logs for tracking:
```json
{
  "provider": "openrouter",
  "model": "openai/gpt-5-mini",
  "latency_ms": 854,
  "cost": 0.00012
}
```

Or for Workers AI:
```json
{
  "provider": "workers-ai",
  "model": "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "gateway": "ai-gateway-gameeval",
  "latency_ms": 1234,
  "cost": 0
}
```

## References

- **Cloudflare AI Gateway**: https://developers.cloudflare.com/ai-gateway/
- **Stagehand with AI Gateway**: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
- **Workers AI**: https://developers.cloudflare.com/workers-ai/
- **Dynamic Routing**: https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/
- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Story 1.5**: `docs/stories/1-5-ai-gateway-configuration.md`

