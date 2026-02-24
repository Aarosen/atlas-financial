/**
 * CONVERSATION ARC ENGINE
 * 
 * Detects conversation phases and synthesizes multi-turn conversations into coherent action plans.
 * This is what separates Atlas from generic chatbots - it understands conversation flow and provides synthesis.
 */

import type { FinancialState } from '@/lib/state/types';

export type ConversationPhase = 'exploration' | 'clarification' | 'decision' | 'action' | 'reflection';

export interface ConversationArc {
  phase: ConversationPhase;
  turnCount: number;
  primaryTopic: string;
  secondaryTopics: string[];
  questionsAsked: string[];
  keyNumbers: Record<string, number>;
  decisions: string[];
  concerns: string[];
  readyForSynthesis: boolean;
}

export interface SessionSynthesis {
  summary: string;
  keyNumbers: Record<string, string>;
  priorities: string[];
  timeline: string;
  nextSteps: string[];
  exportableText: string;
}

/**
 * Detect conversation phase based on message patterns
 */
export function detectConversationPhase(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): ConversationPhase {
  const turnCount = conversationHistory.filter(m => m.role === 'user').length;
  const allMessages = conversationHistory.map(m => m.content).join(' ').toLowerCase();

  // Exploration phase: Early questions, gathering information
  if (turnCount <= 2) {
    return 'exploration';
  }

  // Clarification phase: Asking follow-up questions, seeking details
  if (
    /what about|how much|when|how long|what if|what's the best|should i|can i|is it|does it/i.test(
      userMessage
    )
  ) {
    return 'clarification';
  }

  // Decision phase: Making choices, comparing options
  if (/should i|would it be better|which one|prefer|choose|option|alternative/i.test(userMessage)) {
    return 'decision';
  }

  // Action phase: Ready to implement, asking for next steps
  if (/how do i start|first step|what do i do|let's do this|ready to|let's begin/i.test(userMessage)) {
    return 'action';
  }

  // Reflection phase: Looking back, evaluating progress
  if (/how am i doing|progress|improvement|better|worse|changed/i.test(userMessage)) {
    return 'reflection';
  }

  return 'clarification';
}

/**
 * Build conversation arc from history
 */
export function buildConversationArc(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  financialState: FinancialState
): ConversationArc {
  const userMessages = conversationHistory.filter(m => m.role === 'user').map(m => m.content);
  const allText = userMessages.join(' ');

  // Extract questions
  const questionsAsked = userMessages.filter(m => m.includes('?'));

  // Extract key numbers
  const keyNumbers: Record<string, number> = {};
  const numberMatches = allText.matchAll(/\$?([\d,]+(?:\.\d{2})?)/g);
  for (const match of numberMatches) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    if (num > 0) {
      if (!keyNumbers['total']) keyNumbers['total'] = 0;
      keyNumbers['total'] += num;
    }
  }

  // Detect topics
  const topics: Record<string, boolean> = {
    debt: /debt|credit card|loan|owe/i.test(allText),
    savings: /save|savings|emergency|fund/i.test(allText),
    investing: /invest|401k|ira|stock|market/i.test(allText),
    budgeting: /budget|spend|expense|income/i.test(allText),
    retirement: /retire|retirement|401k|ira|pension/i.test(allText),
    credit: /credit|score|report|history/i.test(allText),
    tax: /tax|deduction|refund|irs/i.test(allText),
  };

  const primaryTopic = Object.entries(topics)
    .filter(([_, v]) => v)
    .map(([k]) => k)[0] || 'general';

  const secondaryTopics = Object.entries(topics)
    .filter(([_, v]) => v)
    .map(([k]) => k)
    .slice(1);

  // Detect decisions made
  const decisions: string[] = [];
  if (/pay off|attack|focus on|prioritize/i.test(allText)) {
    decisions.push('Prioritizing debt payoff');
  }
  if (/invest|start investing|open|401k|ira/i.test(allText)) {
    decisions.push('Beginning investment strategy');
  }
  if (/build|emergency|fund|save/i.test(allText)) {
    decisions.push('Building emergency fund');
  }

  // Detect concerns
  const concerns: string[] = [];
  if (/can't afford|too expensive|expensive|cost/i.test(allText)) {
    concerns.push('Affordability concerns');
  }
  if (/don't have time|busy|overwhelmed/i.test(allText)) {
    concerns.push('Time constraints');
  }
  if (/don't understand|confused|complicated/i.test(allText)) {
    concerns.push('Complexity concerns');
  }

  const phase = detectConversationPhase(userMessages[userMessages.length - 1], conversationHistory);
  const readyForSynthesis = questionsAsked.length >= 3 && (phase === 'action' || phase === 'reflection');

  return {
    phase,
    turnCount: userMessages.length,
    primaryTopic,
    secondaryTopics,
    questionsAsked,
    keyNumbers,
    decisions,
    concerns,
    readyForSynthesis,
  };
}

/**
 * Generate session synthesis
 */
export function generateSessionSynthesis(
  arc: ConversationArc,
  financialState: FinancialState,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): SessionSynthesis {
  const allText = conversationHistory.map(m => m.content).join(' ');

  // Build summary
  const summary = buildSummary(arc, allText);

  // Format key numbers
  const keyNumbers: Record<string, string> = {};
  if (arc.keyNumbers['total']) {
    keyNumbers['Total Financial Amount'] = `$${arc.keyNumbers['total'].toLocaleString()}`;
  }
  if (financialState.monthlyIncome) {
    keyNumbers['Monthly Income'] = `$${financialState.monthlyIncome.toLocaleString()}`;
  }
  if (financialState.essentialExpenses) {
    keyNumbers['Monthly Expenses'] = `$${financialState.essentialExpenses.toLocaleString()}`;
  }

  // Determine priorities
  const priorities = determinePriorities(arc, financialState);

  // Estimate timeline
  const timeline = estimateTimeline(arc, financialState);

  // Generate next steps
  const nextSteps = generateNextStepsFromArc(arc, financialState);

  // Create exportable text
  const exportableText = createExportableText(summary, keyNumbers, priorities, timeline, nextSteps);

  return {
    summary,
    keyNumbers,
    priorities,
    timeline,
    nextSteps,
    exportableText,
  };
}

/**
 * Build summary of conversation
 */
function buildSummary(arc: ConversationArc, allText: string): string {
  const topics = [arc.primaryTopic, ...arc.secondaryTopics].join(', ');
  const questionCount = arc.questionsAsked.length;

  let summary = `We discussed ${topics} across ${questionCount} questions. `;

  if (arc.decisions.length > 0) {
    summary += `You decided to: ${arc.decisions.join(', ')}. `;
  }

  if (arc.concerns.length > 0) {
    summary += `Key concerns: ${arc.concerns.join(', ')}. `;
  }

  summary += `You're in the ${arc.phase} phase and ready to move forward.`;

  return summary;
}

/**
 * Determine priorities from conversation
 */
function determinePriorities(arc: ConversationArc, financialState: FinancialState): string[] {
  const priorities: string[] = [];

  if (arc.primaryTopic === 'debt') {
    priorities.push('1. Pay off high-interest debt');
    priorities.push('2. Build emergency fund ($1,000)');
    priorities.push('3. Expand emergency fund (3-6 months)');
    priorities.push('4. Start investing');
  } else if (arc.primaryTopic === 'savings') {
    priorities.push('1. Build emergency fund ($1,000 this month)');
    priorities.push('2. Expand to 3-6 months expenses');
    priorities.push('3. Start investing');
  } else if (arc.primaryTopic === 'investing') {
    priorities.push('1. Max out employer 401(k) match');
    priorities.push('2. Max out Roth IRA ($7,000/year)');
    priorities.push('3. Invest extra in taxable account');
    priorities.push('4. Rebalance quarterly');
  } else {
    priorities.push('1. Understand current financial situation');
    priorities.push('2. Identify top priority');
    priorities.push('3. Create action plan');
    priorities.push('4. Execute first step');
  }

  return priorities;
}

/**
 * Estimate timeline
 */
function estimateTimeline(arc: ConversationArc, financialState: FinancialState): string {
  if (arc.primaryTopic === 'debt') {
    const debtAmount = financialState.highInterestDebt || 0;
    const monthlyIncome = financialState.monthlyIncome || 0;
    const monthlyExpenses = financialState.essentialExpenses || 0;
    const surplus = monthlyIncome - monthlyExpenses;

    if (surplus > 0) {
      const monthsToPayoff = Math.ceil(debtAmount / Math.max(100, surplus * 0.3));
      return `Debt-free in approximately ${monthsToPayoff} months with aggressive payoff`;
    }
  }

  if (arc.primaryTopic === 'savings') {
    return 'Emergency fund complete in 3-6 months with consistent saving';
  }

  if (arc.primaryTopic === 'investing') {
    return 'Long-term wealth building over 20-30 years';
  }

  return 'Timeline depends on your specific situation and commitment';
}

/**
 * Generate next steps from conversation arc
 */
function generateNextStepsFromArc(arc: ConversationArc, financialState: FinancialState): string[] {
  const steps: string[] = [];

  if (arc.primaryTopic === 'debt') {
    steps.push('List all debts with balances and interest rates');
    steps.push('Identify highest-interest debt');
    steps.push('Set up automatic minimum payments');
    steps.push('Find $100-200/month extra to attack highest-interest debt');
    steps.push('Track progress monthly');
  } else if (arc.primaryTopic === 'savings') {
    steps.push('Open high-yield savings account (Marcus, Ally, Capital One 360)');
    steps.push('Transfer first $1,000 this week');
    steps.push('Set up automatic weekly transfers');
    steps.push('Target: $3,000 by end of month');
  } else if (arc.primaryTopic === 'investing') {
    steps.push('Check if employer offers 401(k) match');
    steps.push('Contribute enough to get full match');
    steps.push('Open Roth IRA at Vanguard, Fidelity, or Schwab');
    steps.push('Invest in target-date fund or S&P 500 index fund');
  } else {
    steps.push('Schedule 30 minutes to review finances');
    steps.push('List income, expenses, debt, and savings');
    steps.push('Identify top priority');
    steps.push('Create action plan for next 30 days');
  }

  return steps;
}

/**
 * Create exportable text for PDF/email
 */
function createExportableText(
  summary: string,
  keyNumbers: Record<string, string>,
  priorities: string[],
  timeline: string,
  nextSteps: string[]
): string {
  let text = '# Your Financial Plan\n\n';

  text += '## Summary\n';
  text += summary + '\n\n';

  text += '## Key Numbers\n';
  for (const [key, value] of Object.entries(keyNumbers)) {
    text += `- ${key}: ${value}\n`;
  }
  text += '\n';

  text += '## Priorities\n';
  for (const priority of priorities) {
    text += `${priority}\n`;
  }
  text += '\n';

  text += '## Timeline\n';
  text += timeline + '\n\n';

  text += '## Next Steps\n';
  for (const step of nextSteps) {
    text += `- ${step}\n`;
  }

  text += '\n---\n';
  text += 'Generated by Atlas AI Financial Mentor\n';

  return text;
}

/**
 * Check if conversation is ready for synthesis
 */
export function isReadyForSynthesis(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  const questionCount = userMessages.filter(m => m.content.includes('?')).length;

  return questionCount >= 3 || userMessages.length >= 5;
}

/**
 * Generate synthesis message to append to response
 */
export function generateSynthesisMessage(synthesis: SessionSynthesis): string {
  return `
---

## 📋 Your Session Summary

**${synthesis.summary}**

### Key Numbers
${Object.entries(synthesis.keyNumbers)
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join('\n')}

### Your Priorities
${synthesis.priorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}

### Timeline
${synthesis.timeline}

### Your Next Steps
${synthesis.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

**[Download as PDF](#) | [Email to myself](#) | [Save to dashboard](#)**
`;
}
