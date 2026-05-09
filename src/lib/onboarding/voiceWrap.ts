import { ATLAS_VOICE } from '@/lib/voice/AtlasVoice';
import type { ToneType } from '@/lib/models/Tone';

export type EmotionTag = 'overwhelmed' | 'shame' | 'analytical' | 'uncertain' | 'motivated' | null;

/**
 * questionKey is the field being asked for, e.g. 'monthlyIncome' | 'essentialExpenses'.
 * userTurnIndex is 1-based: first user message is 1.
 * tone is the inferred Tone (default 'baseline').
 *
 * Returns the deterministic question wrapped in 0–1 voice lines.
 * Does NOT mutate the question itself; only prefixes warmth.
 */
export function voiceWrap(
  question: string,
  questionKey: string,
  userTurnIndex: number,
  tone: ToneType = 'baseline',
  emotionTag?: EmotionTag,
): string {
  // Guard: turn 1 gets a richer wrap (intro + bridge); later turns get a brief bridge.
  if (userTurnIndex <= 1) {
    return question; // turn 1 is handled by C0.7 opener
  }

  const bridge = pickBridge(questionKey, userTurnIndex, tone, emotionTag);
  return bridge ? `${bridge}\n\n${question}` : question;
}

function pickBridge(
  questionKey: string,
  userTurnIndex: number,
  tone: ToneType,
  emotionTag?: EmotionTag,
): string {
  // 1) Emotion-aware bridges take priority — they answer the user before we ask again.
  if (emotionTag === 'overwhelmed') {
    return "Take a breath — there are no wrong answers here. We'll go one number at a time.";
  }
  if (emotionTag === 'shame') {
    return "There's nothing dumb about any of this. Money is complicated — you're not.";
  }
  if (emotionTag === 'uncertain') {
    return "A rough number is completely fine — precision isn't the goal here.";
  }

  // 2) Field-specific bridges that explain WHY we're asking.
  switch (questionKey) {
    case 'monthlyIncome':
      return "First, let's anchor on what comes in each month — that sets everything else in context.";
    case 'essentialExpenses':
      return "Next, the unmovable stuff — rent, utilities, groceries, minimum debt payments.";
    case 'discretionaryExpenses':
      return "Now the flexible side — dining out, subscriptions, the things you'd cut first if you had to.";
    case 'totalSavings':
      return "Let's talk cushion. Cash, checking, savings — anything you could tap quickly.";
    case 'highInterestDebt':
      return "Now the part that costs money to carry — credit cards, anything above ~7% APR.";
    case 'lowInterestDebt':
      return "And the cheaper debt — student loans, car, mortgage, anything at or below 7%.";
    case 'monthlyDebtPayments':
      return "What you actually pay toward debt every month — minimums included.";
    case 'primaryGoal':
      return "Last big one — what's the thing you most want money to do for you right now?";
    case 'timeHorizonYears':
      return "And the timeline — when do you want this to be true by?";
    default:
      return "";
  }
}

/** Tone-scaled variant — useful when tone is non-baseline. */
export function voiceWrapWithTone(
  question: string,
  questionKey: string,
  idx: number,
  tone: ToneType = 'baseline',
  emotion?: EmotionTag,
): string {
  const baseline = voiceWrap(question, questionKey, idx, tone, emotion);
  if (tone === 'gentle') {
    return softenForGentle(baseline);
  }
  if (tone === 'ambitious') {
    return tightenForAmbitious(baseline);
  }
  return baseline;
}

function softenForGentle(text: string): string {
  return text
    .replace(
      "Take a breath — there are no wrong answers here. We'll go one number at a time.",
      "No pressure — we can go as slow as feels right.",
    )
    .replace(
      "Now the part that costs money to carry",
      "When you're ready, the part that costs money to carry",
    );
}

function tightenForAmbitious(text: string): string {
  return text
    .replace(
      "First, let's anchor on what comes in each month — that sets everything else in context.",
      "Let's get the fundamentals locked.",
    )
    .replace(
      "Take a breath — there are no wrong answers here. We'll go one number at a time.",
      "Quick pace — we'll cover the essentials in five questions.",
    );
}
