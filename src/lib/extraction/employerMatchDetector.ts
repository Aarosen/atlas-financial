/**
 * Detects whether a user has said anything about an employer 401(k)/403(b) match.
 * Emits a structured signal the conversation controller can consume to schedule
 * the "Are you contributing enough to capture the match?" follow-up.
 */

export interface EmployerMatchSignal {
  /** True if any 401k / employer-match mention was found. */
  mentioned: boolean;
  /** Numeric match percent (e.g., 0.05 for 5%) if explicitly stated; null otherwise. */
  matchPct: number | null;
  /** Numeric ceiling on which the match applies (e.g., 0.06 for "up to 6% of salary"). */
  matchCapPct: number | null;
  /** Free-text snippet that triggered the detection (for telemetry). */
  evidence: string | null;
}

const PCT = /(\d{1,2}(?:\.\d{1,2})?)\s*%/;
const PCT_NUMERIC = /(\d{1,2}(?:\.\d{1,2})?)\s*percent/i;

const TRIGGERS = [
  /\b401\s*k\b/i,
  /\b403\s*b\b/i,
  /\bemployer\s+match\b/i,
  /\bcompany\s+match\b/i,
  /\bmatching\s+(?:contribution|funds?)\b/i,
  /\bmatch\s*(?:up\s+to|at)?\b/i,
  /\bvested\b/i,
  /\bsafe\s*harbor\b/i,
];

export function detectEmployerMatch(text: string): EmployerMatchSignal {
  if (!text || typeof text !== 'string') return { mentioned: false, matchPct: null, matchCapPct: null, evidence: null };
  const hits = TRIGGERS.filter((rx) => rx.test(text));
  if (hits.length === 0) return { mentioned: false, matchPct: null, matchCapPct: null, evidence: null };

  // Look for "match X%" or "matches X%" → matchPct
  const mPct = text.match(/match(?:es|ing)?\s*(?:up\s+to\s*)?(\d{1,2}(?:\.\d{1,2})?)\s*%/i);
  // Look for "up to Y%" → matchCapPct (when it appears after "match" wording)
  const cap = text.match(/match[^.]{0,80}up\s+to\s*(\d{1,2}(?:\.\d{1,2})?)\s*%/i);
  // Look for "100% of the first X%" / "50% match on first X%" patterns → matchCapPct
  const ofFirst = text.match(/(\d{1,2}(?:\.\d{1,2})?)\s*%[^.]{0,40}(?:on|of)\s+(?:the\s+)?first\s+(\d{1,2}(?:\.\d{1,2})?)\s*%/i);

  let matchPct: number | null = null;
  let matchCapPct: number | null = null;

  if (ofFirst) {
    matchPct = Number(ofFirst[1]) / 100;
    matchCapPct = Number(ofFirst[2]) / 100;
  } else if (mPct) {
    matchPct = Number(mPct[1]) / 100;
  }
  if (cap && !matchCapPct) {
    matchCapPct = Number(cap[1]) / 100;
  }
  if (matchPct === null) {
    const generic = text.match(PCT_NUMERIC);
    if (generic && (mPct || /match/i.test(text))) matchPct = Number(generic[1]) / 100;
  }

  return {
    mentioned: true,
    matchPct: matchPct,
    matchCapPct: matchCapPct,
    evidence: hits[0]?.source ?? null,
  };
}
