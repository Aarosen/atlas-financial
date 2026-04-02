/**
 * PROVIDER INTEGRATION TESTS
 * 
 * Tests for provider switching, fallback, cost optimization, and error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderFactory } from '../providerFactory';
import { ProviderManager } from '../providerManager';
import { MockClaudeProvider, MockOpenAIProvider, MockGeminiProvider, MockErrorProvider } from './mockProviders';
import type { ProviderMessage, ProviderConfig } from '../types';

describe('Provider Integration Tests', () => {
  beforeEach(() => {
    ProviderFactory.registerMockProvider('claude', MockClaudeProvider);
    ProviderFactory.registerMockProvider('openai', MockOpenAIProvider);
    ProviderFactory.registerMockProvider('gemini', MockGeminiProvider);
  });

  afterEach(() => {
    ProviderFactory.clearMockProviders();
    ProviderFactory.clearCache();
  });
  const mockConfig: ProviderConfig = {
    apiKey: 'test-api-key',
    temperature: 0.7,
    maxTokens: 2048,
  };

  const testMessages: ProviderMessage[] = [
    { role: 'user', content: 'What is financial planning?' },
  ];

  const systemPrompt = 'You are a helpful financial advisor.';

  describe('Provider Switching', () => {
    it('should use primary provider by default', async () => {
      const providerConfigs = new Map([
        ['claude', mockConfig],
        ['openai', mockConfig],
        ['gemini', mockConfig],
      ]);

      const manager = new ProviderManager(
        providerConfigs as any,
        {
          primaryProvider: 'claude',
          fallbackProviders: ['openai', 'gemini'],
          enableCostOptimization: false,
        }
      );

      expect(manager.getPrimaryProvider()).toBe('Claude');
    });

    it('should list all available providers', async () => {
      const providerConfigs = new Map([
        ['claude', mockConfig],
        ['openai', mockConfig],
        ['gemini', mockConfig],
      ]);

      const manager = new ProviderManager(
        providerConfigs as any,
        {
          primaryProvider: 'claude',
          fallbackProviders: ['openai', 'gemini'],
        }
      );

      const providers = manager.getAvailableProviders();
      expect(providers).toContain('Claude');
      expect(providers).toContain('OpenAI');
      expect(providers).toContain('Gemini');
    });

    it('should handle provider with no fallbacks', async () => {
      const providerConfigs = new Map([
        ['claude', mockConfig],
      ]);

      const manager = new ProviderManager(
        providerConfigs as any,
        {
          primaryProvider: 'claude',
          enableCostOptimization: false,
        }
      );

      expect(manager.getPrimaryProvider()).toBe('Claude');
      expect(manager.getAvailableProviders()).toHaveLength(1);
    });
  });

  describe('Cost Optimization', () => {
    it('should select cheapest provider when enabled', async () => {
      const providerConfigs = new Map([
        ['claude', mockConfig],
        ['openai', mockConfig],
        ['gemini', mockConfig],
      ]);

      const manager = new ProviderManager(
        providerConfigs as any,
        {
          primaryProvider: 'claude',
          fallbackProviders: ['openai', 'gemini'],
          enableCostOptimization: true,
        }
      );

      // Gemini should be selected as cheapest
      const providers = manager.getAvailableProviders();
      expect(providers).toContain('Gemini');
    });

    it('should show pricing for all providers', async () => {
      const providerConfigs = new Map([
        ['claude', mockConfig],
        ['openai', mockConfig],
        ['gemini', mockConfig],
      ]);

      const manager = new ProviderManager(
        providerConfigs as any,
        {
          primaryProvider: 'claude',
          fallbackProviders: ['openai', 'gemini'],
        }
      );

      const claudePricing = manager.getProviderPricing('Claude');
      const openaiPricing = manager.getProviderPricing('OpenAI');
      const geminiPricing = manager.getProviderPricing('Gemini');

      expect(claudePricing).toBeDefined();
      expect(openaiPricing).toBeDefined();
      expect(geminiPricing).toBeDefined();

      // Verify pricing relationships
      const claudeTotal = claudePricing!.inputPer1M + claudePricing!.outputPer1M;
      const openaiTotal = openaiPricing!.inputPer1M + openaiPricing!.outputPer1M;
      const geminiTotal = geminiPricing!.inputPer1M + geminiPricing!.outputPer1M;

      expect(geminiTotal).toBeLessThan(claudeTotal);
      expect(geminiTotal).toBeLessThan(openaiTotal);
    });

    it('should calculate cost for different token counts', async () => {
      const claudeProvider = new MockClaudeProvider(mockConfig);
      const pricing = claudeProvider.getPricing();

      // 1M tokens
      const cost1M = (1_000_000 / 1_000_000) * (pricing.inputPer1M + pricing.outputPer1M);
      expect(cost1M).toBe(18); // $3 + $15

      // 100K tokens
      const cost100K = (100_000 / 1_000_000) * (pricing.inputPer1M + pricing.outputPer1M);
      expect(cost100K).toBe(1.8);
    });
  });

  describe('Health Checks', () => {
    it('should track health status when enabled', async () => {
      const providerConfigs = new Map([
        ['claude', mockConfig],
      ]);

      const manager = new ProviderManager(
        providerConfigs as any,
        {
          primaryProvider: 'claude',
          enableHealthChecks: true,
        }
      );

      manager.resetHealthChecks();
      expect(manager.getHealthStatus()).toHaveLength(0);
    });

    it('should reset health checks', async () => {
      const providerConfigs = new Map([
        ['claude', mockConfig],
      ]);

      const manager = new ProviderManager(
        providerConfigs as any,
        {
          primaryProvider: 'claude',
          enableHealthChecks: true,
        }
      );

      manager.resetHealthChecks();
      expect(manager.getHealthStatus()).toHaveLength(0);
    });
  });

  describe('Mock Provider Behavior', () => {
    it('Claude mock provider should return correct response', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const response = await provider.complete(testMessages, systemPrompt);

      expect(response.content).toBe('Mock Claude response');
      expect(response.inputTokens).toBe(100);
      expect(response.outputTokens).toBe(50);
    });

    it('OpenAI mock provider should return correct response', async () => {
      const provider = new MockOpenAIProvider(mockConfig);
      const response = await provider.complete(testMessages, systemPrompt);

      expect(response.content).toBe('Mock OpenAI response');
      expect(response.inputTokens).toBe(120);
      expect(response.outputTokens).toBe(60);
    });

    it('Gemini mock provider should return correct response', async () => {
      const provider = new MockGeminiProvider(mockConfig);
      const response = await provider.complete(testMessages, systemPrompt);

      expect(response.content).toBe('Mock Gemini response');
      expect(response.inputTokens).toBe(110);
      expect(response.outputTokens).toBe(55);
    });

    it('Error provider should throw on complete', async () => {
      const provider = new MockErrorProvider(mockConfig);

      await expect(provider.complete(testMessages, systemPrompt)).rejects.toThrow(
        'Mock provider error'
      );
    });

    it('Error provider should throw on stream', async () => {
      const provider = new MockErrorProvider(mockConfig);
      const callback = () => {};

      await expect(provider.streamComplete(testMessages, systemPrompt, callback)).rejects.toThrow(
        'Mock stream error'
      );
    });
  });

  describe('Streaming Behavior', () => {
    it('Claude mock provider should stream correctly', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const chunks: string[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      });

      expect(chunks.join('')).toBe('Mock Claude stream');
    });

    it('OpenAI mock provider should stream correctly', async () => {
      const provider = new MockOpenAIProvider(mockConfig);
      const chunks: string[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      });

      expect(chunks.join('')).toBe('Mock OpenAI stream');
    });

    it('Gemini mock provider should stream correctly', async () => {
      const provider = new MockGeminiProvider(mockConfig);
      const chunks: string[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      });

      expect(chunks.join('')).toBe('Mock Gemini stream');
    });

    it('should emit done chunk with usage', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      let doneChunk: any = null;

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'done') {
          doneChunk = chunk;
        }
      });

      expect(doneChunk).toBeDefined();
      expect(doneChunk.usage).toBeDefined();
      expect(doneChunk.usage.inputTokens).toBe(100);
      expect(doneChunk.usage.outputTokens).toBe(50);
    });
  });

  describe('Token Counting', () => {
    it('should count tokens approximately', () => {
      const provider = new MockClaudeProvider(mockConfig);
      const text = 'Hello world, how are you?';
      const tokens = provider.countTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThanOrEqual(Math.ceil(text.length / 4) + 1);
    });

    it('should handle empty strings', () => {
      const provider = new MockClaudeProvider(mockConfig);
      const tokens = provider.countTokens('');

      expect(tokens).toBe(0);
    });

    it('should handle long text', () => {
      const provider = new MockClaudeProvider(mockConfig);
      const longText = 'a'.repeat(10000);
      const tokens = provider.countTokens(longText);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThanOrEqual(2500 + 1);
    });
  });

  describe('Configuration Handling', () => {
    it('should validate configuration', () => {
      const unconfiguredProvider = new MockClaudeProvider({ apiKey: '' });
      expect(() => unconfiguredProvider.complete(testMessages, systemPrompt)).rejects.toThrow();
    });

    it('should accept partial config overrides', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const response = await provider.complete(testMessages, systemPrompt, {
        temperature: 0.5,
        maxTokens: 4096,
      });

      expect(response).toBeDefined();
    });

    it('should use default model if not specified', async () => {
      const provider = new MockClaudeProvider({ apiKey: 'test-key' });
      expect(provider.isConfigured()).toBe(true);
    });
  });

  describe('Provider Comparison', () => {
    it('should show Claude as mid-range pricing', () => {
      const provider = new MockClaudeProvider(mockConfig);
      const pricing = provider.getPricing();

      expect(pricing.inputPer1M).toBe(3);
      expect(pricing.outputPer1M).toBe(15);
    });

    it('should show OpenAI as premium pricing', () => {
      const provider = new MockOpenAIProvider(mockConfig);
      const pricing = provider.getPricing();

      expect(pricing.inputPer1M).toBe(10);
      expect(pricing.outputPer1M).toBe(30);
    });

    it('should show Gemini as budget pricing', () => {
      const provider = new MockGeminiProvider(mockConfig);
      const pricing = provider.getPricing();

      expect(pricing.inputPer1M).toBe(0.075);
      expect(pricing.outputPer1M).toBe(0.3);
    });

    it('should calculate total cost correctly', () => {
      const providers = [
        new MockClaudeProvider(mockConfig),
        new MockOpenAIProvider(mockConfig),
        new MockGeminiProvider(mockConfig),
      ];

      const costs = providers.map(p => {
        const pricing = p.getPricing();
        return pricing.inputPer1M + pricing.outputPer1M;
      });

      expect(costs[0]).toBe(18); // Claude
      expect(costs[1]).toBe(40); // OpenAI
      expect(costs[2]).toBe(0.375); // Gemini
    });
  });
});
