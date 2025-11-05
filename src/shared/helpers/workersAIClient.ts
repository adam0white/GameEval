/**
 * Workers AI Client for Stagehand with AI Gateway support
 * Based on: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
 * Routes all AI requests through Cloudflare AI Gateway for observability and caching
 */

import {
  CreateChatCompletionOptions,
  LLMClient,
  LogLine,
} from '@browserbasehq/stagehand';
import zodToJsonSchema from 'zod-to-json-schema';

type WorkersAIOptions = AiOptions & {
  logger?: (line: LogLine) => void;
  gateway?: {
    id: string;
  };
};

const modelId = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// Basic implementation of LLMClient for Workers AI with AI Gateway support
// This uses @cf/meta/llama-3.3-70b-instruct-fp8-fast model routed through AI Gateway
// Reference: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
export class WorkersAIClient extends LLMClient {
  public type = 'workers-ai' as const;
  private binding: Ai;
  private options?: WorkersAIOptions;

  constructor(binding: Ai, options?: WorkersAIOptions) {
    super(modelId);
    this.binding = binding;
    this.options = options;
  }

  async createChatCompletion<T>({ options }: CreateChatCompletionOptions): Promise<T> {
    const schema = options.response_model?.schema;

    this.options?.logger?.({ category: 'workersai', message: 'thinking...' });

    // Route through AI Gateway for observability and caching
    // Reference: https://developers.cloudflare.com/browser-rendering/platform/stagehand/
    const { response } = (await this.binding.run(
      this.modelName as keyof AiModels,
      {
        messages: options.messages,
        // @ts-ignore
        tools: options.tools,
        response_format: schema
          ? {
              type: 'json_schema',
              json_schema: zodToJsonSchema(schema),
            }
          : undefined,
        temperature: 0,
      },
      {
        ...this.options,
        // Pass gateway configuration to AI binding
        // This routes the request through AI Gateway for monitoring and caching
        gateway: this.options?.gateway,
      }
    )) as AiTextGenerationOutput;

    this.options?.logger?.({ category: 'workersai', message: 'completed thinking!' });

    return {
      data: response,
    } as T;
  }
}

