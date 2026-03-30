export const runtime = 'edge';
export const maxDuration = 60;

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
import { orchestrate } from '@/lib/ai/conversationOrchestrator';
import { ATLAS_SYSTEM_PROMPT } from '@/lib/ai/atlasSystemPrompt';
import { extractFinancialSnapshot } from '@/lib/ai/financialExtractor';
import { runCalculations, formatCalculationBlock } from '@/lib/calculations/sprint1';
import { cleanAtlasResponse } from '@/lib/ai/responsePostprocessor';
import { validateFinancialSnapshot, buildValidationPrompt } from '@/lib/ai/financialValidation';
import { compressConversationHistory, formatCompressedMemory } from '@/lib/ai/contextWindowExtension';
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
import { applyRateLimit } from './rateLimitMiddleware';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-sonnet-20240229';
const FALLBACK_MODELS = ['claude-3-haiku-20240307', 'claude-3-opus-20240229'] as const;

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
      'Access-Control-Allow-Origin': '*',
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
      'Access-Control-Allow-Origin': '*',
    },
    ...init,
  });
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
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
    return await fetch(ANTHROPIC_API, {
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
    return await fetch(ANTHROPIC_API, {
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

  let { type, messages, missing, question, memorySummary, language, fin, extractedFields, sessionState, lastQuestion, answered, userId, sessionId } = body as {
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
  const kvRateLimitResult = await applyRateLimit(req, rateLimitIdentifier);
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
  const preferredLanguage = isSupportedLanguage(language) ? language : null;
  const detectedLang = (preferredLanguage || detectLanguage(lastUserText)) as SupportedLanguage;
  const normalizedQuestion = normalizeSlang(lastUserText, detectedLang);

  const lastQuestionContext = lastQuestion ? `\nLAST QUESTION ASKED: "${lastQuestion}"\nUse this context to understand what the user is responding to.` : '';
  
  const extractPrompt = `You are Atlas's financial data extraction engine.
Your only job is to identify financial facts from conversational text and return them as structured JSON.${lastQuestionContext}

EXTRACTION RULES:
- Extract ONLY values explicitly stated or clearly implied in the message.
- Never infer, estimate, or fabricate values not present in the text.
- If a user says "about $4k" or "roughly $4,000" — extract 4000.
- "I have no savings" → totalSavings: 0. "No debt" or "No other debt" → highInterestDebt: 0, lowInterestDebt: 0.
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
- essentialExpenses: number (monthly non-negotiable expenses: rent, utilities, groceries, insurance, minimum debt payments)
- discretionaryExpenses: number (monthly lifestyle spending: dining, subscriptions, entertainment, clothing)
- totalSavings: number (total accessible savings and cash holdings)
- highInterestDebt: number (total balance of debts above ~7% APR: credit cards, personal loans)
- lowInterestDebt: number (total balance of debts at or below ~7% APR: student loans, car loans, mortgage)
- monthlyDebtPayments: number (total minimum monthly payments across all debt)
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

  const memoryContext = memorySummary ? `\n\nUSER MEMORY SUMMARY:\n${String(memorySummary).trim()}` : '';
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
  const maxTokens =
    type === 'extract'
      ? 500
      : type === 'answer'
        ? 220
        : type === 'answer_stream'
          ? 260
          : type === 'answer_explain' || type === 'answer_explain_stream'
            ? 700
            : 900;

  const answerPrompt = `You are Atlas. Answer the user's question briefly and clearly.

HARD OUTPUT CONSTRAINTS (must follow exactly):
- Max 2 sentences total
- Max 1 question mark total
- No lists, no bullets, no numbering
- Plain text only

If the user asks something outside scope, respond briefly and redirect to the onboarding question.`;

  const explainerPrompt = `You are Atlas. Answer the user's question with a clear, human explanation.

Structure (use headings or short labels when helpful):
1) What it is (plain English)
2) Why it matters (the decision it affects)
3) What “good” can look like (if relevant, use a range or benchmark)
4) How to improve it (practical levers)
5) One next step (single, concrete action)

Keep it warm, direct, and concise. Ask at most ONE follow-up question, only if needed.`;

  try {
    // CONTEXT WINDOW EXTENSION: Compress conversation history beyond 10 messages
    const { recentMessages, compressedMemory } = compressConversationHistory(messages, 10);
    const trimmedMessages = recentMessages;
    let usedModel = modelCandidates[0] || DEFAULT_MODEL;
    const sys = type === 'answer' ? answerPrompt : type === 'answer_explain' ? explainerPrompt : systemPrompt;
    const msgPayload =
      type === 'answer' || type === 'answer_explain'
        ? [{ role: 'user', content: `Question: ${String(question || '').trim()}` }]
        : trimmedMessages;

    if (type === 'answer_stream' || type === 'answer_explain_stream') {
      const sysStream = type === 'answer_stream' ? answerPrompt : explainerPrompt;
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
                    const delta = j?.delta?.text;
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
          'Access-Control-Allow-Origin': '*',
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
      text = data.content?.[0]?.text || '';
    }

    if (type === 'extract') {
      try {
        const clean = String(text).replace(/```json|```/g, '').trim();
        const fields = JSON.parse(clean);
        return jsonOk({ fields, source: 'claude', model: usedModel, tier });
      } catch {
        return jsonOk({ fields: {}, source: 'claude_parse_error', model: usedModel, tier });
      }
    }

    if (type === 'answer') {
      const t0 = String(text || '').trim();
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
      const lastUserMsg = String((messages || []).slice(-1)[0]?.content || '').trim();
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

      // Step 1: Crisis check first (safety gate)
      const crisisSignal = detectCrisisSignals(lastUserMsg, conversationHistory, financialProfile as any);
      if (crisisSignal) {
        const crisisResponse = generateCrisisResponse(crisisSignal);
        // Route crisis response through cleanAtlasResponse to remove any markdown formatting
        const cleanedCrisisResponse = cleanAtlasResponse(crisisResponse);
        return jsonOk({
          text: cleanedCrisisResponse,
          source: 'atlas_crisis',
          model: usedModel,
          tier,
          sessionState: sessionState ?? {},
        });
      }

      // Step 1.5: AI-powered compliance screening for investment/tax/legal advice
      // Runs in parallel with other processing — only blocks if risk is detected
      // Uses Haiku (fastest, cheapest model) with a strict 2-second timeout
      const complianceCheck = detectComplianceRisk(lastUserMsg);
      if (!complianceCheck) {
        // For messages that pass keyword check, do a fast AI semantic check on first 3 turns
        // After turn 3, topic is established and keyword check is sufficient
        if (messages.length <= 3) {
          const complianceTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
          const aiCompliancePromise = (async () => {
            try {
              const checkResp = await fetch(ANTHROPIC_API, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                  model: 'claude-3-haiku-20240307',
                  max_tokens: 10,
                  system: 'You are a financial compliance classifier. Answer only: YES or NO. Is this message requesting specific investment advice (which securities to buy/sell), specific tax filing guidance, or specific legal advice?',
                  messages: [{ role: 'user', content: lastUserMsg }],
                }),
              });
              if (!checkResp.ok) return null;
              const checkData: any = await checkResp.json();
              const answer = checkData.content?.[0]?.text?.trim().toUpperCase();
              return answer === 'YES' ? 'investment_advice' : null;
            } catch {
              return null;
            }
          })();

          const aiRisk = await Promise.race([aiCompliancePromise, complianceTimeout]);
          if (aiRisk) {
            const safe = complianceResponse(lastUserMsg, aiRisk as any);
            return jsonOk({
              text: safe,
              source: 'compliance_guardrail',
              model: 'policy',
              tier,
            });
          }
        }
      }

      // Step 2: Run the orchestrator with timeout protection
      // This analyzes conversation state and builds a session context block
      // Now uses semantic intent classifier on first message for superior accuracy
      // CRITICAL FIX: Wrap in Promise.race with 5-second timeout to prevent hanging
      const orchestrateTimeout = new Promise<any>((resolve) => {
        setTimeout(() => {
          console.warn('[atlas] Orchestrator timeout - using minimal session state');
          resolve({
            sessionStateBlock: '',
            missingFields: [],
            state: {},
            objectionBlock: '',
            calculationBlock: '',
          });
        }, 5000); // 5 second timeout for orchestrator
      });

      const orchestratePromise = orchestrate({
        messages: conversationHistory,
        financialProfile,
        previousState: sessionState as any,
        answered: updatedAnswered,
      });

      const { sessionStateBlock, missingFields: orchestratorMissingFields, state, objectionBlock, calculationBlock } = await Promise.race([
        orchestratePromise,
        orchestrateTimeout,
      ]);

      // COMPANION INTEGRATION: Build companion system prompt context (with timeout)
      // Injects accountability, progress, roadmap, behavioral, escalation, and multi-goal blocks
      // Wrapped in Promise.race with timeout to prevent blocking response
      // CRITICAL FIX: Only build companion context for authenticated users (not guests)
      // Guest users should not hit Supabase, which causes 5-second timeout
      let companionContext = '';
      let multiGoalContext = '';
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
      const isCrisisFirstMessage = crisisSignal && messages.length === 1;
      const disclaimerContext = `\n\nDISCLAIMER_NEEDED: ${isCrisisFirstMessage || hasDisclaimer(messages) ? 'no' : 'yes'}.`;
      const memoryContext = memorySummary ? `\n\nUSER MEMORY SUMMARY:\n${String(memorySummary).trim()}` : '';
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
      
      const promptSections: string[] = [
        ATLAS_SYSTEM_PROMPT,         // ← Use new Sprint 1 system prompt (position 0)
        sessionStateBlock,           // ← Always included, never trimmed (position 1)
        ...(companionContext ? [companionContext] : []), // ← COMPANION CONTEXT = injected after session state
        ...(multiGoalContext ? [multiGoalContext] : []), // ← MULTI-GOAL CONTEXT = injected after companion context
        ...(calculationBlockSection ? [calculationBlockSection] : []), // ← SECOND = always preserved before other sections get trimmed
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
      
      // Trim sections but preserve session state, calculation block, and persona instructions
      const coreBlocksLength = sessionStateBlock.length + calculationBlockSection.length;
      const enrichedSystemPrompt = trimPromptSections(promptSections, Math.max(8000, coreBlocksLength + 4000));

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
        maxTokens: 900,
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
              maxTokens: 900,
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
                    const delta = j?.delta?.text;
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
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return jsonOk({ text, source: 'claude', model: usedModel, tier });
  } catch {
    return jsonError(500, 'An unexpected error occurred.');
  }
}
