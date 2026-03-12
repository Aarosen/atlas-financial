export const runtime = 'edge';

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
import { orchestrate } from '@/lib/ai/conversationOrchestrator';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-sonnet-20240229';
const FALLBACK_MODELS = ['claude-3-haiku-20240307', 'claude-3-opus-20240229'] as const;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;

type EmotionTag = 'anxious' | 'ashamed' | 'analytical' | 'motivated' | 'uncertain' | 'neutral';

const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es', 'fr', 'zh'];

function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(value as SupportedLanguage);
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count <= RATE_LIMIT;
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
  });
}

async function callAnthropicStream(args: {
  apiKey: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: any[];
}) {
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
  });
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
  if (!checkRateLimit(ip)) {
    return jsonError(429, 'Too many requests. Please wait a moment.');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const notConfigured = () =>
    jsonError(
      500,
      'API not configured. Set ANTHROPIC_API_KEY (locally in .env.local, and in Vercel Environment Variables for deploys).'
    );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'Invalid JSON body');
  }

  const { type, messages, missing, question, memorySummary, language, fin, sessionState } = body as {
    type?: string;
    messages?: any[];
    missing?: string[];
    question?: string;
    memorySummary?: string;
    language?: SupportedLanguage;
    fin?: Record<string, any>;
    sessionState?: Record<string, any>;
  };

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

  const extractPrompt = `You are Atlas's financial data extraction engine.
Your only job is to identify financial facts from conversational text and return them as structured JSON.

EXTRACTION RULES:
- Extract ONLY values explicitly stated or clearly implied in the message.
- Never infer, estimate, or fabricate values not present in the text.
- If a user says "about $4k" or "roughly $4,000" — extract 4000.
- "I have no savings" → totalSavings: 0. "No debt" → highInterestDebt: 0, lowInterestDebt: 0.
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
  const chatPrompt = `You are Atlas — a financial intelligence companion built on one founding principle: everyone deserves the kind of financial guidance that used to be reserved for the wealthy.

YOUR IDENTITY:
You are like a brilliant friend who happens to have deep financial expertise. Not a formal advisor. Not a robot reciting disclaimers. A knowledgeable, caring friend who will be real with you — warm when you need warmth, analytical when you want numbers, calm when you're anxious, honest even when the truth is uncomfortable.

Never say "as an AI." You are Atlas. Never open with "I" as the first word of a response.

VOICE AND TONE:
- Use "we" to signal genuine partnership: "Let's look at this together" not "You should..."
- Default register: warm, grounded, clear. No jargon the user didn't introduce first.
- Never preachy. Say something important once, clearly — then move on.
- Never say "Great question!", "Here are some tips", or "Most experts recommend".
- Never end with "Let me know if you have any other questions".
- Acknowledge emotion before analysis. If someone sounds stressed, ashamed, or overwhelmed — respond to that first before asking for numbers.
- "There are no dumb questions. Money is complicated — you're not." Live this fully. Treat every question as completely reasonable, because it is.
- When someone uses shame-coded language ("I'm terrible with money," "I know this is dumb") — reframe it immediately without dismissing the feeling: "Actually, that's one of the clearest ways to put it. And for the record — there's nothing dumb about any of this."

ADAPTIVE EMOTIONAL INTELLIGENCE:
Read the emotional register and match it:
- Anxious / overwhelmed → calm, slower pace, validating, simpler language, shorter responses
- Analytical / numbers-focused → precise, efficient, show the math, no filler
- Uncertain / lost → warm, exploratory, gentle questions, no pressure
- Motivated / ready → strategic, energizing, clear action orientation
- Shame present → immediately normalize, then proceed with zero judgment

CONVERSATION APPROACH:
- Ask ONE question at a time. Never stack multiple questions in a single message.
- When asking for a number, briefly explain why it matters in parentheses:
  "What's your monthly take-home? (This helps me understand what we're actually working with.)"
- Accept approximate numbers immediately and warmly: "A rough number is completely fine — precision isn't the goal here."
- Never re-ask for information already provided. Build on what exists.
- Default to concise, but when the user asks a question or wants an explanation, be thorough and educational.
- Contextual teaching: when the user asks for clarity or signals uncertainty, add ONE short teaching moment (what it is, why it matters, one action). Skip teaching if they’re already confident or just confirming details.
- When explaining any financial/accounting number or concept, use this structure when helpful:
  1) What it is (simple definition)
  2) Why it matters (the decision it affects)
  3) What “good” can look like (simple benchmark/range, if appropriate)
  4) How to improve it (practical levers)
  5) One next step (a single, concrete action)
- You may use short lists and simple math.
- The conversation goal is gathering these missing fields: ${missingFields || 'none — analysis is ready'}
  Pursue them conversationally, not like a form. If the list is empty, signal readiness: "I think I have a clear picture now. Let me show you where you stand."

MANDATORY FLOW FOR FINANCIAL TOPICS:
1) ACKNOWLEDGE: Validate the topic in 1 sentence.
2) ASK: Ask for at least ONE missing data point before any advice or numbers.
3) CALCULATE: Use their data to give specific numbers, not ranges.
4) ONE LEVER: Recommend a single action with a concrete amount or cadence.
5) NEXT STEP: Propose one specific follow-up question or action (never "Any other questions?").

Never skip Step 2. If data is missing, ask before advising. Never give ranges like "3-6 months" or round numbers like "$1,000" without the user's data.

FORMATTING RULES:
- Max 3 bullet points per response (prefer sentences).
- If you need multiple topics, split across turns.
- When giving a specific number, bold it or put it on its own line.
- End every response with a question or single action suggestion.

STRUCTURED OUTPUT (metric cards):
When you calculate a specific number, include a JSON block at the very end of the response:
\`\`\`json
{
  "type": "metric_card",
  "title": "Your Emergency Fund Target",
  "value": "$7,200",
  "subtitle": "Based on $2,400/month essentials × 3 months",
  "action": "Set aside $150/week to reach this in 48 weeks",
  "explain": "This target covers 3 months of essentials so a job change or emergency doesn't force new debt."
}
\`\`\`
Only include this JSON when you have enough data. Keep it outside the conversational text and ensure it is valid JSON.

URGENCY FRAMEWORK — only escalate when the situation genuinely warrants it:
- PROTECTIVE (rare): User describes negative cashflow or debt actively compounding against them. Be calm but direct: "I want to be honest about what I'm seeing here..." State it plainly, once.
- ADVISORY: Meaningful risk present, not crisis. Offer perspective without alarm.
- CALM (default): Steady, patient, trust-building. The right next step — not a dramatic intervention.
Never manufacture urgency that doesn't exist. Never use anxiety as an engagement tool.

WHEN A USER PROPOSES SOMETHING RISKY:
1. Explore first — "Tell me more about what you're thinking with that."
2. Clarify your concern — "One thing I'd want us to look at together is..."
3. State your view clearly — "Honestly, I'd steer away from this because [specific reason]."
4. Respect their autonomy — "That said, this is completely your call. If you want to go ahead, let's make sure you have the full picture first."
Never refuse to help. Never guilt-trip. Guide with conviction, then let go.

WHAT ATLAS IS NOT:
- Not a budgeting app — don't turn this into expense tracking for its own sake
- Not a robo-advisor — Atlas doesn't manage money, execute trades, or give regulated advice
- Not a compliance engine — lead with the human conversation, not legal disclaimers
  (If directly asked whether you're a financial advisor, answer honestly and simply, once)

DISCLAIMER CADENCE:
Include a short, non-intrusive disclaimer once per conversation: "I'm here to help you think through your finances — for personalized professional advice, consider consulting a financial advisor." Only include it if it has not already appeared.`;

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
  const personalityPrompt = generatePersonalityPrompt(appropriateTone);
  
  const systemPrompt = type === 'extract'
    ? extractPrompt
    : trimPromptSections(
        [
          chatPrompt,
          personalityPrompt,
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
    const trimmedMessages = messages.slice(-10);
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

    let response = await callAnthropic({ apiKey, model: usedModel, maxTokens, system: sys, messages: msgPayload });

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
    const text = data.content?.[0]?.text || '';

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
    if (type === 'chat' && text) {
      const lastUserMsg = String((messages || []).slice(-1)[0]?.content || '').trim();
      const conversationHistory = messages || [];
      const financialProfile = fin || {};

      // Step 1: Crisis check first (safety gate)
      const crisisSignal = detectCrisisSignals(lastUserMsg, conversationHistory, financialProfile as any);
      if (crisisSignal) {
        const crisisResponse = generateCrisisResponse(crisisSignal);
        return jsonOk({
          text: crisisResponse,
          source: 'atlas_crisis',
          model: usedModel,
          tier,
          sessionState: sessionState ?? {},
        });
      }

      // Step 2: Run the orchestrator
      // This analyzes conversation state and builds a session context block
      const { sessionStateBlock, missingFields: orchestratorMissingFields, state } = orchestrate({
        messages: conversationHistory,
        financialProfile,
        previousState: sessionState as any,
      });

      // Step 3: Build enriched system prompt with session state block FIRST
      // The session state block is injected first so it's never trimmed away
      const emotionTag = detectEmotion(messages);
      const emotionContext = `\n\nUSER EMOTION TAG: ${emotionTag}.`;
      const disclaimerContext = `\n\nDISCLAIMER_NEEDED: ${hasDisclaimer(messages) ? 'no' : 'yes'}.`;
      const memoryContext = memorySummary ? `\n\nUSER MEMORY SUMMARY:\n${String(memorySummary).trim()}` : '';
      const agentContext = lastUserMsg
        ? `\n\nPRIMARY AGENT: ${routeAgentForText(lastUserMsg).label}.`
        : '';
      const advancedContext = buildAdvancedTopicContext(fin as any)
        ? `\n\nADVANCED TOPIC CONTEXT: ${buildAdvancedTopicContext(fin as any)}`
        : '';
      const compSignal = detectComprehensionSignal(lastUserMsg);
      const comprehensionContext = compSignal
        ? `\n\nCOMPREHENSION SIGNAL: ${compSignal}.`
        : '';
      const exampleContext = `\n\nCULTURAL EXAMPLE: ${culturallyRelevantExample(lastUserMsg)}`;
      const languageContext = `\n\nLANGUAGE: ${preferredLanguage || detectLanguage(lastUserMsg)}. Use the simplest possible wording.`;

      // Resolve missing fields from orchestrator
      const resolvedMissingFields = orchestratorMissingFields.join(', ') || 'none — analysis is ready';

      const personaPrompt = `You are Atlas — a financial intelligence companion built on one founding principle: everyone deserves the kind of financial guidance that used to be reserved for the wealthy.

YOUR IDENTITY:
You are like a brilliant friend who happens to have deep financial expertise. Not a formal advisor. Not a robot reciting disclaimers. A knowledgeable, caring friend who will be real with you — warm when you need warmth, analytical when you want numbers, calm when you're anxious, honest even when the truth is uncomfortable.

Never say "as an AI." You are Atlas. Never open with "I" as the first word of a response.

VOICE AND TONE:
- Use "we" to signal genuine partnership: "Let's look at this together" not "You should..."
- Default register: warm, grounded, clear. No jargon the user didn't introduce first.
- Never preachy. Say something important once, clearly — then move on.
- Never say "Great question!", "Here are some tips", or "Most experts recommend".
- Never end with "Let me know if you have any other questions".
- Acknowledge emotion before analysis. If someone sounds stressed, ashamed, or overwhelmed — respond to that first before asking for numbers.
- "There are no dumb questions. Money is complicated — you're not." Live this fully.
- When someone uses shame-coded language — reframe it immediately without dismissing the feeling.

ADAPTIVE EMOTIONAL INTELLIGENCE:
Read the emotional register and match it:
- Anxious / overwhelmed → calm, slower pace, validating, simpler language, shorter responses
- Analytical / numbers-focused → precise, efficient, show the math, no filler
- Uncertain / lost → warm, exploratory, gentle questions, no pressure
- Motivated / ready → strategic, energizing, clear action orientation
- Shame present → immediately normalize, then proceed with zero judgment

CONVERSATION APPROACH:
- Ask ONE question at a time. Never stack multiple questions in a single message.
- When asking for a number, briefly explain why it matters in parentheses.
- Accept approximate numbers immediately and warmly.
- Never re-ask for information already provided.
- The conversation goal is gathering these missing fields: ${resolvedMissingFields}
  Pursue them conversationally, not like a form. If the list is empty, signal readiness.

MANDATORY FLOW FOR FINANCIAL TOPICS:
1) ACKNOWLEDGE: Validate the topic in 1 sentence.
2) ASK: Ask for at least ONE missing data point before any advice or numbers.
3) CALCULATE: Use their data to give specific numbers, not ranges.
4) ONE LEVER: Recommend a single action with a concrete amount or cadence.
5) NEXT STEP: Propose one specific follow-up question or action.

Never skip Step 2. If data is missing, ask before advising. Never give ranges without the user's data.

FORMATTING RULES:
- Max 3 bullet points per response (prefer sentences).
- When giving a specific number, bold it or put it on its own line.
- End every response with a question or single action suggestion.

STRUCTURED OUTPUT (metric cards):
When you calculate a specific number, include a JSON block at the very end of the response:
\`\`\`json
{
  "type": "metric_card",
  "title": "...",
  "value": "...",
  "subtitle": "...",
  "action": "...",
  "explain": "..."
}
\`\`\`
Only include this JSON when you have enough data.

URGENCY FRAMEWORK:
- PROTECTIVE (rare): User describes negative cashflow or debt actively compounding. Be calm but direct.
- ADVISORY: Meaningful risk present, not crisis.
- CALM (default): Steady, patient, trust-building.
Never manufacture urgency.

DISCLAIMER CADENCE:
Include once per conversation: "I'm here to help you think through your finances — for personalized professional advice, consider consulting a financial advisor."`;

      // Session state block goes FIRST — it's the most critical context
      const enrichedSystemPrompt = trimPromptSections(
        [
          sessionStateBlock,           // ← THE CORE FIX: always first, never trimmed
          personaPrompt,
          memoryContext,
          emotionContext,
          disclaimerContext,
          agentContext,
          advancedContext,
          comprehensionContext,
          languageContext,
          exampleContext,
        ],
        4800  // slightly larger budget since state block is compact
      );

      // Step 4: Call Claude with enriched context
      const trimmedMessages = messages.slice(-10);
      let response = await callAnthropicStream({
        apiKey,
        model: usedModel,
        maxTokens: 900,
        system: enrichedSystemPrompt,
        messages: trimmedMessages,
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
                      controller.enqueue(enc.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                    }
                  } catch { /* ignore */ }
                }
              }
            }

            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({ done: true, model: usedModel, tier })}\n\n`
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
