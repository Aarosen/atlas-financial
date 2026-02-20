/**
 * Adaptive Question Engine
 * Requirement 2: Adaptive Question Generation
 * 
 * Generates contextual, conversational questions based on customer's concern.
 * Questions are natural language, not form-like.
 */

import type { FinancialConcern } from './needsDetectionEngine';

export interface Question {
  id: string;
  text: string;
  category: string;
  priority: number; // 1-10, higher = more important
  followUp?: string; // Optional follow-up question if answer is unclear
  expectedFormat?: 'number' | 'text' | 'choice' | 'range';
}

/**
 * Generate questions for a specific concern
 * Returns questions in order of priority/relevance
 */
export function generateQuestionsForConcern(concern: FinancialConcern): Question[] {
  const questionMap: Record<FinancialConcern, Question[]> = {
    debt_stress: [
      {
        id: 'debt_type',
        text: "What kind of debt are we talking about? Credit cards, student loans, car loan, or something else?",
        category: 'debt_composition',
        priority: 10,
        expectedFormat: 'text',
      },
      {
        id: 'debt_total',
        text: "Roughly how much total debt do you have across all accounts?",
        category: 'debt_amount',
        priority: 9,
        expectedFormat: 'number',
        followUp: "Is that across credit cards, loans, or both?",
      },
      {
        id: 'highest_interest',
        text: "What's the interest rate on your highest-interest debt? Even a rough estimate helps.",
        category: 'debt_interest',
        priority: 9,
        expectedFormat: 'number',
        followUp: "That's helpful. Do you know the rates on your other debts?",
      },
      {
        id: 'monthly_income',
        text: "What's your monthly take-home income after taxes?",
        category: 'income',
        priority: 8,
        expectedFormat: 'number',
        followUp: "Is that before or after taxes?",
      },
      {
        id: 'essential_expenses',
        text: "What are your essential monthly expenses? Think: rent/mortgage, food, utilities, insurance, minimum debt payments.",
        category: 'expenses',
        priority: 8,
        expectedFormat: 'number',
        followUp: "Does that include your minimum debt payments?",
      },
      {
        id: 'current_savings',
        text: "How much do you currently have in savings?",
        category: 'savings',
        priority: 7,
        expectedFormat: 'number',
        followUp: "Is that in a dedicated emergency fund or mixed with other money?",
      },
    ],
    savings_gap: [
      {
        id: 'monthly_income',
        text: "What's your monthly take-home income after taxes?",
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'current_savings',
        text: "How much do you currently have saved?",
        category: 'savings',
        priority: 10,
        expectedFormat: 'number',
        followUp: "Is that in one account or spread across multiple places?",
      },
      {
        id: 'essential_expenses',
        text: "What are your essential monthly expenses?",
        category: 'expenses',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'savings_goal',
        text: "What's your goal for emergency savings? How many months of expenses would feel safe?",
        category: 'goals',
        priority: 8,
        expectedFormat: 'text',
        followUp: "Most people aim for 3-6 months. What feels right for you?",
      },
      {
        id: 'monthly_surplus',
        text: "After essentials, how much could you realistically save each month?",
        category: 'savings_capacity',
        priority: 8,
        expectedFormat: 'number',
      },
    ],
    budgeting_help: [
      {
        id: 'monthly_income',
        text: "What's your monthly take-home income after taxes?",
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'essential_expenses',
        text: "What are your essential monthly expenses? Rent, food, utilities, insurance—the must-haves.",
        category: 'expenses',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'discretionary_spending',
        text: "Where do you think you're spending the most on non-essentials? Dining out, subscriptions, shopping?",
        category: 'spending_patterns',
        priority: 9,
        expectedFormat: 'text',
        followUp: "Roughly how much per month on that category?",
      },
      {
        id: 'hardest_category',
        text: "Which spending category is hardest for you to control?",
        category: 'spending_patterns',
        priority: 8,
        expectedFormat: 'text',
      },
      {
        id: 'debt_payments',
        text: "Do you have any debt payments? If so, how much per month?",
        category: 'debt',
        priority: 7,
        expectedFormat: 'number',
      },
    ],
    investing_interest: [
      {
        id: 'available_to_invest',
        text: "How much do you have available to invest right now?",
        category: 'investment_amount',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'investment_timeline',
        text: "What's your timeline for this money? Are you investing for the short-term, medium-term, or long-term?",
        category: 'timeline',
        priority: 10,
        expectedFormat: 'text',
      },
      {
        id: 'risk_tolerance',
        text: "How comfortable are you with risk? Would you rather play it safe, or are you okay with ups and downs for potential growth?",
        category: 'risk',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'emergency_fund',
        text: "Do you have an emergency fund in place? (3-6 months of expenses is ideal before investing.)",
        category: 'prerequisites',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'employer_benefits',
        text: "Does your employer offer a 401(k) match or any retirement benefits?",
        category: 'retirement_benefits',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    income_growth: [
      {
        id: 'current_income',
        text: "What's your current income?",
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'income_goal',
        text: "What's your income goal? What would feel like a win?",
        category: 'goals',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'income_source',
        text: "Are you W2 employed, self-employed, or a mix?",
        category: 'employment',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'growth_interest',
        text: "What would help you earn more? Promotion, side income, new skills, or something else?",
        category: 'growth_strategy',
        priority: 9,
        expectedFormat: 'text',
      },
    ],
    emergency_fund: [
      {
        id: 'current_savings',
        text: "How much do you currently have saved?",
        category: 'savings',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'essential_expenses',
        text: "What are your essential monthly expenses?",
        category: 'expenses',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'emergency_target',
        text: "How many months of expenses would feel safe as an emergency fund? (3-6 months is typical.)",
        category: 'goals',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'monthly_income',
        text: "What's your monthly take-home income?",
        category: 'income',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'monthly_savings_capacity',
        text: "How much could you realistically save toward this each month?",
        category: 'savings_capacity',
        priority: 8,
        expectedFormat: 'number',
      },
    ],
    retirement: [
      {
        id: 'retirement_age',
        text: "When are you hoping to retire?",
        category: 'timeline',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'current_age',
        text: "What's your current age?",
        category: 'demographics',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'current_savings',
        text: "Do you have any retirement savings right now?",
        category: 'savings',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'monthly_income',
        text: "What's your monthly income?",
        category: 'income',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'employer_benefits',
        text: "Does your employer offer a 401(k) match or pension?",
        category: 'benefits',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    tax_optimization: [
      {
        id: 'employment_type',
        text: "Are you W2 employed, self-employed, or a mix?",
        category: 'employment',
        priority: 10,
        expectedFormat: 'text',
      },
      {
        id: 'income',
        text: "What's your approximate annual income?",
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'filing_status',
        text: "What's your filing status? Single, married, head of household?",
        category: 'filing',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'retirement_accounts',
        text: "Do you have access to a 401(k), IRA, or other retirement accounts?",
        category: 'accounts',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    expense_reduction: [
      {
        id: 'monthly_income',
        text: "What's your monthly take-home income?",
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'essential_expenses',
        text: "What are your essential monthly expenses?",
        category: 'expenses',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'discretionary_spending',
        text: "Where do you think you're spending the most on non-essentials?",
        category: 'spending',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'subscriptions',
        text: "What subscriptions or recurring charges do you have? (Streaming, apps, memberships, etc.)",
        category: 'recurring',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    general_guidance: [
      {
        id: 'monthly_income',
        text: "What's your monthly take-home income after taxes?",
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'essential_expenses',
        text: "What are your essential monthly expenses?",
        category: 'expenses',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'current_savings',
        text: "How much do you currently have saved?",
        category: 'savings',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'debt',
        text: "Do you have any debt? If so, roughly how much?",
        category: 'debt',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'biggest_concern',
        text: "What's your biggest financial concern right now?",
        category: 'concerns',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    unknown: [
      {
        id: 'initial_concern',
        text: "What's going on with your money right now? What's bothering you or what do you want help with?",
        category: 'initial',
        priority: 10,
        expectedFormat: 'text',
      },
    ],
  };

  return questionMap[concern] || questionMap.general_guidance;
}

/**
 * Get next question based on what's been answered
 */
export function getNextQuestion(
  concern: FinancialConcern,
  answeredQuestionIds: Set<string>
): Question | null {
  const allQuestions = generateQuestionsForConcern(concern);
  
  // Find first unanswered question
  for (const question of allQuestions) {
    if (!answeredQuestionIds.has(question.id)) {
      return question;
    }
  }

  return null;
}

/**
 * Check if we have enough data to proceed
 */
export function hasEnoughData(
  concern: FinancialConcern,
  answeredQuestionIds: Set<string>
): boolean {
  const requiredQuestions: Record<FinancialConcern, string[]> = {
    debt_stress: ['debt_type', 'debt_total', 'monthly_income', 'essential_expenses'],
    savings_gap: ['current_savings', 'monthly_income', 'essential_expenses'],
    budgeting_help: ['monthly_income', 'essential_expenses', 'discretionary_spending'],
    investing_interest: ['available_to_invest', 'investment_timeline', 'risk_tolerance'],
    income_growth: ['current_income', 'income_goal'],
    emergency_fund: ['current_savings', 'essential_expenses', 'monthly_income'],
    retirement: ['retirement_age', 'current_age', 'monthly_income'],
    tax_optimization: ['employment_type', 'income'],
    expense_reduction: ['monthly_income', 'essential_expenses'],
    general_guidance: ['monthly_income', 'essential_expenses'],
    unknown: ['initial_concern'],
  };

  const required = requiredQuestions[concern] || [];
  return required.every(id => answeredQuestionIds.has(id));
}
