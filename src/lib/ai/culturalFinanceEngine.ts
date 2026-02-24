/**
 * CULTURAL FINANCE ENGINE
 * 
 * Recognizes and incorporates cultural and religious financial obligations.
 * Remittances, tithing, halal finance, non-standard households - all must be respected.
 */

import type { FinancialState } from '@/lib/state/types';

export type FinancialObligation = 'remittance' | 'tithing' | 'charity' | 'family_support' | 'cultural_savings';

export interface CulturalContext {
  obligations: Array<{
    type: FinancialObligation;
    description: string;
    monthlyAmount: number;
    priority: 'first' | 'high' | 'normal';
    isFixed: boolean;
  }>;
  constraints: {
    noInterest: boolean; // Halal/Islamic finance
    noAlcoholRelated: boolean;
    noGambling: boolean;
    other: string[];
  };
  householdStructure: {
    dependents: number;
    supportedAdults: number;
    description: string;
  };
  remittanceDestinations: Array<{
    country: string;
    monthlyAmount: number;
    recipients: string;
  }>;
}

/**
 * Extract cultural context from conversation
 */
export function extractCulturalContext(
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): CulturalContext {
  const allText = conversationHistory.map(m => m.content).join(' ');

  const context: CulturalContext = {
    obligations: [],
    constraints: {
      noInterest: false,
      noAlcoholRelated: false,
      noGambling: false,
      other: [],
    },
    householdStructure: {
      dependents: 0,
      supportedAdults: 0,
      description: 'Standard household',
    },
    remittanceDestinations: [],
  };

  // Detect remittances
  const remittanceMatches = allText.matchAll(
    /(?:send|sending|send.*to|remit|remittance).*?\$?([\d,]+).*?(?:to|for).*?([\w\s]+?)(?:every|each|per|month|week|year|,|\.)/gi
  );
  for (const match of remittanceMatches) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    const destination = match[2].trim();

    if (amount > 0) {
      context.obligations.push({
        type: 'remittance',
        description: `Remittance to ${destination}`,
        monthlyAmount: amount,
        priority: 'first',
        isFixed: true,
      });

      // Extract country if mentioned
      const countryMatch = destination.match(
        /(Guatemala|Mexico|Philippines|India|Nigeria|Pakistan|Bangladesh|El Salvador|Honduras|Dominican Republic|Vietnam|China|Colombia|Peru|Ecuador)/i
      );
      if (countryMatch) {
        context.remittanceDestinations.push({
          country: countryMatch[1],
          monthlyAmount: amount,
          recipients: destination,
        });
      }
    }
  }

  // Detect tithing
  if (/tithe|tithing|10%|ten percent/i.test(allText)) {
    const titheMatch = allText.match(/tithe.*?(\d+)%/i);
    const tithePercent = titheMatch ? parseInt(titheMatch[1]) : 10;

    context.obligations.push({
      type: 'tithing',
      description: `Tithing (${tithePercent}% of income)`,
      monthlyAmount: 0, // Will be calculated as percentage
      priority: 'first',
      isFixed: true,
    });
  }

  // Detect charity/zakat
  if (/charity|zakat|sadaqah|alms|giving/i.test(allText)) {
    context.obligations.push({
      type: 'charity',
      description: 'Charitable giving/Zakat',
      monthlyAmount: 0, // Variable
      priority: 'high',
      isFixed: false,
    });
  }

  // Detect family support (non-remittance)
  if (/support.*parent|support.*mother|support.*father|care for parent|aging parent/i.test(allText)) {
    const parentMatch = allText.match(/support.*?(\d+).*?parent/i);
    const parentCount = parentMatch ? parseInt(parentMatch[1]) : 1;

    context.householdStructure.supportedAdults += parentCount;
    context.obligations.push({
      type: 'family_support',
      description: `Supporting ${parentCount} parent(s)`,
      monthlyAmount: 0, // Variable
      priority: 'first',
      isFixed: true,
    });
  }

  // Detect cultural savings (partner hand, rotating savings)
  if (/partner hand|rotating.*savings|susu|tanda|paluwagan|chit fund/i.test(allText)) {
    const savingsMatch = allText.match(/(?:partner hand|rotating.*savings).*?\$?([\d,]+)/i);
    const savingsAmount = savingsMatch ? parseFloat(savingsMatch[1].replace(/,/g, '')) : 0;

    context.obligations.push({
      type: 'cultural_savings',
      description: 'Cultural savings group (partner hand/rotating savings)',
      monthlyAmount: savingsAmount,
      priority: 'high',
      isFixed: true,
    });
  }

  // Detect halal/Islamic finance constraints
  if (/halal|islamic|riba|interest|sharia/i.test(allText)) {
    context.constraints.noInterest = true;
  }

  // Detect alcohol-related constraints
  if (/alcohol|haram|forbidden|don't drink/i.test(allText)) {
    context.constraints.noAlcoholRelated = true;
  }

  // Detect gambling constraints
  if (/gambling|haram|forbidden|don't gamble/i.test(allText)) {
    context.constraints.noGambling = true;
  }

  // Detect household structure
  const dependentMatch = allText.match(/(\d+)\s*(?:children|kids|dependents)/i);
  if (dependentMatch) {
    context.householdStructure.dependents = parseInt(dependentMatch[1]);
  }

  const supportMatch = allText.match(/support.*?(\d+)\s*(?:people|adults|parents)/i);
  if (supportMatch) {
    context.householdStructure.supportedAdults = parseInt(supportMatch[1]);
  }

  // Build household description
  if (context.householdStructure.dependents > 0 || context.householdStructure.supportedAdults > 0) {
    const parts = [];
    if (context.householdStructure.dependents > 0) {
      parts.push(`${context.householdStructure.dependents} dependent(s)`);
    }
    if (context.householdStructure.supportedAdults > 0) {
      parts.push(`${context.householdStructure.supportedAdults} supported adult(s)`);
    }
    context.householdStructure.description = `Non-standard household: ${parts.join(', ')}`;
  }

  return context;
}

/**
 * Calculate total monthly obligations
 */
export function calculateMonthlyObligations(
  context: CulturalContext,
  monthlyIncome: number
): { total: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const obligation of context.obligations) {
    let amount = obligation.monthlyAmount;

    // Calculate percentage-based obligations
    if (obligation.type === 'tithing' && amount === 0) {
      amount = monthlyIncome * 0.1; // Default 10%
    }

    breakdown[obligation.description] = amount;
    total += amount;
  }

  return { total, breakdown };
}

/**
 * Suggest halal-compliant financial alternatives
 */
export function suggestHalalAlternatives(): string {
  return `
## Halal-Compliant Financial Options

Since you prefer halal-compliant investments (no interest/riba), here are your options:

### Savings Accounts
- **High-yield savings accounts** - While technically earning interest, many Muslims accept this as permissible (murabaha-like structure)
- **Islamic banks** - Offer sharia-compliant savings with profit-sharing instead of interest
- **Money market funds** - Some are structured as profit-sharing rather than interest-bearing

### Investments
- **Sukuk bonds** - Islamic bonds that comply with sharia law
- **Halal-certified mutual funds** - Invest in sharia-compliant companies
- **Islamic ETFs** - Exchange-traded funds screened for halal compliance
- **Dividend-paying stocks** - Companies that pay dividends (profit-sharing) rather than interest

### Banks & Institutions
- **Islamic banks** (if available in your area)
- **Credit unions** - Often more flexible with religious preferences
- **Online banks** - Some offer Islamic banking options

### Key Principles
- Avoid interest (riba) - seek profit-sharing instead
- Avoid haram industries (alcohol, gambling, pork, weapons)
- Avoid excessive uncertainty (gharar)
- Ensure transparency in financial products

Would you like specific recommendations for your situation?
`;
}

/**
 * Adjust budget to respect cultural obligations
 */
export function adjustBudgetForObligations(
  baseBudget: { income: number; expenses: number; surplus: number },
  context: CulturalContext,
  monthlyIncome: number
): { income: number; obligations: number; expenses: number; surplus: number } {
  const { total: obligationTotal } = calculateMonthlyObligations(context, monthlyIncome);

  return {
    income: monthlyIncome,
    obligations: obligationTotal,
    expenses: baseBudget.expenses,
    surplus: monthlyIncome - obligationTotal - baseBudget.expenses,
  };
}

/**
 * Generate cultural context acknowledgment
 */
export function generateCulturalAcknowledgment(context: CulturalContext): string {
  if (context.obligations.length === 0 && !context.constraints.noInterest) {
    return '';
  }

  let message = '\n## Your Cultural & Financial Context\n\n';
  message += 'I understand and respect your financial obligations and constraints:\n\n';

  if (context.obligations.length > 0) {
    message += '**Your Fixed Obligations:**\n';
    for (const obligation of context.obligations.filter(o => o.priority === 'first')) {
      if (obligation.monthlyAmount > 0) {
        message += `- ${obligation.description}: $${obligation.monthlyAmount.toLocaleString()}/month\n`;
      } else {
        message += `- ${obligation.description}\n`;
      }
    }
    message += '\n';
  }

  if (context.constraints.noInterest) {
    message += '**Halal Finance Preference:** You prefer interest-free (halal-compliant) financial products.\n\n';
  }

  if (context.householdStructure.description !== 'Standard household') {
    message += `**Household Structure:** ${context.householdStructure.description}\n\n`;
  }

  message += 'All my recommendations will respect these obligations and constraints.\n';

  return message;
}

/**
 * Validate financial plan against cultural obligations
 */
export function validatePlanAgainstObligations(
  plan: { monthlyIncome: number; monthlyExpenses: number; monthlyInvestment: number },
  context: CulturalContext
): { isValid: boolean; issues: string[] } {
  const { total: obligationTotal } = calculateMonthlyObligations(context, plan.monthlyIncome);
  const issues: string[] = [];

  const availableAfterObligations = plan.monthlyIncome - obligationTotal;

  if (availableAfterObligations < plan.monthlyExpenses) {
    issues.push(
      `Your obligations ($${obligationTotal.toLocaleString()}) plus expenses ($${plan.monthlyExpenses.toLocaleString()}) exceed your income ($${plan.monthlyIncome.toLocaleString()})`
    );
  }

  if (context.obligations.some(o => o.priority === 'first') && plan.monthlyInvestment > 0) {
    const afterObligationsAndExpenses = availableAfterObligations - plan.monthlyExpenses;
    if (afterObligationsAndExpenses < plan.monthlyInvestment) {
      issues.push(
        `After obligations and expenses, you don't have enough for your investment goal. Adjust either expenses or investment amount.`
      );
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
