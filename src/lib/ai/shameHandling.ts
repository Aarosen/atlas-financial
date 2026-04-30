/**
 * TASK 10: Shame & Emotional Handling
 * 
 * Detects shame, guilt, and emotional distress in user messages
 * and responds with empathy-first approach before any advice.
 * 
 * Core principle: Acknowledge the feeling first, then provide path forward
 */

export type EmotionalSignal = 'shame' | 'guilt' | 'overwhelm' | 'anxiety' | 'hopelessness' | 'embarrassment' | 'stress' | 'fear';

export interface ShameProfile {
  hasShame: boolean;
  signals: EmotionalSignal[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledgment: string;
  pathForward: string;
}

/**
 * Detect shame and emotional distress signals
 */
export function detectShame(userMessage: string): ShameProfile {
  const messageLower = userMessage.toLowerCase();

  const shamePatterns: Record<EmotionalSignal, RegExp> = {
    shame: /\b(shame|ashamed|shameful|embarrassed|embarrassing|mortified)\b/i,
    guilt: /\b(guilt|guilty|feel.*bad|regret|shouldn't have|my fault)\b/i,
    overwhelm: /\b(overwhelm|overwhelmed|too much|can't handle|drowning|sinking)\b/i,
    anxiety: /\b(anxious|anxiety|worried|worry|nervous|panic|scared|afraid)\b/i,
    hopelessness: /\b(hopeless|hopeless|stuck|trapped|never.*escape|impossible|doomed|give.*up)\b/i,
    embarrassment: /\b(embarrass|embarrassed|awkward|uncomfortable|weird|strange)\b/i,
    stress: /\b(stress|stressed|stressful|pressure|tense|tension)\b/i,
    fear: /\b(fear|afraid|terrified|frightened|dread|dreading)\b/i,
  };

  const detectedSignals: EmotionalSignal[] = [];

  for (const [signal, pattern] of Object.entries(shamePatterns)) {
    if (pattern.test(messageLower)) {
      detectedSignals.push(signal as EmotionalSignal);
    }
  }

  if (detectedSignals.length === 0) {
    return {
      hasShame: false,
      signals: [],
      severity: 'low',
      acknowledgment: '',
      pathForward: '',
    };
  }

  const severity = computeSeverity(detectedSignals, messageLower);
  const acknowledgment = buildAcknowledgment(detectedSignals, severity);
  const pathForward = buildPathForward(detectedSignals, severity);

  return {
    hasShame: true,
    signals: detectedSignals,
    severity,
    acknowledgment,
    pathForward,
  };
}

/**
 * Compute severity of emotional distress
 */
function computeSeverity(signals: EmotionalSignal[], messageLower: string): 'low' | 'medium' | 'high' | 'critical' {
  // Critical: hopelessness, multiple signals, or explicit crisis language
  if (signals.includes('hopelessness') || signals.length >= 3) {
    return 'critical';
  }

  // High: anxiety + shame, or stress + overwhelm
  if ((signals.includes('anxiety') && signals.includes('shame')) ||
      (signals.includes('stress') && signals.includes('overwhelm'))) {
    return 'high';
  }

  // High: explicit crisis language
  if (/can't sleep|losing sleep|suicidal|self.*harm|give.*up|end.*it/i.test(messageLower)) {
    return 'critical';
  }

  // Medium: single strong signal
  if (signals.includes('overwhelm') || signals.includes('anxiety') || signals.includes('hopelessness')) {
    return 'medium';
  }

  // Low: guilt or embarrassment alone
  return 'low';
}

/**
 * Build empathetic acknowledgment
 */
function buildAcknowledgment(signals: EmotionalSignal[], severity: 'low' | 'medium' | 'high' | 'critical'): string {
  const primarySignal = signals[0];

  const acknowledgments: Record<EmotionalSignal, string> = {
    shame: "Feeling ashamed about money is one of the most common experiences — and it doesn't mean you're broken or bad with money.",
    guilt: "Guilt about past financial decisions is real, and it's actually a sign you care about doing better.",
    overwhelm: "Feeling overwhelmed by finances is completely normal — the numbers can feel massive when you're in the middle of it.",
    anxiety: "Financial anxiety is one of the most common stressors people face. You're not alone in this.",
    hopelessness: "Feeling stuck or hopeless about money is a sign you need a real plan, not judgment. We can build that together.",
    embarrassment: "Embarrassment about financial struggles is understandable, but it's also something almost everyone experiences at some point.",
    stress: "Money stress is real stress. Your body and mind are responding to a real challenge.",
    fear: "Fear about money is legitimate. Let's turn that fear into a concrete plan you can control.",
  };

  let ack = acknowledgments[primarySignal];

  // Add severity-specific context
  if (severity === 'critical') {
    ack += " And right now, you need real support and a concrete path forward.";
  } else if (severity === 'high') {
    ack += " Let's break this down into manageable pieces.";
  }

  return ack;
}

/**
 * Build path forward after acknowledgment
 */
function buildPathForward(signals: EmotionalSignal[], severity: 'low' | 'medium' | 'high' | 'critical'): string {
  if (severity === 'critical') {
    return `Here's what we do:
1. FIRST: Take a breath. You're not alone, and this is fixable.
2. SECOND: Get the numbers. Income, expenses, debts. Just the facts.
3. THIRD: Build a plan. One small step at a time.
4. FOURTH: Take action. Small wins build momentum.

You don't need to fix everything today. You need one clear next step. What's the most pressing issue right now?`;
  }

  if (severity === 'high') {
    return `Here's the path forward:
1. Acknowledge the feeling (you just did)
2. Get clarity on the numbers
3. Build a realistic plan
4. Take one small action

The shame/guilt/overwhelm comes from uncertainty. A plan removes the uncertainty. Let's build it.`;
  }

  return `You're aware of the issue and you want to fix it — that's actually the hardest part. The rest is just math and execution. Let's do this.`;
}

/**
 * Build system prompt context for shame handling
 */
export function buildShameContext(profile: ShameProfile): string {
  if (!profile.hasShame) {
    return '';
  }

  return `[SHAME_CONTEXT]
Emotional Signals: ${profile.signals.join(', ')}
Severity: ${profile.severity}
CRITICAL RULE: Acknowledge the feeling FIRST (one sentence). Then provide the path forward.
Acknowledgment: ${profile.acknowledgment}
Path Forward: ${profile.pathForward}
[END_SHAME_CONTEXT]`;
}

/**
 * Determine if response should lead with empathy
 */
export function shouldLeadWithEmpathy(profile: ShameProfile): boolean {
  return profile.hasShame && profile.severity !== 'low';
}

/**
 * Format empathy-first response
 */
export function formatEmpathyFirstResponse(profile: ShameProfile, technicalAdvice: string): string {
  if (!profile.hasShame) {
    return technicalAdvice;
  }

  return `${profile.acknowledgment}

${profile.pathForward}

---

${technicalAdvice}`;
}
