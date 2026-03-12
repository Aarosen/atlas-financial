/**
 * ATLAS ROUTE.TS — SURGICAL PATCH
 * 
 * This file shows ONLY the changes needed in your existing route.ts.
 * Three targeted modifications. Nothing else changes.
 * 
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGE 1: Add this import at the top of route.ts (with other imports)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ADD THIS IMPORT:
import { orchestrate } from '@/lib/ai/conversationOrchestrator';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGE 2: Update the POST body destructuring
 * 
 * FIND this line in your existing route.ts:
 *   const { type, messages, missing, question, memorySummary } = body as { ... }
 * 
 * REPLACE with:
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { type, messages, missing, question, memorySummary, fin, sessionState } = body as {
  type?: string;
  messages?: any[];
  missing?: string[];
  question?: string;
  memorySummary?: string;
  fin?: Record<string, any>;              // financial profile fields (already exists)
  sessionState?: Record<string, any>;    // ADD: client passes back previous state
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGE 3: Replace the entire chat block.
 * 
 * FIND this comment in your existing route.ts:
 *   // For chat responses, use Claude's natural generation with minimal post-processing
 * 
 * REPLACE everything from that comment through the closing brace of the if block.
 * 
 * The OLD code was:
 *   if (type === 'chat' && text) {
 *     const lastUserMsg = ...
 *     const crisisSignal = ...
 *     if (crisisSignal) { return crisisResponse }
 *     return jsonOk({ text, source: 'claude', ... })
 *   }
 * 
 * REPLACE WITH THE FUNCTION BELOW:
 * ─────────────────────────────────────────────────────────────────────────────
 */

// PASTE THIS FUNCTION into route.ts, replacing the old chat block.
// This is a self-contained function you can call from the main POST handler.

async function handleChatRequest(params: {
  apiKey: string;
  modelCandidates: string[];
  messages: any[];
  fin: Record<string, any>;
  sessionState: Record<string, any> | undefined;
  memorySummary: string | undefined;
  tier: string;
  body: any;
}) {
  const { apiKey, modelCandidates, messages, fin, sessionState, memorySummary, tier, body } = params;

  const lastUserMsg = String((messages || []).slice(-1)[0]?.content || '').trim();
  const conversationHistory = messages || [];
  const financialProfile = fin || {};

  // ── Step 1: Crisis check first (safety gate) ───────────────────────────────
  const crisisSignal = detectCrisisSignals(lastUserMsg, conversationHistory, financialProfile);
  if (crisisSignal) {
    const crisisResponse = generateCrisisResponse(crisisSignal);
    return jsonOk({
      text: crisisResponse,
      source: 'atlas_crisis',
      model: modelCandidates[0],
      tier,
      sessionState: sessionState ?? {},
    });
  }

  // ── Step 2: Run the orchestrator ───────────────────────────────────────────
  // This is the missing layer. It analyzes the conversation state and builds
  // a session context block that gets injected into every Claude call.
  const { sessionStateBlock, missingFields, state } = orchestrate({
    messages: conversationHistory,
    financialProfile,
    previousState: sessionState as any,
  });

  // ── Step 3: Build the enriched system prompt ───────────────────────────────
  // The session state block is injected FIRST so it's never trimmed away.
  // Then the persona prompt. Then contextual signals.
  const emotionTag = detectEmotion(messages);
  const language = detectLanguage(lastUserMsg);
  const emotionContext = `\n\nUSER EMOTION TAG: ${emotionTag}.`;
  const disclaimerContext = `\n\nDISCLAIMER_NEEDED: ${hasDisclaimer(messages) ? 'no' : 'yes'}.`;
  const memoryContext = memorySummary ? `\n\nUSER MEMORY SUMMARY:\n${String(memorySummary).trim()}` : '';
  const agentContext = lastUserMsg
    ? `\n\nPRIMARY AGENT: ${routeAgentForText(lastUserMsg).label}.`
    : '';
  const advancedContext = buildAdvancedTopicContext(fin)
    ? `\n\nADVANCED TOPIC CONTEXT: ${buildAdvancedTopicContext(fin)}`
    : '';
  const compSignal = detectComprehensionSignal(lastUserMsg);
  const comprehensionContext = compSignal
    ? `\n\nCOMPREHENSION SIGNAL: ${compSignal}.`
    : '';
  const exampleContext = `\n\nCULTURAL EXAMPLE: ${culturallyRelevantExample(lastUserMsg)}`;
  const languageContext = `\n\nLANGUAGE: ${language}. Use the simplest possible wording.`;

  // Build the persona section (same as your existing chatPrompt but with
  // dynamic missingFields from orchestrator instead of raw `missing` array)
  const resolvedMissingFields = missingFields.join(', ') || 'none — analysis is ready';

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

  // The session state block goes FIRST — it's the most critical context.
  // If the prompt gets trimmed, the persona gets trimmed, not the state.
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

  // ── Step 4: Call Claude with enriched context ──────────────────────────────
  const trimmedMessages = messages.slice(-10);
  let usedModel = modelCandidates[0];

  let response = await callAnthropicStream({
    apiKey,
    model: usedModel,
    maxTokens: 900,
    system: enrichedSystemPrompt,
    messages: trimmedMessages,
  });

  // Model fallback logic (same as your existing code)
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

  // ── Step 5: Stream response back with session state ────────────────────────
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CHANGE 4: Update how the frontend calls the API
 * 
 * In your frontend conversation component, include sessionState in the request body:
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Frontend call example (update your conversation page):
const FRONTEND_EXAMPLE = `
// Store session state in React state
const [sessionState, setSessionState] = useState({});

// When sending a message:
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'chat',
    messages: conversationHistory,
    missing: [],           // orchestrator now handles this server-side
    fin: financialProfile, // keep sending this as before
    sessionState,          // ADD: send back the state from previous turn
  }),
});

// When reading the SSE stream, watch for session_state events:
// event.data.type === 'session_state' → setSessionState(event.data.state)
// event.data.delta → append to message text
`;

export { handleChatRequest };
