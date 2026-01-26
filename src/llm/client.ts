import { Message, LLMResponse, TokenUsage } from '../agents/types';
import { RATE_LIMIT_CONFIG } from '../config/constants';
import { sanitizeLogMessage } from '../utils/security';

interface ModelConfig {
  provider: 'novita' | 'anthropic' | 'local';
  endpoint: string;
  apiKey?: string;
  pricing: { input: number; output: number };
}

interface NovitaResponse {
  choices: Array<{ message?: { content?: string; tool_calls?: any[] } }>;
  usage?: any;
}

interface AnthropicResponse {
  content: Array<{ text?: string; type?: string }>;
  usage?: any;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeout: number;
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(
    private maxTokens: number,
    private refillRate: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }
  check(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }
  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / 1000) * this.refillRate;
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  timeout: 60000,
};

// Global rate limiter for LLM API calls
const llmRateLimiter = new TokenBucket(
  RATE_LIMIT_CONFIG.TOKEN_BUCKET_MAX_TOKENS,
  RATE_LIMIT_CONFIG.TOKEN_BUCKET_REFILL_RATE / 60 // Convert to tokens per second
);

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), config.timeout);
      });

      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on validation errors
      if (error instanceof Error && error.message.includes('validation')) {
        throw error;
      }

      if (attempt < config.maxRetries) {
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
        console.log(
          sanitizeLogMessage(`Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms...`)
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

const modelConfigs: Record<string, ModelConfig> = {
  'deepseek-r1': {
    provider: 'novita',
    endpoint: 'https://api.novita.ai/v3/openai/chat/completions',
    apiKey: process.env.NOVITA_API_KEY,
    pricing: { input: 0.55, output: 2.19 },
  },
  'deepseek-v3': {
    provider: 'novita',
    endpoint: 'https://api.novita.ai/v3/openai/chat/completions',
    apiKey: process.env.NOVITA_API_KEY,
    pricing: { input: 0.3, output: 0.9 },
  },
  'claude-sonnet-4': {
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKey: process.env.ANTHROPIC_API_KEY,
    pricing: { input: 3.0, output: 15.0 },
  },
  'llama-4-scout-local': {
    provider: 'local',
    endpoint: process.env.LOCAL_LLM_ENDPOINT || 'http://localhost:8000/v1',
    pricing: { input: 0, output: 0 },
  },
};

export class LLMClient {
  private totalCost = 0;
  private totalTokens = 0;

  async chat(model: string, messages: Message[], tools?: any[]): Promise<LLMResponse> {
    // Check rate limit before making API call
    if (!llmRateLimiter.check()) {
      throw new Error('Rate limit exceeded');
    }

    const config = this.getConfig(model);

    if (config.provider === 'local') {
      return this.callLocal(config, messages, tools);
    } else if (config.provider === 'novita') {
      return this.callNovita(config, model, messages, tools);
    } else {
      return this.callAnthropic(config, model, messages, tools);
    }
  }

  private getConfig(model: string): ModelConfig {
    // Find matching config
    for (const [key, config] of Object.entries(modelConfigs)) {
      if (model.includes(key) || key.includes(model)) {
        return config;
      }
    }
    // Default to local
    return modelConfigs['llama-4-scout-local']!;
  }

  private async callNovita(
    config: ModelConfig,
    model: string,
    messages: Message[],
    tools?: any[]
  ): Promise<LLMResponse> {
    const fetchCall = async (): Promise<LLMResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_RETRY_CONFIG.timeout);

      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages,
            tools,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          // Don't expose API keys or sensitive information in error messages
          throw new Error(`Novita API error: ${response.status}`);
        }

        const data = (await response.json()) as NovitaResponse;
        const usage = this.calculateUsage(data.usage, config.pricing);

        return {
          content: data.choices[0]?.message?.content || '',
          toolCalls: data.choices[0]?.message?.tool_calls,
          usage,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    return withRetry(fetchCall);
  }

  private async callAnthropic(
    config: ModelConfig,
    model: string,
    messages: Message[],
    tools?: any[]
  ): Promise<LLMResponse> {
    const fetchCall = async (): Promise<LLMResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_RETRY_CONFIG.timeout);

      try {
        const response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            messages,
            tools,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          // Don't expose API keys or sensitive information in error messages
          throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = (await response.json()) as AnthropicResponse;
        const usage = this.calculateUsage(data.usage, config.pricing);

        return {
          content: data.content[0]?.text || '',
          toolCalls: data.content.filter((c: any) => c.type === 'tool_use') as any,
          usage,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    return withRetry(fetchCall);
  }

  private async callLocal(
    config: ModelConfig,
    messages: Message[],
    tools?: any[]
  ): Promise<LLMResponse> {
    const fetchCall = async (): Promise<LLMResponse> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_RETRY_CONFIG.timeout);

      try {
        const response = await fetch(`${config.endpoint}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-4-scout',
            messages,
            tools,
            max_tokens: 4096,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Local LLM API error: ${response.status}`);
        }

        const data = (await response.json()) as NovitaResponse;

        return {
          content: data.choices[0]?.message?.content || '',
          toolCalls: data.choices[0]?.message?.tool_calls,
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0 },
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    return withRetry(fetchCall);
  }

  private calculateUsage(usage: any, pricing: { input: number; output: number }): TokenUsage {
    const inputTokens = usage?.prompt_tokens || usage?.input_tokens || 0;
    const outputTokens = usage?.completion_tokens || usage?.output_tokens || 0;
    const cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;

    this.totalTokens += inputTokens + outputTokens;
    this.totalCost += cost;

    return { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, cost };
  }

  getTotalCost() {
    return this.totalCost;
  }
  getTotalTokens() {
    return this.totalTokens;
  }
  reset() {
    this.totalCost = 0;
    this.totalTokens = 0;
  }
}

export const llmClient = new LLMClient();
