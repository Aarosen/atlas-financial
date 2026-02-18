export const runtime = 'edge';

import { fallbackAnswer, violatesGuardrails } from '@/lib/server/guardrails';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-3-sonnet-20240229';
const FALLBACK_MODELS = ['claude-3-haiku-20240307', 'claude-3-opus-20240229'] as const;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000;

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

  const { type, messages, missing, question } = body as { type?: string; messages?: any[]; missing?: string[]; question?: string };

  if (!type || !['extract', 'chat', 'answer', 'answer_stream', 'status'].includes(type)) {
    return jsonError(400, 'Invalid request type.');
  }

  if (type === 'status') {
    if (!apiKey) return notConfigured();
    return jsonOk({ configured: true });
  }

  if (!apiKey) {
    return notConfigured();
  }

  const requestedModel = process.env.ANTHROPIC_MODEL;
  const modelCandidates = Array.from(
    new Set([requestedModel, DEFAULT_MODEL, ...FALLBACK_MODELS].filter(Boolean) as string[])
  );

  if (!messages || !Array.isArray(messages)) {
    return jsonError(400, 'messages array is required');
  }

  if (type === 'chat') {
    if (!missing || !Array.isArray(missing) || missing.length === 0) {
      return jsonError(400, 'missing array is required for chat');
    }
  }

  if (type === 'answer' || type === 'answer_stream') {
    if (!question || !String(question).trim()) {
      return jsonError(400, 'question is required');
    }
  }

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
- When explaining any financial/accounting number or concept, use this structure when helpful:
  1) What it is (simple definition)
  2) Why it matters (the decision it affects)
  3) What “good” can look like (simple benchmark/range, if appropriate)
  4) How to improve it (practical levers)
  5) One next step (a single, concrete action)
- You may use short lists and simple math.
- The conversation goal is gathering these missing fields: ${missingFields || 'none — analysis is ready'}
  Pursue them conversationally, not like a form. If the list is empty, signal readiness: "I think I have a clear picture now. Let me show you where you stand."

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
  (If directly asked whether you're a financial advisor, answer honestly and simply, once)`;

  const systemPrompt = type === 'extract' ? extractPrompt : chatPrompt;
  const maxTokens = type === 'extract' ? 500 : type === 'answer' ? 220 : type === 'answer_stream' ? 260 : 900;

  const answerPrompt = `You are Atlas. Answer the user's question briefly and clearly.

HARD OUTPUT CONSTRAINTS (must follow exactly):
- Max 2 sentences total
- Max 1 question mark total
- No lists, no bullets, no numbering
- Plain text only

If the user asks something outside scope, respond briefly and redirect to the onboarding question.`;

  try {
    const trimmedMessages = messages.slice(-10);
    let usedModel = modelCandidates[0] || DEFAULT_MODEL;
    const sys = type === 'answer' ? answerPrompt : systemPrompt;
    const msgPayload =
      type === 'answer'
        ? [{ role: 'user', content: `Question: ${String(question || '').trim()}` }]
        : trimmedMessages;

    if (type === 'answer_stream') {
      const sysStream = answerPrompt;
      const streamPayload = [{ role: 'user', content: `Question: ${String(question || '').trim()}` }];
      let response = await callAnthropicStream({ apiKey, model: usedModel, maxTokens: 220, system: sysStream, messages: streamPayload });

      if (!response.ok) {
        let bodyText = await readUpstreamErrorBody(response);
        if (response.status === 404 && bodyText.includes('not_found_error') && bodyText.includes('model')) {
          for (const m of modelCandidates.slice(1)) {
            usedModel = m;
            response = await callAnthropicStream({ apiKey, model: usedModel, maxTokens: 220, system: sysStream, messages: streamPayload });
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
        return jsonOk({ fields, source: 'claude', model: usedModel });
      } catch {
        return jsonOk({ fields: {}, source: 'claude_parse_error', model: usedModel });
      }
    }

    if (type === 'answer') {
      const t0 = String(text || '').trim();
      if (!violatesGuardrails(t0)) {
        return jsonOk({ text: t0, source: 'claude', model: usedModel });
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
          return jsonOk({ text: repaired, source: 'claude_repaired', model: usedModel });
        }
      }

      console.log('[atlas_guardrails] fallback_answer', { model: usedModel });
      return jsonOk({ text: fallbackAnswer(String(question || '').trim()), source: 'fallback' });
    }

    return jsonOk({ text, source: 'claude', model: usedModel });
  } catch {
    return jsonError(500, 'An unexpected error occurred.');
  }
}
