/**
 * CONTEXT AWARENESS ENGINE
 * 
 * Tracks and references specific numbers and situations mentioned in conversation.
 * Makes Atlas responses personal and specific instead of generic.
 */

import type { FinancialState } from '@/lib/state/types';

export interface ExtractedContext {
  debtAmount: number | null;
  debtRate: number | null;
  savingsAmount: number | null;
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  investmentAmount: number | null;
  emergencyFundTarget: number | null;
  specificConcerns: string[];
  mentionedAccounts: string[];
  timeframes: string[];
}

/**
 * Extract specific numbers and context from conversation history
 */
export function extractConversationContext(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): ExtractedContext {
  const context: ExtractedContext = {
    debtAmount: null,
    debtRate: null,
    savingsAmount: null,
    monthlyIncome: null,
    monthlyExpenses: null,
    investmentAmount: null,
    emergencyFundTarget: null,
    specificConcerns: [],
    mentionedAccounts: [],
    timeframes: [],
  };

  // Combine all user messages
  const allUserMessages = conversationHistory
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content)
    .join(' ');

  // Extract debt amount
  const debtMatch = allUserMessages.match(/(?:debt|owe|credit card|loan).*?\$?([\d,]+)/i);
  if (debtMatch) {
    context.debtAmount = parseFloat(debtMatch[1].replace(/,/g, ''));
  }

  // Extract debt rate
  const rateMatch = allUserMessages.match(/(?:rate|interest|apr|apy).*?(\d+(?:\.\d{1,2})?)\s*%/i);
  if (rateMatch) {
    context.debtRate = parseFloat(rateMatch[1]);
  }

  // Extract savings amount
  const savingsMatch = allUserMessages.match(/(?:save|savings|have).*?\$?([\d,]+)/i);
  if (savingsMatch) {
    context.savingsAmount = parseFloat(savingsMatch[1].replace(/,/g, ''));
  }

  // Extract monthly income
  const incomeMatch = allUserMessages.match(/(?:income|earn|make|salary).*?\$?([\d,]+)/i);
  if (incomeMatch) {
    context.monthlyIncome = parseFloat(incomeMatch[1].replace(/,/g, ''));
  }

  // Extract monthly expenses
  const expensesMatch = allUserMessages.match(/(?:expenses|spend|costs?).*?\$?([\d,]+)/i);
  if (expensesMatch) {
    context.monthlyExpenses = parseFloat(expensesMatch[1].replace(/,/g, ''));
  }

  // Extract investment amount
  const investMatch = allUserMessages.match(/(?:invest|investing).*?\$?([\d,]+)/i);
  if (investMatch) {
    context.investmentAmount = parseFloat(investMatch[1].replace(/,/g, ''));
  }

  // Extract specific concerns
  if (/debt/i.test(allUserMessages)) context.specificConcerns.push('debt');
  if (/emergency|savings/i.test(allUserMessages)) context.specificConcerns.push('emergency_fund');
  if (/invest|retirement|401k|ira/i.test(allUserMessages)) context.specificConcerns.push('investing');
  if (/budget|spend/i.test(allUserMessages)) context.specificConcerns.push('budgeting');
  if (/credit|score/i.test(allUserMessages)) context.specificConcerns.push('credit');
  if (/tax|deduction/i.test(allUserMessages)) context.specificConcerns.push('tax');

  // Extract mentioned accounts
  if (/401k|401\(k\)/i.test(allUserMessages)) context.mentionedAccounts.push('401k');
  if (/ira/i.test(allUserMessages)) context.mentionedAccounts.push('IRA');
  if (/savings account|hysa/i.test(allUserMessages)) context.mentionedAccounts.push('savings_account');
  if (/credit card/i.test(allUserMessages)) context.mentionedAccounts.push('credit_card');
  if (/checking|checking account/i.test(allUserMessages)) context.mentionedAccounts.push('checking');

  // Extract timeframes
  const timeframeMatches = allUserMessages.match(/(\d+)\s*(month|year|week|day)s?/gi);
  if (timeframeMatches) {
    context.timeframes = timeframeMatches;
  }

  return context;
}

/**
 * Generate context-aware response prefix that references specific numbers
 */
export function generateContextAwarePrefix(context: ExtractedContext, userMessage: string): string {
  const parts: string[] = [];

  // Reference debt if mentioned
  if (context.debtAmount && context.debtAmount > 0) {
    parts.push(`With your $${context.debtAmount.toLocaleString()} in debt`);
    
    if (context.debtRate && context.debtRate > 0) {
      const monthlyInterest = (context.debtAmount * (context.debtRate / 100)) / 12;
      parts.push(`(at ${context.debtRate}% interest, that's $${monthlyInterest.toFixed(0)}/month in interest alone)`);
    }
  }

  // Reference savings if mentioned
  if (context.savingsAmount && context.savingsAmount > 0) {
    parts.push(`and $${context.savingsAmount.toLocaleString()} in savings`);
  }

  // Reference income if mentioned
  if (context.monthlyIncome && context.monthlyIncome > 0) {
    parts.push(`on a $${context.monthlyIncome.toLocaleString()}/month income`);
  }

  if (parts.length === 0) return '';

  return parts.join(' ') + ', ';
}

/**
 * Calculate financial metrics based on extracted context
 */
export function calculateContextMetrics(context: ExtractedContext): {
  monthlyInterestCost: number | null;
  debtToIncomeRatio: number | null;
  savingsAsMonthsOfExpenses: number | null;
  monthlyDebtPaymentRecommendation: number | null;
} {
  return {
    monthlyInterestCost:
      context.debtAmount && context.debtRate
        ? (context.debtAmount * (context.debtRate / 100)) / 12
        : null,
    debtToIncomeRatio:
      context.debtAmount && context.monthlyIncome
        ? context.debtAmount / (context.monthlyIncome * 12)
        : null,
    savingsAsMonthsOfExpenses:
      context.savingsAmount && context.monthlyExpenses
        ? context.savingsAmount / context.monthlyExpenses
        : null,
    monthlyDebtPaymentRecommendation:
      context.monthlyIncome && context.monthlyExpenses
        ? (context.monthlyIncome - context.monthlyExpenses) * 0.3
        : null,
  };
}

/**
 * Generate urgency assessment based on financial context
 */
export function assessUrgency(context: ExtractedContext): {
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  recommendation: string;
} {
  // Critical: High debt, low income, no savings
  if (
    context.debtAmount &&
    context.debtAmount > 50000 &&
    context.monthlyIncome &&
    context.monthlyIncome < 5000 &&
    (!context.savingsAmount || context.savingsAmount < 1000)
  ) {
    return {
      urgencyLevel: 'critical',
      reason: `You have $${context.debtAmount.toLocaleString()} in debt with limited income and minimal savings. This needs immediate action.`,
      recommendation: 'Focus on: (1) Stop the bleeding (reduce spending), (2) Debt triage (pay highest interest first), (3) Build small emergency fund ($1k)',
    };
  }

  // High: Significant debt with high interest rate
  if (context.debtAmount && context.debtAmount > 20000 && context.debtRate && context.debtRate > 15) {
    return {
      urgencyLevel: 'high',
      reason: `$${context.debtAmount.toLocaleString()} at ${context.debtRate}% interest is costing you significant money every month.`,
      recommendation: 'Attack this debt aggressively. Every month you wait costs you money.',
    };
  }

  // Medium: Moderate debt or low savings
  if (
    (context.debtAmount && context.debtAmount > 10000) ||
    (!context.savingsAmount || context.savingsAmount < 3000)
  ) {
    return {
      urgencyLevel: 'medium',
      reason: 'You have room to improve your financial foundation.',
      recommendation: 'Build emergency fund while managing debt strategically.',
    };
  }

  // Low: Good financial position
  return {
    urgencyLevel: 'low',
    reason: 'Your financial foundation is solid.',
    recommendation: 'Focus on optimization and wealth building.',
  };
}

/**
 * Generate context-aware action items
 */
export function generateContextAwareActions(
  context: ExtractedContext,
  urgency: ReturnType<typeof assessUrgency>
): string[] {
  const actions: string[] = [];

  if (urgency.urgencyLevel === 'critical') {
    actions.push('1. List all expenses and find $200-500/month to cut');
    actions.push('2. Pay minimums on everything except highest-interest debt');
    actions.push('3. Attack highest-interest debt with extra $200-500/month');
    actions.push('4. Build $1,000 emergency fund (pause debt payoff if emergency happens)');
  } else if (urgency.urgencyLevel === 'high') {
    actions.push(`1. Calculate exact payoff timeline for $${context.debtAmount?.toLocaleString()} at current payment rate`);
    actions.push('2. Increase payment by $100-200/month if possible');
    actions.push('3. Stop accumulating new debt');
    actions.push('4. Build 3-month emergency fund while paying debt');
  } else if (urgency.urgencyLevel === 'medium') {
    if (!context.savingsAmount || context.savingsAmount < 3000) {
      actions.push('1. Build emergency fund to $3,000 (1 month of expenses)');
      actions.push('2. Then build to 3-6 months of expenses');
    }
    if (context.debtAmount && context.debtAmount > 0) {
      actions.push('3. Create debt payoff plan (timeline and payment amount)');
    }
    actions.push('4. Set up automatic transfers to savings');
  } else {
    actions.push('1. Max out retirement contributions (401k, IRA)');
    actions.push('2. Invest extra in diversified index funds');
    actions.push('3. Optimize tax strategy');
    actions.push('4. Review and rebalance quarterly');
  }

  return actions;
}

/**
 * Enhance response with context awareness
 */
export function enhanceWithContextAwareness(
  baseResponse: string,
  context: ExtractedContext,
  userMessage: string
): string {
  // Generate context-aware prefix
  const prefix = generateContextAwarePrefix(context, userMessage);
  if (!prefix) return baseResponse;

  // Calculate metrics
  const metrics = calculateContextMetrics(context);

  // Build enhanced response
  let enhanced = prefix + baseResponse;

  // Add specific calculations if relevant
  if (metrics.monthlyInterestCost && metrics.monthlyInterestCost > 0) {
    enhanced += `\n\n**Your monthly interest cost: $${metrics.monthlyInterestCost.toFixed(0)}**\nThat's money going nowhere. Let's fix this.`;
  }

  if (metrics.debtToIncomeRatio && metrics.debtToIncomeRatio > 0.5) {
    enhanced += `\n\n**Your debt-to-income ratio: ${(metrics.debtToIncomeRatio * 100).toFixed(0)}%**\nThis is high. We need to prioritize debt reduction.`;
  }

  if (metrics.savingsAsMonthsOfExpenses && metrics.savingsAsMonthsOfExpenses < 3) {
    const monthsNeeded = 3 - metrics.savingsAsMonthsOfExpenses;
    enhanced += `\n\n**Emergency fund gap: ${monthsNeeded.toFixed(1)} months of expenses**\nLet's build this first.`;
  }

  return enhanced;
}
