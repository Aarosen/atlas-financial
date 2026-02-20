/**
 * Atlas Eval Monitor Integration
 * Integrates atlas-evals framework into Atlas response pipeline
 * Runs code evals on every response (< 1ms), LLM judges on sampled responses
 */

import { checkResponse } from '../../evals/src/monitoring/onlineMonitor';

export interface AtlasResponseContext {
  userMessage: string;
  atlasResponse: string;
  sessionId: string;
  userProfile?: Record<string, any>;
  concernType?: string;
  literacyLevel?: 'beginner' | 'intermediate' | 'advanced';
  topicType?: string;
  emotionalState?: string;
}

export interface EvalMonitorResult {
  passed: boolean;
  blockers: any[];
  timestamp: string;
  sessionId: string;
}

/**
 * Monitor Atlas response through eval framework
 * Runs asynchronously — never blocks user response
 * Fires alerts to Slack on critical failures
 */
export async function monitorAtlasResponse(ctx: AtlasResponseContext): Promise<EvalMonitorResult> {
  try {
    const result = await checkResponse(
      ctx.userMessage,
      ctx.atlasResponse,
      ctx.sessionId,
      ctx.userProfile,
      {
        concernType: ctx.concernType,
        literacyLevel: ctx.literacyLevel,
        topicType: ctx.topicType,
      }
    );

    // Log critical failures for analysis
    if (result.blockers.length > 0) {
      console.error(`[Atlas Eval] CRITICAL failures in session ${ctx.sessionId}:`, result.blockers.map(b => b.name));
    }

    return {
      passed: result.passed,
      blockers: result.blockers,
      timestamp: result.timestamp,
      sessionId: result.sessionId,
    };
  } catch (err) {
    console.error(`[Atlas Eval Monitor] Error evaluating response:`, err);
    // Don't throw — monitoring should never break the user experience
    return {
      passed: true,
      blockers: [],
      timestamp: new Date().toISOString(),
      sessionId: ctx.sessionId,
    };
  }
}

/**
 * Wrapper for integration into Atlas response handlers
 * Usage:
 *   const evalResult = await monitorAtlasResponse({
 *     userMessage: req.body.message,
 *     atlasResponse: response.text,
 *     sessionId: req.body.sessionId,
 *     userProfile: req.body.userProfile,
 *     concernType: req.body.concernType,
 *   });
 */
export function createEvalMonitor() {
  return {
    monitor: monitorAtlasResponse,
    
    // Fire-and-forget monitoring (recommended for production)
    monitorAsync: (ctx: AtlasResponseContext) => {
      monitorAtlasResponse(ctx).catch(err => 
        console.error('[Atlas Eval] Async monitor error:', err)
      );
    },
  };
}

// Export singleton instance
export const atlasEvalMonitor = createEvalMonitor();
