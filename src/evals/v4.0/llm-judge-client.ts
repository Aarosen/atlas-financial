/**
 * ATLAS AI v4.0 LLM Judge Client
 * 
 * Integrates with Claude Opus 4 to run all 10 specialized judges
 * on Atlas responses for comprehensive evaluation
 */

import type { JudgeInput, JudgeResult, JudgeType } from './llm-judges';
import { JUDGE_REGISTRY } from './llm-judges';

export interface LLMJudgeClientConfig {
  apiKey: string;
  model: 'claude-opus-4' | 'claude-opus-4-turbo';
  maxRetries: number;
  timeoutMs: number;
}

export interface JudgeEvaluationRequest {
  judge_id: JudgeType;
  input: JudgeInput;
}

export interface JudgeEvaluationResponse {
  judge_id: JudgeType;
  result: JudgeResult;
  evaluation_time_ms: number;
  tokens_used: {
    input: number;
    output: number;
  };
}

export class LLMJudgeClient {
  private config: LLMJudgeClientConfig;
  private evaluationCache: Map<string, JudgeEvaluationResponse> = new Map();

  constructor(config: LLMJudgeClientConfig) {
    this.config = config;
  }

  /**
   * Evaluate a response with a specific judge
   */
  async evaluateWithJudge(request: JudgeEvaluationRequest): Promise<JudgeEvaluationResponse> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    if (this.evaluationCache.has(cacheKey)) {
      return this.evaluationCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    const systemPrompt = JUDGE_REGISTRY[request.judge_id].system_prompt;

    try {
      const response = await this.callClaudeAPI(
        systemPrompt,
        this.formatJudgeInput(request.input)
      );

      const evaluationTime = Date.now() - startTime;
      const result = this.parseJudgeResponse(response.content[0].text);

      const judgeResponse: JudgeEvaluationResponse = {
        judge_id: request.judge_id,
        result,
        evaluation_time_ms: evaluationTime,
        tokens_used: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
        },
      };

      // Cache the result
      this.evaluationCache.set(cacheKey, judgeResponse);

      return judgeResponse;
    } catch (error) {
      throw new Error(`Judge ${request.judge_id} evaluation failed: ${error}`);
    }
  }

  /**
   * Evaluate a response with all relevant judges
   */
  async evaluateWithAllJudges(
    userMessage: string,
    atlasResponse: string,
    input: Partial<JudgeInput> = {}
  ): Promise<JudgeEvaluationResponse[]> {
    const fullInput: JudgeInput = {
      user_message: userMessage,
      atlas_response: atlasResponse,
      ...input,
    };

    const judgeIds: JudgeType[] = [
      'JUDGE-01',
      'JUDGE-02',
      'JUDGE-03',
      'JUDGE-04',
      'JUDGE-05',
      'JUDGE-06',
      'JUDGE-07',
      'JUDGE-08',
      'JUDGE-09',
      'JUDGE-10',
    ];

    const results = await Promise.all(
      judgeIds.map((judge_id) =>
        this.evaluateWithJudge({
          judge_id,
          input: fullInput,
        })
      )
    );

    return results;
  }

  /**
   * Call Claude Opus 4 API
   */
  private async callClaudeAPI(
    systemPrompt: string,
    userMessage: string
  ): Promise<{
    content: Array<{ type: string; text: string }>;
    usage: { input_tokens: number; output_tokens: number };
  }> {
    const maxRetries = this.config.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.config.model,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userMessage,
              },
            ],
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`API error: ${response.status} - ${error}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Format judge input for Claude
   */
  private formatJudgeInput(input: JudgeInput): string {
    const lines: string[] = [];

    if (input.user_message) {
      lines.push(`User message: ${input.user_message}`);
    }
    if (input.atlas_response) {
      lines.push(`Atlas response: ${input.atlas_response}`);
    }
    if (input.user_profile_json) {
      lines.push(`User profile: ${JSON.stringify(input.user_profile_json)}`);
    }
    if (input.topic_type) {
      lines.push(`Topic classification: ${input.topic_type}`);
    }
    if (input.literacy_level) {
      lines.push(`User literacy level: ${input.literacy_level}`);
    }
    if (input.mastered_concepts && input.mastered_concepts.length > 0) {
      lines.push(`Concepts user has already mastered: ${input.mastered_concepts.join(', ')}`);
    }
    if (input.concern_type) {
      lines.push(`User concern type: ${input.concern_type}`);
    }
    if (input.emotional_state) {
      lines.push(`User emotional state (detected): ${input.emotional_state}`);
    }
    if (input.comm_preference) {
      lines.push(`User communication preference: ${input.comm_preference}`);
    }
    if (input.agents_list && input.agents_list.length > 0) {
      lines.push(`Agents invoked: ${input.agents_list.join(', ')}`);
    }
    if (input.tax_profile) {
      lines.push(`User tax situation: ${JSON.stringify(input.tax_profile)}`);
    }
    if (input.investing_experience) {
      lines.push(`User investing experience: ${input.investing_experience}`);
    }
    if (input.risk_profile) {
      lines.push(`User risk profile (if known): ${input.risk_profile}`);
    }
    if (input.user_retirement_profile) {
      lines.push(`User age and retirement timeline: ${JSON.stringify(input.user_retirement_profile)}`);
    }

    return lines.join('\n\n');
  }

  /**
   * Parse judge response JSON
   */
  private parseJudgeResponse(responseText: string): JudgeResult {
    try {
      // Extract JSON from response (may contain explanatory text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        judge_id: parsed.judge_id || 'JUDGE-00',
        overall: parsed.overall || 'FAIL',
        severity: parsed.severity || 'OK',
        deployment_recommendation: parsed.deployment_recommendation || 'ALERT',
        score: parsed.score,
        details: parsed,
      };
    } catch (error) {
      throw new Error(`Failed to parse judge response: ${error}`);
    }
  }

  /**
   * Generate cache key for evaluation
   */
  private generateCacheKey(request: JudgeEvaluationRequest): string {
    const inputHash = JSON.stringify(request.input);
    return `${request.judge_id}:${inputHash}`;
  }

  /**
   * Clear evaluation cache
   */
  clearCache(): void {
    this.evaluationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.evaluationCache.size,
      entries: Array.from(this.evaluationCache.keys()),
    };
  }
}

/**
 * Singleton instance for global use
 */
let judgeClientInstance: LLMJudgeClient | null = null;

export function initializeLLMJudgeClient(config: LLMJudgeClientConfig): LLMJudgeClient {
  judgeClientInstance = new LLMJudgeClient(config);
  return judgeClientInstance;
}

export function getLLMJudgeClient(): LLMJudgeClient {
  if (!judgeClientInstance) {
    throw new Error('LLM Judge Client not initialized. Call initializeLLMJudgeClient first.');
  }
  return judgeClientInstance;
}
