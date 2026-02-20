/**
 * Assumption Confirmation Engine
 * Requirement 10: Assumption Confirmation (Ask Before Assuming)
 * 
 * Detects assumptions about customer's priorities and asks for confirmation
 * before making recommendations, showing respect for customer's actual goals.
 */

export interface CustomerAssumption {
  id: string;
  assumption: string;
  confidence: number;
  basedOn: string[];
  confirmationQuestion: string;
}

export interface AssumptionAnalysis {
  assumptions: CustomerAssumption[];
  primaryAssumption: CustomerAssumption | null;
  shouldConfirm: boolean;
  reasoning: string;
}

export function detectAssumptions(
  concern: string,
  financialData: Record<string, any>,
  conversationHistory: string[]
): AssumptionAnalysis {
  const assumptions: CustomerAssumption[] = [];

  // Assumption: Customer wants to pay off debt
  if (financialData.totalDebt && financialData.totalDebt > 0) {
    assumptions.push({
      id: 'debt_priority',
      assumption: 'Your main priority is paying off debt',
      confidence: 0.8,
      basedOn: ['You mentioned debt', 'You have outstanding debt'],
      confirmationQuestion: 'Is paying off debt your main priority right now, or is there something else you\'d rather focus on?',
    });
  }

  // Assumption: Customer wants to build savings
  if (financialData.currentSavings !== undefined && financialData.savingsGoal !== undefined) {
    if (financialData.currentSavings < financialData.savingsGoal) {
      assumptions.push({
        id: 'savings_priority',
        assumption: 'You want to reach your savings goal',
        confidence: 0.75,
        basedOn: ['You have a savings goal', 'You haven\'t reached it yet'],
        confirmationQuestion: 'Is building savings your main focus, or would you prefer to address something else first?',
      });
    }
  }

  // Assumption: Customer is concerned about expenses
  if (concern === 'budgeting_help' || concern === 'expense_reduction') {
    assumptions.push({
      id: 'expense_concern',
      assumption: 'You\'re concerned about your spending',
      confidence: 0.85,
      basedOn: ['You mentioned budgeting', 'You mentioned expenses'],
      confirmationQuestion: 'Are you mainly looking to reduce expenses, or is there another financial goal you\'d like to focus on?',
    });
  }

  // Assumption: Customer wants to invest
  if (concern === 'investing_interest') {
    assumptions.push({
      id: 'investing_priority',
      assumption: 'You\'re interested in investing',
      confidence: 0.9,
      basedOn: ['You mentioned investing'],
      confirmationQuestion: 'Is investing your main goal right now, or are there other financial priorities we should address first?',
    });
  }

  // Assumption: Customer wants to increase income
  if (concern === 'income_growth') {
    assumptions.push({
      id: 'income_priority',
      assumption: 'You want to increase your income',
      confidence: 0.9,
      basedOn: ['You mentioned income growth'],
      confirmationQuestion: 'Is increasing your income your main focus, or would you like to work on something else?',
    });
  }

  // Assumption: Customer wants emergency fund
  if (concern === 'emergency_fund') {
    assumptions.push({
      id: 'emergency_fund_priority',
      assumption: 'You want to build an emergency fund',
      confidence: 0.9,
      basedOn: ['You mentioned emergency fund'],
      confirmationQuestion: 'Is building an emergency fund your priority, or is there something else you\'d like to focus on?',
    });
  }

  // Sort by confidence and get primary assumption
  assumptions.sort((a, b) => b.confidence - a.confidence);
  const primaryAssumption = assumptions.length > 0 ? assumptions[0] : null;

  return {
    assumptions,
    primaryAssumption,
    shouldConfirm: primaryAssumption ? primaryAssumption.confidence >= 0.7 : false,
    reasoning: primaryAssumption
      ? `Based on what you've shared, we're assuming ${primaryAssumption.assumption.toLowerCase()}`
      : 'We need more information to understand your priorities',
  };
}

export function generateConfirmationPrompt(assumption: CustomerAssumption): string {
  return `It sounds like ${assumption.assumption.toLowerCase()}. ${assumption.confirmationQuestion}`;
}

export function processAssumptionResponse(
  assumption: CustomerAssumption,
  response: string
): { confirmed: boolean; newPriority?: string; reasoning: string } {
  const lowerResponse = response.toLowerCase();

  // Check for confirmation
  const confirmationKeywords = ['yes', 'right', 'correct', 'true', 'that\'s right', 'exactly', 'definitely', 'absolutely'];
  const negationKeywords = ['no', 'not', 'wrong', 'incorrect', 'false', 'actually', 'not really', 'not exactly'];

  const isConfirmed = confirmationKeywords.some(kw => lowerResponse.includes(kw));
  const isNegated = negationKeywords.some(kw => lowerResponse.includes(kw));

  if (isNegated) {
    // Extract new priority if mentioned
    const newPriority = extractNewPriority(response);
    return {
      confirmed: false,
      newPriority,
      reasoning: `Customer clarified that ${assumption.assumption.toLowerCase()} is not their priority.${newPriority ? ` They want to focus on ${newPriority}.` : ''}`,
    };
  }

  if (isConfirmed) {
    return {
      confirmed: true,
      reasoning: `Customer confirmed that ${assumption.assumption.toLowerCase()}.`,
    };
  }

  return {
    confirmed: false,
    reasoning: 'Customer response was unclear. We should ask for clarification.',
  };
}

function extractNewPriority(response: string): string | undefined {
  const lowerResponse = response.toLowerCase();

  // Look for priority keywords
  if (lowerResponse.includes('debt')) return 'debt payoff';
  if (lowerResponse.includes('sav')) return 'savings';
  if (lowerResponse.includes('invest')) return 'investing';
  if (lowerResponse.includes('income')) return 'income growth';
  if (lowerResponse.includes('expense') || lowerResponse.includes('spend')) return 'expense reduction';
  if (lowerResponse.includes('emergency')) return 'emergency fund';
  if (lowerResponse.includes('budget')) return 'budgeting';

  return undefined;
}

export function updateAssumptionsBasedOnResponse(
  assumptions: CustomerAssumption[],
  response: string
): CustomerAssumption[] {
  // Reduce confidence of assumptions that were contradicted
  return assumptions.map(assumption => {
    const result = processAssumptionResponse(assumption, response);
    if (!result.confirmed) {
      return { ...assumption, confidence: assumption.confidence * 0.5 };
    }
    return assumption;
  });
}

export function shouldApologizeForMisunderstanding(assumption: CustomerAssumption, confirmed: boolean): boolean {
  return !confirmed && assumption.confidence >= 0.8;
}

export function generateApology(assumption: CustomerAssumption): string {
  return `I apologize for the misunderstanding. I shouldn't have assumed that ${assumption.assumption.toLowerCase()}. Let me help you with what actually matters to you.`;
}
