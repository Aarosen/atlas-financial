/**
 * CLAUDE PROVIDER
 * 
 * Anthropic Claude implementation of the LLM provider interface
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

let Anthropic: any;

// Lazy load Anthropic to avoid import errors in test environments
try {
  Anthropic = require('@anthropic-ai/sdk').Anthropic;
} catch (e) {
  // Anthropic not installed, will fail at runtime if used
}

export class ClaudeProvider extends BaseProvider {
  private client: any;

  constructor(config: ProviderConfig) {
    super(config, 'claude-3-5-sonnet-20241022');
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  getName(): string {
    return 'Claude';
  }

  async complete(
    messages: ProviderMessage[],
    systemPrompt?: string,
    config?: Partial<ProviderConfig>
  ): Promise<ProviderResponse> {
    this.validateConfig();
    const mergedConfig = this.mergeConfig(config);
    const formattedMessages = this.formatMessages(messages);

    const response = await this.client.messages.create({
      model: mergedConfig.model!,
      max_tokens: mergedConfig.maxTokens!,
      temperature: mergedConfig.temperature,
      system: systemPrompt,
      messages: formattedMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => (block as { type: 'text'; text: string }).text)
      .join('');

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason,
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

    const stream = await this.client.messages.stream({
      model: mergedConfig.model!,
      max_tokens: mergedConfig.maxTokens!,
      temperature: mergedConfig.temperature,
      system: systemPrompt,
      messages: formattedMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as { type: string; text?: string };
        if (delta.type === 'text_delta' && delta.text) {
          this.emitChunk(callback, {
            type: 'text',
            content: delta.text,
          });
        }
      } else if (event.type === 'message_start') {
        const message = event.message as { usage?: { input_tokens: number } };
        if (message.usage) {
          inputTokens = message.usage.input_tokens;
        }
      } else if (event.type === 'message_delta') {
        const delta = event as { usage?: { output_tokens: number } };
        if (delta.usage) {
          outputTokens = delta.usage.output_tokens;
        }
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
    // Claude uses approximately 1 token per 4 characters for English text
    // This is a rough estimate; actual token count may vary
    return Math.ceil(text.length / 4);
  }

  getPricing(): {
    inputPer1M: number;
    outputPer1M: number;
  } {
    // Claude 3.5 Sonnet pricing (as of 2024)
    return {
      inputPer1M: 3, // $3 per 1M input tokens
      outputPer1M: 15, // $15 per 1M output tokens
    };
  }
}
