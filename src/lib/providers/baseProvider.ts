/**
 * BASE PROVIDER CLASS
 * 
 * Abstract base class for all LLM providers
 * Implements common functionality and enforces interface compliance
 */

import type {
  ILLMProvider,
  ProviderConfig,
  ProviderMessage,
  ProviderResponse,
  StreamCallback,
  StreamChunk,
} from './types';

export abstract class BaseProvider implements ILLMProvider {
  protected config: ProviderConfig;
  protected defaultModel: string;

  constructor(config: ProviderConfig, defaultModel: string) {
    this.config = config;
    this.defaultModel = defaultModel;
  }

  /**
   * Get provider name - must be implemented by subclasses
   */
  abstract getName(): string;

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Send completion request - must be implemented by subclasses
   */
  abstract complete(
    messages: ProviderMessage[],
    systemPrompt?: string,
    config?: Partial<ProviderConfig>
  ): Promise<ProviderResponse>;

  /**
   * Stream completion request - must be implemented by subclasses
   */
  abstract streamComplete(
    messages: ProviderMessage[],
    systemPrompt: string,
    callback: StreamCallback,
    config?: Partial<ProviderConfig>
  ): Promise<void>;

  /**
   * Count tokens - must be implemented by subclasses
   */
  abstract countTokens(text: string): number;

  /**
   * Get pricing - must be implemented by subclasses
   */
  abstract getPricing(): {
    inputPer1M: number;
    outputPer1M: number;
  };

  /**
   * Merge config with defaults
   */
  protected mergeConfig(overrides?: Partial<ProviderConfig>): ProviderConfig {
    return {
      apiKey: this.config.apiKey,
      model: overrides?.model || this.config.model || this.defaultModel,
      temperature: overrides?.temperature ?? this.config.temperature ?? 0.7,
      maxTokens: overrides?.maxTokens || this.config.maxTokens || 2048,
      topP: overrides?.topP ?? this.config.topP ?? 1.0,
      topK: overrides?.topK ?? this.config.topK ?? 40,
    };
  }

  /**
   * Format messages for API call
   */
  protected formatMessages(messages: ProviderMessage[]): ProviderMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content.trim(),
    }));
  }

  /**
   * Calculate cost for a completion
   */
  protected calculateCost(inputTokens: number, outputTokens: number): number {
    const pricing = this.getPricing();
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
    return inputCost + outputCost;
  }

  /**
   * Emit stream chunk
   */
  protected emitChunk(callback: StreamCallback, chunk: StreamChunk): void {
    try {
      callback(chunk);
    } catch (error) {
      console.error(`Error in stream callback: ${error}`);
    }
  }

  /**
   * Validate configuration
   */
  protected validateConfig(): void {
    if (!this.isConfigured()) {
      throw new Error(`${this.getName()} provider not configured - missing API key`);
    }
  }
}
