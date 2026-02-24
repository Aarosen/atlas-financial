/**
 * DIRECT ANSWER ENGINE
 * 
 * Critical fix: When user asks a specific follow-up question,
 * answer it DIRECTLY instead of giving generic education.
 * 
 * This is the missing piece that makes Atlas actually responsive.
 */

import type { FinancialState } from '@/lib/state/types';

export interface DirectAnswerContext {
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  financialState: FinancialState;
  previousResponse: string;
}

/**
 * Detect if this is a direct follow-up question that needs a specific answer
 */
export function isDirectFollowUpQuestion(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  // If conversation has prior context, this is likely a follow-up
  if (conversationHistory.length < 2) return false;

  const msg = userMessage.toLowerCase();
  
  // Direct question patterns
  const directQuestionPatterns = [
    /^(where|how|what|when|why|which)\b/i,
    /\?$/,
    /^(should|can|do|is|are|will|would|could)\b/i,
  ];

  return directQuestionPatterns.some(pattern => pattern.test(msg));
}

/**
 * Extract the specific question being asked
 */
export function extractSpecificQuestion(userMessage: string): string {
  // Remove filler words and get to the core question
  return userMessage
    .replace(/^(so|well|um|uh|like|you know|i mean)\s+/i, '')
    .trim();
}

/**
 * Generate DIRECT answer to specific question
 */
export function generateDirectAnswer(context: DirectAnswerContext): string | null {
  const msg = context.userMessage.toLowerCase();
  const { financialState } = context;

  // EMERGENCY FUND QUESTIONS
  if (msg.includes('emergency fund') && (msg.includes('where') || msg.includes('put'))) {
    return generateEmergencyFundAnswer(financialState);
  }

  if (msg.includes('emergency fund') && msg.includes('how much')) {
    return generateEmergencyFundAmountAnswer(financialState);
  }

  if (msg.includes('emergency fund') && msg.includes('account')) {
    return `High-yield savings account (HYSA). You want:
- Easy access (can withdraw in 1-2 days)
- No risk to principal
- Best rates: Marcus, Ally, or Capital One 360 (currently 4-5% APY)
- NOT: money market, CDs, or stocks (too slow to access)

Set it up today. Takes 5 minutes.`;
  }

  // DEBT QUESTIONS
  if (msg.includes('debt') && msg.includes('pay')) {
    return generateDebtPaymentAnswer(financialState);
  }

  if (msg.includes('high interest') && msg.includes('rate')) {
    const rate = extractNumberFromHistory(context.conversationHistory, 'interest|rate|%');
    if (rate) {
      return `At ${rate}% interest, every month you wait costs you money. Here's the math:
- $1,000 at ${rate}% = $${(1000 * (rate / 100) / 12).toFixed(2)}/month in interest alone
- That's ${(rate / 12).toFixed(1)}% of your balance EVERY MONTH

Action: Attack this first. Even $50/month extra saves you hundreds.`;
    }
  }

  // SAVINGS QUESTIONS
  if (msg.includes('save') && msg.includes('where')) {
    return generateSavingsPlacementAnswer(financialState);
  }

  if (msg.includes('savings') && msg.includes('how much')) {
    return generateSavingsTargetAnswer(financialState);
  }

  // INVESTMENT QUESTIONS
  if (msg.includes('invest') && msg.includes('where')) {
    return generateInvestmentPlacementAnswer(financialState);
  }

  if (msg.includes('401k') || msg.includes('ira')) {
    return generateRetirementAccountAnswer(context);
  }

  // BUDGET QUESTIONS
  if (msg.includes('budget') && msg.includes('how')) {
    return `50/30/20 rule:
- 50% = essentials (rent, food, utilities, insurance)
- 30% = wants (entertainment, dining out, hobbies)
- 20% = savings + debt payoff

Your situation: ${financialState.monthlyIncome ? `$${financialState.monthlyIncome}/month` : 'unknown income'}
- Essentials: ${financialState.essentialExpenses ? `$${financialState.essentialExpenses}` : 'unknown'}
- Available for wants + savings: $${financialState.monthlyIncome && financialState.essentialExpenses ? financialState.monthlyIncome - financialState.essentialExpenses : '?'}

Start tracking today. Use YNAB, Mint, or a spreadsheet.`;
  }

  // CREDIT SCORE QUESTIONS
  if (msg.includes('credit') && (msg.includes('improve') || msg.includes('score'))) {
    return `Credit score breakdown (FICO):
- 35% = Payment history (pay on time, always)
- 30% = Credit utilization (keep below 30% of limit)
- 15% = Length of credit history (keep old accounts open)
- 10% = Credit mix (credit card + installment loan is good)
- 10% = New credit (don't open many accounts at once)

Fastest wins:
1. Pay all bills on time (even $1 late = -100 points)
2. Pay down credit card balances (get below 30% utilization)
3. Don't close old accounts

Timeline: 3-6 months to see improvement.`;
  }

  return null;
}

/**
 * Generate specific answer about where to put emergency fund
 */
function generateEmergencyFundAnswer(financialState: FinancialState): string {
  return `**Where to put your emergency fund: High-Yield Savings Account (HYSA)**

Why HYSA:
- Money is accessible in 1-2 business days (true emergency access)
- Currently earning 4-5% APY (way better than regular savings)
- FDIC insured up to $250k (zero risk)
- No fees, no minimums

Best options right now:
1. **Marcus by Goldman Sachs** - 4.85% APY, no fees
2. **Ally Bank** - 4.85% APY, no fees
3. **Capital One 360** - 4.85% APY, no fees
4. **Wealthfront Cash Account** - 5.00% APY, no fees

Setup takes 5 minutes. You'll have money in 1-2 days.

NOT recommended:
- Regular savings account (0.01% interest = you're losing money to inflation)
- Money market account (slower access)
- CDs (locked up for months)
- Stocks/index funds (too volatile for emergency money)

Action: Open a HYSA today. Set up automatic transfers of $${Math.max(50, Math.floor((financialState.monthlyIncome || 0) * 0.1))} weekly.`;
}

/**
 * Generate specific answer about emergency fund amount
 */
function generateEmergencyFundAmountAnswer(financialState: FinancialState): string {
  const essentials = financialState.essentialExpenses || 3000;
  const oneMonth = essentials;
  const threeMonths = essentials * 3;
  const sixMonths = essentials * 6;

  return `**Emergency fund target: 3-6 months of expenses**

Your situation:
- Monthly expenses: $${essentials}
- 1 month emergency fund: $${oneMonth}
- 3 months (stable): $${threeMonths}
- 6 months (strong): $${sixMonths}

**Start here: $${oneMonth}** (1 month)
- Gives you breathing room for job loss or unexpected bill
- Takes 1-3 months to build
- Reduces financial panic significantly

**Build to: $${threeMonths}** (3 months)
- Covers most emergencies
- Protects against job loss
- Recommended minimum

**Aim for: $${sixMonths}** (6 months)
- Maximum financial security
- Covers extended unemployment
- Peace of mind

Timeline:
- Month 1: Save $${oneMonth} (1 month fund)
- Month 3: Save $${threeMonths} (3 month fund)
- Month 6: Save $${sixMonths} (6 month fund)

Don't wait for perfection. Start with $${Math.min(1000, oneMonth)} this week.`;
}

/**
 * Generate specific answer about debt payment
 */
function generateDebtPaymentAnswer(financialState: FinancialState): string {
  const hasHighInterestDebt = (financialState.highInterestDebt || 0) > 0;
  const hasLowInterestDebt = (financialState.lowInterestDebt || 0) > 0;

  if (!hasHighInterestDebt && !hasLowInterestDebt) {
    return `No debt detected. Focus on building emergency fund instead.`;
  }

  let answer = `**Debt payoff strategy:**\n\n`;

  if (hasHighInterestDebt) {
    answer += `**Step 1: Attack high-interest debt FIRST**
- High-interest debt: $${financialState.highInterestDebt}
- This is costing you money every single day
- Pay minimums on everything else
- Throw extra money at this

**Step 2: Then low-interest debt**
- Low-interest debt: $${financialState.lowInterestDebt || 0}
- This can wait (interest is lower)
- Pay after high-interest is gone`;
  } else {
    answer += `**Pay off low-interest debt strategically**
- Low-interest debt: $${financialState.lowInterestDebt}
- You could invest instead (market returns > interest rate)
- But psychological win of being debt-free is valuable
- Your choice: speed up payoff OR invest the difference`;
  }

  const surplus = (financialState.monthlyIncome || 0) - (financialState.essentialExpenses || 0);
  if (surplus > 0) {
    answer += `\n\n**Your monthly surplus: $${surplus}**
- Minimum payment: $${Math.ceil(surplus * 0.2)}
- Recommended extra: $${Math.ceil(surplus * 0.3)}
- Aggressive payoff: $${Math.ceil(surplus * 0.5)}`;
  }

  return answer;
}

/**
 * Generate specific answer about where to put savings
 */
function generateSavingsPlacementAnswer(financialState: FinancialState): string {
  return `**Where to put your savings (in order of priority):**

**1. Emergency fund first** (3-6 months expenses)
- Account: High-yield savings account (HYSA)
- Rate: 4-5% APY
- Access: 1-2 days
- Why: You need this before anything else

**2. Then retirement accounts** (if employer match available)
- Account: 401(k) or IRA
- Rate: Depends on investments (historically 7-10%)
- Access: Locked until 59.5 (with exceptions)
- Why: Tax-advantaged growth, employer match is free money

**3. Then taxable investments** (for long-term wealth)
- Account: Brokerage account (Vanguard, Fidelity, etc.)
- Rate: Depends on investments (historically 7-10%)
- Access: Anytime
- Why: No contribution limits, flexibility

**4. Then pay down low-interest debt** (optional)
- Why: Psychological win, reduces monthly obligations

Your priority right now:
${!financialState.totalSavings || financialState.totalSavings < (financialState.essentialExpenses || 0) * 3 ? '→ Build emergency fund to 3-6 months' : '→ Max out retirement accounts'}`;
}

/**
 * Generate specific answer about savings target
 */
function generateSavingsTargetAnswer(financialState: FinancialState): string {
  const essentials = financialState.essentialExpenses || 3000;
  const target = essentials * 3;
  const current = financialState.totalSavings || 0;
  const remaining = Math.max(0, target - current);
  const surplus = (financialState.monthlyIncome || 0) - essentials;
  const monthsToTarget = surplus > 0 ? Math.ceil(remaining / surplus) : 999;

  return `**Your savings target: $${target}** (3 months of expenses)

Current savings: $${current}
Target: $${target}
Remaining: $${remaining}

Monthly surplus: $${surplus}
Months to reach target: ${monthsToTarget} months

Timeline:
- Month 1: $${Math.min(surplus, remaining)}
- Month 2: $${Math.min(surplus * 2, remaining)}
- Month ${monthsToTarget}: $${target} ✓

Action: Set up automatic transfer of $${Math.ceil(surplus * 0.3)}/month starting today.`;
}

/**
 * Generate specific answer about where to invest
 */
function generateInvestmentPlacementAnswer(financialState: FinancialState): string {
  return `**Where to invest (in order of priority):**

**1. Employer 401(k)** (if available)
- Contribution: Up to $23,500/year
- Match: Free money (usually 3-6%)
- Tax: Pre-tax (reduces taxable income)
- Access: Age 59.5+
- Action: Contribute enough to get full match

**2. Roth IRA** (if eligible)
- Contribution: $7,000/year
- Tax: Tax-free growth + withdrawals
- Access: Age 59.5+, or $10k for first home
- Best for: Long-term wealth building
- Action: Max this out ($583/month)

**3. Taxable brokerage account**
- Contribution: Unlimited
- Tax: Pay taxes on gains/dividends
- Access: Anytime
- Best for: Flexibility + long-term wealth
- Action: Invest extra after retirement accounts

**What to invest in:**
- Index funds (S&P 500, total market)
- Target-date funds (auto-adjusts as you age)
- Diversified portfolio (80% stocks, 20% bonds)

**NOT recommended:**
- Individual stocks (too risky)
- Crypto (too volatile)
- Bonds alone (too low return)
- Savings account (inflation eats returns)`;
}

/**
 * Generate specific answer about retirement accounts
 */
function generateRetirementAccountAnswer(context: DirectAnswerContext): string {
  const msg = context.userMessage.toLowerCase();

  if (msg.includes('401k')) {
    return `**401(k) - Employer retirement plan**

Contribution limit: $23,500/year ($1,958/month)
Tax: Pre-tax (reduces your taxable income)
Match: Usually 3-6% (FREE MONEY)
Access: Age 59.5+

Action:
1. Check if your employer offers 401(k)
2. Contribute enough to get full match (usually 3-6%)
3. Increase contribution by 1% each year

Example: $50,000 salary
- 6% contribution = $3,000/year
- Employer match = $3,000/year
- Total = $6,000/year in retirement savings`;
  }

  if (msg.includes('ira')) {
    return `**IRA - Individual Retirement Account**

Two types:

**Roth IRA** (recommended for most people)
- Contribution limit: $7,000/year
- Tax: After-tax (but growth is tax-free)
- Withdrawals: Tax-free in retirement
- Access: Age 59.5+, or $10k for first home
- Best for: Long-term wealth building

**Traditional IRA**
- Contribution limit: $7,000/year
- Tax: Pre-tax (reduces taxable income)
- Withdrawals: Taxed as income
- Access: Age 59.5+
- Best for: High earners wanting tax deduction

Action:
1. Open Roth IRA at Vanguard, Fidelity, or Schwab
2. Contribute $583/month ($7,000/year)
3. Invest in index funds (S&P 500 or total market)`;
  }

  return '';
}

/**
 * Extract a number from conversation history
 */
function extractNumberFromHistory(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  pattern: string
): number | null {
  const regex = new RegExp(`${pattern}[^\\d]*(\\d+(?:\\.\\d{1,2})?)`);
  
  for (const msg of history) {
    const match = msg.content.match(regex);
    if (match) {
      return parseFloat(match[1]);
    }
  }
  
  return null;
}

/**
 * Check if response is generic and should be replaced with direct answer
 */
export function shouldReplaceWithDirectAnswer(
  userMessage: string,
  previousResponse: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): boolean {
  // If previous response is generic education, replace it
  const genericPatterns = [
    /^what is:/i,
    /^here's how/i,
    /^let me explain/i,
    /^the key is/i,
  ];

  const isGeneric = genericPatterns.some(p => p.test(previousResponse));
  const isFollowUp = isDirectFollowUpQuestion(userMessage, conversationHistory);

  return isGeneric && isFollowUp;
}
