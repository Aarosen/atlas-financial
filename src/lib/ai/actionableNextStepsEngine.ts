/**
 * ACTIONABLE NEXT STEPS ENGINE
 * 
 * Ensures every response ends with a clear, specific next step.
 * This is what separates Atlas from competitors - actual guidance, not just advice.
 */

import type { FinancialState } from '@/lib/state/types';

export interface NextStepsContext {
  userMessage: string;
  financialState: FinancialState;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
  primaryConcern: string;
  conversationTurn: number;
}

/**
 * Generate specific, actionable next steps based on context
 */
export function generateNextSteps(context: NextStepsContext): string {
  const { urgencyLevel, primaryConcern, financialState, conversationTurn } = context;

  // CRITICAL URGENCY - Immediate action required
  if (urgencyLevel === 'critical') {
    return generateCriticalNextSteps(primaryConcern, financialState);
  }

  // HIGH URGENCY - This week
  if (urgencyLevel === 'high') {
    return generateHighUrgencyNextSteps(primaryConcern, financialState);
  }

  // MEDIUM URGENCY - This month
  if (urgencyLevel === 'medium') {
    return generateMediumUrgencyNextSteps(primaryConcern, financialState);
  }

  // LOW URGENCY - This quarter
  return generateLowUrgencyNextSteps(primaryConcern, financialState);
}

/**
 * Critical urgency next steps (do TODAY)
 */
function generateCriticalNextSteps(concern: string, financialState: FinancialState): string {
  if (concern === 'debt') {
    return `**Next step (TODAY):**
1. List all debts with balances and interest rates
2. Identify the highest-interest debt
3. Set up automatic payment of at least minimums
4. Find $50-100/month extra to attack highest-interest debt

Do this today. Every day you wait costs you money.`;
  }

  if (concern === 'emergency_fund') {
    return `**Next step (TODAY):**
1. Open a high-yield savings account (Marcus, Ally, or Capital One 360)
2. Transfer your first $100-500 today
3. Set up automatic weekly transfers of $50-100
4. Target: $1,000 by end of month

Takes 5 minutes. Do it now.`;
  }

  if (concern === 'cash_flow') {
    return `**Next step (TODAY):**
1. Track every expense for the next 7 days
2. Identify your top 3 spending categories
3. Find one category to cut by 20%
4. Calculate your new monthly surplus

You can't fix what you don't measure.`;
  }

  return `**Next step (TODAY):**
1. Write down your top 3 financial concerns
2. Rank them by urgency (what costs you money fastest?)
3. Focus on #1 only
4. Come back and we'll build a plan

Don't try to fix everything at once.`;
}

/**
 * High urgency next steps (this week)
 */
function generateHighUrgencyNextSteps(concern: string, financialState: FinancialState): string {
  if (concern === 'debt') {
    const debtAmount = financialState.highInterestDebt || 0;
    const monthlyIncome = financialState.monthlyIncome || 0;
    const monthlyExpenses = financialState.essentialExpenses || 0;
    const surplus = monthlyIncome - monthlyExpenses;

    return `**Next step (THIS WEEK):**
1. Calculate exact payoff timeline: $${debtAmount} ÷ $${Math.max(100, surplus * 0.3)}/month = ${Math.ceil(debtAmount / Math.max(100, surplus * 0.3))} months
2. Set up automatic payment of $${Math.ceil(surplus * 0.3)}/month
3. Stop using credit cards (freeze them if needed)
4. Schedule weekly check-in to track progress

Timeline: ${Math.ceil(debtAmount / Math.max(100, surplus * 0.3))} months to debt-free.`;
  }

  if (concern === 'investing') {
    return `**Next step (THIS WEEK):**
1. Check if your employer offers 401(k) match
2. If yes, contribute enough to get full match (usually 3-6%)
3. Open a Roth IRA at Vanguard, Fidelity, or Schwab
4. Invest in a target-date fund or S&P 500 index fund

Contribution limit: $7,000/year ($583/month).`;
  }

  return `**Next step (THIS WEEK):**
1. Schedule 30 minutes to review your financial situation
2. List income, expenses, debt, and savings
3. Identify your #1 priority
4. Create a simple action plan (3-5 steps)

Let's turn this into a concrete plan.`;
}

/**
 * Medium urgency next steps (this month)
 */
function generateMediumUrgencyNextSteps(concern: string, financialState: FinancialState): string {
  if (concern === 'emergency_fund') {
    const essentials = financialState.essentialExpenses || 3000;
    const target = essentials * 3;

    return `**Next step (THIS MONTH):**
1. Open high-yield savings account (4-5% APY)
2. Transfer $${Math.min(1000, essentials)} this week
3. Set up automatic transfers of $${Math.ceil(essentials / 10)}/week
4. Target: $${target} by month 6

Timeline: 6 months to 3-month emergency fund.`;
  }

  if (concern === 'budgeting') {
    return `**Next step (THIS MONTH):**
1. Track expenses for 1 week (use YNAB, Mint, or spreadsheet)
2. Categorize into: essentials, wants, savings
3. Calculate your 50/30/20 breakdown
4. Identify 1-2 categories to optimize

Once you see the numbers, the path becomes clear.`;
  }

  return `**Next step (THIS MONTH):**
1. Review your financial goals (1-year, 5-year, 10-year)
2. Prioritize: What matters most?
3. Create a simple plan (3-5 steps)
4. Schedule monthly check-ins

Progress over perfection.`;
}

/**
 * Low urgency next steps (this quarter)
 */
function generateLowUrgencyNextSteps(concern: string, financialState: FinancialState): string {
  if (concern === 'investing') {
    return `**Next step (THIS QUARTER):**
1. Max out 401(k) contributions ($23,500/year)
2. Max out Roth IRA ($7,000/year)
3. Invest extra in taxable brokerage account
4. Rebalance quarterly (80% stocks, 20% bonds)

You're in a good position. Focus on wealth building.`;
  }

  if (concern === 'tax') {
    return `**Next step (THIS QUARTER):**
1. Review tax deductions you might be missing
2. Consider tax-loss harvesting if you have investments
3. Maximize retirement contributions
4. Schedule tax planning session with CPA

Small optimizations add up to big savings.`;
  }

  return `**Next step (THIS QUARTER):**
1. Review your progress on financial goals
2. Celebrate wins (you've made progress!)
3. Adjust plan based on what you've learned
4. Set new goals for next quarter

You're on the right track.`;
}

/**
 * Generate multi-step action plan
 */
export function generateMultiStepPlan(
  concern: string,
  financialState: FinancialState,
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
): string {
  const steps: string[] = [];

  if (concern === 'debt') {
    steps.push('**Step 1: Stop the bleeding**');
    steps.push('- Cut unnecessary spending');
    steps.push('- Set up automatic minimum payments');
    steps.push('- Freeze credit cards if needed');
    steps.push('');
    steps.push('**Step 2: Attack the debt**');
    steps.push('- Pay minimums on everything');
    steps.push('- Throw extra money at highest-interest debt');
    steps.push(`- Target payment: $${Math.max(100, (financialState.monthlyIncome || 0) * 0.3)}/month`);
    steps.push('');
    steps.push('**Step 3: Build emergency fund**');
    steps.push('- Once debt is manageable, build 3-6 month fund');
    steps.push('- Keep in high-yield savings account');
    steps.push('');
    steps.push('**Step 4: Invest**');
    steps.push('- Max out 401(k) and IRA');
    steps.push('- Invest extra in index funds');
  } else if (concern === 'emergency_fund') {
    const essentials = financialState.essentialExpenses || 3000;
    steps.push('**Step 1: Build $1,000 (1 month)**');
    steps.push('- Open HYSA (Marcus, Ally, Capital One 360)');
    steps.push('- Transfer $1,000 this week');
    steps.push('');
    steps.push('**Step 2: Build $3,000 (1 month)**');
    steps.push(`- Add $${essentials - 1000} over next month`);
    steps.push('- Set up automatic transfers');
    steps.push('');
    steps.push('**Step 3: Build $9,000 (3 months)**');
    steps.push(`- Add $${essentials * 2} over next 3 months`);
    steps.push('- This is your safety net');
    steps.push('');
    steps.push('**Step 4: Build $18,000 (6 months)**');
    steps.push(`- Add another $${essentials * 3}`);
    steps.push('- Maximum financial security');
  } else if (concern === 'investing') {
    steps.push('**Step 1: Employer 401(k)**');
    steps.push('- Contribute enough to get full match');
    steps.push('- Usually 3-6% of salary');
    steps.push('');
    steps.push('**Step 2: Roth IRA**');
    steps.push('- Max out: $7,000/year');
    steps.push('- Invest in index funds');
    steps.push('');
    steps.push('**Step 3: Taxable brokerage**');
    steps.push('- Invest extra money');
    steps.push('- Same index funds');
    steps.push('');
    steps.push('**Step 4: Rebalance**');
    steps.push('- Quarterly: 80% stocks, 20% bonds');
    steps.push('- Adjust as you age');
  }

  return steps.join('\n');
}

/**
 * Append next steps to response
 */
export function appendNextSteps(baseResponse: string, context: NextStepsContext): string {
  const nextSteps = generateNextSteps(context);
  return `${baseResponse}\n\n${nextSteps}`;
}

/**
 * Determine if response should include multi-step plan
 */
export function shouldIncludeMultiStepPlan(
  userMessage: string,
  conversationTurn: number
): boolean {
  const asksForPlan = /plan|strategy|roadmap|steps|how do i|what should i|next steps/i.test(userMessage);
  const isEarlyConversation = conversationTurn < 3;

  return asksForPlan || isEarlyConversation;
}
