// ─────────────────────────────────────────────────────────────────────────────
// CODE-04: Session Integrity Checker (D2-07, D4-03, D4-05, D4-10, D6-04)
// Checks for repeated questions, repeated concepts, and first-message quality.
// ─────────────────────────────────────────────────────────────────────────────

import { EvalContext, EvalResult, SessionMessage } from "../../types";

const FORBIDDEN_OPENERS = [
  "what is your monthly income",
  "please enter your",
  "to get started, i need",
  "what are your monthly expenses",
  "how much do you make",
  "enter your income",
  "provide your",
  "fill in your",
];

const OPEN_ENDED_SIGNALS = [
  "what's going on",
  "what's bothering",
  "how can i help",
  "what would you like",
  "tell me about",
  "what's on your mind",
  "what brings you",
  "where are you",
  "what are you working",
  "what's your situation",
];

export function runSessionChecker(ctx: EvalContext): EvalResult[] {
  const results: EvalResult[] = [];
  const session = ctx.sessionLog ?? [];

  // ── D4-10: First message must be open-ended ──────────────────────────────
  const firstAtlas = session.find(m => m.role === "atlas");
  if (firstAtlas) {
    const text = firstAtlas.content.toLowerCase();
    const hasForbidden = FORBIDDEN_OPENERS.some(f => text.includes(f));
    const hasOpenEnded = OPEN_ENDED_SIGNALS.some(s => text.includes(s));
    results.push({
      id:        "D4-SESSION-01",
      name:      "First Message Open-Ended",
      dimension: "D4",
      result:    (!hasForbidden && hasOpenEnded) ? "PASS" : "FAIL",
      severity:  "CRITICAL",
      threshold: "Open-ended, no scripted form-like opener",
      actual:    hasForbidden ? `Forbidden opener detected` : hasOpenEnded ? `Open-ended signal found` : `No open-ended signal`,
      reason:    hasForbidden
        ? `CRITICAL: Atlas opened with a scripted form-filler question — users should be asked 'What's on your mind?' not 'What is your income?'`
        : hasOpenEnded
        ? `First message correctly invites the user to share freely`
        : `First message did not clearly invite open sharing`,
      blocker:   hasForbidden || !hasOpenEnded,
      quote:     firstAtlas.content.substring(0, 120),
      timestamp: new Date().toISOString(),
    });
  }

  // ── D4-05: No repeated questions ────────────────────────────────────────
  const atlasQuestions = session
    .filter(m => m.role === "atlas" && m.type === "question")
    .map(m => m.content.toLowerCase().trim());

  const questionCounts = atlasQuestions.reduce<Record<string, number>>((acc, q) => {
    acc[q] = (acc[q] || 0) + 1;
    return acc;
  }, {});

  const duplicateQuestions = Object.entries(questionCounts)
    .filter(([_, count]) => count > 1)
    .map(([q]) => q);

  results.push({
    id:        "D4-SESSION-02",
    name:      "No Repeated Questions in Session",
    dimension: "D4",
    result:    duplicateQuestions.length === 0 ? "PASS" : "FAIL",
    severity:  "HIGH",
    threshold: "≤ 1% repeat rate",
    actual:    duplicateQuestions.length === 0
      ? "No duplicate questions"
      : `${duplicateQuestions.length} repeated question(s)`,
    reason:    duplicateQuestions.length > 0
      ? `Atlas asked the same question twice: "${duplicateQuestions[0].substring(0, 80)}..."`
      : "All questions are unique within the session",
    blocker:   false,
    timestamp: new Date().toISOString(),
  });

  // ── D3-07: No repeated concepts ─────────────────────────────────────────
  const teachingMessages = session.filter(m => m.role === "atlas" && m.type === "teaching");
  const conceptIds = teachingMessages
    .map(m => m.conceptId)
    .filter((id): id is string => !!id);

  const conceptCounts = conceptIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  const repeatedConcepts = Object.entries(conceptCounts)
    .filter(([_, count]) => count > 1)
    .map(([id]) => id);

  results.push({
    id:        "D3-SESSION-01",
    name:      "No Repeated Teaching Concepts",
    dimension: "D3",
    result:    repeatedConcepts.length === 0 ? "PASS" : "WARN",
    severity:  "STANDARD",
    threshold: "≤ 5% repetition rate",
    actual:    repeatedConcepts.length === 0
      ? "All concepts are unique"
      : `${repeatedConcepts.length} repeated concept(s): ${repeatedConcepts.join(", ")}`,
    reason:    repeatedConcepts.length > 0
      ? `Atlas taught the same concept(s) more than once — risks feeling repetitive`
      : "No concept repetition detected",
    blocker:   false,
    timestamp: new Date().toISOString(),
  });

  return results;
}
