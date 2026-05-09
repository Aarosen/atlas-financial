const TIMEOUT_MS = 1200;

const SYSTEM = `You are Atlas's voice. The user is mid-onboarding.
Your only job: return ONE warm, concrete sentence that acknowledges what the user just said. Then a literal newline. Then the exact deterministic question text below — do not change a word of it.

Hard rules:
- Output is exactly: <one sentence>\\n<DETERMINISTIC_QUESTION>
- Never add a second question.
- Never use the words "I" as the first word, "as an AI", "advisor", "recommend", "you should".
- Use "we" / "let's" sparingly, only when natural.
- Maximum total length: 220 characters. The deterministic question already counts toward that.
- If you can't think of a useful acknowledgment, just return the deterministic question with no preamble.`;

export async function warmWrap({
  userMessage,
  deterministicQuestion,
  signal,
}: {
  userMessage: string;
  deterministicQuestion: string;
  signal?: AbortSignal;
}): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  if (signal) signal.addEventListener('abort', () => ctrl.abort());
  try {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        type: 'warm_wrap',
        messages: [
          {
            role: 'user',
            content: `User just said: "${userMessage}"\nDETERMINISTIC_QUESTION: ${deterministicQuestion}`,
          },
        ],
      }),
    });
    if (!r.ok) return deterministicQuestion;
    const j = await r.json();
    const out = (typeof j?.text === 'string' ? j.text : '').trim();
    if (!out || !out.endsWith(deterministicQuestion)) return deterministicQuestion;
    if (out.length > 220) return deterministicQuestion;
    if (/\bI\s/i.test(out.slice(0, 2)) || /as an AI/i.test(out)) return deterministicQuestion;
    return out;
  } catch {
    return deterministicQuestion;
  } finally {
    clearTimeout(timer);
  }
}
