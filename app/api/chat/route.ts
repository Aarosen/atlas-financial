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

// ============================================================
// REM-31-E: Financial threshold constants (REM-29-I)
// These control which financial tier users are assigned to.
// Any change here changes the advice ALL users receive.
// ============================================================
const TRIAGE_CRISIS_SURPLUS_RATIO = 0.05;   // Below 5% surplus = crisis tier
const TRIAGE_STABILIZE_SURPLUS_RATIO = 0.15; // Below 15% surplus = stabilize tier
const INCOME_LEVER_SURPLUS_RATIO = 0.20;    // Below 20% surplus = show income lever
const INCOME_LEVER_POTENTIAL_PCT = 0.15;    // 15% of expenses as achievable income bump

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
  // AUDIT 19 FIX P2: Fix CORS OPTIONS wildcard to use proper origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-financial.vercel.app';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': appUrl,
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
- highInterestDebtAPR: number (AUDIT 23 FIX REM-23-D: APR/interest rate of high-interest debt; extract ONLY if explicitly stated by user from phrases like "23% APR", "18% interest", "my credit card rate is 21%", "at 22%", "charging 19%"; CRITICAL: do NOT infer or assume a rate; omit if not explicitly stated in user's message)
- lowInterestDebtAPR: number (AUDIT 23 FIX REM-23-D: APR/interest rate of low-interest debt; extract ONLY if explicitly stated from phrases like "4.5% student loan", "2.9% car loan", "at 5%"; CRITICAL: do NOT infer or assume a rate; omit if not explicitly stated)
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
    // AUDIT 23 FIX REM-23-C: Fix emergency fund target inconsistency (3 months → 6 months)
    // Code was using 3-month target but model advises 6-month target. Unify to 6 months.
    const emergencyTarget = expenses * 6;
    
    // AUDIT 22 FIX BUG-22-002: Crisis only when cashflow is negative or near-zero
    // Crisis: negative cashflow or extreme thin margin (< 5% surplus ratio)
    if (surplus < 0) return 'crisis';
    if (surplusRatio < TRIAGE_CRISIS_SURPLUS_RATIO) return 'crisis';
    
    // AUDIT 22 FIX BUG-22-002: Stabilize includes users with underfunded emergency fund AND high-interest debt
    // Stabilize: thin margin (< 15% surplus ratio) OR underfunded emergency fund OR (underfunded savings + high-interest debt)
    if (surplusRatio < TRIAGE_STABILIZE_SURPLUS_RATIO || savings < emergencyTarget || (savings < expenses && hiDebt > 0)) return 'stabilize';
    
    // Growth: has debt to pay down
    if (hiDebt > 0) return 'growth';
    
    // Optimize: healthy position, focus on optimization
    return 'optimize';
  };

  // Build context-aware answer prompt that includes confirmed financial profile
  const buildAnswerPrompt = (fin?: Partial<FinancialState> | null, baseline?: Strategy | null, activeLever?: string | null, activeTier?: string | null) => {
    // AUDIT 19 FIX P1: Resolve HARD OUTPUT CONSTRAINTS conflict with protocols
    let prompt = `You are Atlas. Answer the user's question briefly and clearly.

HARD OUTPUT CONSTRAINTS (must follow exactly):
- Max 2 sentences (exception: 3 sentences when emotional acknowledgment required)
- No markdown, no formatting
- Direct answer only
- Never ask multiple questions or request detailed elaboration
- Exception: If PARTIAL INFO PROTOCOL or EMOTIONAL INTELLIGENCE GATE activates below, those instructions override these constraints`;

    // AUDIT 19 FIX P1: EMOTIONAL INTELLIGENCE GATE at position 0 (before all financial instructions)
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

    // AUDIT 19 FIX P1: PARTIAL INFO PROTOCOL at position 0 with exact question requirement
    if (fin && fin.monthlyIncome && !fin.essentialExpenses) {
      prompt += `\n\nPARTIAL INFO PROTOCOL (POSITION 0 — OVERRIDES ALL OTHER INSTRUCTIONS INCLUDING HARD OUTPUT CONSTRAINTS):
User provided income but NOT expenses. The ONLY acceptable output is this EXACT question:
"Roughly what do you spend on essentials — rent, food, transportation, utilities — each month? A ballpark is fine."
Do NOT ask about triage level. Do NOT ask about goals. Do NOT ask about debt. Do NOT explain why you need this.
Output ONLY that question. No prefix. No suffix. No other text.
WRONG: "Are you in financial crisis, stabilizing, or optimizing?"
WRONG: "What's your biggest financial goal?"
RIGHT: "Roughly what do you spend on essentials — rent, food, transportation, utilities — each month? A ballpark is fine."`;
    }

    // AUDIT 20 FIX BUG-20-002: Inject extractedFields context when fin is null
    // This fixes answer_stream context blindness where model says "I don't have access to your financial information"
    const financialContext = fin || {};
    if (!fin && extractedFields && Object.keys(extractedFields).length > 0) {
      // Merge extractedFields into context when fin is null
      Object.assign(financialContext, extractedFields);
    }

    // AUDIT 21 FIX BUG-21-002: Compute triageLevel AFTER extractedFields merge
    // Previously computed at line 783 BEFORE merge, causing triageLevel to always be 'optimize' when fin is null
    const triageLevel = Object.keys(financialContext).length > 0 ? getTriageLevel(financialContext as any) : 'optimize';

    prompt += `\n\nAUDIT 20 FIX BUG-20-007 - TRIAGE MODE (STRENGTHENED):
If triageLevel is 'crisis': 
  MANDATORY: BEGIN with EXACTLY these 4 words: "You're in financial triage."
  Then give ONE specific action with a dollar figure and timeframe.
  WRONG: "Hold on. Let me understand your situation."
  WRONG: "You're spending more than you earn."
  RIGHT: "You're in financial triage. Your one move this week: identify $200 in recurring charges you can cancel by Friday."
  Do NOT ask diagnostic questions. Do NOT present a lever menu. Do NOT discuss optimization.
If triageLevel is 'stabilize': 
  BEGIN with EXACTLY: "You're close to stable — one move gets you there:"
  Then give ONE specific action with a dollar figure.
If triageLevel is 'growth' or 'optimize': Use standard response format.`;

    if (financialContext && (financialContext.monthlyIncome || financialContext.essentialExpenses)) {
      const surplus = (financialContext.monthlyIncome || 0) - (financialContext.essentialExpenses || 0);
      // AUDIT 16 FIX DEFECT-15-NEG-CASHFLOW-502: Guard against negative surplus in string interpolation
      const safeSurplus = Math.max(-999999, Math.min(999999, surplus)); // Clamp to prevent extreme values
      const surplusDisplay = surplus < 0 ? `deficit of $${Math.abs(surplus)}` : `surplus $${safeSurplus}`;
      prompt += `\n\nUSER PROFILE: Monthly income $${financialContext.monthlyIncome}, expenses $${financialContext.essentialExpenses}, ${surplusDisplay}, triage level: ${triageLevel}.`;
      
      // AUDIT 21 FIX REM-21-C: Extend USER PROFILE to include debt/savings amounts
      // Previously debt/savings amounts were not visible to model when fin was null
      if ((financialContext as any).highInterestDebt && (financialContext as any).highInterestDebt > 0) {
        const debtAPR = (financialContext as any).highInterestDebtAPR;
        // AUDIT 22 FIX REM-22-D: Validate APR is a reasonable number before including in prompt
        // AUDIT 22 FIX REM-22-E: Do NOT guess a specific APR when unknown; prohibit fabrication
        let aprText = '';
        if (debtAPR && typeof debtAPR === 'number' && debtAPR > 0 && debtAPR < 100) {
          aprText = `at ${debtAPR}% APR`;
        } else {
          aprText = `(APR unknown — do NOT guess a specific rate; say "high-interest debt at unknown APR" to the user)`;
        }
        prompt += ` High-interest debt: $${((financialContext as any).highInterestDebt as number).toLocaleString()} ${aprText}.`;
      }
      if ((financialContext as any).lowInterestDebt && (financialContext as any).lowInterestDebt > 0) {
        const lowAPR = (financialContext as any).lowInterestDebtAPR;
        // AUDIT 24 FIX REM-24-E: Remove low-interest APR fallback (~5%) — same hallucination pattern as high-interest
        let lowAPRText = '';
        if (lowAPR && typeof lowAPR === 'number' && lowAPR > 0 && lowAPR < 100) {
          lowAPRText = `at ${lowAPR}%`;
        } else {
          lowAPRText = `(APR not provided)`;
        }
        prompt += ` Low-interest debt: $${((financialContext as any).lowInterestDebt as number).toLocaleString()} ${lowAPRText}.`;
      }
      // AUDIT 27 FIX REM-27-C: Explicitly state savings status to prevent debt-as-savings confusion
      // When savings is undefined or zero, explicitly label it as such to prevent model from inferring savings from debt balance
      const totalSavingsValue = (financialContext as any).totalSavings;
      if (totalSavingsValue !== undefined && totalSavingsValue > 0) {
        prompt += ` Current savings: $${(totalSavingsValue as number).toLocaleString()}.`;
      } else if (totalSavingsValue === 0 || totalSavingsValue === undefined) {
        // Explicitly state zero savings to prevent model from confusing debt balance with savings
        prompt += ` Current savings: $0 (not provided).`;
      }
      
      // AUDIT 17 FIX P1: Additional PARTIAL INFO checks for secondary scenarios
      const hasIncome = (financialContext.monthlyIncome || 0) > 0;
      const hasExpenses = (financialContext.essentialExpenses || 0) > 0;
      const hasSavings = (financialContext.totalSavings || 0) > 0;
      const hasDebt = (financialContext.highInterestDebt || 0) > 0 || (financialContext.lowInterestDebt || 0) > 0;
      
      if (hasIncome && hasExpenses && !hasSavings && !hasDebt) {
        prompt += `\n\nPARTIAL INFO PROTOCOL: User provided income and expenses but NOT savings or debt. Ask: "Do you have any savings or emergency fund?" and "Any debt — credit cards, student loans, car loans?" Build the picture conversationally, not via homework assignment.`;
      }
      
      // AUDIT 12 FIX DEFECT-09: Add cushion status to prevent recommending funded emergency fund
      const monthlyEssentials = financialContext.essentialExpenses || 0;
      // REM-29-C: Align emergency cushion target with RULE 8A (6 months, not 3)
      // RULE 8A in atlasSystemPrompt.ts specifies 6 months. This was using 3, creating
      // a conflict: the data context told the model "3 months", the system prompt rule told it "6 months".
      const cushionTarget = monthlyEssentials * 6;
      const totalSavings = financialContext.totalSavings || 0;
      // AUDIT 13 FIX DEFECT-09-FORMATTING: Format cushion status values with currency
      const cushionStatus = totalSavings >= cushionTarget
        ? `EMERGENCY CUSHION: FUNDED ($${totalSavings.toLocaleString()} savings vs. $${cushionTarget.toLocaleString()} target). Do NOT recommend building an emergency fund.`
        : `EMERGENCY CUSHION: UNDERFUNDED ($${totalSavings.toLocaleString()} savings vs. $${cushionTarget.toLocaleString()} needed).`;
      prompt += `\n\n${cushionStatus}`;
      
      // AUDIT 13 FIX DEFECT-RETIREMENT: Add retirement context to system prompt
      if (financialContext.retirementSavings !== null && financialContext.retirementSavings !== undefined) {
        prompt += `\n\nRETIREMENT SAVINGS: User has $${financialContext.retirementSavings.toLocaleString()} in retirement accounts. When discussing financial goals, reference their retirement balance and provide retirement-specific guidance.`;
      }
      
      // AUDIT 17 FIX P1: Employer match detection and priority
      // AUDIT 23 FIX REM-23-E: Enhance employer match logic to address debt tradeoff
      const employerMatchPercent = (financialContext as any).employerMatchPercent || null;
      const currentlyContributing = (financialContext as any).currentlyContributing || null;
      if (employerMatchPercent && employerMatchPercent > 0) {
        const freeMoneyForfeited = Math.round((financialContext.monthlyIncome || 0) * employerMatchPercent / 100);
        const hiDebt = (financialContext as any).highInterestDebt || 0;
        const hiApr = (financialContext as any).highInterestDebtAPR;
        
        // If user has high-interest debt, address the match vs debt tradeoff explicitly
        if (hiDebt > 0 && hiApr && typeof hiApr === 'number' && hiApr > 0) {
          const matchReturn = employerMatchPercent * 2; // Assume 100% match = 2x return
          const matchStatus = currentlyContributing === false 
            ? `EMPLOYER MATCH + DEBT TRADEOFF: User is NOT currently contributing to ${employerMatchPercent}% match ($${freeMoneyForfeited}/month) AND has ${hiApr}% high-interest debt ($${hiDebt.toLocaleString()}). CRITICAL RULE: ALWAYS capture the full employer match FIRST (it is a 100% return on day one). Then direct remaining surplus to the high-interest debt. Never leave employer match money on the table. The math: match is ~${matchReturn}% guaranteed return vs debt at ${hiApr}% cost. Get the match first, then attack the debt.`
            : `EMPLOYER MATCH + DEBT CONTEXT: User has ${employerMatchPercent}% employer match available (${currentlyContributing ? 'currently contributing' : 'status unknown'}) AND ${hiApr}% high-interest debt. ALWAYS prioritize: (1) Capture full employer match first (guaranteed return), (2) Then direct remaining surplus to the debt. Explain this tradeoff with the math.`;
          prompt += `\n\n${matchStatus}`;
        } else {
          // No high-interest debt, or APR unknown
          const matchStatus = currentlyContributing === false 
            ? `EMPLOYER MATCH ALERT: User is NOT currently contributing. Employer offers ${employerMatchPercent}% match = $${freeMoneyForfeited}/month FREE MONEY being forfeited. This is ALWAYS priority #1 before any other financial move.`
            : `EMPLOYER MATCH: User has ${employerMatchPercent}% employer match available (${currentlyContributing ? 'currently contributing' : 'status unknown'}).`;
          prompt += `\n\n${matchStatus}`;
        }
      }
      
      // AUDIT 27 FIX REM-27-E: Apply authoritative APR data to answer path (same as chat path)
      // Previously used text-based prohibition which model overrides with training knowledge
      // Now use authoritative data injection to prevent APR hallucination
      const answerPathHiDebt = (financialContext.highInterestDebt || 0) > 0;
      const answerPathHiApr = financialContext.highInterestDebtAPR;
      if (answerPathHiDebt && (!answerPathHiApr || typeof answerPathHiApr !== 'number')) {
        prompt += `\n\nDEBT CONTEXT (Authoritative Data — DO NOT OVERRIDE):
High-interest debt balance: $${(financialContext.highInterestDebt as number).toLocaleString()}
APR: NOT PROVIDED BY USER — UNKNOWN
Monthly interest cost: CANNOT BE CALCULATED (APR not known)
Payoff timeline: CANNOT BE CALCULATED (APR not known)
CONSTRAINT: Do not state any specific APR. Do not calculate interest costs. Do not say "at 18%" or any percentage. The user has not provided this information. If they ask about interest costs or payoff timeline, say: "I need your APR to calculate that — it's on your credit card statement or in your card's app." This constraint is absolute.`;
      }
    }

    // AUDIT 11 FIX DEFECT-06: Use activeLever/activeTier if provided, otherwise fall back to baseline
    const leverToUse = activeLever || baseline?.lever;
    if (leverToUse) {
      prompt += `\n\nACTIVE RECOMMENDATION: ${leverToUse.replace(/_/g, ' ')}. Your response must reinforce this recommendation and not suggest contradictory strategies.`;

      if (baseline && financialContext) {
        const surplus = (financialContext.monthlyIncome || 0) - (financialContext.essentialExpenses || 0);
        // AUDIT 16 FIX DEFECT-15-NEG-CASHFLOW-502: Guard against negative surplus display
        const safeSurplus = Math.max(-999999, Math.min(999999, surplus));
        const surplusLine = surplus < 0 ? `- Monthly deficit: $${Math.abs(safeSurplus)}` : `- Monthly surplus: $${safeSurplus}`;
        prompt += `\n\nATLAS RECOMMENDATION:
- Recommended lever: ${baseline.lever}
- Urgency: ${baseline.urgency}
${surplusLine}`;
        
        // AUDIT 14 FIX GAP-01 Part C: Add debt-first priority when active lever is debt elimination
        // AUDIT 23 FIX REM-23-B: Remove hardcoded APR fallback (?? 23) that causes hallucination
        if (leverToUse === 'eliminate_high_interest_debt' && financialContext.highInterestDebt && financialContext.highInterestDebt > 0) {
          const aprPct = financialContext.highInterestDebtAPR;
          if (aprPct && typeof aprPct === 'number' && aprPct > 0 && aprPct < 100) {
            prompt += `\n\nDEBT-FIRST PRIORITY: The user has $${financialContext.highInterestDebt.toLocaleString()} in high-interest debt at ${aprPct}% APR. When asked about other financial priorities (retirement contributions, savings, investing), always reference this debt-first priority. A guaranteed ${aprPct}% return from debt payoff exceeds most investment returns. Recommend paying off this debt first, then redirecting that payment amount toward retirement contributions or other goals.`;
          } else {
            prompt += `\n\nDEBT-FIRST PRIORITY: The user has $${financialContext.highInterestDebt.toLocaleString()} in high-interest debt (APR unknown). When asked about other financial priorities (retirement contributions, savings, investing), always reference this debt-first priority. High-interest debt typically carries a guaranteed return from payoff that exceeds most investment returns. Recommend paying off this debt first, then redirecting that payment amount toward retirement contributions or other goals. Ask the user for the APR if needed for precise calculations.`;
          }
        }
        
        // AUDIT 16 FIX GAP-16-DEBT-SEQUENCE: Add debt sequencing logic when multiple debt types present
        // AUDIT 23 FIX REM-23-B: Remove hardcoded APR fallbacks (?? 23, ?? 5) that cause hallucination
        const hiDebtAmount = financialContext.highInterestDebt || 0;
        const loDebtAmount = financialContext.lowInterestDebt || 0;
        const hasMultipleDebts = hiDebtAmount > 0 && loDebtAmount > 0;
        if (hasMultipleDebts) {
          const hiApr = financialContext.highInterestDebtAPR;
          const loApr = financialContext.lowInterestDebtAPR;
          
          // Only provide specific APR guidance if both APRs are known
          if (hiApr && typeof hiApr === 'number' && loApr && typeof loApr === 'number' && hiApr > 0 && loApr > 0) {
            const sequencingGuidance = hiApr > loApr
              ? `DEBT SEQUENCING: User has both high-interest ($${hiDebtAmount.toLocaleString()} at ${hiApr}%) and low-interest ($${loDebtAmount.toLocaleString()} at ${loApr}%) debt. Use the avalanche method: pay high-interest debt first (${hiApr}% guaranteed return), then low-interest debt (${loApr}%). This minimizes total interest paid.`
              : `DEBT SEQUENCING: User has both high-interest ($${hiDebtAmount.toLocaleString()} at ${hiApr}%) and low-interest ($${loDebtAmount.toLocaleString()} at ${loApr}%) debt. Interest rates are close — either avalanche (highest rate first) or snowball (smallest balance first) works. Recommend avalanche for mathematical optimality: pay ${hiApr}% debt first.`;
            prompt += `\n\n${sequencingGuidance}`;
          } else {
            // If APRs are not fully known, provide generic guidance without specific rates
            prompt += `\n\nDEBT SEQUENCING: User has both high-interest and low-interest debt. Use the avalanche method: pay the highest-rate debt first, then the lower-rate debt. This minimizes total interest paid. Ask the user for specific APRs if needed for precise calculations.`;
          }
        }
        
        // AUDIT 17 FIX P3: Recommendation ordering - debt payoff urgency weight
        // AUDIT 23 FIX REM-23-B: Remove hardcoded APR fallback (?? 23)
        const surplusForPayoff = (financialContext.monthlyIncome || 0) - (financialContext.essentialExpenses || 0);
        const hiDebtPayoffMonths = hiDebtAmount > 0 && surplusForPayoff > 0 ? Math.ceil(hiDebtAmount / surplusForPayoff) : 999;
        if (hiDebtAmount > 0 && hiDebtPayoffMonths <= 2) {
          const aprText = financialContext.highInterestDebtAPR && typeof financialContext.highInterestDebtAPR === 'number' 
            ? `The guaranteed ${financialContext.highInterestDebtAPR}% return from payoff exceeds all other opportunities.`
            : `High-interest debt elimination is the clear priority — the guaranteed return exceeds most other opportunities.`;
          prompt += `\n\nDEBT PAYOFF URGENCY (AUDIT 17): High-interest debt payable in ${hiDebtPayoffMonths} month(s) at current surplus. This is the clear priority — eliminate it before any other lever. ${aprText}`;
        }
        
        // AUDIT 17 FIX P1: Income lever surface for thin-margin users
        // AUDIT 23 FIX REM-23-F: Surface income lever for ALL tight-surplus users, not just those who signaled growth
        const incomeGrowthSignal = (financialContext as any).incomeGrowthSignal || false;
        const surplusRatio = (financialContext.monthlyIncome || 0) > 0 ? ((financialContext.monthlyIncome || 0) - (financialContext.essentialExpenses || 0)) / (financialContext.monthlyIncome || 0) : 0;
        const currentSurplus = (financialContext.monthlyIncome || 0) - (financialContext.essentialExpenses || 0);
        const potentialIncome = Math.round((financialContext.essentialExpenses || 0) * INCOME_LEVER_POTENTIAL_PCT);
        
        // Surface income lever for tight-surplus users (< 20% surplus ratio) with debt
        if (surplusRatio < INCOME_LEVER_SURPLUS_RATIO && surplusRatio > 0 && hiDebtAmount > 0) {
          const currentPayoffMonths = hiDebtAmount > 0 && currentSurplus > 0 ? Math.ceil(hiDebtAmount / currentSurplus) : 999;
          const boostedPayoffMonths = hiDebtAmount > 0 && (currentSurplus + potentialIncome) > 0 ? Math.ceil(hiDebtAmount / (currentSurplus + potentialIncome)) : 999;
          const monthsSaved = currentPayoffMonths - boostedPayoffMonths;
          
          if (monthsSaved > 0) {
            prompt += `\n\nINCOME LEVER (AUDIT 23): User's surplus is thin at $${currentSurplus}/month (${Math.round(surplusRatio * 100)}% of income). If they increased monthly income by $${potentialIncome} (achievable via side work, raise negotiation, or reduced withholding), debt payoff would accelerate by ${monthsSaved} months. Surface this as "The other lever": after the debt action, mention this income opportunity. Example: "The other lever is income — adding $${potentialIncome}/month from a side gig or negotiating a raise would cut your payoff timeline by ${monthsSaved} months."`;
          }
        } else if (incomeGrowthSignal && surplusRatio < INCOME_LEVER_SURPLUS_RATIO) {
          // Original logic: if user signaled income growth interest
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
    // CONTEXT WINDOW TRUNCATION: If conversation exceeds 40 messages, keep last 30
    let trimmedMessages = messages;
    
    if (messages.length > 40) {
      // Keep the last 30 messages to stay within token limits
      const recentMessages = messages.slice(-30);
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
        
        // AUDIT 19 FIX P2: Remove financial data from server logs (security/privacy)
        // Log only field count, not actual values which contain sensitive financial data
        console.log('[extract] fieldCount:', Object.keys(fields || {}).length);
        console.log('[extract] fieldNames:', Object.keys(fields || {}).join(', '));
        
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
      
      // AUDIT 18 FIX P2: Post-generation APR disclosure check (REMOVED by REM-29-A)
      // Previous code appended fabricated "~18-23% typical APR" to answer path responses.
      // This violated RULE 5B (absolute prohibition on APR estimation).
      // Removed in Audit 29. The model's system prompt (RULE 5B) now governs APR handling.
      const fin = (body as any)?.fin;

      // REM-29-G: Apply post-processors to answer path (parity with chat path REM-28-A and REM-28-B)
      const answerDebt = (fin?.highInterestDebt as number) || 0;
      const answerApr = fin?.highInterestDebtAPR;
      const answerSavings = fin?.totalSavings ?? null;

      // REM-28-A equivalent: strip APR hallucinations when APR is unknown
      if (answerDebt > 0 && (!answerApr || typeof answerApr !== 'number')) {
        const answerSentences = t0.split(/(?<=[.!?])\s+/);
        t0 = answerSentences.filter(s => {
          if (/\bat\s+\d+(\.\d+)?%(\s*(APR|interest\s*rate|interest))?/i.test(s) && !s.includes('?')) return false;
          if (/\d+(\.\d+)?%\s+(APR|interest\s+rate)/i.test(s) && !s.includes('?')) return false;
          if (/charg(es?|ing)\s+\d+(\.\d+)?%/i.test(s)) return false;
          if (/\$\d[\d,]*\s*(\/month|per month|a month|monthly)\s+in\s+interest/i.test(s)) return false;
          if (/interest\s+(of|costs?\s*you|charges?|is|are)\s+\$\d[\d,]*/i.test(s) && !s.includes('?')) return false;
          if (/\$[\d,]+\s*[×x*]\s*0\.\d+\s*[÷/]\s*12/i.test(s)) return false;
          return true;
        }).join(' ').trim();
      }

      // REM-28-B equivalent: fix debt-savings confusion
      if (answerDebt > 0 && (answerSavings === null || answerSavings === undefined)) {
        const debtStr = answerDebt.toLocaleString();
        const fakeSavingsPattern = new RegExp(
          `\\$${debtStr.replace(/,/g, ',?')}\\s*(in\\s+(your\\s+)?savings(\\s+right\\s+now)?|saved(\\s+right\\s+now)?)`,
          'gi'
        );
        if (fakeSavingsPattern.test(t0)) {
          t0 = t0.replace(fakeSavingsPattern, `$${debtStr} in high-interest debt`);
        }
      }
      
      if (!violatesGuardrails(t0)) {
        return jsonOk({ text: t0, source: 'claude', model: usedModel, tier });
      }

      // AUDIT 19 FIX P1: Preserve emotional acknowledgment through repair mechanism
      const isEmotional = (body as any)?.fin?.emotionalDistressSignal;
      const repairSystem = isEmotional
        ? `Rewrite the following text to comply with ALL constraints.
Constraints: max 2 sentences; max 1 question mark; no lists; plain text only.
CRITICAL: If the original text begins with emotional acknowledgment (acknowledging stress, worry, or difficulty), you MUST preserve that acknowledgment as the first sentence.
Return ONLY the rewritten text.`
        : `Rewrite the following text to comply with ALL constraints.
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

      // REM-29-D: Sanitize string fields in financialProfile before system prompt injection
      // Numeric/boolean fields are type-checked throughout. String fields need sanitization.
      // This prevents a crafted fin object from injecting instructions into the model context.
      if (financialProfile) {
        const stringFields = ['notes', 'goal', 'incomeSource', 'debtType'] as const;
        for (const field of stringFields) {
          const val = (financialProfile as any)[field];
          if (typeof val === 'string') {
            (financialProfile as any)[field] = sanitizeMemorySummary(val);
          }
        }
      }

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

      // AUDIT 27 FIX REM-27-A Part 1: Authoritative null-APR data injection (CORRECTED)
      // When debt exists but APR is unknown, inject explicit "APR: NOT PROVIDED" into calculationBlock
      // This fills the void that the model otherwise fills with training knowledge (18%)
      // CRITICAL FIX: Always inject this block when debt exists without APR, even if other calculations exist
      // The model respects authoritative data (T8 confirms: when APR IS in block, model uses it exactly)
      // Solution: make the absence of APR equally authoritative by ALWAYS including this block
      const nullAprDebt = (financialProfile?.highInterestDebt as number) || 0;
      const nullAprValue = (financialProfile as any)?.highInterestDebtAPR;
      if (nullAprDebt > 0 && (!nullAprValue || typeof nullAprValue !== 'number')) {
        const nullAprBlock = `DEBT CONTEXT (Authoritative Data — DO NOT OVERRIDE):
High-interest debt balance: $${nullAprDebt.toLocaleString()}
APR: NOT PROVIDED BY USER — UNKNOWN
Monthly interest cost: CANNOT BE CALCULATED (APR not known)
Payoff timeline: CANNOT BE CALCULATED (APR not known)
CONSTRAINT: Do not state any specific APR. Do not calculate interest costs. Do not say "at 18%" or any percentage. The user has not provided this information. If they ask about interest costs or payoff timeline, say: "I need your APR to calculate that — it's on your credit card statement or in your card's app." This constraint is absolute.`;
        // Prepend null-APR block to ensure it's seen first and takes precedence
        calculationBlock = nullAprBlock + (calculationBlock ? `\n\n${calculationBlock}` : '');
      }

      // AUDIT 27 FIX REM-27-B: Employer match into calculationBlock (replaces dynamicProtocols injection)
      // The model ignores employer match instructions in dynamicProtocols because training says "debt first"
      // Solution: inject match guidance into authoritative calculationBlock so model respects it
      const emMatchPctCalc = (financialProfile as any)?.employerMatchPercent;
      const emContributingCalc = (financialProfile as any)?.currentlyContributing;
      const emIncomeCalc = (financialProfile?.monthlyIncome as number) || 0;
      
      if (emMatchPctCalc && typeof emMatchPctCalc === 'number' && emMatchPctCalc > 0 && emIncomeCalc > 0) {
        const freeMoneyMonth = Math.round(emIncomeCalc * emMatchPctCalc / 100);
        const matchBlock = !emContributingCalc
          ? `\n\nEMPLOYER MATCH (Authoritative — MUST INCLUDE IN RESPONSE):
Match rate: ${emMatchPctCalc}% of salary
Free money being forfeited monthly: $${freeMoneyMonth} (100% guaranteed return)
Currently contributing: NO — THIS IS A CRITICAL GAP
RULE: Employer match capture is ALWAYS priority #1 before any other financial move. $${freeMoneyMonth}/month free money beats paying down any debt. ALWAYS lead with: "Before anything else, start contributing enough to capture your full ${emMatchPctCalc}% employer match — that's $${freeMoneyMonth}/month you're leaving on the table."`
          : `\n\nEMPLOYER MATCH (Authoritative):
Match rate: ${emMatchPctCalc}% of salary
Currently contributing: YES — good
Monthly match captured: $${freeMoneyMonth}`;
        calculationBlock = (calculationBlock || '') + matchBlock;
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

      // REM-31-C: Wire conversation arc engine
      // Build arc to detect conversation phase and check synthesis readiness
      let arcContext = '';
      let synthesisSuffix = '';
      try {
        if (conversationHistory.length >= 2) {
          const arc = buildConversationArc(
            (conversationHistory as any[]).map(m => ({
              role: m.role as 'user' | 'assistant',
              content: String(m.content || ''),
            })),
            financialProfile as any
          );
          
          // Add phase awareness to dynamicProtocols
          if (arc.phase === 'action') {
            arcContext = `\n\nCONVERSATION PHASE: User is in ACTION phase — they understand the situation and are ready to move. Do not re-explain. Give one concrete next step they can do today.`;
          } else if (arc.phase === 'decision') {
            arcContext = `\n\nCONVERSATION PHASE: User is in DECISION phase — comparing options or making choices. Help them decide, not just explore.`;
          } else if (arc.phase === 'reflection') {
            arcContext = `\n\nCONVERSATION PHASE: User is in REFLECTION phase — evaluating progress. Acknowledge what they've done before recommending next steps.`;
          }
          
          // Session synthesis when ready
          if (arc.readyForSynthesis && isReadyForSynthesis(conversationHistory as any[])) {
            const synthesis = generateSessionSynthesis(arc, financialProfile as any, conversationHistory as any[]);
            // Add synthesis to financial profile context — model can reference it
            arcContext += `\n\nSESSION SYNTHESIS READY: User has completed ${arc.questionsAsked.length} questions. After your main response, offer: "Want me to summarize your financial priorities and next steps so far?"`;
          }
        }
      } catch (e) {
        console.warn('[arc-engine] Conversation arc failed:', e);
        // Non-fatal — continue without arc context
      }

      // AUDIT 20 FIX BUG-20-003: Dynamic protocol injection for chat path
      // Move PARTIAL INFO, TRIAGE, and EMOTIONAL INTELLIGENCE protocols from buildAnswerPrompt()
      // to the chat path so they fire during main onboarding conversation
      let dynamicProtocols = '';
      
      // PARTIAL INFO PROTOCOL: When income is provided but expenses are missing
      if (extractedFields?.monthlyIncome && !extractedFields?.essentialExpenses) {
        dynamicProtocols += `\n\nPARTIAL INFO PROTOCOL (POSITION 0 — OVERRIDES ALL OTHER INSTRUCTIONS):
User provided income but NOT expenses. The ONLY acceptable output is this EXACT question:
"Roughly what do you spend on essentials — rent, food, transportation, utilities — each month? A ballpark is fine."
Do NOT ask about triage level. Do NOT ask about goals. Do NOT ask about debt. Do NOT explain why you need this.
Output ONLY that question. No prefix. No suffix. No other text.`;
      }
      
      // TRIAGE PROTOCOL: When spending exceeds income (financial crisis)
      if (extractedFields?.monthlyIncome && extractedFields?.essentialExpenses &&
          (extractedFields.essentialExpenses as number) > (extractedFields.monthlyIncome as number)) {
        const deficit = (extractedFields.essentialExpenses as number) - (extractedFields.monthlyIncome as number);
        dynamicProtocols += `\n\nTRIAGE PROTOCOL (POSITION 0 — CRITICAL):
User is in financial triage (spending $${deficit} more than they earn monthly).
MANDATORY: Open your response with EXACTLY: "You're in financial triage."
Then show the burn rate: "At $${deficit}/month deficit, you'll exhaust savings in X months."
Then give ONE specific action with a dollar figure.
Do NOT ask "where is the money coming from" (past question). Ask "What can you cut?" (action question).
Do NOT provide false reassurance. Be direct about the crisis.`;
      }
      
      // EMOTIONAL INTELLIGENCE GATE: When user shows emotional distress
      if (extractedFields?.emotionalDistressSignal) {
        dynamicProtocols += `\n\nEMOTIONAL INTELLIGENCE GATE (POSITION 0 — ABSOLUTE PRIORITY):
User is in emotional distress (fear, stress, overwhelm, hopelessness).
MANDATORY: Your FIRST sentence must acknowledge their feeling before any numbers or advice.
Do NOT start with numbers, percentages, or recommendations.
ONE sentence acknowledgment only. Then proceed with analysis.
Examples of correct acknowledgments:
- "That kind of stress is real — carrying debt while trying to sleep is genuinely hard."
- "Feeling overwhelmed about money is one of the most common experiences there is, and it doesn't mean you're stuck."
- "The fact that you're looking at this directly, even though it feels overwhelming, puts you ahead of most people in the same spot."`;
      }
      
      // AUDIT 24 FIX REM-24-B: Move income lever to chat path (was dead code in buildAnswerPrompt)
      // Surface income-side option for tight-surplus users with high-interest debt
      const ilIncome = (financialProfile?.monthlyIncome as number) || 0;
      const ilExpenses = (financialProfile?.essentialExpenses as number) || 0;
      const ilDebt = (financialProfile?.highInterestDebt as number) || 0;
      const ilSurplusRatio = ilIncome > 0 ? (ilIncome - ilExpenses) / ilIncome : 0;
      const ilSurplus = ilIncome - ilExpenses;
      if (ilSurplusRatio < INCOME_LEVER_SURPLUS_RATIO && ilSurplusRatio > 0 && ilDebt > 0) {
        const ilPotentialIncome = Math.round(ilExpenses * INCOME_LEVER_POTENTIAL_PCT);
        const ilCurrentMonths = ilSurplus > 0 ? Math.ceil(ilDebt / ilSurplus) : 999;
        const ilBoostedMonths = (ilSurplus + ilPotentialIncome) > 0 ? Math.ceil(ilDebt / (ilSurplus + ilPotentialIncome)) : 999;
        const ilMonthsSaved = ilCurrentMonths - ilBoostedMonths;
        if (ilMonthsSaved > 0) {
          // REM-31-D: Replace generic income lever suggestions with specific, actionable alternatives (REM-29-H)
          // "Side income or a raise" is advice available on any personal finance blog.
          // Atlas differentiates by providing concrete, specific alternatives with real mechanics.
          const w4Adjustment = Math.round(ilPotentialIncome * 0.7);
          dynamicProtocols += `\n\nINCOME LEVER: User has thin surplus ($${ilSurplus}/month, ${Math.round(ilSurplusRatio * 100)}% of income) and $${ilDebt.toLocaleString()} in debt. If they added $${ilPotentialIncome}/month, debt payoff accelerates by ${ilMonthsSaved} months. After your main recommendation, surface this as "The other lever — three ways to add $${ilPotentialIncome}/month:
(1) Negotiate a raise: book a 30-minute meeting with your manager this week. Asking once for 5-10% has a high success rate and zero downside.
(2) One freelance project per month: your existing skills (writing, design, data analysis, tutoring) can generate $${Math.round(ilPotentialIncome / 2)}–$${ilPotentialIncome} in a single project.
(3) Adjust your W-4: if you got a federal tax refund last year, you're over-withholding — adjust your W-4 to get $${w4Adjustment}–$${ilPotentialIncome} per month back in your paycheck immediately.
Surface these specifically, not generically."`;
        }
      }
      
      // AUDIT 27 FIX REM-27-A Part 2: Removed redundant APR prohibition from dynamicProtocols
      // REM-27-A Part 1 now injects authoritative "APR: NOT PROVIDED" into calculationBlock
      // This is more effective than text-based prohibition in dynamicProtocols
      // The model respects authoritative data blocks (T8 confirms) over prompt instructions
      
      // AUDIT 27 FIX REM-27-B Part 2: Removed redundant employer match from dynamicProtocols
      // REM-27-B Part 1 now injects employer match into calculationBlock as authoritative data
      // This is more effective than text-based guidance in dynamicProtocols
      
      // AUDIT 26 FIX REM-26-D: Surface profile savings data in chat path
      // Savings injection at line 880 (buildAnswerPrompt) is unreachable by chat users
      // Add savings context to dynamicProtocols to prevent re-asking for data already in profile
      const chatSavings = (financialProfile?.totalSavings as number) ?? (financialProfile as any)?.savings ?? null;
      if (chatSavings !== null && chatSavings >= 0) {
        dynamicProtocols += `\n\nPROFILE SAVINGS: User has $${chatSavings.toLocaleString()} in total savings. Do NOT ask "how much do you have in savings?" — you already know this. Use it in your guidance (emergency fund gap, runway calculations, lump-sum debt payoff potential).`;
      }

      // AUDIT 27 FIX REM-27-F: Cross-session debt progress tracking
      // When user has debt, compare to previous session and surface progress
      // This transforms Atlas from one-time advisor into returning companion
      if (userId && (financialProfile?.highInterestDebt as number) > 0) {
        try {
          const { getDebtProgressContext } = await import('@/lib/profile');
          const debtProgress = await getDebtProgressContext(userId, financialProfile.highInterestDebt as number);
          if (debtProgress && debtProgress.debtPaidDown > 0) {
            dynamicProtocols += `\n\nDEBT PROGRESS: Last session you had $${debtProgress.previousBalance.toLocaleString()} in high-interest debt. Today: $${(financialProfile.highInterestDebt as number).toLocaleString()}. You've paid down $${debtProgress.debtPaidDown.toLocaleString()} (${debtProgress.percentageReduction}% reduction). Acknowledge this progress explicitly — "You've paid down $${debtProgress.debtPaidDown.toLocaleString()} since last time — that's real progress." Then continue with next steps.`;
          }
        } catch (e) {
          console.warn('[REM-27-F] Debt progress context failed:', e);
        }
      }

      // REM-29-B: Explicit known APR injection for chat path
      // The chat path currently relies on calculationBlock for APR data, which only generates
      // when financialDecision.domain === 'debt_payoff'. Domain detection is non-deterministic,
      // so APR data is silently absent when domain detection doesn't fire (T-28-2 failure).
      // This explicit injection ensures the model always has authoritative APR data regardless of domain.
      const chatKnownApr = (financialProfile as any)?.highInterestDebtAPR;
      const chatKnownDebt = (financialProfile?.highInterestDebt as number) || 0;
      if (chatKnownDebt > 0 && chatKnownApr && typeof chatKnownApr === 'number' && chatKnownApr > 0 && chatKnownApr < 100) {
        const monthlyInterestCost = Math.round(chatKnownDebt * chatKnownApr / 100 / 12);
        dynamicProtocols += `\n\nKNOWN APR (AUTHORITATIVE DATA — MUST USE):
User's high-interest debt: $${chatKnownDebt.toLocaleString()}
User's APR: ${chatKnownApr}% (confirmed from profile)
Monthly interest cost: $${monthlyInterestCost.toLocaleString()}
CRITICAL INSTRUCTION: This APR is from the user's actual profile data. You MUST use ${chatKnownApr}% in all calculations and discussions. Do NOT estimate, assume, or substitute any other rate. Do NOT say "typically 18%" or "usually 20%". The user's actual rate is ${chatKnownApr}%.`;
      }

      // REM-29-F: Proactive employer match question
      // When user has debt and income but no employer match data in profile,
      // add a follow-up question to surface this critical variable.
      // Employer match changes the debt-vs-retirement calculation entirely.
      const hasDebtForMatch = chatKnownDebt > 0 || (financialProfile?.highInterestDebt as number || 0) > 0;
      const hasIncomeForMatch = (financialProfile?.monthlyIncome as number || 0) > 0;
      const matchAlreadyKnown = !!(financialProfile as any)?.employerMatchPercent;
      const userMessageMentionsMatch = /employer|401k|match|retirement\s+plan/i.test(lastUserMsg);

      // REM-30-A: Add conversation history check to prevent repeating the employer match question
      // Without this, the question fires on every turn until employerMatchPercent is populated.
      // conversationHistory contains all prior assistant messages — check if we already asked.
      // REM-31-F: Unify regex patterns with post-processor to catch all match question variants
      const matchAlreadyAskedInHistory = (conversationHistory as any[]).some(msg =>
        msg.role === 'assistant' &&
        /employer\s+match|company\s+match|\bmatching\s+contribution|\b401k\s+match|does\s+your\s+employer/i.test(String(msg.content || ''))
      );

      if (hasDebtForMatch && hasIncomeForMatch && !matchAlreadyKnown && !userMessageMentionsMatch && !matchAlreadyAskedInHistory) {
        dynamicProtocols += `\n\nEMPLOYER MATCH UNKNOWN: User has debt and income but has not mentioned whether their employer offers a 401k match. After giving debt advice, ask: "One quick question — does your employer offer a 401k match? If yes, that changes the math on what to prioritize first." Ask this ONCE, at the end of your response. Do not ask it in follow-up messages if it's already been asked.`;
      }

      // OP-2: Deepen optimize-tier guidance for HNW and gig worker profiles
      // Users with zero debt and funded emergency fund need specialized guidance beyond generic "optimize"
      const optimizeTierIncome = (financialProfile?.monthlyIncome as number) || 0;
      const optimizeTierSavings = (financialProfile?.totalSavings as number) || 0;
      const optimizeTierExpenses = (financialProfile?.essentialExpenses as number) || 0;
      const optimizeTierDebt = (financialProfile?.highInterestDebt as number) || 0;
      const chatTriageLevel = getTriageLevel(financialProfile as any);
      const isHighNetWorth = optimizeTierSavings > optimizeTierExpenses * 24 && optimizeTierDebt === 0;
      const isGigWorker = (financialProfile as any)?.incomeType === 'variable' || (financialProfile as any)?.incomeType === 'gig';
      
      if (chatTriageLevel === 'optimize') {
        if (isHighNetWorth) {
          // HNW-specific guidance: tax efficiency, asset location, complex strategies
          dynamicProtocols += `\n\nOPTIMIZE TIER — HIGH NET WORTH: User has substantial assets (${optimizeTierSavings > 0 ? `$${optimizeTierSavings.toLocaleString()}` : 'significant savings'}) and zero debt. Their optimization levers are: (1) Tax efficiency — is asset location optimal (tax-deferred vs taxable accounts)? (2) Roth conversion opportunities? (3) Are they maxing tax-advantaged accounts before taxable? (4) Fee drag in investment accounts? For these decisions, a fee-only CFP should verify investment product selection and complex tax scenarios. Acknowledge professional guidance naturally when discussing specific investment products or tax strategies.`;
        } else if (isGigWorker) {
          // Gig worker-specific guidance: self-employment tax, quarterly estimates, retirement options
          dynamicProtocols += `\n\nOPTIMIZE TIER — GIG WORKER: User has variable income and zero debt. Their optimization levers are: (1) Self-employment tax planning — quarterly estimated taxes and deduction optimization? (2) Retirement account choice — SEP-IRA vs Solo 401k vs Roth SEP? (3) Income smoothing — how to handle variable monthly income? (4) Deduction tracking — home office, equipment, professional development? These are the biggest financial gaps for self-employed workers. Surface these specifically when discussing income or retirement planning.`;
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

      // REM-29-E: Cross-session financial progress context
      let progressContext = '';
      if (userId && userId !== 'guest' && (financialProfile?.highInterestDebt as number) > 0) {
        try {
          const { getPriorFinancialSnapshot } = await import('@/lib/profile');
          const prior = await getPriorFinancialSnapshot(userId);
          if (prior && prior.highInterestDebt !== undefined && financialProfile?.highInterestDebt !== undefined) {
            const currentDebt = (financialProfile.highInterestDebt as number) || 0;
            const priorDebt = prior.highInterestDebt;
            const debtPaidDown = priorDebt - currentDebt;
            if (debtPaidDown > 0 && priorDebt > 0) {
              const pctPaid = Math.round((debtPaidDown / priorDebt) * 100);
              const priorDate = prior.timestamp ? new Date(prior.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'last session';
              progressContext = `\n\nCROSS-SESSION PROGRESS (since ${priorDate}):
Prior debt: $${priorDebt.toLocaleString()} | Current debt: $${currentDebt.toLocaleString()} | Paid down: $${debtPaidDown.toLocaleString()} (${pctPaid}%)
INSTRUCTION: Acknowledge this progress explicitly in your response. Say something like: "Since ${priorDate}, you've paid down $${debtPaidDown.toLocaleString()} — that's ${pctPaid}% of your original balance. That's real progress." Acknowledge it before giving new advice.`;
            }
          }
        } catch (e) {
          console.warn('[REM-29-E] Cross-session progress retrieval failed:', e);
        }
      }

      const promptSections: string[] = [
        ATLAS_SYSTEM_PROMPT,         // ← Use new Sprint 1 system prompt (position 0)
        ...(dynamicProtocols ? [dynamicProtocols] : []), // ← AUDIT 20 FIX: Dynamic protocols (PARTIAL INFO, TRIAGE, EMOTIONAL) injected at position 1
        ...(arcContext ? [arcContext] : []), // ← REM-31-C: Conversation arc context (phase awareness + synthesis readiness)
        sessionStateBlock,           // ← Always included, never trimmed (position 2)
        ...(calculationBlockSection ? [calculationBlockSection] : []), // ← REM-K: POSITION 3 = calculation block MUST NEVER BE TRIMMED (matches stated intent)
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
        ...(progressContext ? [progressContext] : []), // ← REM-29-E: Cross-session progress
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
      // CRITICAL: For null-APR blocks, use stronger prefilling to prevent model from overriding the constraint
      let messagesToSend = trimmedMessages;
      if (calculationBlock) {
        const hasNullAprConstraint = calculationBlock.includes('APR: NOT PROVIDED BY USER');
        const prefillContent = hasNullAprConstraint
          ? `[CALCULATION COMPLETE]\n${calculationBlock}\n\nI cannot calculate your exact payoff timeline or interest costs without your APR. Here's what I know:`
          : `[CALCULATION COMPLETE]\n${calculationBlock}\n\nNow let me explain these results in plain language:`;
        
        messagesToSend = [
          ...trimmedMessages,
          {
            role: 'assistant' as const,
            content: prefillContent
          }
        ];
      }
      
      // AUDIT 27 FIX REM-27-D: Add retry mechanism for 502 errors
      // T13 consistently returns 502 — likely upstream Anthropic API intermittent issue
      // Implement exponential backoff retry (max 2 retries, 1s + 2s delays)
      let response: any = null;
      let lastError: any = null;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          response = await callAnthropicStream({
            apiKey,
            model: usedModel,
            maxTokens: maxTokens,
            system: enrichedSystemPrompt,
            messages: messagesToSend,
          });
          
          // Check if response is a 502 error
          if (response && response.status === 502 && attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s
            console.warn(`[CLAUDE-API-RETRY] 502 error on attempt ${attempt + 1}, retrying in ${delayMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue; // Retry
          }
          
          // Success or non-502 error — break out of retry loop
          break;
        } catch (error: any) {
          lastError = error;
          if (attempt < maxRetries) {
            const delayMs = Math.pow(2, attempt) * 1000;
            console.warn(`[CLAUDE-API-RETRY] Exception on attempt ${attempt + 1}, retrying in ${delayMs}ms...`, {
              error: error?.message,
            });
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            console.error('[CLAUDE-API-ERROR] Exception during callAnthropicStream (all retries exhausted):', {
              error: error?.message,
              systemPromptLength: enrichedSystemPrompt?.length,
              messageCount: messagesToSend?.length,
              model: usedModel,
            });
            return jsonError(502, `Upstream API error (exception): ${error?.message}`);
          }
        }
      }

      // Model fallback logic
      if (!response.ok) {
        let bodyText = await readUpstreamErrorBody(response);
        
        // AUDIT 23 FIX REM-23-G: Log full error details for 502 diagnosis
        if (response.status >= 500) {
          console.error('[CLAUDE-API-ERROR] Upstream 5xx error:', {
            status: response.status,
            body: bodyText.substring(0, 500),
            systemPromptLength: enrichedSystemPrompt?.length,
            messageCount: messagesToSend?.length,
            model: usedModel,
          });
        }
        
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
            
            // REM-31-A: Wire self-check quality assurance layer
            // runSelfCheck was implemented but never called — this wires it in
            // Only run self-check if response exceeds a minimum length (skip for very short responses)
            if (cleanedResponse.length > 100) {
              try {
                const selfCheckResult = await runSelfCheck({
                  apiKey,
                  model: usedModel,
                  userMessage: lastUserMsg,
                  atlasResponse: cleanedResponse,
                });
                if (selfCheckResult.revised && selfCheckResult.text) {
                  cleanedResponse = selfCheckResult.text;
                  console.log('[self-check] Response revised by quality check');
                }
              } catch (e) {
                console.warn('[self-check] Self-check failed, using original response:', e);
                // Non-fatal: proceed with original cleanedResponse
              }
            }
            
            // AUDIT 21 FIX REM-21-D: Force triage opening via post-processing deterministic check
            // AUDIT 24 FIX REM-24-C: Expand to check fin (saved profile) in addition to extractedFields
            // AUDIT 26 FIX REM-26-B: Remove monthlyIncome > 0 guard — zero income IS a triage situation
            // The TRIAGE PROTOCOL is injected but model doesn't consistently comply in chat path
            // This deterministic post-processing ensures triage responses always start with the correct phrase
            // Must check both extractedFields (from message) and fin (from saved profile)
            // Zero income (job loss) is the most extreme triage scenario — must be included
            const isTriageSituation = 
              // Check extractedFields (from message-level extraction)
              (extractedFields &&
               (extractedFields.essentialExpenses as number) > 0 &&
               (extractedFields.essentialExpenses as number) > ((extractedFields.monthlyIncome as number) || 0))
              ||
              // Check fin (from saved profile) — ensures post-processing fires for profile users
              (fin &&
               (fin.essentialExpenses || 0) > 0 &&
               (fin.essentialExpenses || 0) > (fin.monthlyIncome || 0));
            
            if (isTriageSituation && !cleanedResponse.startsWith("You're in financial triage.")) {
              // Strip any false-reassurance opener and prepend correct one
              cleanedResponse = "You're in financial triage. " + cleanedResponse;
              console.log('[triage] Forced triage opening via post-processing');
            }
            
            // AUDIT 23 FIX REM-23-A: Deterministic triage question suppression
            // Prompt-based RULE 8 has been verified non-functional across 2 audit cycles.
            // Code must enforce the no-question constraint for triage responses.
            if (isTriageSituation && cleanedResponse.startsWith("You're in financial triage.")) {
              // Split into sentences. Remove any sentence containing "?"
              const sentences = cleanedResponse
                .split(/(?<=[.!?])\s+/)
                .filter(sentence => !sentence.includes('?'));
              
              let strippedResponse = sentences.join(' ').trim();
              
              // If the cleaning removed all content after the opener, add a deterministic action
              if (strippedResponse === "You're in financial triage." || strippedResponse.length < 50) {
                const deficit = Math.abs(
                  ((extractedFields?.essentialExpenses as number) || 0) - 
                  ((extractedFields?.monthlyIncome as number) || 0)
                );
                // REM-31-B: Fix OP-1 — triage fallback says "three largest" not "three smallest"
                // A person in triage needs to eliminate the largest expense drains, not the smallest.
                // Canceling three $5/month subscriptions when a $300/month streaming bundle exists is meaningless.
                strippedResponse = `You're in financial triage. You're spending $${deficit} more than you earn each month. Your one move this week: identify your three largest non-essential expenses — what you spend on subscriptions, dining, and convenience services. Which one can you reduce by $200 this month. Every dollar you recover stops the bleeding.`;
              }
              
              cleanedResponse = strippedResponse;
              console.log('[triage-REM23A] Stripped diagnostic questions from triage response');
            }
            
            // ============================================================
            // REM-28-A: APR hallucination post-processor
            // ARCHITECTURE: After 10 failed prompt/data approaches, this is the definitive fix.
            // Modeled on REM-23-A (triage question suppression), which has been 100% reliable.
            // When profile has high-interest debt but no APR was provided, strip any sentences
            // containing fabricated APR percentages or derived interest cost calculations.
            const postProcDebt = (financialProfile?.highInterestDebt as number) || 0;
            const postProcApr = (financialProfile as any)?.highInterestDebtAPR;
            const profileHasDebtNoApr =
              postProcDebt > 0 &&
              (!postProcApr || typeof postProcApr !== 'number');

            if (profileHasDebtNoApr) {
              const aprSentences = cleanedResponse.split(/(?<=[.!?])\s+/);
              const aprStripped = aprSentences.filter(sentence => {
                // Strip: "at 18% APR", "at 20% interest rate", "at 24%"
                if (/\bat\s+\d+(\.\d+)?%(\s*(APR|interest\s*rate|interest))?/i.test(sentence) && !sentence.includes('?')) return false;
                // Strip: "18% APR", "your 20% APR debt", "the 24% APR"
                if (/\d+(\.\d+)?%\s+(APR|interest\s+rate)/i.test(sentence) && !sentence.includes('?')) return false;
                // Strip: "charging 18%", "charges 20%"
                if (/charg(es?|ing)\s+\d+(\.\d+)?%/i.test(sentence)) return false;
                // Strip: "$180/month in interest", "$150 per month in interest", "$120 a month in interest"
                if (/\$\d[\d,]*\s*(\/month|per month|a month|monthly)\s+in\s+interest/i.test(sentence)) return false;
                // Strip: "interest of $180", "interest costs $150", "interest is $120"
                if (/interest\s+(of|costs?\s*you|charges?|is|are)\s+\$\d[\d,]*/i.test(sentence) && !sentence.includes('?')) return false;
                // Strip: APR arithmetic shown explicitly — "$10,000 × 0.18 ÷ 12"
                if (/\$[\d,]+\s*[×x*]\s*0\.\d+\s*[÷/]\s*12/i.test(sentence)) return false;
                return true;
              });

              const preAprStrip = cleanedResponse;
              cleanedResponse = aprStripped.join(' ').trim();

              if (cleanedResponse !== preAprStrip) {
                console.log('[apr-postprocess-REM28A] Stripped APR hallucination sentences from response');
              }
            }

            // ============================================================
            // REM-28-B: Debt-savings confusion post-processor
            // Confirmed pattern (T3, T7): model says "$X in savings" when $X is DEBT and no savings exist.
            // RULE 5C in atlasSystemPrompt.ts was ineffective. Code-level replacement is the fix.
            const postProcSavings =
              (financialProfile?.totalSavings as number) ??
              (financialProfile as any)?.savings ??
              null;
            const profileHasDebtNoSavings =
              postProcDebt > 0 &&
              (postProcSavings === null || postProcSavings === undefined);

            if (profileHasDebtNoSavings) {
              const debtAmountStr = postProcDebt.toLocaleString();
              // Match: "$12,000 in savings", "$12,000 in your savings", "$12,000 saved", "$12,000 in savings right now"
              const fakeSavingsPattern = new RegExp(
                `\\$${debtAmountStr.replace(/,/g, ',?')}\\s*(in\\s+(your\\s+)?savings(\\s+right\\s+now)?|saved(\\s+right\\s+now)?)`,
                'gi'
              );
              if (fakeSavingsPattern.test(cleanedResponse)) {
                cleanedResponse = cleanedResponse.replace(
                  fakeSavingsPattern,
                  `$${debtAmountStr} in high-interest debt` 
                );
                console.log('[debt-savings-postprocess-REM28B] Corrected debt/savings confusion in response');
              }
            }

            // ============================================================
            // REM-28-C: Employer match append post-processor
            // The model receives employer match data in calculationBlock and prefill but ignores it
            // in the generated prose (T15, T15b confirmed). Post-processing detects the omission
            // and appends a standardized match reminder when the model failed to surface it.
            const postProcMatchPct = (financialProfile as any)?.employerMatchPercent;
            const postProcContributing = (financialProfile as any)?.currentlyContributing;
            const postProcIncome = (financialProfile?.monthlyIncome as number) || 0;

            const shouldEnforceMatch =
              postProcMatchPct &&
              typeof postProcMatchPct === 'number' &&
              postProcMatchPct > 0 &&
              postProcContributing === false &&
              postProcIncome > 0;

            if (shouldEnforceMatch) {
              // Check if the model mentioned the employer match in its response
              const matchMentioned = /employer\s+match|company\s+match|\bmatching\s+contribution|\bmatch\s+rate\b/i.test(cleanedResponse);

              if (!matchMentioned) {
                const freeMoneyMonth = Math.round(postProcIncome * postProcMatchPct / 100);
                const matchReminder = ` One more thing that takes priority: your employer offers a ${postProcMatchPct}% match that you're not currently capturing — that's $${freeMoneyMonth.toLocaleString()}/month in free money (a guaranteed 100% return). Contribute enough to get the full match before putting extra toward debt. No debt payoff rate beats a 100% guaranteed return.`;
                cleanedResponse = cleanedResponse + matchReminder;
                console.log('[employer-match-postprocess-REM28C] Appended employer match reminder (model omitted it)');
              }
            }
            
            // AUDIT 20 FIX BUG-20-006: Move nudge injection BEFORE stream close
            // Previously nudge injection ran in fire-and-forget AFTER stream closed, so it never reached client
            // Now evaluate and inject nudges BEFORE sending done:true
            if (userId && sessionId) {
              try {
                const nudgeResult = injectNudgeIfAppropriate(
                  cleanedResponse,
                  {
                    userId,
                    goals: sessionState?.goals || [],
                  },
                  messages.length
                );
                // Use nudged response if nudge was injected, otherwise use original
                if (nudgeResult && nudgeResult.nudgeInjected && nudgeResult.response) {
                  cleanedResponse = nudgeResult.response;
                  console.log('[nudge] Nudge successfully injected into response');
                }
              } catch (error) {
                console.error('[nudge] Error injecting nudge:', error);
                // Continue with original response if nudge injection fails
              }
            }
            
            // AUDIT 19 FIX P0: Send done:true IMMEDIATELY, then fire-and-forget async companion work
            // The root cause of "I'm having trouble connecting" was that done:true was held hostage
            // by action extraction (3s) + nudge injection (2s), causing the stream to hang.
            // Now we send done:true within milliseconds, then do async work in background.
            
            // Send cleaned response as a replacement event for the frontend to use
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ type: 'replace', text: cleanedResponse })}\n\n`
              )
            );
            // Send done event FIRST — client gets response immediately
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ done: true, model: usedModel, tier, sessionId })}\n\n`
              )
            );
            
            // FIRE-AND-FORGET: Do companion work AFTER stream is closed
            // This no longer blocks the response. Use void to suppress unhandled promise warning.
            void (async () => {
              try {
                // AUDIT 27 FIX REM-27-G: Multi-turn context retention
                // Store financial snapshot for this turn so model can reference "earlier you said..." in same session
                if (userId && sessionId && financialProfile && (financialProfile.monthlyIncome || financialProfile.highInterestDebt)) {
                  try {
                    const { storeSessionFinancialSnapshot } = await import('@/lib/profile');
                    await storeSessionFinancialSnapshot(userId, sessionId, {
                      monthlyIncome: financialProfile.monthlyIncome,
                      essentialExpenses: financialProfile.essentialExpenses,
                      totalSavings: financialProfile.totalSavings,
                      highInterestDebt: financialProfile.highInterestDebt,
                      lowInterestDebt: financialProfile.lowInterestDebt,
                      timestamp: new Date().toISOString(),
                    });
                  } catch (e) {
                    console.warn('[REM-27-G] Session snapshot storage failed:', e);
                  }
                }

                // COMPANION INTEGRATION: Process Atlas response for actions
                if (userId && sessionId) {
                  try {
                    await processAtlasResponseForCompanion(userId, sessionId, cleanedResponse, apiKey, financialProfile);
                    
                    // Extract and persist action to user_actions table
                    try {
                      const { extractActionFromResponse } = await import('@/lib/ai/actionExtractor');
                      const extractedAction = await extractActionFromResponse(cleanedResponse, apiKey);
                      
                      if (extractedAction.action_detected && extractedAction.action_text) {
                        const checkInDate = new Date();
                        checkInDate.setDate(checkInDate.getDate() + (extractedAction.check_in_days || 30));
                        
                        const incomingAuth = req.headers.get('Authorization');
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
                      console.error('[companion] Error persisting action:', persistError);
                    }
                  } catch (error) {
                    console.error('[companion] Error processing response:', error);
                  }
                }
              } catch (error) {
                console.error('[companion] Unexpected error in fire-and-forget:', error);
              }
            })();
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
