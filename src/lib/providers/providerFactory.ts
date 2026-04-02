/**
 * PROVIDER FACTORY
 * 
 * Factory for creating and managing LLM provider instances
 * Handles provider instantiation and lifecycle management
 */

import type { ILLMProvider, ProviderConfig, ProviderType } from './types';

let ClaudeProvider: any;
let OpenAIProvider: any;
let GeminiProvider: any;

// Lazy load providers
try {
  ClaudeProvider = require('./claudeProvider').ClaudeProvider;
} catch (e) {
  // Provider not available
}

try {
  OpenAIProvider = require('./openaiProvider').OpenAIProvider;
} catch (e) {
  // Provider not available
}

try {
  GeminiProvider = require('./geminiProvider').GeminiProvider;
} catch (e) {
  // Provider not available
}

export class ProviderFactory {
  private static instances: Map<string, ILLMProvider> = new Map();
  private static mockProviders: Map<string, any> = new Map();

  /**
   * Register mock provider for testing
   */
  static registerMockProvider(type: ProviderType, providerClass: any): void {
    this.mockProviders.set(type, providerClass);
  }

  /**
   * Clear mock providers
   */
  static clearMockProviders(): void {
    this.mockProviders.clear();
  }

  /**
   * Create or retrieve a provider instance
   */
  static createProvider(type: ProviderType, config: ProviderConfig): ILLMProvider {
    const key = `${type}-${config.apiKey.substring(0, 10)}`;

    // Return cached instance if available
    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    let provider: ILLMProvider;

    // Check if mock provider is registered
    if (this.mockProviders.has(type)) {
      const MockProvider = this.mockProviders.get(type);
      provider = new MockProvider(config);
    } else {
      // Use real providers
      switch (type) {
        case 'claude':
          if (!ClaudeProvider) throw new Error('Claude provider not available');
          provider = new ClaudeProvider(config);
          break;
        case 'openai':
          if (!OpenAIProvider) throw new Error('OpenAI provider not available');
          provider = new OpenAIProvider(config);
          break;
        case 'gemini':
          if (!GeminiProvider) throw new Error('Gemini provider not available');
          provider = new GeminiProvider(config);
          break;
        default:
          throw new Error(`Unknown provider type: ${type}`);
      }
    }

    // Cache the instance
    this.instances.set(key, provider);
    return provider;
  }

  /**
   * Get all available provider types
   */
  static getAvailableProviders(): ProviderType[] {
    return ['claude', 'openai', 'gemini'];
  }

  /**
   * Check if a provider is configured
   */
  static isProviderConfigured(type: ProviderType): boolean {
    const apiKey = this.getApiKeyForProvider(type);
    return !!apiKey;
  }

  /**
   * Get API key for a provider from environment
   */
  private static getApiKeyForProvider(type: ProviderType): string | undefined {
    switch (type) {
      case 'claude':
        return process.env.ANTHROPIC_API_KEY;
      case 'openai':
        return process.env.OPENAI_API_KEY;
      case 'gemini':
        return process.env.GOOGLE_API_KEY;
      default:
        return undefined;
    }
  }

  /**
   * Create provider from environment variables
   */
  static createFromEnv(type: ProviderType): ILLMProvider {
    const apiKey = this.getApiKeyForProvider(type);
    if (!apiKey) {
      throw new Error(`API key not found for provider: ${type}`);
    }

    return this.createProvider(type, { apiKey });
  }

  /**
   * Clear cached instances
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get configured providers
   */
  static getConfiguredProviders(): ProviderType[] {
    return this.getAvailableProviders().filter(type =>
      this.isProviderConfigured(type)
    );
  }
}
