/**
 * MOCK PROVIDERS FOR TESTING
 * 
 * Mock implementations of providers for unit testing
 * Allows testing without external API dependencies
 */

import { BaseProvider } from '../baseProvider';
import type {
  ProviderConfig,
  ProviderMessage,
  ProviderResponse,
  StreamCallback,
} from '../types';

/**
 * Mock Claude Provider for testing
 */
export class MockClaudeProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config, 'claude-3-5-sonnet-20241022');
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
    return {
      content: 'Mock Claude response',
      inputTokens: 100,
      outputTokens: 50,
      stopReason: 'end_turn',
    };
  }

  async streamComplete(
    messages: ProviderMessage[],
    systemPrompt: string,
    callback: StreamCallback,
    config?: Partial<ProviderConfig>
  ): Promise<void> {
    this.validateConfig();
    this.emitChunk(callback, { type: 'text', content: 'Mock ' });
    this.emitChunk(callback, { type: 'text', content: 'Claude ' });
    this.emitChunk(callback, { type: 'text', content: 'stream' });
    this.emitChunk(callback, {
      type: 'done',
      usage: { inputTokens: 100, outputTokens: 50 },
    });
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getPricing(): { inputPer1M: number; outputPer1M: number } {
    return { inputPer1M: 3, outputPer1M: 15 };
  }
}

/**
 * Mock OpenAI Provider for testing
 */
export class MockOpenAIProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config, 'gpt-4-turbo');
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
    return {
      content: 'Mock OpenAI response',
      inputTokens: 120,
      outputTokens: 60,
      stopReason: 'stop',
    };
  }

  async streamComplete(
    messages: ProviderMessage[],
    systemPrompt: string,
    callback: StreamCallback,
    config?: Partial<ProviderConfig>
  ): Promise<void> {
    this.validateConfig();
    this.emitChunk(callback, { type: 'text', content: 'Mock ' });
    this.emitChunk(callback, { type: 'text', content: 'OpenAI ' });
    this.emitChunk(callback, { type: 'text', content: 'stream' });
    this.emitChunk(callback, {
      type: 'done',
      usage: { inputTokens: 120, outputTokens: 60 },
    });
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getPricing(): { inputPer1M: number; outputPer1M: number } {
    return { inputPer1M: 10, outputPer1M: 30 };
  }
}

/**
 * Mock Gemini Provider for testing
 */
export class MockGeminiProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config, 'gemini-2.0-flash');
  }

  getName(): string {
    return 'Gemini';
  }

  async complete(
    messages: ProviderMessage[],
    systemPrompt?: string,
    config?: Partial<ProviderConfig>
  ): Promise<ProviderResponse> {
    this.validateConfig();
    return {
      content: 'Mock Gemini response',
      inputTokens: 110,
      outputTokens: 55,
      stopReason: 'STOP',
    };
  }

  async streamComplete(
    messages: ProviderMessage[],
    systemPrompt: string,
    callback: StreamCallback,
    config?: Partial<ProviderConfig>
  ): Promise<void> {
    this.validateConfig();
    this.emitChunk(callback, { type: 'text', content: 'Mock ' });
    this.emitChunk(callback, { type: 'text', content: 'Gemini ' });
    this.emitChunk(callback, { type: 'text', content: 'stream' });
    this.emitChunk(callback, {
      type: 'done',
      usage: { inputTokens: 110, outputTokens: 55 },
    });
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getPricing(): { inputPer1M: number; outputPer1M: number } {
    return { inputPer1M: 0.075, outputPer1M: 0.3 };
  }
}

/**
 * Mock Error Provider for testing error handling
 */
export class MockErrorProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config, 'error-model');
  }

  getName(): string {
    return 'ErrorProvider';
  }

  async complete(
    messages: ProviderMessage[],
    systemPrompt?: string,
    config?: Partial<ProviderConfig>
  ): Promise<ProviderResponse> {
    throw new Error('Mock provider error');
  }

  async streamComplete(
    messages: ProviderMessage[],
    systemPrompt: string,
    callback: StreamCallback,
    config?: Partial<ProviderConfig>
  ): Promise<void> {
    throw new Error('Mock stream error');
  }

  countTokens(text: string): number {
    return 0;
  }

  getPricing(): { inputPer1M: number; outputPer1M: number } {
    return { inputPer1M: 0, outputPer1M: 0 };
  }
}
