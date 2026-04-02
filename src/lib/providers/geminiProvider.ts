/**
 * GEMINI PROVIDER
 * 
 * Google Gemini implementation of the LLM provider interface
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

let GoogleGenerativeAI: any;

// Lazy load Google Generative AI to avoid import errors in test environments
try {
  GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (e) {
  // Google Generative AI not installed, will fail at runtime if used
}

export class GeminiProvider extends BaseProvider {
  private client: any;

  constructor(config: ProviderConfig) {
    super(config, 'gemini-2.0-flash');
    this.client = new GoogleGenerativeAI(config.apiKey);
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
    const mergedConfig = this.mergeConfig(config);
    const formattedMessages = this.formatMessages(messages);

    const model = this.client.getGenerativeModel({
      model: mergedConfig.model!,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContent({
      contents: formattedMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: mergedConfig.temperature,
        maxOutputTokens: mergedConfig.maxTokens,
        topP: mergedConfig.topP,
        topK: mergedConfig.topK,
      },
    });

    const content = result.response.text();
    const usageMetadata = result.response.usageMetadata;

    return {
      content,
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
      stopReason: result.response.candidates?.[0]?.finishReason,
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

    const model = this.client.getGenerativeModel({
      model: mergedConfig.model!,
      systemInstruction: systemPrompt,
    });

    const result = await model.generateContentStream({
      contents: formattedMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: mergedConfig.temperature,
        maxOutputTokens: mergedConfig.maxTokens,
        topP: mergedConfig.topP,
        topK: mergedConfig.topK,
      },
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        this.emitChunk(callback, {
          type: 'text',
          content: text,
        });
      }

      const usageMetadata = chunk.usageMetadata;
      if (usageMetadata) {
        inputTokens = usageMetadata.promptTokenCount;
        outputTokens = usageMetadata.candidatesTokenCount;
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
    // Gemini uses approximately 1 token per 4 characters for English text
    // This is a rough estimate; actual token count may vary
    return Math.ceil(text.length / 4);
  }

  getPricing(): {
    inputPer1M: number;
    outputPer1M: number;
  } {
    // Gemini 2.0 Flash pricing (as of 2024)
    return {
      inputPer1M: 0.075, // $0.075 per 1M input tokens
      outputPer1M: 0.3, // $0.3 per 1M output tokens
    };
  }
}
