// api/chat.js — Secure proxy for Anthropic Claude API
// Your API key lives here (server-side only), never in the browser.

export const config = {
  runtime: 'edge',
};

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';

const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60000;

function checkRateLimit(ip) {
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

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed');
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!checkRateLimit(ip)) {
    return jsonError(429, 'Too many requests. Please wait a moment.');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError(500, 'API not configured. Please set ANTHROPIC_API_KEY in Vercel environment variables.');
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'Invalid JSON body');
  }

  const { type, messages, missing } = body;

  if (!type || !['extract', 'chat'].includes(type)) {
    return jsonError(400, 'Invalid request type.');
  }

  if (!messages || !Array.isArray(messages)) {
    return jsonError(400, 'messages array is required');
  }

  const systemPrompt = type === 'extract'
    ? `You are a financial data extractor for Atlas, a personal finance companion.
Extract ONLY what is explicitly stated in the user's message.
Return a JSON object with any of these fields (omit fields you're not confident about):
monthlyIncome, essentialExpenses, discretionaryExpenses, totalSavings,
highInterestDebt, lowInterestDebt, monthlyDebtPayments,
primaryGoal ("stability"|"growth"|"flexibility"|"wealth_building"),
timeHorizonYears, riskTolerance ("cautious"|"balanced"|"growth"), biggestConcern.
Return {} if nothing is clearly extractable. Return pure JSON only, no markdown.`
    : `You are Atlas — a warm, empathetic financial companion. Like a trusted friend who is also brilliant with money.
Tone: calm, clear, caring. Never preachy. Ask ONE question at a time. Maximum 2 sentences per reply.
When asking for numbers, briefly explain why: e.g. "(This helps me understand your safety net.)"
Missing fields needed from user: ${(missing || []).join(', ')}
Never say "as an AI". Be warm and human.`;

  const maxTokens = type === 'extract' ? 400 : 250;

  try {
    const response = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages.slice(-10),
      }),
    });

    if (!response.ok) {
      if (response.status === 401) return jsonError(401, 'API key is invalid.');
      if (response.status === 429) return jsonError(429, 'Rate limit reached. Please try again.');
      return jsonError(502, 'Upstream API error. Please try again.');
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    if (type === 'extract') {
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        const fields = JSON.parse(clean);
        return jsonOk({ fields, source: 'claude' });
      } catch {
        return jsonOk({ fields: {}, source: 'claude_parse_error' });
      }
    }

    return jsonOk({ text, source: 'claude' });

  } catch (err) {
    return jsonError(500, 'An unexpected error occurred.');
  }
}

function jsonOk(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
