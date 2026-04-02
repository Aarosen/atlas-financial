/**
 * OPENAI PROVIDER
 * 
 * OpenAI GPT implementation of the LLM provider interface
 * Supports streaming and standard completions
 */

import { BaseProvider } from './baseProvider';
import type {
  ProviderConfig,
  ProviderMessage,
  ProviderResponse,
  StreamCallback,
  StreamChunk,
} from './types';

let OpenAI: any;

// Lazy load OpenAI to avoid import errors in test environments
try {
  OpenAI = require('openai').default;
} catch (e) {
  // OpenAI not installed, will fail at runtime if used
}

export class OpenAIProvider extends BaseProvider {
  private client: any;

  constructor(config: ProviderConfig) {
    super(config, 'gpt-4-turbo');
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  getName(): string {
    return 'OpenAI';
  }

  async complete(
    messages: ProviderMessage[],
    systemPrompt?: string,
    config?: Partial<ProviderConfig>
  ): Promise<ProviderResponse> {
    this.validateConfig();
    const mergedConfig = this.mergeConfig(config);
    const formattedMessages = this.formatMessages(messages);

    const allMessages = systemPrompt
      ? [
          { role: 'system' as const, content: systemPrompt },
          ...formattedMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
          })),
        ]
      : formattedMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        }));

    const response = await this.client.chat.completions.create({
      model: mergedConfig.model!,
      max_tokens: mergedConfig.maxTokens!,
      temperature: mergedConfig.temperature,
      top_p: mergedConfig.topP,
      messages: allMessages,
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      content,
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      stopReason: response.choices[0]?.finish_reason,
    };
  }

  async streamComplete(
    messages: ProviderMessage[],
    systemPrompt: string,
    callback: StreamCallback,
    config?: Partial<ProviderConfig>
  ): Promise<void> {
    this.validateConfig();
    const mergedConfig = this.mergeConfig(config);
    const formattedMessages = this.formatMessages(messages);

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...formattedMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      })),
    ];

    const stream = await this.client.chat.completions.create({
      model: mergedConfig.model!,
      max_tokens: mergedConfig.maxTokens!,
      temperature: mergedConfig.temperature,
      top_p: mergedConfig.topP,
      messages: allMessages,
      stream: true,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
      }

      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        this.emitChunk(callback, {
          type: 'text',
          content,
        });
      }
    }

    this.emitChunk(callback, {
      type: 'done',
      usage: {
        inputTokens,
        outputTokens,
      },
    });
  }

  countTokens(text: string): number {
    // OpenAI uses approximately 1 token per 4 characters for English text
    // This is a rough estimate; actual token count may vary
    return Math.ceil(text.length / 4);
  }

  getPricing(): {
    inputPer1M: number;
    outputPer1M: number;
  } {
    // GPT-4 Turbo pricing (as of 2024)
    return {
      inputPer1M: 10, // $10 per 1M input tokens
      outputPer1M: 30, // $30 per 1M output tokens
    };
  }
}
