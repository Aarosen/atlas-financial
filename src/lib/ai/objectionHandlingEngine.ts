/**
 * OBJECTION HANDLING ENGINE
 * 
 * Anticipates and proactively addresses user concerns before they raise them.
 * This is what separates a mentor from a generic advisor.
 */

export type ObjectionCategory =
  | 'affordability'
  | 'time'
  | 'complexity'
  | 'trust'
  | 'debt'
  | 'risk'
  | 'discipline'
  | 'family'
  | 'other';

export interface Objection {
  category: ObjectionCategory;
  pattern: RegExp;
  concern: string;
  proactiveResponse: string;
  alternatives: string[];
}

/**
 * Comprehensive objection database
 */
const objections: Objection[] = [
  {
    category: 'affordability',
    pattern: /can't afford|too expensive|expensive|cost|price|money/i,
    concern: 'User thinks they cannot afford the recommendation',
    proactiveResponse: `I know cost is a concern. Here's the good news: **you don't need a lot of money to start**. Even $25/week adds up to $1,300/year. Start small, build momentum, and increase as you can.`,
    alternatives: [
      'Start with $10-25/week instead of $100/month',
      'Use a low-cost provider (Vanguard, Fidelity, Schwab)',
      'Focus on high-interest debt first (saves money immediately)',
      'Cut one small expense to fund this',
    ],
  },
  {
    category: 'time',
    pattern: /don't have time|busy|overwhelmed|too much|complicated|hard/i,
    concern: 'User thinks this requires too much time or effort',
    proactiveResponse: `I get it - you're busy. **The good news: this takes less time than you think.** Most of this is set-it-and-forget-it. Once you set up automatic transfers and investments, you're done. It's literally 30 minutes of setup.`,
    alternatives: [
      'Set up automatic transfers (5 minutes)',
      'Use robo-advisors that manage for you',
      'Focus on one goal at a time, not everything',
      'Start with just emergency fund (simplest first)',
    ],
  },
  {
    category: 'debt',
    pattern: /but i have debt|debt first|pay off debt|owe money/i,
    concern: 'User thinks they should pay off all debt before investing',
    proactiveResponse: `**You can do both.** Here's the strategy: pay minimums on low-interest debt (student loans, mortgage) while attacking high-interest debt (credit cards). Meanwhile, get your employer 401(k) match - that's free money. Then tackle the rest.`,
    alternatives: [
      'Get employer 401(k) match first (free money)',
      'Attack high-interest debt (18%+) aggressively',
      'Pay minimums on low-interest debt',
      'Build small emergency fund ($1k) while paying debt',
    ],
  },
  {
    category: 'trust',
    pattern: /don't trust|skeptical|not sure|don't believe|sounds too good|risky/i,
    concern: 'User is skeptical or distrustful of the advice',
    proactiveResponse: `Your skepticism is healthy - you should question financial advice. **Here's why this works:** It's based on decades of research, used by millions of people, and recommended by CFAs and financial advisors. Start small to test it. See the results yourself.`,
    alternatives: [
      'Start with a small amount to test',
      'Read the research and data yourself',
      'Talk to a fee-only financial advisor for validation',
      'Start with the safest option (high-yield savings)',
    ],
  },
  {
    category: 'risk',
    pattern: /risky|lose money|market crash|what if|scared|afraid/i,
    concern: 'User is worried about losing money or market risk',
    proactiveResponse: `**Risk is real, but so is the cost of not investing.** Your money loses value to inflation if you don't invest. A diversified portfolio of index funds has recovered from every crash in history. And you have time - the longer you invest, the less risk matters.`,
    alternatives: [
      'Start conservative (bonds + stocks mix)',
      'Use target-date funds (automatically adjust risk)',
      'Dollar-cost average (invest same amount monthly)',
      'Keep emergency fund separate (no risk)',
    ],
  },
  {
    category: 'discipline',
    pattern: /i'll fail|i can't stick|i've tried|didn't work|gave up|relapsed/i,
    concern: 'User doubts their ability to follow through',
    proactiveResponse: `**You don't need willpower - you need automation.** Set it up once, then it happens automatically. No decisions, no discipline needed. You can't fail if it's automatic.`,
    alternatives: [
      'Automate everything (transfers, investments, payments)',
      'Start with tiny amounts ($10/week)',
      'Track progress visually (see wins)',
      'Find an accountability partner',
    ],
  },
  {
    category: 'family',
    pattern: /spouse|partner|family|kids|children|dependents|not sure|need to ask/i,
    concern: 'User needs to discuss with family or partner',
    proactiveResponse: `**Great instinct - financial decisions are family decisions.** Here's what to discuss: your goals, your timeline, and your risk tolerance. Bring this plan to them. Most partners appreciate a clear, thoughtful plan.`,
    alternatives: [
      'Schedule a family financial meeting',
      'Share this plan with your partner',
      'Start with something small you can both agree on',
      'Consider couples financial counseling',
    ],
  },
  {
    category: 'complexity',
    pattern: /confusing|don't understand|too complicated|explain|how does|what does/i,
    concern: 'User finds the concept confusing or complex',
    proactiveResponse: `**Let me simplify.** Think of it like this: [simple analogy]. That's it. You don't need to understand every detail - you just need to understand the basics and take action.`,
    alternatives: [
      'Start with the simplest option first',
      'Use a robo-advisor (they handle complexity)',
      'Watch a 5-minute explainer video',
      'Ask me to explain it differently',
    ],
  },
  {
    category: 'other',
    pattern: /but|however|what about|what if|concerned|worried/i,
    concern: 'Generic objection or concern',
    proactiveResponse: `That's a fair point. Let me address that directly: [specific response]. Here's why it still makes sense for you: [benefit].`,
    alternatives: [
      'Let\'s break this down step by step',
      'What specific concern can I address?',
      'Let\'s find an alternative that works for you',
      'What would make you feel confident about this?',
    ],
  },
];

/**
 * Detect objections in user message
 */
export function detectObjections(userMessage: string): Objection[] {
  const detected: Objection[] = [];

  for (const objection of objections) {
    if (objection.pattern.test(userMessage)) {
      detected.push(objection);
    }
  }

  return detected;
}

/**
 * Generate proactive objection response
 */
export function generateProactiveObjectionResponse(detectedObjections: Objection[]): string {
  if (detectedObjections.length === 0) return '';

  let response = '\n---\n\n**I anticipate a concern:**\n\n';

  for (const objection of detectedObjections.slice(0, 2)) {
    // Only address top 2 objections
    response += `**${objection.concern}**\n`;
    response += `${objection.proactiveResponse}\n\n`;

    if (objection.alternatives.length > 0) {
      response += `**Alternatives:**\n`;
      for (const alt of objection.alternatives.slice(0, 3)) {
        response += `- ${alt}\n`;
      }
      response += '\n';
    }
  }

  return response;
}

/**
 * Generate response to explicit objection
 */
export function generateObjectionResponse(userMessage: string, objectionCategory: ObjectionCategory): string {
  const objection = objections.find(o => o.category === objectionCategory);

  if (!objection) {
    return `I understand your concern. Let me address that directly and find a solution that works for you.`;
  }

  let response = `**I hear you.** ${objection.concern}\n\n`;
  response += `${objection.proactiveResponse}\n\n`;

  if (objection.alternatives.length > 0) {
    response += `**Here are some alternatives:**\n`;
    for (const alt of objection.alternatives) {
      response += `- ${alt}\n`;
    }
  }

  return response;
}

/**
 * Check if user is raising an objection
 */
export function isRaisingObjection(userMessage: string): boolean {
  const objectionIndicators = /but|however|what about|what if|concerned|worried|can't|don't|won't|shouldn't/i;
  return objectionIndicators.test(userMessage);
}

/**
 * Generate empathetic acknowledgment
 */
export function generateEmpathyAcknowledgment(objectionCategory: ObjectionCategory): string {
  const acknowledgments: Record<ObjectionCategory, string> = {
    affordability: "I understand - money is tight, and every dollar counts.",
    time: "I get it - you're busy and don't have time for complexity.",
    complexity: "That makes sense - financial jargon can be confusing.",
    trust: "That's fair - you should be skeptical of financial advice.",
    debt: "You're right to think about debt - it's a real concern.",
    risk: "Your caution is healthy - losing money is scary.",
    discipline: "I hear you - it's hard to stick with financial plans.",
    family: "Smart thinking - financial decisions affect everyone.",
    other: "I understand your concern.",
  };

  return acknowledgments[objectionCategory];
}

/**
 * Build objection-aware recommendation with specific instruction for Claude
 */
export function buildObjectionAwareRecommendation(
  baseRecommendation: string,
  userMessage: string
): string {
  const detectedObjections = detectObjections(userMessage);

  if (detectedObjections.length === 0) {
    return baseRecommendation;
  }

  let response = baseRecommendation;

  // Add proactive objection handling
  response += generateProactiveObjectionResponse(detectedObjections);

  return response;
}

/**
 * Generate objection handling instruction using few-shot example format
 * This is injected into the system prompt to ensure concrete, specific responses
 */
export function generateObjectionHandlingInstruction(detectedObjections: Objection[]): string {
  if (detectedObjections.length === 0) return '';

  let instruction = '\n━━━ OBJECTION HANDLING INSTRUCTION ━━━\n';
  instruction += 'The user is expressing a psychological barrier. Use the example format below to respond.\n\n';

  for (const objection of detectedObjections.slice(0, 2)) {
    if (objection.category === 'debt') {
      instruction += `OBJECTION DETECTED: hopelessness about debt payoff\n\n`;
      instruction += `When the user expresses hopelessness about debt, respond like this example:\n`;
      instruction += `---\n`;
      instruction += `I hear that. Here's what the math actually looks like: someone with $40,000 in debt putting $300/month extra toward the highest-interest card first could be debt-free in under 5 years — that's the avalanche method. We can run those exact numbers for your situation. What's your total debt balance?\n`;
      instruction += `---\n`;
      instruction += `Structure: one empathy sentence, one concrete math example with specific dollar amount and timeframe, one question.\n\n`;
    } else if (objection.category === 'affordability') {
      instruction += `OBJECTION DETECTED: can't afford to save\n\n`;
      instruction += `When the user says they can't afford to save, respond like this example:\n`;
      instruction += `---\n`;
      instruction += `I get it — money is tight. But here's what's possible: even $25/week adds up to $1,300/year. That's enough to start a high-yield savings account or fund an emergency fund. What's one small amount you could commit to?\n`;
      instruction += `---\n`;
      instruction += `Structure: one empathy sentence, one concrete amount with annual total, one question.\n\n`;
    } else if (objection.category === 'discipline') {
      instruction += `OBJECTION DETECTED: doubts about ability to stick with it\n\n`;
      instruction += `When the user doubts their discipline, respond like this example:\n`;
      instruction += `---\n`;
      instruction += `You don't need willpower — you need automation. Set up a $50 automatic transfer on payday and it happens before you see the money. No decisions, no discipline needed. What amount could you automate?\n`;
      instruction += `---\n`;
      instruction += `Structure: one reframe about mechanism, one concrete example with amount, one question.\n\n`;
    } else if (objection.category === 'risk') {
      instruction += `OBJECTION DETECTED: fear of losing money\n\n`;
      instruction += `When the user fears market risk, respond like this example:\n`;
      instruction += `---\n`;
      instruction += `Your caution is healthy. Here's the data: a diversified portfolio of index funds has recovered from every crash in history, including 2008 and 2020. If you'd invested $100/month starting in 2008, you'd have $18,000 today despite the crash. What's your timeline?\n`;
      instruction += `---\n`;
      instruction += `Structure: one validation, one historical example with specific numbers, one question.\n\n`;
    } else if (objection.category === 'time') {
      instruction += `OBJECTION DETECTED: too complicated or time-consuming\n\n`;
      instruction += `When the user says it's too complicated, respond like this example:\n`;
      instruction += `---\n`;
      instruction += `Setup takes 30 minutes — opening an account and setting up automatic transfers. After that, it's completely hands-off. Can you find 30 minutes this week?\n`;
      instruction += `---\n`;
      instruction += `Structure: one concrete timeframe, one reassurance, one question.\n\n`;
    }
  }

  instruction += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  return instruction;
}
