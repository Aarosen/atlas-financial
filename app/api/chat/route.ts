export const runtime = 'edge';
export const maxDuration = 60;

import type { FinancialState, Strategy } from '@/lib/state/types';
import { inferModelTier } from '@/lib/ai/modelRouting';
import { routeAgentForText } from '@/lib/ai/agentRouter';
import { getPlaybookResponse } from '@/lib/ai/playbooks';
import { complianceResponse, detectComplianceRisk, fallbackAnswer, violatesGuardrails } from '@/lib/server/guardrails';
import { buildAdvancedTopicContext } from '@/lib/ai/advancedTopics';
import { detectComprehensionSignal } from '@/lib/ai/comprehension';
import { culturallyRelevantExample } from '@/lib/ai/culturalExamples';
import { detectLanguage } from '@/lib/ai/multiLanguage';
import { trimPromptSections } from '@/lib/ai/promptTrim';
import { normalizeSlang, type SupportedLanguage } from '@/lib/ai/slangMapper';
import { processUserMessageAdaptively } from '@/lib/ai/conversationAdaptationLayer';
import { isDirectFollowUpQuestion, generateDirectAnswer, shouldReplaceWithDirectAnswer } from '@/lib/ai/directAnswerEngine';
import { extractConversationContext, enhanceWithContextAwareness, assessUrgency, generateContextAwareActions } from '@/lib/ai/contextAwarenessEngine';
import { buildConversationArc, generateSessionSynthesis, isReadyForSynthesis } from '@/lib/ai/conversationArcEngine';
import { detectCrisisSignals, generateCrisisResponse } from '@/lib/ai/crisisDetectionEngine';
import { extractCulturalContext, adjustBudgetForObligations, generateCulturalAcknowledgment } from '@/lib/ai/culturalFinanceEngine';
import { detectObjections, buildObjectionAwareRecommendation } from '@/lib/ai/objectionHandlingEngine';
import { detectAppropriateTone, generatePersonalityPrompt, injectPersonality } from '@/lib/ai/tonePersonalityEngine';
import { buildToolkitContext } from '@/lib/ai/financialToolkit';
import { atlasEvalMonitor } from '@/lib/monitoring/atlasEvalMonitor';
import { maybeQueueFailureSample } from '@/lib/monitoring/failureSampler';
import { captureException, captureMessage, addBreadcrumb, setUserContext } from '@/lib/monitoring/sentry';
import { atlasEngineOrchestrator } from '@/lib/ai/engines';
import { ATLAS_SYSTEM_PROMPT } from '@/lib/ai/atlasSystemPrompt';
import { extractFinancialSnapshot } from '@/lib/ai/financialExtractor';
import { shouldGateExtraction } from '@/lib/ai/extractionGate';
import { runCalculations, formatCalculationBlock } from '@/lib/calculations/sprint1';
import { calculateFinancials, formatAffordabilityBlock, formatBudgetBlock, formatEmergencyFundBlock, formatInvestmentBlock, formatRetirementBlock } from '@/lib/ai/financialCalculations';
import { formatDebtPayoffBlock } from '@/lib/ai/debtPayoffCalculations';
import { cleanAtlasResponse } from '@/lib/ai/responsePostprocessor';
import { validateFinancialSnapshot, buildValidationPrompt } from '@/lib/ai/financialValidation';
import { compressConversationHistory, formatCompressedMemory } from '@/lib/ai/contextWindowExtension';
import { sanitizeMemorySummary } from '@/lib/ai/memorySanitizer';
import { classifyUserIntent } from '@/lib/ai/intentClassifier';
import { buildSystemPrompt } from '@/lib/ai/systemPromptBuilder';
import { 
  buildCompanionSystemPromptContext, 
  processUserMessageForCompanion, 
  processAtlasResponseForCompanion, 
  endCompanionSession 
} from '@/lib/ai/companionIntegration';
import { injectNudgeIfAppropriate } from '@/lib/notifications/nudgeInjection';
import { loadUserContext } from '@/lib/db/userContext';
import { initializeConversationSession } from '@/lib/db/supabaseIntegration';
import { buildStrategyContextBlock } from '@/lib/ai/strategyContextBuilder';
import { applyRateLimit } from './rateLimitMiddleware';
import { checkRateLimitKv } from '@/lib/api/rateLimitKv';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const FALLBACK_MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6'] as const;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_GUEST = 20; // 20 requests per minute for guests
const RATE_LIMIT_AUTHENTICATED = 100; // 100 requests per minute for authenticated users
const RATE_WINDOW = 60_000; // 1 minute

type EmotionTag = 'anxious' | 'ashamed' | 'analytical' | 'motivated' | 'uncertain' | 'neutral';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es', 'fr', 'zh'];

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

function checkRateLimit(identifier: string, isAuthenticated: boolean = false) {
  const now = Date.now();
  const limit = isAuthenticated ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_GUEST;
  const entry = rateLimitMap.get(identifier) || { count: 0, resetAt: now + RATE_WINDOW };
  
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW;
  }
  entry.count++;
  rateLimitMap.set(identifier, entry);
  return entry.count <= limit;
}

function streamStaticResponse(text: string, meta: { model: string; tier: string; guardrail?: string }) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
      controller.enqueue(
        enc.encode(
          `data: ${JSON.stringify({ done: true, model: meta.model, tier: meta.tier, guardrail: meta.guardrail })}\n\n`
        )
      );
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-financial.vercel.app',
    },
  });
}

async function runSelfCheck(args: {
  apiKey: string;
  model: string;
  userMessage: string;
  atlasResponse: string;
}) {
  const system = `You are Atlas' self-check layer. Review the draft response for:
- math errors or missing calculations
- missing required question
- safety/compliance risks
- prompt compliance violations ("as an AI", multiple questions)

Return JSON only:
{"needs_revision": true|false, "revised_response": "...", "issues": ["..."]}`;

  const messages = [
    {
      role: 'user',
      content: `USER MESSAGE:\n${args.userMessage}\n\nDRAFT RESPONSE:\n${args.atlasResponse}`,
    },
  ];

  try {
    const response = await callAnthropic({
      apiKey: args.apiKey,
      model: args.model,
      maxTokens: 500,
      system,
      messages,
    });

    if (!response.ok) return { text: args.atlasResponse, revised: false };
    const data: any = await response.json();
    const text = data.content?.[0]?.text || '';
    const clean = String(text).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { needs_revision?: boolean; revised_response?: string };
    if (parsed.needs_revision && parsed.revised_response) {
      return { text: parsed.revised_response.trim(), revised: true };
    }
  } catch {
    // fall through
  }

  return { text: args.atlasResponse, revised: false };
}

function detectEmotion(messages: Array<{ role: string; content: string }>): EmotionTag {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const t = String(lastUser?.content || '').toLowerCase();
  if (!t) return 'neutral';
  if (/\b(overwhelmed|stressed|panic|anxious|worried|freaking out|nervous|scared)\b/.test(t)) return 'anxious';
  if (/\b(embarrassed|ashamed|guilty|stupid|dumb|terrible with money|failure|behind)\b/.test(t)) return 'ashamed';
  if (/\b(roi|apr|yield|basis points|allocation|portfolio|cashflow|net)\b/.test(t)) return 'analytical';
  if (/\b(ready|motivated|let's do this|let us do this|excited|driven|committed)\b/.test(t)) return 'motivated';
  if (/\b(not sure|confused|lost|no idea|unsure|don't know)\b/.test(t)) return 'uncertain';
  return 'neutral';
}

function hasDisclaimer(messages: Array<{ role: string; content: string }>) {
  return messages.some(
    (m) =>
      m.role === 'assistant' &&
      /financial advisor|financial advice|personalized professional advice/i.test(String(m.content || ''))
  );
}

function jsonOk(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-financial.vercel.app',
    },
    ...init,
  });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-financial.vercel.app',
    },
  });
}

async function readUpstreamErrorBody(r: Response) {
  try {
    const t = await r.text();
    return t.slice(0, 2000);
  } catch {
    return '';
  }
}

async function callAnthropic(args: {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: any[];
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000); // 25s server-side limit
  try {
    const claudeResponse = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': args.apiKey,
        Authorization: `Bearer ${args.apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: args.model,
        max_tokens: args.maxTokens,
        system: args.system,
        messages: args.messages,
      }),
      signal: controller.signal,
    });

    // AUDIT 5 FIX: Add OpenAI fallback for non-streaming calls (data extraction, direct answers)
    // Claude rate limits (429), auth failures (401), and bad gateway (502) should fall back to OpenAI
    if (!claudeResponse.ok && process.env.OPENAI_API_KEY) {
      return await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          max_tokens: args.maxTokens,
          messages: [
            { role: 'system', content: args.system },
            ...args.messages,
          ],
        }),
        signal: controller.signal,
      });
    }

    return claudeResponse;
  } catch (claudeNetworkError) {
    // Network-level exception: try OpenAI fallback
    if (process.env.OPENAI_API_KEY) {
      return await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          max_tokens: args.maxTokens,
          messages: [
            { role: 'system', content: args.system },
            ...args.messages,
          ],
        }),
        signal: controller.signal,
      });
    }
    throw claudeNetworkError;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callAnthropicStream(args: {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: any[];
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000); // 25s server-side limit
  try {
    // AUDIT 3 FIX: Implement real provider fallback with HTTP error detection
    // fetch() does not throw on HTTP errors (429, 401, 404, 502) — it returns a Response with ok === false
    // Must check response.ok to detect rate limiting, auth failures, and other HTTP errors
    try {
      const claudeResponse = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': args.apiKey,
          Authorization: `Bearer ${args.apiKey}`,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: args.model,
          max_tokens: args.maxTokens,
          system: args.system,
          messages: args.messages,
          stream: true,
        }),
        signal: controller.signal,
      });

      // Check for HTTP errors (429 rate limit, 401 auth, 404 not found, 502 bad gateway, etc.)
      if (!claudeResponse.ok && process.env.OPENAI_API_KEY) {
        console.warn('[provider_fallback] Claude HTTP error', claudeResponse.status, '— attempting OpenAI fallback');
        return await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo',
            max_tokens: args.maxTokens,
            messages: [
              { role: 'system', content: args.system },
              ...args.messages,
            ],
            stream: true,
          }),
          signal: controller.signal,
        });
      }

      // Return Claude response (success or error that we can't fallback from)
      return claudeResponse;
    } catch (claudeNetworkError) {
      // Network-level exceptions: DNS failure, connection refused, timeout, etc.
      if (process.env.OPENAI_API_KEY) {
        console.warn('[provider_fallback] Claude network error, attempting OpenAI fallback:', claudeNetworkError);
        return await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo',
            max_tokens: args.maxTokens,
            messages: [
              { role: 'system', content: args.system },
              ...args.messages,
            ],
            stream: true,
          }),
          signal: controller.signal,
        });
      }
      // If no fallback available, rethrow network error
      throw claudeNetworkError;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const notConfigured = () =>
    jsonError(
      500,
      'API not configured. Set ANTHROPIC_API_KEY (locally in .env.local, and in Vercel Environment Variables for deploys).'
    );

  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    captureException(error, { context: 'chat_route_json_parse' });
    return jsonError(400, 'Invalid JSON body');
  }

  let { type, messages, missing, question, memorySummary, language, fin, extractedFields, sessionState, lastQuestion, answered, userId, sessionId, baseline, activeLever, activeTier } = body as {
    type?: string;
    messages?: any[];
    missing?: string[];
    question?: string;
    memorySummary?: string;
    language?: SupportedLanguage;
    fin?: Record<string, any>;
    extractedFields?: Record<string, unknown>;
    sessionState?: Record<string, any>;
    lastQuestion?: string;
    answered?: Record<string, boolean>;
    userId?: string;
    sessionId?: string;
    baseline?: any;
    activeLever?: string;
    activeTier?: string;
  };

  // Set user context for error monitoring
  if (userId && userId !== 'guest') {
    setUserContext(userId);
    addBreadcrumb(`Chat request from user ${userId}`, 'chat', 'info', { sessionId });
  }

  // RATE LIMITING: Per-user limits (higher for authenticated users)
  // Use userId if available, otherwise use IP address
  const isAuthenticated = !!(userId && userId !== 'guest');
  const rateLimitIdentifier = isAuthenticated ? (userId as string) : ip;
  
  // Check distributed KV rate limit first (persists across cold starts)
  const kvRateLimitResult = await applyRateLimit(req, rateLimitIdentifier, isAuthenticated);
  const rateLimitRemaining = kvRateLimitResult.remaining ?? 30;
  if (!kvRateLimitResult.allowed && kvRateLimitResult.response) {
    captureMessage('Rate limit exceeded (KV)', 'warning', { userId, ip });
    return kvRateLimitResult.response;
  }
  
  // Fall back to in-memory check as fast pre-check
  if (!checkRateLimit(rateLimitIdentifier, isAuthenticated)) {
    captureMessage('Rate limit exceeded (in-memory)', 'warning', { userId, ip });
    return jsonError(429, 'Too many requests. Please wait a moment.');
  }

  // COMPANION INTEGRATION: Initialize session for authenticated users only
  // CRITICAL: Must check userId !== 'guest' — guests are not in auth.users, Supabase call hangs
  // CRITICAL: Must use Promise.race with timeout — bare await hangs entire Edge Function if Supabase is slow
  if (userId && userId !== 'guest' && !sessionId && type === 'chat' && messages && messages.length <= 1) {
    const sessionInitTimeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn('[companion] Session init timeout - continuing without sessionId');
        resolve();
      }, 3000);
    });

    const sessionInitPromise = (async () => {
      try {
        const newSession = await initializeConversationSession(userId);
        sessionId = newSession.id;
        console.log(`[companion] Initialized session ${sessionId} for user ${userId}`);
      } catch (error) {
        console.error('Error initializing companion session:', error);
      }
    })();

    await Promise.race([sessionInitPromise, sessionInitTimeout]);
  }

  // MEMORY INTEGRATION: Load prior context from Supabase for cross-session memory
  // This enables the AI to reference prior financial data and goals across device/session boundaries
  let priorContextBlock = '';
  if (userId && userId !== 'guest' && type === 'chat') {
    const priorContextTimeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        console.warn('[memory] Prior context load timeout - continuing without prior context');
        resolve();
      }, 2000);
    });

    const priorContextPromise = (async () => {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseServiceKey) {
          console.warn('[memory] Supabase not configured for prior context');
          return;
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Fetch most recent financial snapshot
        const { data: snapshots } = await supabase
          .from('financial_snapshots')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1);

        const latestSnapshot = snapshots?.[0];

        // Fetch active goals
        const { data: goals } = await supabase
          .from('user_goals')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        // Fetch overdue actions for accountability loop
        const { data: overdueActions } = await supabase
          .from('user_actions')
          .select('action_text, check_in_due_at, status, action_category')
          .eq('user_id', userId)
          .in('status', ['recommended', 'committed'])
          .lt('check_in_due_at', new Date().toISOString())
          .order('check_in_due_at', { ascending: true })
          .limit(3);

        // Build prior context block
        if (latestSnapshot || (goals && goals.length > 0) || (overdueActions && overdueActions.length > 0)) {
          let contextParts = ['[PRIOR_CONTEXT]'];
          
          if (latestSnapshot) {
            contextParts.push(`Financial Snapshot: Monthly income $${latestSnapshot.monthly_income}, expenses $${latestSnapshot.essential_expenses}, savings $${latestSnapshot.total_savings}, high-interest debt $${latestSnapshot.high_interest_debt}, low-interest debt $${latestSnapshot.low_interest_debt}`);
          }
          
          if (goals && goals.length > 0) {
            const goalSummary = goals.map((g: any) => `${g.goal_label || g.goal_type} (${g.goal_type})`).join(', ');
            contextParts.push(`Active Goals: ${goalSummary}`);
          }

          if (overdueActions && overdueActions.length > 0) {
            contextParts.push('OVERDUE COMMITMENTS (user agreed to these but hasn\'t reported back):');
            overdueActions.forEach((a: any, i: number) => {
              const daysOverdue = Math.floor(
                (Date.now() - new Date(a.check_in_due_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              contextParts.push(`${i + 1}. "${a.action_text}" — ${daysOverdue} day(s) overdue`);
            });
            contextParts.push('IMPORTANT: Ask the user about their progress on these commitments early in the conversation. Do not skip this.');
          }
          
          priorContextBlock = '\n\n' + contextParts.join('\n');
        }
      } catch (error) {
        console.error('[memory] Error loading prior context:', error);
      }
    })();

    await Promise.race([priorContextPromise, priorContextTimeout]);
  }

  if (!type || !['extract', 'chat', 'answer', 'answer_stream', 'answer_explain', 'answer_explain_stream'].includes(type)) {
    return jsonError(400, 'Invalid request type.');
  }

  if (!apiKey) {
    return notConfigured();
  }

  const tier = inferModelTier({ type: type || '', question, messages });
  const requestedModel = process.env.ANTHROPIC_MODEL;
  const premiumModel = process.env.ANTHROPIC_MODEL_PREMIUM || requestedModel || DEFAULT_MODEL;
  const lightModel = process.env.ANTHROPIC_MODEL_LIGHT || requestedModel || DEFAULT_MODEL;
  const tierModel = tier === 'premium' ? premiumModel : lightModel;
  const modelCandidates = Array.from(
    new Set([tierModel, requestedModel, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(Boolean) as string[])
  );

  if (!messages || !Array.isArray(messages)) {
    return jsonError(400, 'messages array is required');
  }

  if (type === 'chat') {
    if (!missing || !Array.isArray(missing)) {
      return jsonError(400, 'missing must be an array');
    }
    // Note: missing.length === 0 is valid — orchestrator handles discovery completion
  }

  if (type === 'answer' || type === 'answer_stream' || type === 'answer_explain' || type === 'answer_explain_stream') {
    if (!question || !String(question).trim()) {
      return jsonError(400, 'question is required');
    }
  }

  if (type === 'answer' || type === 'answer_stream' || type === 'answer_explain' || type === 'answer_explain_stream') {
    const risk = detectComplianceRisk(String(question || ''));
    if (risk) {
      const safe = complianceResponse(String(question || ''), risk);
      if (type === 'answer_stream' || type === 'answer_explain_stream') {
        return streamStaticResponse(safe, { model: 'policy', tier, guardrail: 'compliance' });
      }
      return jsonOk({ text: safe, source: 'compliance_guardrail', model: 'policy', tier });
    }
    // Disabled playbooks to allow natural, adaptive Claude responses instead of rigid templates
    // if (type === 'answer_explain' || type === 'answer_explain_stream') {
    //   const pb = getPlaybookResponse(String(question || ''));
    //   if (pb) {
    //     if (type === 'answer_explain_stream') {
    //       return streamStaticResponse(pb.body, { model: 'playbook', tier, guardrail: 'playbook' });
    //     }
    //     return jsonOk({ text: pb.body, source: 'playbook', model: 'playbook', tier });
    //   }
    // }
  }

  const lastUserText = String((messages || []).slice(-1)[0]?.content || question || '').trim();
  
  // REMEDIATION 3: Gate extraction to data-bearing messages only
  // If extraction is requested but message contains no financial data, skip extraction and route to chat instead
  if (type === 'extract' && shouldGateExtraction(lastUserText)) {
    // AUDIT 12 FIX DEFECT-02: Diagnostic log to identify negative cashflow routing failure
    console.log('[extraction_gate] shouldGate: true, text:', lastUserText.substring(0, 100));
    console.log('[extraction_gate] Skipping extraction — no financial data detected. Routing to chat instead.');
    // Return empty extraction result — frontend will skip confirmation card and go straight to chat
    return jsonOk({ fields: {}, source: 'extraction_gated', model: DEFAULT_MODEL, tier: 'light' });
  }
  
  // AUDIT 12 FIX DEFECT-02: Log when extraction proceeds (to confirm gate is not blocking valid messages)
  if (type === 'extract') {
    console.log('[extraction_gate] shouldGate: false, proceeding with extraction. text:', lastUserText.substring(0, 100));
  }
  
  const preferredLanguage = isSupportedLanguage(language) ? language : null;
  const detectedLang = (preferredLanguage || detectLanguage(lastUserText)) as SupportedLanguage;

  const lastQuestionContext = lastQuestion ? `\nLAST QUESTION ASKED: "${lastQuestion}"\nUse this context to understand what the user is responding to.` : '';
  
  const extractPrompt = `You are Atlas's financial data extraction engine.
Your only job is to identify financial facts from conversational text and return them as structured JSON.${lastQuestionContext}

EXTRACTION RULES:
- Extract ONLY values explicitly stated or clearly implied in the message.
- Never infer, estimate, or fabricate values not present in the text.
- If a user says "about $4k" or "roughly $4,000" — extract 4000.
- "I have no savings" → totalSavings: 0. "No debt" or "No other debt" → highInterestDebt: 0, lowInterestDebt: 0.
- CRITICAL: For negative cashflow scenarios (expenses > income), extract BOTH income AND expenses even if user mentions deficit. Example: "I make $3,200 but spend $4,100" → monthlyIncome: 3200, essentialExpenses: 4100 (NOT as deficit).
- DEBT NEGATIONS (user explicitly says NO to a debt type):
  * If last question asked about credit cards/high-interest debt and user says "No", "No I don't", "Nope", "None" → highInterestDebt: 0
  * If last question asked about student loans/car loans/other debt and user says "No", "No I don't", "Nope", "None" → lowInterestDebt: 0
  * "No credit card debt" or "No high-interest debt" → highInterestDebt: 0
  * "No student loans" or "No car loans" or "No low-interest debt" → lowInterestDebt: 0
- CRITICAL: Extract debt amounts from ANY mention of debt. "$8,000 credit card debt" → highInterestDebt: 8000. "$15k student loans" → lowInterestDebt: 15000.
- CRITICAL: Only set debt to 0 if user EXPLICITLY says "no" or "I don't have" in response to a debt question. If user doesn't mention debt at all, OMIT the field entirely (don't default to 0).
- CRITICAL: "I have $X left over" or "I have $X surplus" or "after essentials I have $X" → this is SURPLUS, NOT income. Extract as essentialExpenses = (monthlyIncome - surplus). Do NOT extract as monthlyIncome.
- Annual salary → divide by 12 for monthlyIncome.
- "Take-home" / "after tax" / "net" → use as monthlyIncome.
- Value ranges ("$3,000–$3,500") → use the midpoint.
- "k" or "thousand" suffix → multiply by 1000.
- Understand casual/slang language: "broke" = no money, "stash" = savings, "gig" = side income, etc.

FIELDS TO EXTRACT (omit any you cannot confidently extract):
- monthlyIncome: number (monthly take-home / net income, in dollars)
- monthlyIncomeMin: number (AUDIT 16 FIX: If user has variable/irregular income, extract the LOW end of the range. Example: "some months $2k, some months $8k" → monthlyIncomeMin: 2000, monthlyIncomeMax: 8000. If income is fixed, omit these fields.)
- monthlyIncomeMax: number (AUDIT 16 FIX: If user has variable/irregular income, extract the HIGH end of the range.)
- incomeType: string (AUDIT 16 FIX: If user mentions variable/irregular/freelance/gig income, set to "variable". Otherwise omit.)
- essentialExpenses: number (monthly non-negotiable expenses: rent, utilities, groceries, insurance, minimum debt payments)
- discretionaryExpenses: number (monthly lifestyle spending: dining, subscriptions, entertainment, clothing)
- totalSavings: number (total accessible savings and cash holdings)
- retirementSavings: number (401k, IRA, Roth IRA, pension, or other retirement account balances; extract from phrases like "I have $50k in my 401k" or "$200k in retirement accounts"; omit if not stated)
- employerMatchPercent: number (AUDIT 17 FIX: If user mentions employer 401k match, extract as percentage. Example: "employer matches up to 4%" → 4. Omit if not stated.)
- currentlyContributing: boolean (AUDIT 17 FIX: If user states whether they're currently contributing to 401k/retirement plan. Omit if not stated.)
- incomeGrowthSignal: boolean (AUDIT 17 FIX: Set to true if user mentions side income, freelancing, promotion, part-time work, or skills. Omit if not present.)
- emotionalDistressSignal: boolean (AUDIT 18 FIX: Set to true if user message contains distress signals: can't sleep, overwhelmed, anxious, scared, don't know where to start, stressed, worried, hopeless. Omit if not present.)
- highInterestDebt: number (total balance of debts above ~7% APR: credit cards, personal loans)
- lowInterestDebt: number (total balance of debts at or below ~7% APR: student loans, car loans, mortgage)
- highInterestDebtAPR: number (APR/interest rate of high-interest debt; extract from phrases like "23% APR", "18% interest", "my credit card rate is 21%"; omit if not stated)
- lowInterestDebtAPR: number (APR/interest rate of low-interest debt; extract from phrases like "4.5% student loan", "2.9% car loan"; omit if not stated)
- monthlyDebtPayments: number (total minimum monthly payments across all debt)
- proposedPayment: number (monthly payment amount for a specific purchase being evaluated; extract ONLY when user is evaluating a specific purchase like 'I want to buy a house with a $2,500/month payment' or 'the car payment would be $450/month' or 'the apartment is $1,800/month'; omit if user is not evaluating a specific purchase)
- primaryGoal: one of "stability" | "growth" | "flexibility" | "wealth_building"
  (stability/security → "stability", investing/returns → "growth",
   freedom/liquid → "flexibility", FIRE/retire early/wealth → "wealth_building")
- timeHorizonYears: number (how many years out the user is planning)
- riskTolerance: one of "cautious" | "balanced" | "growth"
  (conservative/careful → "cautious", moderate/middle → "balanced", aggressive/bold → "growth")
- biggestConcern: string (brief phrase capturing their stated concern, 5 words max)

OUTPUT: Return pure JSON only. No markdown, no commentary, no explanation.
Return {} if nothing can be confidently extracted.

EXAMPLE:
Input: "I take home about $5,500/month. My rent is $1,800, groceries and bills maybe $800 more. I've got around $6k saved and $4,200 on a credit card. No other debt."
Output: {"monthlyIncome":5500,"essentialExpenses":2600,"totalSavings":6000,"highInterestDebt":4200,"lowInterestDebt":0}`;

  const missingFields = (missing || []).join(', ');

  const memoryContext = memorySummary ? `\n\nUSER MEMORY SUMMARY:\n${sanitizeMemorySummary(String(memorySummary).trim())}` : '';
  const agentContext = lastUserText
    ? `\n\nPRIMARY AGENT: ${routeAgentForText(lastUserText).label}. Use this domain expertise unless another agent is required.`
    : '';
  const languageForPrompt = preferredLanguage || detectLanguage(lastUserText);
  const languageContext = `\n\nLANGUAGE: ${languageForPrompt}. Use the simplest possible wording.`;
  const exampleContext = `\n\nCULTURAL EXAMPLE: ${culturallyRelevantExample(lastUserText)}`;
  const advancedContext = buildAdvancedTopicContext((body as any)?.fin || {})
    ? `\n\nADVANCED TOPIC CONTEXT: ${buildAdvancedTopicContext((body as any)?.fin || {})}`
    : '';
  const toolkitContextValue = buildToolkitContext((body as any)?.fin || {});
  const toolkitContext = toolkitContextValue ? `\n\nFINANCIAL TOOLKIT:\n${toolkitContextValue}` : '';
  const compSignal = detectComprehensionSignal(lastUserText);
  const comprehensionContext = compSignal
    ? `\n\nCOMPREHENSION SIGNAL: ${compSignal}. If low, simplify. If high, you may go deeper.`
    : '';
  const emotionTag = detectEmotion(messages);
  const emotionContext = `\n\nUSER EMOTION TAG: ${emotionTag}.`;
  const disclaimerContext = `\n\nDISCLAIMER_NEEDED: ${hasDisclaimer(messages) ? 'no' : 'yes'}. Only include the disclaimer if needed.`;
  
  // Detect appropriate tone based on conversation context
  const lastUserMessage = messages[messages.length - 1]?.content || '';
  const hasProgress = messages.length > 5; // Simple heuristic: longer conversation = progress
  const isFirstMessage = messages.length <= 1;
  const emotionalState = emotionTag === 'anxious' || emotionTag === 'ashamed' ? 'stressed' : emotionTag === 'motivated' ? 'positive' : 'neutral';
  const appropriateTone = detectAppropriateTone(lastUserMessage, {
    isCrisis: false, // Simplified: crisis detection happens separately in orchestrator
    hasProgress,
    isFirstMessage,
    emotionalState,
  });
  // Note: personalityPrompt removed - ATLAS_SYSTEM_PROMPT already defines personality completely
  // Tone detection (appropriateTone) can be used to adjust sessionStateBlock instructions instead
  
  const systemPrompt = type === 'extract'
    ? extractPrompt
    : trimPromptSections(
        [
          ATLAS_SYSTEM_PROMPT,
          priorContextBlock,
          memoryContext,
          emotionContext,
          disclaimerContext,
          agentContext,
          advancedContext,
          toolkitContext,
          comprehensionContext,
          languageContext,
          exampleContext,
        ],
        4200
      );
  
  // AUDIT 13 FIX DEFECT-02: Add extraction-level logging to identify failure point
  if (type === 'extract') {
    console.log('[extract] mode:', type, 'lastQuestion:', lastQuestion?.substring(0, 50));
    console.log('[extract] userText:', lastUserText.substring(0, 100));
  }
  const maxTokens =
    type === 'extract'
      ? 500
      : type === 'answer'
        ? 220
        : type === 'answer_stream'
          ? 260
          : type === 'answer_explain' || type === 'answer_explain_stream'
            ? 700
            : 1200;

  // AUDIT 17 FIX P0: Triage Mode - detect financial crisis level
  type TriageLevel = 'crisis' | 'stabilize' | 'growth' | 'optimize';
  
  const getTriageLevel = (fin: Partial<FinancialState>): TriageLevel => {
    const income = fin.monthlyIncome || 0;
    const expenses = fin.essentialExpenses || 0;
    const surplus = income - expenses;
    const surplusRatio = income > 0 ? surplus / income : 0;
    const savings = fin.totalSavings || 0;
    const hiDebt = fin.highInterestDebt || 0;
    const emergencyTarget = expenses * 3;
    
    // Crisis: negative cashflow, no buffer with debt, or extreme thin margin
    if (surplus < 0) return 'crisis';
    if (surplusRatio < 0.05 || (savings < expenses && hiDebt > 0)) return 'crisis';
    
    // Stabilize: thin margin or underfunded emergency fund
    if (surplusRatio < 0.15 || savings < emergencyTarget) return 'stabilize';
    
    // Growth: has debt to pay down
    if (hiDebt > 0) return 'growth';
    
    // Optimize: healthy position, focus on optimization
    return 'optimize';
  };

  // Build context-aware answer prompt that includes confirmed financial profile
  const buildAnswerPrompt = (fin?: Partial<FinancialState> | null, baseline?: Strategy | null, activeLever?: string | null, activeTier?: string | null) => {
    const triageLevel = fin ? getTriageLevel(fin) : 'optimize';
    
    // AUDIT 18 FIX P0: Move PARTIAL INFO PROTOCOL to position 0 with anti-examples
    let prompt = `You are Atlas. Answer the user's question briefly and clearly.

HARD OUTPUT CONSTRAINTS (must follow exactly):
- Max 2 sentences
- No markdown, no formatting
- Direct answer only
- Never ask for more information`;

    // AUDIT 18 FIX P1: EMOTIONAL INTELLIGENCE GATE at position 0 (before all financial instructions)
    const emotionalDistressSignal = (fin as any)?.emotionalDistressSignal || false;
    if (emotionalDistressSignal) {
      prompt += `\n\nEMOTIONAL INTELLIGENCE GATE (POSITION 0 — ABSOLUTE PRIORITY):
ABSOLUTE RULE: If the user expressed emotional distress, fear, stress, overwhelm, loss of sleep, or hopelessness — your FIRST sentence MUST acknowledge their feeling. This is non-negotiable.
Do NOT start with numbers, percentages, or recommendations.
ONE sentence acknowledgment only. Then proceed with analysis.
Examples of correct acknowledgments:
- "That kind of stress is real — carrying debt while trying to sleep is genuinely hard."
- "Feeling overwhelmed about money is one of the most common experiences there is, and it doesn't mean you're stuck."
- "The fact that you're looking at this directly, even though it feels overwhelming, puts you ahead of most people in the same spot."`;
    }

    // AUDIT 18 FIX P0: PARTIAL INFO PROTOCOL at position 0 with explicit anti-examples
    if (fin && fin.monthlyIncome && !fin.essentialExpenses) {
      prompt += `\n\nPARTIAL INFO PROTOCOL (POSITION 0 — HIGHEST PRIORITY):
User provided income but NOT expenses. Your ONLY output is ONE focused question asking for their essential spending estimate.
MANDATORY: Do NOT produce budget templates, do NOT assign tracking homework, do NOT explain why tracking matters, do NOT ask about goals.
WRONG RESPONSE: "That's really common! Here's what I'd suggest: First, go through your bank statements for the last month and categorize every transaction into rent, food, transportation..."
RIGHT RESPONSE: "Roughly what do you spend on essentials — rent, food, transportation, utilities — each month? A ballpark is fine."
Your response must be ONLY the question. Nothing else.`;
    }

    prompt += `\n\nAUDIT 17 FIX P0 - TRIAGE MODE:
If triageLevel is 'crisis': BEGIN with EXACTLY: "You're in financial triage right now. Here's the one move that stabilizes everything:" followed by exactly one action. Do not present a lever menu. Do not discuss optimization.
If triageLevel is 'stabilize': BEGIN with EXACTLY: "You're close to stable — one move gets you there:" before presenting the primary recommendation.
If triageLevel is 'growth' or 'optimize': Use standard response format.`;

    if (fin && (fin.monthlyIncome || fin.essentialExpenses)) {
      const surplus = (fin.monthlyIncome || 0) - (fin.essentialExpenses || 0);
      // AUDIT 16 FIX DEFECT-15-NEG-CASHFLOW-502: Guard against negative surplus in string interpolation
      const safeSurplus = Math.max(-999999, Math.min(999999, surplus)); // Clamp to prevent extreme values
      const surplusDisplay = surplus < 0 ? `deficit of $${Math.abs(surplus)}` : `surplus $${safeSurplus}`;
      prompt += `\n\nUSER PROFILE: Monthly income $${fin.monthlyIncome}, expenses $${fin.essentialExpenses}, ${surplusDisplay}, triage level: ${triageLevel}.`;
      
      // AUDIT 17 FIX P1: Additional PARTIAL INFO checks for secondary scenarios
      const hasIncome = (fin.monthlyIncome || 0) > 0;
      const hasExpenses = (fin.essentialExpenses || 0) > 0;
      const hasSavings = (fin.totalSavings || 0) > 0;
      const hasDebt = (fin.highInterestDebt || 0) > 0 || (fin.lowInterestDebt || 0) > 0;
      
      if (hasIncome && hasExpenses && !hasSavings && !hasDebt) {
        prompt += `\n\nPARTIAL INFO PROTOCOL: User provided income and expenses but NOT savings or debt. Ask: "Do you have any savings or emergency fund?" and "Any debt — credit cards, student loans, car loans?" Build the picture conversationally, not via homework assignment.`;
      }
      
      // AUDIT 12 FIX DEFECT-09: Add cushion status to prevent recommending funded emergency fund
      const monthlyEssentials = fin.essentialExpenses || 0;
      const cushionTarget = monthlyEssentials * 3;
      const totalSavings = fin.totalSavings || 0;
      // AUDIT 13 FIX DEFECT-09-FORMATTING: Format cushion status values with currency
      const cushionStatus = totalSavings >= cushionTarget
        ? `EMERGENCY CUSHION: FUNDED ($${totalSavings.toLocaleString()} savings vs. $${cushionTarget.toLocaleString()} target). Do NOT recommend building an emergency fund.`
        : `EMERGENCY CUSHION: UNDERFUNDED ($${totalSavings.toLocaleString()} savings vs. $${cushionTarget.toLocaleString()} needed).`;
      prompt += `\n\n${cushionStatus}`;
      
      // AUDIT 13 FIX DEFECT-RETIREMENT: Add retirement context to system prompt
      if (fin.retirementSavings !== null && fin.retirementSavings !== undefined) {
        prompt += `\n\nRETIREMENT SAVINGS: User has $${fin.retirementSavings.toLocaleString()} in retirement accounts. When discussing financial goals, reference their retirement balance and provide retirement-specific guidance.`;
      }
      
      // AUDIT 17 FIX P1: Employer match detection and priority
      const employerMatchPercent = (fin as any).employerMatchPercent || null;
      const currentlyContributing = (fin as any).currentlyContributing || null;
      if (employerMatchPercent && employerMatchPercent > 0) {
        const freeMoneyForfeited = Math.round((fin.monthlyIncome || 0) * employerMatchPercent / 100);
        const matchStatus = currentlyContributing === false 
          ? `EMPLOYER MATCH ALERT: User is NOT currently contributing. Employer offers ${employerMatchPercent}% match = $${freeMoneyForfeited}/month FREE MONEY being forfeited. This is ALWAYS priority #1 before any other financial move.`
          : `EMPLOYER MATCH: User has ${employerMatchPercent}% employer match available (${currentlyContributing ? 'currently contributing' : 'status unknown'}).`;
        prompt += `\n\n${matchStatus}`;
      }
      
      // AUDIT 18 FIX P2: APR assumption disclosure with mandatory inclusion
      const hiAprAssumed = !fin.highInterestDebtAPR && (fin.highInterestDebt || 0) > 0;
      if (hiAprAssumed) {
        prompt += `\n\nAPR ASSUMPTION DISCLOSURE (AUDIT 18): High-interest debt APR not provided by user. Any interest calculations use ~18-23% estimated APR. MANDATORY: You MUST include the exact phrase: (estimated at ~18-23% typical APR — check your statement for the real number). This phrase is MANDATORY when APR was not stated. If you omit it, you are presenting a false-precision calculation as fact.`;
      }
    }

    // AUDIT 11 FIX DEFECT-06: Use activeLever/activeTier if provided, otherwise fall back to baseline
    const leverToUse = activeLever || baseline?.lever;
    if (leverToUse) {
      prompt += `\n\nACTIVE RECOMMENDATION: ${leverToUse.replace(/_/g, ' ')}. Your response must reinforce this recommendation and not suggest contradictory strategies.`;

      if (baseline && fin) {
        const surplus = (fin.monthlyIncome || 0) - (fin.essentialExpenses || 0);
        // AUDIT 16 FIX DEFECT-15-NEG-CASHFLOW-502: Guard against negative surplus display
        const safeSurplus = Math.max(-999999, Math.min(999999, surplus));
        const surplusLine = surplus < 0 ? `- Monthly deficit: $${Math.abs(safeSurplus)}` : `- Monthly surplus: $${safeSurplus}`;
        prompt += `\n\nATLAS RECOMMENDATION:
- Recommended lever: ${baseline.lever}
- Urgency: ${baseline.urgency}
${surplusLine}`;
        
        // AUDIT 14 FIX GAP-01 Part C: Add debt-first priority when active lever is debt elimination
        if (leverToUse === 'eliminate_high_interest_debt' && fin.highInterestDebt && fin.highInterestDebt > 0) {
          const aprPct = fin.highInterestDebtAPR ?? 23;
          prompt += `\n\nDEBT-FIRST PRIORITY: The user has $${fin.highInterestDebt.toLocaleString()} in high-interest debt at ~${aprPct}% APR. When asked about other financial priorities (retirement contributions, savings, investing), always reference this debt-first priority. A guaranteed ${aprPct}% return from debt payoff exceeds most investment returns. Recommend paying off this debt first, then redirecting that payment amount toward retirement contributions or other goals.`;
        }
        
        // AUDIT 16 FIX GAP-16-DEBT-SEQUENCE: Add debt sequencing logic when multiple debt types present
        const hiDebtAmount = fin.highInterestDebt || 0;
        const loDebtAmount = fin.lowInterestDebt || 0;
        const hasMultipleDebts = hiDebtAmount > 0 && loDebtAmount > 0;
        if (hasMultipleDebts) {
          const hiApr = fin.highInterestDebtAPR ?? 23;
          const loApr = fin.lowInterestDebtAPR ?? 5;
          const sequencingGuidance = hiApr > loApr
            ? `DEBT SEQUENCING: User has both high-interest ($${hiDebtAmount.toLocaleString()} at ${hiApr}%) and low-interest ($${loDebtAmount.toLocaleString()} at ${loApr}%) debt. Use the avalanche method: pay high-interest debt first (${hiApr}% guaranteed return), then low-interest debt (${loApr}%). This minimizes total interest paid.`
            : `DEBT SEQUENCING: User has both high-interest ($${hiDebtAmount.toLocaleString()} at ${hiApr}%) and low-interest ($${loDebtAmount.toLocaleString()} at ${loApr}%) debt. Interest rates are close — either avalanche (highest rate first) or snowball (smallest balance first) works. Recommend avalanche for mathematical optimality: pay ${hiApr}% debt first.`;
          prompt += `\n\n${sequencingGuidance}`;
        }
        
        // AUDIT 17 FIX P3: Recommendation ordering - debt payoff urgency weight
        const surplusForPayoff = (fin.monthlyIncome || 0) - (fin.essentialExpenses || 0);
        const hiDebtPayoffMonths = hiDebtAmount > 0 && surplusForPayoff > 0 ? Math.ceil(hiDebtAmount / surplusForPayoff) : 999;
        if (hiDebtAmount > 0 && hiDebtPayoffMonths <= 2) {
          prompt += `\n\nDEBT PAYOFF URGENCY (AUDIT 17): High-interest debt payable in ${hiDebtPayoffMonths} month(s) at current surplus. This is the clear priority — eliminate it before any other lever. The guaranteed ${fin.highInterestDebtAPR ?? 23}% return from payoff exceeds all other opportunities.`;
        }
        
        // AUDIT 17 FIX P1: Income lever surface for thin-margin users
        const incomeGrowthSignal = (fin as any).incomeGrowthSignal || false;
        const surplusRatio = (fin.monthlyIncome || 0) > 0 ? ((fin.monthlyIncome || 0) - (fin.essentialExpenses || 0)) / (fin.monthlyIncome || 0) : 0;
        if (incomeGrowthSignal && surplusRatio < 0.20) {
          const potentialIncome = Math.round((fin.essentialExpenses || 0) * 0.15);
          prompt += `\n\nINCOME GROWTH OPPORTUNITY: User signaled income-growth interest AND has thin surplus (${Math.round(surplusRatio * 100)}%). Adding $${potentialIncome}/month in side income would transform their financial trajectory. Include one paragraph on income-side leverage in your response.`;
        }
      }

      prompt += `\n\nWhen answering the user's follow-up question, reference their specific financial situation and recommendation. Be direct and actionable.`;
    }

    return prompt;
  };

  const answerPrompt = buildAnswerPrompt();

  const explainerPrompt = `You are Atlas. Answer the user's question with a clear, human explanation.

Structure (use headings or short labels when helpful):
1) What it is (plain English)
2) Why it matters (the decision it affects)
3) What “good” can look like (if relevant, use a range or benchmark)
4) How to improve it (practical levers)
5) One next step (single, concrete action)

Keep it warm, direct, and concise. Ask at most ONE follow-up question, only if needed.`;

  try {
    // CONTEXT WINDOW TRUNCATION: If conversation exceeds 40 messages, keep last 30 + prepend summary
    let trimmedMessages = messages;
    let contextWindowNote = '';
    
    if (messages.length > 40) {
      // Keep the last 30 messages to stay within token limits
      const recentMessages = messages.slice(-30);
      const truncatedMessages = messages.slice(0, -30);
      
      // Create a summary of earlier conversation
      if (truncatedMessages.length > 0) {
        contextWindowNote = `[Earlier conversation with ${truncatedMessages.length} messages truncated for context window. User's financial situation and goals remain consistent.]`;
      }
      
      trimmedMessages = recentMessages;
    }
    
    // CONTEXT WINDOW EXTENSION: Compress conversation history beyond 10 messages
    const { recentMessages: compressedRecent, compressedMemory } = compressConversationHistory(trimmedMessages, 10);
    trimmedMessages = compressedRecent;
    let usedModel = modelCandidates[0] || DEFAULT_MODEL;
    const sys = type === 'answer' ? answerPrompt : type === 'answer_explain' ? explainerPrompt : systemPrompt;
    const msgPayload =
      type === 'answer' || type === 'answer_explain'
        ? [{ role: 'user', content: `Question: ${String(question || '').trim()}` }]
        : trimmedMessages;

    if (type === 'answer_stream' || type === 'answer_explain_stream') {
      // AUDIT 9 FIX: Inject financial context into answer_stream for post-CONFIRM follow-ups
      // When user asks "What should I do first?" after confirming numbers, include their profile
      // AUDIT 11 FIX DEFECT-06: Include activeLever/activeTier to reinforce active recommendation
      const sysStream = type === 'answer_stream' ? buildAnswerPrompt(fin, baseline, activeLever, activeTier) : explainerPrompt;
      const streamPayload = [{ role: 'user', content: `Question: ${String(question || '').trim()}` }];
      const streamMaxTokens = type === 'answer_explain_stream' ? 700 : 220;
      let response = await callAnthropicStream({ apiKey, model: usedModel, maxTokens: streamMaxTokens, system: sysStream, messages: streamPayload });

      if (!response.ok) {
        let bodyText = await readUpstreamErrorBody(response);
        if (response.status === 404 && bodyText.includes('not_found_error') && bodyText.includes('model')) {
          for (const m of modelCandidates.slice(1)) {
            usedModel = m;
            response = await callAnthropicStream({ apiKey, model: usedModel, maxTokens: streamMaxTokens, system: sysStream, messages: streamPayload });
            if (response.ok) break;
            bodyText = await readUpstreamErrorBody(response);
            if (!(response.status === 404 && bodyText.includes('not_found_error') && bodyText.includes('model'))) break;
          }
        }
        if (!response.ok) {
          if (response.status === 401) return jsonError(401, 'Anthropic auth failed (check ANTHROPIC_API_KEY).');
          if (response.status === 429) return jsonError(429, 'Anthropic rate limit reached. Please try again.');
          if (response.status === 400) return jsonError(400, `Anthropic request rejected. ${bodyText ? `Details: ${bodyText}` : ''}`.trim());
          return jsonError(502, `Upstream API error (${response.status}). ${bodyText ? `Details: ${bodyText}` : ''}`.trim());
        }
      }

      if (!response.body) return jsonError(502, 'Upstream stream missing body');

      const enc = new TextEncoder();
      const dec = new TextDecoder();
      let carry = '';

      const sse = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = response.body!.getReader();
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              const chunk = dec.decode(value, { stream: true });
              carry += chunk;

              // Anthropic streams as SSE; we forward only text deltas.
              while (true) {
                const idx = carry.indexOf('\n\n');
                if (idx < 0) break;
                const frame = carry.slice(0, idx);
                carry = carry.slice(idx + 2);

                const lines = frame.split('\n');
                const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
                for (const dl of dataLines) {
                  if (!dl || dl === '[DONE]') continue;
                  try {
                    const j = JSON.parse(dl);
                    // AUDIT 4 FIX: Handle both Anthropic and OpenAI streaming formats
                    // Anthropic: j?.delta?.text
                    // OpenAI: j?.choices?.[0]?.delta?.content
                    const delta = j?.delta?.text ?? j?.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string' && delta) {
                      controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                    }
                  } catch {
                    // ignore
                  }
                }
              }
            }
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true, model: usedModel })}\n\n`));
          } catch {
            controller.enqueue(enc.encode(`data: ${JSON.stringify({ done: true, error: 'stream_error', model: usedModel })}\n\n`));
          } finally {
            controller.close();
            try {
              reader.releaseLock();
            } catch {
              // ignore
            }
          }
        },
      });

      return new Response(sse, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': 'https://atlas-financial.vercel.app',
        },
      });
    }

    // CRITICAL FIX: For non-chat types (extract, answer), use non-streaming call
    // For chat type, skip this pre-call and go directly to streaming at line 843
    // The pre-call was causing 8+ second latency before streaming started
    let response: Response | null = null;
    let text = '';

    if (type !== 'chat') {
      response = await callAnthropic({ apiKey, model: usedModel, maxTokens, system: sys, messages: msgPayload });

      if (!response.ok) {
        let bodyText = await readUpstreamErrorBody(response);

        if (response.status === 404 && bodyText.includes('not_found_error') && bodyText.includes('model')) {
          for (const m of modelCandidates.slice(1)) {
            usedModel = m;
            response = await callAnthropic({ apiKey, model: usedModel, maxTokens, system: systemPrompt, messages: trimmedMessages });
            if (response.ok) break;
            bodyText = await readUpstreamErrorBody(response);
            if (!(response.status === 404 && bodyText.includes('not_found_error') && bodyText.includes('model'))) break;
          }
        }

        if (!response.ok) {
          if (response.status === 401) return jsonError(401, 'Anthropic auth failed (check ANTHROPIC_API_KEY).');
          if (response.status === 429) return jsonError(429, 'Anthropic rate limit reached. Please try again.');
          if (response.status === 400) return jsonError(400, `Anthropic request rejected. ${bodyText ? `Details: ${bodyText}` : ''}`.trim());
          return jsonError(502, `Upstream API error (${response.status}). ${bodyText ? `Details: ${bodyText}` : ''}`.trim());
        }
      }

      const data: any = await response.json();
      // REMEDIATION 4: Handle both Anthropic and OpenAI response formats
      // Anthropic: data.content[0].text
      // OpenAI: data.choices[0].message.content
      text = data.content?.[0]?.text || data.choices?.[0]?.message?.content || '';
    }

    if (type === 'extract') {
      try {
        // AUDIT 13 FIX DEFECT-02: Log raw LLM response
        console.log('[extract] rawResponse:', text.substring(0, 300));
        
        const clean = String(text).replace(/```json|```/g, '').trim();
        const fields = JSON.parse(clean);
        
        // AUDIT 13 FIX DEFECT-02: Log parsed fields
        console.log('[extract] parsed:', JSON.stringify(fields));
        console.log('[extract] fieldCount:', Object.keys(fields || {}).length);
        
        // AUDIT 18 FIX P0: Force expenses = null for money-blindness phrases
        // Users who say "don't know where it goes" need the PARTIAL INFO PROTOCOL, not a budget template
        const moneyBlindnessPatterns = [
          /don't know where.*goes/i,
          /no idea.*spend/i,
          /can't track/i,
          /not sure where/i,
          /everything disappears/i,
          /money just vanishes/i,
          /no clue.*expenses/i,
          /can't account for/i,
        ];
        const hasMoneyBlindness = moneyBlindnessPatterns.some(p => p.test(lastUserText || ''));
        if (hasMoneyBlindness && fields.monthlyIncome) {
          // Force expenses to null to trigger PARTIAL INFO PROTOCOL
          fields.essentialExpenses = null;
          delete fields.discretionaryExpenses;
        }
        
        // AUDIT 13 FIX DEFECT-02: Allow negative cashflow (expenses > income is valid financial state)
        // Negative cashflow is a real scenario that needs extraction and display
        // The extraction prompt explicitly requires extracting both income and expenses for negative cashflow
        
        return jsonOk({ fields, source: 'claude', model: usedModel, tier });
      } catch (parseErr) {
        console.error('[extract] parseError:', String(parseErr).substring(0, 200));
        console.log('[extract] failedText:', text.substring(0, 300));
        return jsonOk({ fields: {}, source: 'claude_parse_error', model: usedModel, tier });
      }
    }

    if (type === 'answer') {
      let t0 = String(text || '').trim();
      
      // AUDIT 18 FIX P2: Post-generation APR disclosure check
      // If APR was assumed and response doesn't contain disclosure, append it
      const fin = (body as any)?.fin;
      const hiAprAssumed = fin && !fin.highInterestDebtAPR && (fin.highInterestDebt || 0) > 0;
      if (hiAprAssumed && !t0.includes('estimated') && !t0.includes('typical APR')) {
        t0 += ' (estimated at ~18-23% typical APR — check your statement for the real number)';
      }
      
      if (!violatesGuardrails(t0)) {
        return jsonOk({ text: t0, source: 'claude', model: usedModel, tier });
      }

      const repairSystem = `Rewrite the following text to comply with ALL constraints.
Constraints: max 2 sentences; max 1 question mark; no lists; plain text only.
Return ONLY the rewritten text.`;
      const repairMsg = [{ role: 'user', content: t0 }];
      const repairResp = await callAnthropic({ apiKey, model: usedModel, maxTokens: 120, system: repairSystem, messages: repairMsg });
      if (repairResp.ok) {
        const repairData: any = await repairResp.json();
        const repaired = String(repairData.content?.[0]?.text || '').trim();
        if (!violatesGuardrails(repaired)) {
          console.log('[atlas_guardrails] repaired_answer', { model: usedModel });
          return jsonOk({ text: repaired, source: 'claude_repaired', model: usedModel, tier });
        }
      }

      console.log('[atlas_guardrails] fallback_answer', { model: usedModel });
      return jsonOk({ text: fallbackAnswer(String(question || '').trim()), source: 'fallback', tier });
    }

    // For chat responses, use orchestrator to inject session state
    // This makes Claude aware of conversation goal, phase, missing fields, and urgency
    if (type === 'chat') {
      // PRIORITY 6: Sanitize user message input before LLM injection
      // Prevent prompt injection attacks by removing instruction-override patterns
      const rawUserMsg = String((messages || []).slice(-1)[0]?.content || '').trim();
      const lastUserMsg = sanitizeMemorySummary(rawUserMsg).slice(0, 8000); // Cap at 8000 chars
      const conversationHistory = messages || [];
      const financialProfile = { ...(fin || {}), ...(extractedFields || {}) };

      // Track answered fields when extractor successfully extracts them
      // This prevents infinite loops when user provides zero income or other falsy values
      const updatedAnswered = { ...(answered || {}) };
      if (extractedFields?.monthlyIncome !== undefined && extractedFields.monthlyIncome !== null) {
        updatedAnswered.monthlyIncome = true;
      }
      if (extractedFields?.essentialExpenses !== undefined && extractedFields.essentialExpenses !== null) {
        updatedAnswered.essentialExpenses = true;
      }
      if (extractedFields?.totalSavings !== undefined && extractedFields.totalSavings !== null) {
        updatedAnswered.totalSavings = true;
      }
      if (extractedFields?.proposedPayment !== undefined && extractedFields.proposedPayment !== null) {
        updatedAnswered.proposedPayment = true;
      }

      // FINANCIAL VALIDATION: Validate extracted financial snapshot for implausible values
      // This catches typos and suspicious data before analysis runs
      const validation = validateFinancialSnapshot((extractedFields || {}) as any);
      let validationContext = '';
      if (!validation.isValid) {
        validationContext = `\n\n${buildValidationPrompt(validation)}`;
      }

      // COMPANION INTEGRATION: Process user message for commitments (with timeout)
      // This detects if user is committing to or completing actions
      // Wrapped in Promise.race with timeout to prevent blocking response
      if (userId && sessionId) {
        const commitmentTimeout = new Promise((resolve) => {
          setTimeout(() => {
            console.warn('[companion] Commitment detection timeout - skipping');
            resolve(null);
          }, 3000); // 3 second timeout for commitment detection
        });

        const commitmentPromise = (async () => {
          try {
            const { commitment } = await processUserMessageForCompanion(userId, lastUserMsg, apiKey);
            // Handle the commitment (update action status if detected)
            if (commitment.commitment_detected) {
              const { handleUserCommitment } = await import('@/lib/ai/companionIntegration');
              await handleUserCommitment(userId, sessionId, commitment, apiKey);
            }
            return commitment;
          } catch (error) {
            console.error('Error processing user message for companion:', error);
            return null;
          }
        })();

        // Race: whichever completes first (commitment or timeout)
        Promise.race([commitmentPromise, commitmentTimeout]).catch(() => {
          // Silently ignore timeout
        });
      }

      // PRIORITY 1: Wire AtlasEngineOrchestrator into chat route
      // This replaces old crisis detection, compliance check, and orchestrator calls
      // with a single deterministic call to the new orchestrator
      // REMEDIATION 2: Pass LLM-extracted financialProfile for higher accuracy
      const engineResult = atlasEngineOrchestrator.orchestrate(
        lastUserMsg,
        (conversationHistory as any[]).map((msg: any) => ({
          role: msg.role || 'user',
          content: msg.content || '',
          timestamp: msg.timestamp,
        })),
        sessionState?.goals || [],
        isAuthenticated ? 'pro' : 'free',
        financialProfile as any  // Pass LLM-verified data to engine
      );

      // Crisis response: return immediately if crisis detected
      if (engineResult.crisis.detected) {
        const cleanedCrisisResponse = cleanAtlasResponse(engineResult.crisis.response);
        return jsonOk({
          text: cleanedCrisisResponse,
          source: 'atlas_crisis',
          model: usedModel,
          tier,
          sessionState: sessionState ?? {},
        });
      }

      // Compliance response: return immediately if compliance violation detected
      if (engineResult.compliance.detected) {
        const cleanedComplianceResponse = cleanAtlasResponse(engineResult.compliance.response || 'This request violates our compliance policy.');
        return jsonOk({
          text: cleanedComplianceResponse,
          source: 'compliance_guardrail',
          model: 'policy',
          tier,
        });
      }

      // Use deterministic decision from engines as the session state
      const financialDecision = engineResult.decision;
      const nextQuestion = engineResult.nextQuestion;
      const extractedData = engineResult.extraction.data;
      
      // Map engine result to old orchestrator format for backward compatibility
      const sessionStateBlock = engineResult.contextBlocks
        .map(block => block.content)
        .join('\n\n');
      const missingFields = financialDecision.missingFields || [];
      const state = { 
        domain: financialDecision.domain, 
        urgency: financialDecision.urgency,
        urgencyLevel: financialDecision.urgency,
        goal: financialDecision.domain,
        phase: financialDecision.urgency === 'critical' ? 'crisis' : 'analysis',
        missingFields: missingFields,
        turnCount: messages.length,
      };

      // REMEDIATION 1: Restore deterministic calculations from LLM-verified financial profile
      // Use the financialProfile assembled at line 848 (LLM-extracted, user-confirmed data)
      // instead of regex extraction from the engine
      let calculationBlock = '';
      try {
        if (financialProfile && (financialProfile.monthlyIncome || financialProfile.essentialExpenses || financialProfile.totalSavings)) {
          const calculations = calculateFinancials(
            financialProfile as any,
            financialDecision.domain,
            financialProfile.proposedPayment
          );
          
          // Priority order: affordability → budget → emergency fund → debt payoff → investment → retirement
          if (calculations.affordability) {
            calculationBlock = formatAffordabilityBlock(calculations.affordability);
          } else if (calculations.budget) {
            calculationBlock = formatBudgetBlock(calculations.budget);
          } else if (calculations.emergencyFund) {
            calculationBlock = formatEmergencyFundBlock(calculations.emergencyFund);
          } else if (calculations.debtPayoff) {
            calculationBlock = formatDebtPayoffBlock(calculations.debtPayoff);
          } else if (calculations.investment) {
            calculationBlock = formatInvestmentBlock(calculations.investment);
          } else if (calculations.retirement) {
            calculationBlock = formatRetirementBlock(calculations.retirement);
          }
        }
      } catch (error) {
        console.warn('[calculations] Error generating calculation block:', error);
        // Continue without calculation block if error occurs
      }

      // REMEDIATION 1: Restore objection handling from LLM-extracted data
      let objectionBlock = '';
      try {
        const objections = detectObjections(lastUserMsg);
        if (objections && objections.length > 0) {
          const baseRecommendation = `Address the following objections: ${objections.map(o => o.category).join(', ')}`;
          objectionBlock = buildObjectionAwareRecommendation(baseRecommendation, lastUserMsg);
        }
      } catch (error) {
        console.warn('[objections] Error detecting objections:', error);
        // Continue without objection block if error occurs
      }

      // COMPANION INTEGRATION: Build companion system prompt context (with timeout)
      // Injects accountability, progress, roadmap, behavioral, escalation, and multi-goal blocks
      // Wrapped in Promise.race with timeout to prevent blocking response
      // CRITICAL FIX: Only build companion context for authenticated users (not guests)
      // Guest users should not hit Supabase, which causes 5-second timeout
      let companionContext = '';
      let multiGoalContext = '';
      let behavioralContext = '';
      if (userId && userId !== 'guest') {
        const contextTimeout = new Promise<string>((resolve) => {
          setTimeout(() => {
            console.warn('[companion] Context building timeout - using empty context');
            resolve('');
          }, 5000); // 5 second timeout for companion context building
        });

        const contextPromise = (async () => {
          try {
            const isFirstMessage = messages.length <= 1;
            return await buildCompanionSystemPromptContext(userId, lastUserMsg, extractedFields || {}, isFirstMessage);
          } catch (error) {
            console.error('Error building companion context:', error);
            return '';
          }
        })();

        // Race: whichever completes first (context or timeout)
        companionContext = await Promise.race([contextPromise, contextTimeout]);
        
        // FIX 6: Wire behavioral adaptation
        // Analyze user's behavioral patterns and incorporate into system prompt
        const behavioralTimeout = new Promise<string>((resolve) => {
          setTimeout(() => {
            console.warn('[companion] Behavioral adaptation timeout - skipping');
            resolve('');
          }, 3000); // 3 second timeout for behavioral analysis
        });

        const behavioralPromise = (async () => {
          try {
            const { analyzeBehavioralPatterns, buildBehavioralAdaptationContext } = await import('@/lib/ai/behavioralAdaptation');
            const pattern = await analyzeBehavioralPatterns(userId, conversationHistory);
            
            // Write pattern back to user_behavior_profiles (fire-and-forget)
            if (userId && userId !== 'guest') {
              const incomingAuth = req.headers.get('Authorization');
              fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-financial.vercel.app'}/api/profile/behavior`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(incomingAuth ? { 'Authorization': incomingAuth } : {}),
                },
                body: JSON.stringify({ userId, pattern }),
              }).catch(e => console.warn('[behavioral-profile] write-back failed:', e));
            }
            
            return buildBehavioralAdaptationContext(pattern);
          } catch (error) {
            console.error('Error analyzing behavioral patterns:', error);
            return '';
          }
        })();

        behavioralContext = await Promise.race([behavioralPromise, behavioralTimeout]);
      }

      // MULTI-GOAL INTEGRATION: Build multi-goal context if goals are present
      // This injects all active goals and current phase into the system prompt
      if (sessionState && sessionState.goals && Array.isArray(sessionState.goals) && sessionState.goals.length > 0) {
        try {
          const { buildMultiGoalContextBlock } = await import('@/lib/ai/multiGoalPrompt');
          multiGoalContext = buildMultiGoalContextBlock(sessionState.goals);
        } catch (error) {
          console.error('Error building multi-goal context:', error);
          // Continue without multi-goal context if it fails
        }
      }

      // Step 3: Build enriched system prompt with session state block FIRST
      // The session state block is injected first so it's never trimmed away
      const emotionTag = detectEmotion(messages);
      const emotionContext = `\n\nUSER EMOTION TAG: ${emotionTag}.`;
      // For crisis entries on first message, don't show disclaimer mid-conversation
      const isCrisisFirstMessage = engineResult.crisis.detected && messages.length === 1;
      const disclaimerContext = `\n\nDISCLAIMER_NEEDED: ${isCrisisFirstMessage || hasDisclaimer(messages) ? 'no' : 'yes'}.`;
      const memoryContext = memorySummary ? `\n\nUSER MEMORY SUMMARY:\n${sanitizeMemorySummary(String(memorySummary).trim())}` : '';
      const agentContext = lastUserMsg
        ? `\n\nPRIMARY AGENT: ${routeAgentForText(lastUserMsg).label}.`
        : '';
      const advancedContext = buildAdvancedTopicContext((fin || {}) as any)
        ? `\n\nADVANCED TOPIC CONTEXT: ${buildAdvancedTopicContext((fin || {}) as any)}`
        : '';
      const compSignal = detectComprehensionSignal(lastUserMsg);
      const comprehensionContext = compSignal
        ? `\n\nCOMPREHENSION SIGNAL: ${compSignal}.`
        : '';
      const exampleContext = `\n\nCULTURAL EXAMPLE: ${culturallyRelevantExample(lastUserMsg)}`;
      const languageContext = `\n\nLANGUAGE: ${preferredLanguage || detectLanguage(lastUserMsg)}. Use the simplest possible wording.`;

      // Session state block goes FIRST — it's the most critical context
      // Calculation block is SECOND — it must never be trimmed
      // Use only the orchestrator's calculationBlock (unified calculation engine)
      const calculationBlockSection = calculationBlock
        ? `\n━━━ AUTHORITATIVE CALCULATION DATA ━━━\nYOU MUST USE ONLY THE NUMBERS BELOW. DO NOT ESTIMATE OR CALCULATE INDEPENDENTLY.\n${calculationBlock}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` 
        : '';
      
      // Build strategy context block from baseline
      const strategyContextBlock = buildStrategyContextBlock(baseline);

      const promptSections: string[] = [
        ATLAS_SYSTEM_PROMPT,         // ← Use new Sprint 1 system prompt (position 0)
        sessionStateBlock,           // ← Always included, never trimmed (position 1)
        ...(calculationBlockSection ? [calculationBlockSection] : []), // ← REM-K: POSITION 2 = calculation block MUST NEVER BE TRIMMED (matches stated intent)
        ...(strategyContextBlock ? [strategyContextBlock] : []), // ← STRATEGY CONTEXT = tier/lever/urgency/confidence/metrics
        ...(objectionBlock ? [objectionBlock] : []), // ← REM-G: OBJECTION HANDLING = psychological barrier detection and reframing
        ...(priorContextBlock ? [priorContextBlock] : []), // ← REM-L: PRIOR CONTEXT = trusted server-generated data from Supabase (no sanitization needed)
        ...(companionContext ? [companionContext] : []), // ← COMPANION CONTEXT = injected after session state
        ...(behavioralContext ? [behavioralContext] : []), // ← REM-H: BEHAVIORAL ADAPTATION = adjust communication style based on user patterns
        ...(multiGoalContext ? [multiGoalContext] : []), // ← MULTI-GOAL CONTEXT = injected after companion context
        ...(compressedMemory ? [formatCompressedMemory(compressedMemory)] : []), // ← COMPRESSED MEMORY = preserve context beyond 10 messages
        ...(validationContext ? [validationContext] : []), // ← VALIDATION CONTEXT = flag implausible values
        memoryContext,
        emotionContext,
        disclaimerContext,
        agentContext,
        advancedContext,
        comprehensionContext,
        languageContext,
        exampleContext,
      ];
      
      // REM-M: Increase budget to 32,000 chars to ensure companion context features reach Claude
      // Anthropic API has 200k-token context window; 32k chars (~8k tokens) for system prompt is reasonable
      // This ensures behavioral adaptation, multi-goal context, and other companion features are never trimmed
      const enrichedSystemPrompt = trimPromptSections(promptSections, 32000);

      // Step 4: Call Claude with enriched context
      // NOTE: trimmedMessages already computed at line 495 from compressConversationHistory
      // This preserves full conversation history (not just last 10 messages) via compressed memory injection
      
      // If calculation block exists, use prefill pattern: inject it as assistant message
      // This forces Claude to continue from the calculation output instead of generating its own numbers
      let messagesToSend = trimmedMessages;
      if (calculationBlock) {
        messagesToSend = [
          ...trimmedMessages,
          {
            role: 'assistant' as const,
            content: `[CALCULATION COMPLETE]\n${calculationBlock}\n\nNow let me explain these results in plain language:`
          }
        ];
      }
      
      let response = await callAnthropicStream({
        apiKey,
        model: usedModel,
        maxTokens: maxTokens,
        system: enrichedSystemPrompt,
        messages: messagesToSend,
      });

      // Model fallback logic
      if (!response.ok) {
        let bodyText = await readUpstreamErrorBody(response);
        if (response.status === 404 && bodyText.includes('not_found_error') && bodyText.includes('model')) {
          for (const m of modelCandidates.slice(1)) {
            usedModel = m;
            response = await callAnthropicStream({
              apiKey,
              model: usedModel,
              maxTokens: maxTokens,
              system: enrichedSystemPrompt,
              messages: trimmedMessages,
            });
            if (response.ok) break;
          }
        }
        if (!response.ok) {
          if (response.status === 401) return jsonError(401, 'Anthropic auth failed.');
          if (response.status === 429) return jsonError(429, 'Anthropic rate limit reached.');
          return jsonError(502, `Upstream API error (${response.status}).`);
        }
      }

      if (!response.body) return jsonError(502, 'Upstream stream missing body');

      // Step 5: Stream response back with session state
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      let carry = '';

      const sse = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = response.body!.getReader();
          let fullResponse = '';

          // Send session state as first SSE event so client can update its store
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({
                type: 'session_state',
                state: {
                  goal: state.goal,
                  phase: state.phase,
                  missingFields: state.missingFields,
                  turnCount: state.turnCount,
                  urgencyLevel: state.urgencyLevel,
                },
              })}\n\n`
            )
          );

          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              const chunk = dec.decode(value, { stream: true });
              carry += chunk;

              while (true) {
                const idx = carry.indexOf('\n\n');
                if (idx < 0) break;
                const frame = carry.slice(0, idx);
                carry = carry.slice(idx + 2);

                const lines = frame.split('\n');
                const dataLines = lines.filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim());
                for (const dl of dataLines) {
                  if (!dl || dl === '[DONE]') continue;
                  try {
                    const j = JSON.parse(dl);
                    // AUDIT 4 FIX: Handle both Anthropic and OpenAI streaming formats
                    // Anthropic: j?.delta?.text
                    // OpenAI: j?.choices?.[0]?.delta?.content
                    const delta = j?.delta?.text ?? j?.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string' && delta) {
                      fullResponse += delta;
                      // Clean calculation result tags from each delta before sending to frontend
                      const cleanDelta = delta
                        .replace(/\[CALCULATION_RESULTS[^\]]*\]/g, '')
                        .replace(/\[END_CALCULATIONS\]/g, '');
                      if (cleanDelta) {
                        controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta: cleanDelta })}\n\n`));
                      }
                    }
                  } catch { /* ignore */ }
                }
              }
            }

            // Apply postprocessing to clean formatting
            let cleanedResponse = cleanAtlasResponse(fullResponse);
            
            // COMPANION INTEGRATION: Process Atlas response for actions (with timeout)
            // This extracts actions from Claude response and tracks them
            // Wrapped in Promise.race with timeout to prevent blocking response
            if (userId && sessionId) {
              const actionTimeout = new Promise<void>((resolve) => {
                setTimeout(() => {
                  console.warn('[companion] Action extraction timeout - skipping');
                  resolve();
                }, 3000); // 3 second timeout for action extraction
              });

              const actionPromise = (async () => {
                try {
                  await processAtlasResponseForCompanion(userId, sessionId, cleanedResponse, apiKey, financialProfile);
                  
                  // FIX 5: Wire action persistence to user_actions table
                  // After detecting action, persist it to the database
                  try {
                    const { extractActionFromResponse } = await import('@/lib/ai/actionExtractor');
                    const extractedAction = await extractActionFromResponse(cleanedResponse, apiKey);
                    
                    if (extractedAction.action_detected && extractedAction.action_text) {
                      const checkInDate = new Date();
                      checkInDate.setDate(checkInDate.getDate() + (extractedAction.check_in_days || 30));
                      
                      // Extract incoming auth header to forward to /api/actions/save
                      const incomingAuth = req.headers.get('Authorization');
                      
                      // FIX 5: Use full URL with NEXT_PUBLIC_APP_URL for Edge Runtime compatibility
                      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-financial.vercel.app';
                      await fetch(`${appUrl}/api/actions/save`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(incomingAuth ? { 'Authorization': incomingAuth } : {}),
                        },
                        body: JSON.stringify({
                          userId,
                          sessionId,
                          action: {
                            action_text: extractedAction.action_text,
                            action_category: extractedAction.action_category || 'other',
                            target_amount: extractedAction.target_amount,
                            target_frequency: extractedAction.target_frequency,
                            check_in_due_at: checkInDate.toISOString(),
                            status: 'recommended',
                          },
                        }),
                        keepalive: true,
                      });
                    }
                  } catch (persistError) {
                    console.error('Error persisting action:', persistError);
                  }
                } catch (error) {
                  console.error('Error processing Atlas response for companion:', error);
                }
              })();

              // Race: whichever completes first (action extraction or timeout)
              // Await this to ensure it completes before closing stream
              await Promise.race([actionPromise, actionTimeout]).catch(() => {
                // Silently ignore timeout
              });
            }

            // NUDGE INJECTION: Inject proactive nudges if appropriate
            // This adds contextual nudges to the response based on user progress
            // Wrapped in Promise.race with timeout to prevent blocking response
            if (userId && sessionId) {
              const nudgeTimeout = new Promise<string>((resolve) => {
                setTimeout(() => {
                  console.warn('[companion] Nudge injection timeout - skipping');
                  resolve(cleanedResponse);
                }, 2000); // 2 second timeout for nudge injection
              });

              const nudgePromise = (async () => {
                try {
                  // Nudge injection with real goals from sessionState
                  const result = injectNudgeIfAppropriate(
                    cleanedResponse,
                    {
                      userId,
                      goals: sessionState?.goals || [],
                    },
                    messages.length
                  );
                  return result.response;
                } catch (error) {
                  console.error('Error injecting nudge:', error);
                  return cleanedResponse;
                }
              })();

              // Race: whichever completes first (nudge injection or timeout)
              // Await this to ensure it completes before closing stream
              try {
                cleanedResponse = await Promise.race([nudgePromise, nudgeTimeout]);
              } catch {
                // Silently ignore timeout, use original response
              }
            }
            
            // Send cleaned response as a replacement event for the frontend to use
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ type: 'replace', text: cleanedResponse })}\n\n`
              )
            );
            // Also send done event with metadata (include sessionId for frontend tracking)
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ done: true, model: usedModel, tier, sessionId })}\n\n`
              )
            );
          } catch {
            controller.enqueue(
              enc.encode(`data: ${JSON.stringify({ done: true, error: 'stream_error', model: usedModel })}\n\n`)
            );
          } finally {
            controller.close();
            try { reader.releaseLock(); } catch { /* ignore */ }
          }
        },
      });

      return new Response(sse, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-financial.vercel.app',
          'X-RateLimit-Remaining': Math.max(0, rateLimitRemaining).toString(),
        },
      });
    }

    return jsonOk({ text, source: 'claude', model: usedModel, tier });
  } catch {
    return jsonError(500, 'An unexpected error occurred.');
  }
}
