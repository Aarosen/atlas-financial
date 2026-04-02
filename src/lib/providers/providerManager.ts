/**
 * PROVIDER MANAGER
 * 
 * Manages multiple LLM providers with intelligent routing and fallback
 * Handles provider selection, cost optimization, and health monitoring
 */

import { ProviderFactory } from './providerFactory';
import type {
  ILLMProvider,
  ProviderConfig,
  ProviderMessage,
  ProviderResponse,
  StreamCallback,
  StreamChunkType,
  ProviderType,
  ProviderHealthCheck,
} from './types';

export interface ProviderManagerConfig {
  primaryProvider: ProviderType;
  fallbackProviders?: ProviderType[];
  enableCostOptimization?: boolean;
  enableHealthChecks?: boolean;
}

export class ProviderManager {
  private primaryProvider: ILLMProvider;
  private fallbackProviders: ILLMProvider[] = [];
  private config: ProviderManagerConfig;
  private healthChecks: Map<string, ProviderHealthCheck> = new Map();

  constructor(
    providerConfigs: Map<ProviderType, ProviderConfig>,
    config: ProviderManagerConfig
  ) {
    this.config = config;

    // Initialize primary provider
    const primaryConfig = providerConfigs.get(config.primaryProvider);
    if (!primaryConfig) {
      throw new Error(`Primary provider config not found: ${config.primaryProvider}`);
    }
    this.primaryProvider = ProviderFactory.createProvider(
      config.primaryProvider,
      primaryConfig
    );

    // Initialize fallback providers
    if (config.fallbackProviders) {
      for (const fallbackType of config.fallbackProviders) {
        const fallbackConfig = providerConfigs.get(fallbackType);
        if (fallbackConfig) {
          const provider = ProviderFactory.createProvider(fallbackType, fallbackConfig);
          this.fallbackProviders.push(provider);
        }
      }
    }
  }

  /**
   * Get the best provider based on cost and availability
   */
  private getOptimalProvider(): ILLMProvider {
    if (!this.config.enableCostOptimization) {
      return this.primaryProvider;
    }

    // Get all available providers
    const providers = [this.primaryProvider, ...this.fallbackProviders];

    // Filter healthy providers
    const healthyProviders = providers.filter(p => {
      const health = this.healthChecks.get(p.getName());
      return !health || health.healthy;
    });

    if (healthyProviders.length === 0) {
      return this.primaryProvider;
    }

    // Sort by cost (input + output pricing)
    healthyProviders.sort((a, b) => {
      const aPricing = a.getPricing();
      const bPricing = b.getPricing();
      const aCost = aPricing.inputPer1M + aPricing.outputPer1M;
      const bCost = bPricing.inputPer1M + bPricing.outputPer1M;
      return aCost - bCost;
    });

    return healthyProviders[0];
  }

  /**
   * Complete with automatic fallback
   */
  async complete(
    messages: ProviderMessage[],
    systemPrompt?: string,
    config?: { provider?: ProviderType }
  ): Promise<ProviderResponse> {
    let lastError: Error | null = null;
    const providers = config?.provider
      ? [ProviderFactory.createProvider(config.provider, { apiKey: '' })]
      : [this.getOptimalProvider(), ...this.fallbackProviders];

    for (const provider of providers) {
      try {
        const response = await provider.complete(messages, systemPrompt);
        this.recordHealthCheck(provider.getName(), true);
        return response;
      } catch (error) {
        lastError = error as Error;
        this.recordHealthCheck(provider.getName(), false, error as Error);
      }
    }

    throw lastError || new Error('All providers failed');
  }

  /**
   * Stream with automatic fallback
   */
  async streamComplete(
    messages: ProviderMessage[],
    systemPrompt: string,
    callback: StreamCallback,
    config?: { provider?: ProviderType }
  ): Promise<void> {
    let lastError: Error | null = null;
    const providers = config?.provider
      ? [ProviderFactory.createProvider(config.provider, { apiKey: '' })]
      : [this.getOptimalProvider(), ...this.fallbackProviders];

    for (const provider of providers) {
      try {
        await provider.streamComplete(messages, systemPrompt, callback);
        this.recordHealthCheck(provider.getName(), true);
        return;
      } catch (error) {
        lastError = error as Error;
        this.recordHealthCheck(provider.getName(), false, error as Error);
      }
    }

    throw lastError || new Error('All providers failed');
  }

  /**
   * Get primary provider name
   */
  getPrimaryProvider(): string {
    return this.primaryProvider.getName();
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return [
      this.primaryProvider.getName(),
      ...this.fallbackProviders.map(p => p.getName()),
    ];
  }

  /**
   * Get provider pricing
   */
  getProviderPricing(providerName: string): { inputPer1M: number; outputPer1M: number } | null {
    const provider = [this.primaryProvider, ...this.fallbackProviders].find(
      p => p.getName() === providerName
    );
    return provider ? provider.getPricing() : null;
  }

  /**
   * Record health check result
   */
  private recordHealthCheck(
    providerName: string,
    healthy: boolean,
    error?: Error
  ): void {
    if (!this.config.enableHealthChecks) {
      return;
    }

    this.healthChecks.set(providerName, {
      provider: providerName,
      healthy,
      error: error?.message,
    });
  }

  /**
   * Get health status of all providers
   */
  getHealthStatus(): ProviderHealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Reset health checks
   */
  resetHealthChecks(): void {
    this.healthChecks.clear();
  }
}
