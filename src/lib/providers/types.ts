/**
 * PROVIDER ABSTRACTION LAYER - Type Definitions
 * 
 * Defines interfaces for all LLM providers (Claude, OpenAI, Gemini)
 * Enables seamless provider switching without changing core logic
 */

/**
 * Message role types supported by all providers
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Standard message format across all providers
 */
export interface ProviderMessage {
  role: MessageRole;
  content: string;
}

/**
 * Streaming chunk types
 */
export type StreamChunkType = 'text' | 'error' | 'done';

export interface StreamChunk {
  type: StreamChunkType;
  content?: string;
  error?: Error;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Provider configuration options
 */
export interface ProviderConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

/**
 * Response from provider completion
 */
export interface ProviderResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  stopReason?: string;
}

/**
 * Streaming response callback
 */
export type StreamCallback = (chunk: StreamChunk) => void;

/**
 * Core provider interface - all providers must implement this
 */
export interface ILLMProvider {
  /**
   * Get provider name
   */
  getName(): string;

  /**
   * Check if provider is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Send a completion request
   */
  complete(
    messages: ProviderMessage[],
    systemPrompt?: string,
    config?: Partial<ProviderConfig>
  ): Promise<ProviderResponse>;

  /**
   * Send a streaming completion request
   */
  streamComplete(
    messages: ProviderMessage[],
    systemPrompt: string,
    callback: StreamCallback,
    config?: Partial<ProviderConfig>
  ): Promise<void>;

  /**
   * Count tokens in a message (for cost estimation)
   */
  countTokens(text: string): number;

  /**
   * Get provider pricing per 1M tokens
   */
  getPricing(): {
    inputPer1M: number;
    outputPer1M: number;
  };
}

/**
 * Provider factory for creating provider instances
 */
export type ProviderType = 'claude' | 'openai' | 'gemini';

export interface ProviderFactory {
  createProvider(type: ProviderType, config: ProviderConfig): ILLMProvider;
}

/**
 * Provider health check result
 */
export interface ProviderHealthCheck {
  provider: string;
  healthy: boolean;
  latency?: number;
  error?: string;
}
