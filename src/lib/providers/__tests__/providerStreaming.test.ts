/**
 * PROVIDER STREAMING TESTS
 * 
 * Comprehensive tests for streaming functionality across all providers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderFactory } from '../providerFactory';
import { MockClaudeProvider, MockOpenAIProvider, MockGeminiProvider } from './mockProviders';
import type { ProviderMessage, ProviderConfig, StreamChunk } from '../types';

describe('Provider Streaming Tests', () => {
  const mockConfig: ProviderConfig = {
    apiKey: 'test-api-key',
    temperature: 0.7,
    maxTokens: 2048,
  };

  const testMessages: ProviderMessage[] = [
    { role: 'user', content: 'What is financial planning?' },
  ];

  const systemPrompt = 'You are a helpful financial advisor.';

  beforeEach(() => {
    ProviderFactory.registerMockProvider('claude', MockClaudeProvider);
    ProviderFactory.registerMockProvider('openai', MockOpenAIProvider);
    ProviderFactory.registerMockProvider('gemini', MockGeminiProvider);
  });

  afterEach(() => {
    ProviderFactory.clearMockProviders();
    ProviderFactory.clearCache();
  });

  describe('Claude Streaming', () => {
    it('should stream text chunks', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const chunks: string[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBe('Mock Claude stream');
    });

    it('should emit done chunk with usage', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      let doneChunk: StreamChunk | null = null;

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'done') {
          doneChunk = chunk;
        }
      });

      expect(doneChunk).toBeDefined();
      expect(doneChunk?.usage).toBeDefined();
      expect(doneChunk?.usage?.inputTokens).toBe(100);
      expect(doneChunk?.usage?.outputTokens).toBe(50);
    });

    it('should handle streaming with system prompt', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const chunks: StreamChunk[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.type).toBe('done');
    });

    it('should handle streaming with empty messages', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const chunks: StreamChunk[] = [];

      await provider.streamComplete([], systemPrompt, chunk => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle streaming with long messages', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const longMessage: ProviderMessage = {
        role: 'user',
        content: 'a'.repeat(10000),
      };
      const chunks: StreamChunk[] = [];

      await provider.streamComplete([longMessage], systemPrompt, chunk => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('OpenAI Streaming', () => {
    it('should stream text chunks', async () => {
      const provider = new MockOpenAIProvider(mockConfig);
      const chunks: string[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBe('Mock OpenAI stream');
    });

    it('should emit done chunk with usage', async () => {
      const provider = new MockOpenAIProvider(mockConfig);
      let doneChunk: StreamChunk | null = null;

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'done') {
          doneChunk = chunk;
        }
      });

      expect(doneChunk).toBeDefined();
      expect(doneChunk?.usage?.inputTokens).toBe(120);
      expect(doneChunk?.usage?.outputTokens).toBe(60);
    });

    it('should handle streaming with config overrides', async () => {
      const provider = new MockOpenAIProvider(mockConfig);
      const chunks: StreamChunk[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        chunks.push(chunk);
      }, { temperature: 0.5, maxTokens: 4096 });

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Gemini Streaming', () => {
    it('should stream text chunks', async () => {
      const provider = new MockGeminiProvider(mockConfig);
      const chunks: string[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.join('')).toBe('Mock Gemini stream');
    });

    it('should emit done chunk with usage', async () => {
      const provider = new MockGeminiProvider(mockConfig);
      let doneChunk: StreamChunk | null = null;

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'done') {
          doneChunk = chunk;
        }
      });

      expect(doneChunk).toBeDefined();
      expect(doneChunk?.usage?.inputTokens).toBe(110);
      expect(doneChunk?.usage?.outputTokens).toBe(55);
    });
  });

  describe('Streaming Callback Handling', () => {
    it('should handle callback errors gracefully', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const errorCallback = () => {
        throw new Error('Callback error');
      };

      // Should not throw even if callback throws
      await expect(
        provider.streamComplete(testMessages, systemPrompt, errorCallback)
      ).resolves.not.toThrow();
    });

    it('should call callback for each chunk', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      let callCount = 0;

      await provider.streamComplete(testMessages, systemPrompt, () => {
        callCount++;
      });

      expect(callCount).toBeGreaterThan(0);
    });

    it('should provide chunk content in order', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const contents: string[] = [];

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.content) {
          contents.push(chunk.content);
        }
      });

      expect(contents.join('')).toContain('Mock');
    });
  });

  describe('Streaming Token Counting', () => {
    it('should count tokens in streamed content', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      let totalContent = '';

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          totalContent += chunk.content;
        }
      });

      const tokens = provider.countTokens(totalContent);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should match token count between streaming and non-streaming', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      let streamedContent = '';

      await provider.streamComplete(testMessages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          streamedContent += chunk.content;
        }
      });

      const response = await provider.complete(testMessages, systemPrompt);
      const streamTokens = provider.countTokens(streamedContent);
      const responseTokens = provider.countTokens(response.content);

      // Should be approximately equal
      expect(Math.abs(streamTokens - responseTokens)).toBeLessThanOrEqual(2);
    });
  });

  describe('Streaming with Multiple Messages', () => {
    it('should handle multi-turn conversation streaming', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const messages: ProviderMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];
      const chunks: StreamChunk[] = [];

      await provider.streamComplete(messages, systemPrompt, chunk => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
      const lastChunk = chunks[chunks.length - 1];
      expect(lastChunk.type).toBe('done');
    });

    it('should handle alternating user/assistant messages', async () => {
      const provider = new MockOpenAIProvider(mockConfig);
      const messages: ProviderMessage[] = [
        { role: 'user', content: 'What is 2+2?' },
        { role: 'assistant', content: '4' },
        { role: 'user', content: 'What is 3+3?' },
        { role: 'assistant', content: '6' },
        { role: 'user', content: 'What is 4+4?' },
      ];
      const chunks: string[] = [];

      await provider.streamComplete(messages, systemPrompt, chunk => {
        if (chunk.type === 'text' && chunk.content) {
          chunks.push(chunk.content);
        }
      });

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Streaming Performance', () => {
    it('should complete streaming in reasonable time', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const startTime = Date.now();

      await provider.streamComplete(testMessages, systemPrompt, () => {});

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle rapid streaming calls', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          provider.streamComplete(testMessages, systemPrompt, () => {})
        );
      }

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Streaming Edge Cases', () => {
    it('should handle streaming with special characters', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const specialMessage: ProviderMessage = {
        role: 'user',
        content: 'What about émojis 🎉 and spëcial çhars?',
      };
      const chunks: StreamChunk[] = [];

      await provider.streamComplete([specialMessage], systemPrompt, chunk => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle streaming with very long system prompt', async () => {
      const provider = new MockClaudeProvider(mockConfig);
      const longPrompt = 'a'.repeat(10000);
      const chunks: StreamChunk[] = [];

      await provider.streamComplete(testMessages, longPrompt, chunk => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should handle streaming with unicode content', async () => {
      const provider = new MockOpenAIProvider(mockConfig);
      const unicodeMessage: ProviderMessage = {
        role: 'user',
        content: '你好世界 مرحبا بالعالم שלום עולם',
      };
      const chunks: StreamChunk[] = [];

      await provider.streamComplete([unicodeMessage], systemPrompt, chunk => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
