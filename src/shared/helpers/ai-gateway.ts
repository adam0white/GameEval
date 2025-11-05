/**
 * AI Gateway Helper Functions
 * Story 1.5: AI Gateway Configuration
 * 
 * Routes all AI requests through Cloudflare AI Gateway with:
 * - Primary: Workers AI (via env.AI binding)
 * - Fallback: OpenAI via authenticated AI Gateway
 * - Observability: Cost tracking, caching, metadata
 * - Automatic failover on rate limits, timeouts, errors
 */

import type { DbResult, AIResponse, AIMetadata, ModelPreference, TokenUsage } from '../types';
import { EventType } from '../constants';
import { insertTestEvent } from './d1';

// AI Gateway configuration
const AI_GATEWAY_CONFIG = {
  // Cloudflare account ID (from wrangler.toml)
  ACCOUNT_ID: 'a20259cba74e506296745f9c67c1f3bc',
  // Authenticated gateway name (already configured in Cloudflare dashboard)
  GATEWAY_NAME: 'ai-gateway-gameeval',
  // Default models
  WORKERS_AI_VISION_MODEL: '@cf/meta/llama-3.2-11b-vision-instruct',
  WORKERS_AI_TEXT_MODEL: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  OPENAI_MODEL: 'gpt-4o',
  // Timeouts
  PRIMARY_TIMEOUT_MS: 30000,
  FALLBACK_TIMEOUT_MS: 45000,
} as const;

/**
 * Call AI model with automatic routing and fallback
 * 
 * Flow:
 * 1. Try Workers AI (primary) via env.AI binding
 * 2. On failure (rate limit, timeout, error), route to AI Gateway (OpenAI fallback)
 * 3. Log all requests to test_events with metadata
 * 4. Return standardized AIResponse with cost and performance data
 * 
 * @param env - Cloudflare Worker environment bindings
 * @param prompt - Text prompt for the AI model
 * @param images - Optional image buffers for vision models
 * @param modelPreference - Force primary or fallback provider
 * @param testRunId - Optional test run ID for event logging
 * @param customMetadata - Optional custom metadata for observability
 * @returns DbResult with AIResponse or error
 */
export async function callAI(
  env: {
    AI: Ai;
    DB: D1Database;
  },
  prompt: string,
  images?: ArrayBuffer[],
  modelPreference: ModelPreference = 'primary',
  testRunId?: string,
  customMetadata?: Record<string, unknown>
): Promise<DbResult<AIResponse>> {
  const startTime = Date.now();
  const hasImages = images && images.length > 0;
  
  // Try primary provider (Workers AI) first unless fallback is explicitly requested
  if (modelPreference === 'primary') {
    const primaryResult = await callWorkersAI(
      env,
      prompt,
      images,
      startTime,
      testRunId,
      customMetadata
    );
    
    if (primaryResult.success) {
      return primaryResult;
    }
    
    // Primary failed - log and try fallback
    if (testRunId) {
      const errorMsg = primaryResult.success ? 'Unknown error' : primaryResult.error;
      await insertTestEvent(
        env.DB,
        testRunId,
        'ai',
        EventType.AI_REQUEST_FAILED,
        `Workers AI failed: ${errorMsg}. Trying OpenAI fallback.`,
        JSON.stringify({
          provider: 'workers-ai',
          error: errorMsg,
          ...customMetadata,
        })
      );
    }
  }
  
  // Try fallback provider (OpenAI via AI Gateway)
  const fallbackResult = await callAIGatewayOpenAI(
    env,
    prompt,
    images,
    startTime,
    testRunId,
    customMetadata
  );
  
  return fallbackResult;
}

/**
 * Call Workers AI (primary provider) using env.AI binding
 * @internal
 */
async function callWorkersAI(
  env: { AI: Ai; DB: D1Database },
  prompt: string,
  images: ArrayBuffer[] | undefined,
  startTime: number,
  testRunId?: string,
  customMetadata?: Record<string, unknown>
): Promise<DbResult<AIResponse>> {
  const hasImages = images && images.length > 0;
  const model = hasImages
    ? AI_GATEWAY_CONFIG.WORKERS_AI_VISION_MODEL
    : AI_GATEWAY_CONFIG.WORKERS_AI_TEXT_MODEL;
  
  try {
    // Log AI request start
    if (testRunId) {
      await insertTestEvent(
        env.DB,
        testRunId,
        'ai',
        EventType.AI_REQUEST_START,
        `Calling Workers AI ${model} via AI Gateway (${prompt.length} chars, ${images?.length || 0} images)`,
        JSON.stringify({
          provider: 'workers-ai',
          model,
          prompt_length: prompt.length,
          image_count: images?.length || 0,
          gateway: AI_GATEWAY_CONFIG.GATEWAY_NAME,
          ...customMetadata,
        })
      );
    }
    
    // Prepare request options
    const requestOptions: Record<string, unknown> = {
      prompt,
    };
    
    // Add images if provided (vision model)
    if (hasImages && images) {
      // Workers AI accepts images as base64 strings
      requestOptions.image = images.map(buffer => 
        arrayBufferToBase64(buffer)
      );
    }
    
    // Call Workers AI with timeout, routing through AI Gateway
    // Reference: https://developers.cloudflare.com/ai-gateway/
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Workers AI timeout')), AI_GATEWAY_CONFIG.PRIMARY_TIMEOUT_MS);
    });
    
    // Route through AI Gateway for observability, caching, and cost tracking
    const aiPromise = env.AI.run(model, requestOptions, {
      gateway: {
        id: AI_GATEWAY_CONFIG.GATEWAY_NAME
      }
    });
    const result = await Promise.race([aiPromise, timeoutPromise]) as AiTextGenerationOutput;
    
    const latency = Date.now() - startTime;
    
    // Workers AI is free - no cost tracking needed
    const response: AIResponse = {
      text: result.response || '',
      model,
      provider: 'workers-ai',
      cost: 0,
      cached: false,
      tokens: {
        total: 0, // Workers AI doesn't return token counts
      },
      metadata: {
        model,
        provider: 'workers-ai',
        latency_ms: latency,
        test_run_id: testRunId,
        ...customMetadata,
      },
    };
    
    // Log AI request success
    if (testRunId) {
      await insertTestEvent(
        env.DB,
        testRunId,
        'ai',
        EventType.AI_REQUEST_COMPLETE,
        `Workers AI via AI Gateway responded (${latency}ms, $0.00)`,
        JSON.stringify({
          provider: 'workers-ai',
          model,
          latency_ms: latency,
          cost: 0,
          gateway: AI_GATEWAY_CONFIG.GATEWAY_NAME,
          ...customMetadata,
        })
      );
    }
    
    return { success: true, data: response };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Workers AI request failed: ${errorMessage}`,
    };
  }
}

/**
 * Call OpenAI via AI Gateway (fallback provider)
 * Uses authenticated gateway with OpenAI key already configured
 * @internal
 */
async function callAIGatewayOpenAI(
  env: { DB: D1Database },
  prompt: string,
  images: ArrayBuffer[] | undefined,
  startTime: number,
  testRunId?: string,
  customMetadata?: Record<string, unknown>
): Promise<DbResult<AIResponse>> {
  const hasImages = images && images.length > 0;
  const model = AI_GATEWAY_CONFIG.OPENAI_MODEL;
  
  try {
    // Log AI request start
    if (testRunId) {
      await insertTestEvent(
        env.DB,
        testRunId,
        'ai',
        EventType.AI_REQUEST_START,
        `Calling AI Gateway OpenAI ${model} (${prompt.length} chars, ${images?.length || 0} images)`,
        JSON.stringify({
          provider: 'openai',
          model,
          prompt_length: prompt.length,
          image_count: images?.length || 0,
          gateway: AI_GATEWAY_CONFIG.GATEWAY_NAME,
          ...customMetadata,
        })
      );
    }
    
    // Build OpenAI-compatible request body
    const messages: Array<{
      role: string;
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    }> = [];
    
    if (hasImages && images) {
      // Vision request with images
      const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
        { type: 'text', text: prompt },
      ];
      
      for (const buffer of images) {
        const base64 = arrayBufferToBase64(buffer);
        content.push({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${base64}` },
        });
      }
      
      messages.push({ role: 'user', content });
    } else {
      // Text-only request
      messages.push({ role: 'user', content: prompt });
    }
    
    // Call OpenAI via authenticated AI Gateway
    // Gateway endpoint format: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/openai/chat/completions
    // Since gateway is authenticated, we don't need to pass API keys
    const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${AI_GATEWAY_CONFIG.ACCOUNT_ID}/${AI_GATEWAY_CONFIG.GATEWAY_NAME}/openai/chat/completions`;
    
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), AI_GATEWAY_CONFIG.FALLBACK_TIMEOUT_MS);
    
    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add custom metadata headers for AI Gateway observability
        'cf-aig-metadata': JSON.stringify({
          test_run_id: testRunId,
          ...customMetadata,
        }),
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4096,
      }),
      signal: timeoutController.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      cf_cache_status?: string;
    };
    
    const latency = Date.now() - startTime;
    const cached = data.cf_cache_status === 'HIT';
    
    // Extract token usage
    const tokens: TokenUsage = {
      input: data.usage?.prompt_tokens,
      output: data.usage?.completion_tokens,
      total: data.usage?.total_tokens,
    };
    
    // Estimate cost (rough approximation for GPT-4o)
    // Input: $2.50 per 1M tokens, Output: $10.00 per 1M tokens
    const inputCost = (tokens.input || 0) * 2.50 / 1_000_000;
    const outputCost = (tokens.output || 0) * 10.00 / 1_000_000;
    const totalCost = inputCost + outputCost;
    
    const aiResponse: AIResponse = {
      text: data.choices[0]?.message?.content || '',
      model,
      provider: 'openai',
      cost: totalCost,
      cached,
      tokens,
      metadata: {
        model,
        provider: 'openai',
        cached,
        cost: totalCost,
        tokens,
        latency_ms: latency,
        test_run_id: testRunId,
        gateway: AI_GATEWAY_CONFIG.GATEWAY_NAME,
        ...customMetadata,
      },
    };
    
    // Log AI request success
    if (testRunId) {
      await insertTestEvent(
        env.DB,
        testRunId,
        'ai',
        EventType.AI_REQUEST_COMPLETE,
        `OpenAI responded (${latency}ms, $${totalCost.toFixed(4)}, ${cached ? 'cached' : 'fresh'})`,
        JSON.stringify({
          provider: 'openai',
          model,
          latency_ms: latency,
          cost: totalCost,
          cached,
          tokens,
          gateway: AI_GATEWAY_CONFIG.GATEWAY_NAME,
          ...customMetadata,
        })
      );
    }
    
    return { success: true, data: aiResponse };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Log AI request failure
    if (testRunId) {
      await insertTestEvent(
        env.DB,
        testRunId,
        'ai',
        EventType.AI_REQUEST_FAILED,
        `OpenAI via AI Gateway failed: ${errorMessage}`,
        JSON.stringify({
          provider: 'openai',
          model,
          error: errorMessage,
          gateway: AI_GATEWAY_CONFIG.GATEWAY_NAME,
          ...customMetadata,
        })
      );
    }
    
    return {
      success: false,
      error: `AI Gateway request failed: ${errorMessage}`,
    };
  }
}

/**
 * Get total AI costs for a test run
 * 
 * Queries test_events table for all AI requests and sums their costs
 * 
 * @param db - D1Database instance from env.DB
 * @param testRunId - UUID of the test run
 * @returns DbResult with total cost in USD
 */
export async function getAICosts(
  db: D1Database,
  testRunId: string
): Promise<DbResult<number>> {
  try {
    // Query all AI request completion events for this test run
    const result = await db
      .prepare(
        `SELECT metadata FROM test_events 
         WHERE test_run_id = ? 
         AND event_type = ? 
         AND metadata IS NOT NULL`
      )
      .bind(testRunId, EventType.AI_REQUEST_COMPLETE)
      .all<{ metadata: string }>();
    
    let totalCost = 0;
    
    // Sum costs from metadata JSON
    for (const row of result.results || []) {
      try {
        const metadata = JSON.parse(row.metadata) as { cost?: number };
        if (metadata.cost !== undefined) {
          totalCost += metadata.cost;
        }
      } catch {
        // Skip invalid JSON
        continue;
      }
    }
    
    return { success: true, data: totalCost };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get AI costs: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Convert ArrayBuffer to base64 string
 * @internal
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * AI Gateway configuration object (exported for testing/monitoring)
 */
export const aiGatewayConfig = AI_GATEWAY_CONFIG;

