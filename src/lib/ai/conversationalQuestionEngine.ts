/**
 * Conversational Question Engine
 * 
 * Generates natural, adaptive questions that feel like a real conversation.
 * No explanations, no scripts, no teaching moments mid-question.
 * Just genuine curiosity and interest in understanding the customer.
 */

import type { FinancialConcern } from './needsDetectionEngine';

export interface ConversationalQuestion {
  id: string;
  variations: string[]; // Multiple ways to ask the same thing
  category: string;
  priority: number;
  followUpVariations?: string[];
  expectedFormat?: 'number' | 'text' | 'choice' | 'range';
}

/**
 * Generate conversational questions with multiple natural variations
 * Each variation feels like a different moment in a real conversation
 */
export function generateConversationalQuestions(concern: FinancialConcern): ConversationalQuestion[] {
  const questionMap: Record<FinancialConcern, ConversationalQuestion[]> = {
    debt_stress: [
      {
        id: 'debt_type',
        variations: [
          "What kind of debt are we talking about?",
          "What's the debt situation? Credit cards, student loans, car loan?",
          "Tell me about the debt. What types do you have?",
          "What kind of debt is weighing on you?",
        ],
        category: 'debt_composition',
        priority: 10,
        expectedFormat: 'text',
      },
      {
        id: 'debt_total',
        variations: [
          "Roughly how much total?",
          "What's the total amount?",
          "How much are we talking about?",
          "What's the ballpark figure?",
        ],
        category: 'debt_amount',
        priority: 9,
        expectedFormat: 'number',
        followUpVariations: ["Across all of it?", "Is that everything combined?"],
      },
      {
        id: 'highest_interest',
        variations: [
          "What's the interest rate on the highest one?",
          "Do you know the rates? What's the worst one?",
          "Which one has the highest interest rate?",
          "What's the highest rate you're paying?",
        ],
        category: 'debt_interest',
        priority: 9,
        expectedFormat: 'number',
        followUpVariations: ["Do you know the rates on the others?", "What about the other rates?"],
      },
      {
        id: 'monthly_income',
        variations: [
          "What's your monthly take-home?",
          "How much do you bring home each month?",
          "What's your monthly income after taxes?",
          "How much are you making per month?",
        ],
        category: 'income',
        priority: 8,
        expectedFormat: 'number',
        followUpVariations: ["After taxes?", "Is that after taxes?"],
      },
      {
        id: 'essential_expenses',
        variations: [
          "What do you spend on essentials each month? Rent, food, utilities, that kind of thing.",
          "How much goes to essentials? Rent, groceries, utilities?",
          "What are your basic monthly expenses?",
          "How much do you need just for the basics?",
        ],
        category: 'expenses',
        priority: 8,
        expectedFormat: 'number',
        followUpVariations: ["Does that include your minimum debt payments?", "Are debt payments included in that?"],
      },
      {
        id: 'current_savings',
        variations: [
          "How much do you have in savings right now?",
          "What's your savings balance?",
          "Do you have any savings?",
          "How much have you managed to save?",
        ],
        category: 'savings',
        priority: 7,
        expectedFormat: 'number',
        followUpVariations: ["Is that in an emergency fund or mixed in?", "Is that spread across accounts?"],
      },
    ],
    savings_gap: [
      {
        id: 'monthly_income',
        variations: [
          "What's your monthly take-home?",
          "How much do you bring home each month?",
          "What's your monthly income after taxes?",
          "How much are you making per month?",
        ],
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'current_savings',
        variations: [
          "How much do you currently have saved?",
          "What's your savings balance right now?",
          "How much have you saved so far?",
          "Do you have savings set aside?",
        ],
        category: 'savings',
        priority: 10,
        expectedFormat: 'number',
        followUpVariations: ["Is that in one account or spread across multiple places?", "Where is it sitting?"],
      },
      {
        id: 'essential_expenses',
        variations: [
          "What are your essential monthly expenses?",
          "How much do you need for essentials each month?",
          "What's your baseline monthly spend?",
          "What do you spend on the basics?",
        ],
        category: 'expenses',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'savings_goal',
        variations: [
          "What's your goal for emergency savings? How many months of expenses would feel safe?",
          "How much of an emergency fund do you want to build?",
          "What's your target for emergency savings?",
          "How many months of expenses would make you feel secure?",
        ],
        category: 'goals',
        priority: 8,
        expectedFormat: 'text',
        followUpVariations: ["Most people aim for 3-6 months. What feels right for you?"],
      },
      {
        id: 'monthly_surplus',
        variations: [
          "After essentials, how much could you realistically save each month?",
          "What's left over after you cover the basics?",
          "How much could you put toward savings?",
          "What's your monthly surplus?",
        ],
        category: 'savings_capacity',
        priority: 8,
        expectedFormat: 'number',
      },
    ],
    budgeting_help: [
      {
        id: 'monthly_income',
        variations: [
          "What's your monthly take-home?",
          "How much do you bring home each month?",
          "What's your monthly income after taxes?",
          "How much are you making per month?",
        ],
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'essential_expenses',
        variations: [
          "What are your essential monthly expenses? Rent, food, utilities, insurance—the must-haves.",
          "How much do you spend on essentials?",
          "What's your baseline monthly spend?",
          "What do the basics cost you?",
        ],
        category: 'expenses',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'discretionary_spending',
        variations: [
          "Where do you think you're spending the most on non-essentials? Dining out, subscriptions, shopping?",
          "What's eating up your discretionary budget?",
          "Where does the extra money go?",
          "What are you spending on that's not essential?",
        ],
        category: 'spending_patterns',
        priority: 9,
        expectedFormat: 'text',
        followUpVariations: ["Roughly how much per month on that?", "What's that costing you?"],
      },
      {
        id: 'hardest_category',
        variations: [
          "Which spending category is hardest for you to control?",
          "Where do you struggle the most with spending?",
          "What's the hardest category to cut back on?",
          "Where do you tend to overspend?",
        ],
        category: 'spending_patterns',
        priority: 8,
        expectedFormat: 'text',
      },
      {
        id: 'debt_payments',
        variations: [
          "Do you have any debt payments? If so, how much per month?",
          "Are you paying down any debt?",
          "What are your monthly debt payments?",
          "Do you have debt obligations?",
        ],
        category: 'debt',
        priority: 7,
        expectedFormat: 'number',
      },
    ],
    investing_interest: [
      {
        id: 'available_to_invest',
        variations: [
          "How much do you have available to invest right now?",
          "What amount are you looking to invest?",
          "How much are you thinking of putting in?",
          "What's your investment amount?",
        ],
        category: 'investment_amount',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'investment_timeline',
        variations: [
          "What's your timeline for this money? Short-term, medium-term, or long-term?",
          "When do you need this money?",
          "How long are you planning to invest?",
          "What's your time horizon?",
        ],
        category: 'timeline',
        priority: 10,
        expectedFormat: 'text',
      },
      {
        id: 'risk_tolerance',
        variations: [
          "How comfortable are you with risk? Would you rather play it safe, or are you okay with ups and downs for potential growth?",
          "What's your comfort level with volatility?",
          "Are you conservative or willing to take some risk?",
          "How much risk can you stomach?",
        ],
        category: 'risk',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'emergency_fund',
        variations: [
          "Do you have an emergency fund in place?",
          "How's your emergency fund looking?",
          "Do you have 3-6 months of expenses saved?",
          "Are you covered for emergencies?",
        ],
        category: 'prerequisites',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'employer_benefits',
        variations: [
          "Does your employer offer a 401(k) match or any retirement benefits?",
          "What retirement benefits does your employer offer?",
          "Do you have access to a 401(k)?",
          "Any employer match available to you?",
        ],
        category: 'retirement_benefits',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    income_growth: [
      {
        id: 'current_income',
        variations: [
          "What's your current income?",
          "How much are you making right now?",
          "What's your income level?",
          "What do you earn?",
        ],
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'income_goal',
        variations: [
          "What's your income goal? What would feel like a win?",
          "Where do you want to get to?",
          "What's your target income?",
          "What would feel like success?",
        ],
        category: 'goals',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'income_source',
        variations: [
          "Are you W2 employed, self-employed, or a mix?",
          "What's your employment situation?",
          "How do you make your money?",
          "Are you employed or self-employed?",
        ],
        category: 'employment',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'growth_interest',
        variations: [
          "What would help you earn more? Promotion, side income, new skills, or something else?",
          "How do you see yourself growing income?",
          "What's your path to more income?",
          "What would move the needle for you?",
        ],
        category: 'growth_strategy',
        priority: 9,
        expectedFormat: 'text',
      },
    ],
    emergency_fund: [
      {
        id: 'current_savings',
        variations: [
          "How much do you currently have saved?",
          "What's your savings balance?",
          "How much have you saved so far?",
          "Do you have savings set aside?",
        ],
        category: 'savings',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'essential_expenses',
        variations: [
          "What are your essential monthly expenses?",
          "How much do you need for essentials each month?",
          "What's your baseline monthly spend?",
          "What do you spend on the basics?",
        ],
        category: 'expenses',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'emergency_target',
        variations: [
          "How many months of expenses would feel safe as an emergency fund?",
          "What's your target for emergency savings?",
          "How much of a cushion do you want?",
          "What's your comfort level for emergency funds?",
        ],
        category: 'goals',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'monthly_income',
        variations: [
          "What's your monthly take-home?",
          "How much do you bring home each month?",
          "What's your monthly income?",
          "How much are you making per month?",
        ],
        category: 'income',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'monthly_savings_capacity',
        variations: [
          "How much could you realistically save toward this each month?",
          "What's your monthly savings capacity?",
          "How much could you put aside?",
          "What's your savings potential?",
        ],
        category: 'savings_capacity',
        priority: 8,
        expectedFormat: 'number',
      },
    ],
    retirement: [
      {
        id: 'retirement_age',
        variations: [
          "When are you hoping to retire?",
          "What's your target retirement age?",
          "When do you want to retire?",
          "What age do you see yourself retiring?",
        ],
        category: 'timeline',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'current_age',
        variations: [
          "What's your current age?",
          "How old are you?",
          "What's your age?",
          "How many years until retirement?",
        ],
        category: 'demographics',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'current_savings',
        variations: [
          "Do you have any retirement savings right now?",
          "What's your retirement balance?",
          "How much have you saved for retirement?",
          "Any retirement accounts started?",
        ],
        category: 'savings',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'monthly_income',
        variations: [
          "What's your monthly income?",
          "How much do you bring home?",
          "What's your monthly take-home?",
          "How much are you making?",
        ],
        category: 'income',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'employer_benefits',
        variations: [
          "Does your employer offer a 401(k) match or pension?",
          "What retirement benefits do you have access to?",
          "Does your employer match 401(k)?",
          "Any employer retirement plans?",
        ],
        category: 'benefits',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    tax_optimization: [
      {
        id: 'employment_type',
        variations: [
          "Are you W2 employed, self-employed, or a mix?",
          "What's your employment situation?",
          "How do you work? W2, 1099, or both?",
          "Are you employed or self-employed?",
        ],
        category: 'employment',
        priority: 10,
        expectedFormat: 'text',
      },
      {
        id: 'income',
        variations: [
          "What's your approximate annual income?",
          "How much do you make per year?",
          "What's your annual income?",
          "What's your yearly earnings?",
        ],
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'filing_status',
        variations: [
          "What's your filing status? Single, married, head of household?",
          "How do you file? Single, married, head of household?",
          "What's your tax filing status?",
          "Are you filing single or married?",
        ],
        category: 'filing',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'retirement_accounts',
        variations: [
          "Do you have access to a 401(k), IRA, or other retirement accounts?",
          "What retirement accounts do you have?",
          "Do you use any retirement accounts?",
          "Any IRAs or 401(k)s?",
        ],
        category: 'accounts',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    expense_reduction: [
      {
        id: 'monthly_income',
        variations: [
          "What's your monthly take-home?",
          "How much do you bring home each month?",
          "What's your monthly income?",
          "How much are you making per month?",
        ],
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'essential_expenses',
        variations: [
          "What are your essential monthly expenses?",
          "How much do you need for essentials?",
          "What's your baseline spend?",
          "What do the basics cost you?",
        ],
        category: 'expenses',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'discretionary_spending',
        variations: [
          "Where do you think you're spending the most on non-essentials?",
          "What's eating up your discretionary budget?",
          "Where does the extra money go?",
          "What are you spending on that's not essential?",
        ],
        category: 'spending',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'subscriptions',
        variations: [
          "What subscriptions or recurring charges do you have? Streaming, apps, memberships?",
          "What recurring charges are you paying?",
          "What subscriptions do you have?",
          "Any recurring monthly charges?",
        ],
        category: 'recurring',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    general_guidance: [
      {
        id: 'monthly_income',
        variations: [
          "What's your monthly take-home?",
          "How much do you bring home each month?",
          "What's your monthly income?",
          "How much are you making per month?",
        ],
        category: 'income',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'essential_expenses',
        variations: [
          "What are your essential monthly expenses?",
          "How much do you need for essentials?",
          "What's your baseline spend?",
          "What do the basics cost you?",
        ],
        category: 'expenses',
        priority: 10,
        expectedFormat: 'number',
      },
      {
        id: 'current_savings',
        variations: [
          "How much do you currently have saved?",
          "What's your savings balance?",
          "How much have you saved?",
          "Do you have savings?",
        ],
        category: 'savings',
        priority: 9,
        expectedFormat: 'number',
      },
      {
        id: 'debt',
        variations: [
          "Do you have any debt? If so, roughly how much?",
          "Are you carrying any debt?",
          "What's your debt situation?",
          "Do you have debt?",
        ],
        category: 'debt',
        priority: 9,
        expectedFormat: 'text',
      },
      {
        id: 'biggest_concern',
        variations: [
          "What's your biggest financial concern right now?",
          "What's keeping you up at night?",
          "What's the main thing on your mind?",
          "What's your biggest worry?",
        ],
        category: 'concerns',
        priority: 8,
        expectedFormat: 'text',
      },
    ],
    unknown: [
      {
        id: 'initial_concern',
        variations: [
          "What's going on with your money right now?",
          "What's on your mind?",
          "What brought you here?",
          "What do you want help with?",
        ],
        category: 'initial',
        priority: 10,
        expectedFormat: 'text',
      },
    ],
  };

  return questionMap[concern] || questionMap.general_guidance;
}

/**
 * Get a random variation of a question to feel natural and conversational
 */
export function getQuestionVariation(question: ConversationalQuestion): string {
  return question.variations[Math.floor(Math.random() * question.variations.length)];
}

/**
 * Get a follow-up question variation if available
 */
export function getFollowUpVariation(question: ConversationalQuestion): string | undefined {
  if (!question.followUpVariations || question.followUpVariations.length === 0) {
    return undefined;
  }
  return question.followUpVariations[Math.floor(Math.random() * question.followUpVariations.length)];
}

/**
 * Get next question based on what's been answered
 */
export function getNextConversationalQuestion(
  concern: FinancialConcern,
  answeredQuestionIds: Set<string>
): ConversationalQuestion | null {
  const allQuestions = generateConversationalQuestions(concern);

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
export function hasEnoughConversationalData(
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
