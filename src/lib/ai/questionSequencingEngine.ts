import { FinancialConcern } from './needsDetectionEngine';

export interface SequencedQuestion {
  id: string;
  text: string;
  priority: number;
  relevantTo: FinancialConcern[];
  category: 'core' | 'supporting' | 'optional';
  reason?: string;
}

export interface QuestionSequence {
  questions: SequencedQuestion[];
  skippedQuestions: string[];
  reasoning: string;
}

const questionPriorities: Record<FinancialConcern, Record<string, number>> = {
  debt_stress: {
    debt_type: 10,
    debt_amount: 10,
    interest_rate: 9,
    monthly_payment: 9,
    income: 8,
    essentials: 7,
    savings: 5,
    goals: 3,
  },
  savings_gap: {
    current_savings: 10,
    savings_goal: 10,
    timeline: 9,
    income: 8,
    essentials: 7,
    debt: 6,
    goals: 5,
  },
  budgeting_help: {
    income: 10,
    essentials: 10,
    discretionary: 9,
    savings: 8,
    debt: 7,
    goals: 5,
  },
  investing_interest: {
    savings: 10,
    risk_tolerance: 10,
    timeline: 9,
    goals: 9,
    income: 7,
    experience: 6,
  },
  income_growth: {
    current_income: 10,
    income_goal: 10,
    skills: 8,
    timeline: 7,
    essentials: 6,
    goals: 5,
  },
  emergency_fund: {
    current_savings: 10,
    essentials: 10,
    target_amount: 9,
    income: 8,
    debt: 6,
    goals: 4,
  },
  retirement: {
    age: 10,
    retirement_age: 10,
    current_savings: 9,
    income: 9,
    goals: 8,
    risk_tolerance: 7,
  },
  tax_optimization: {
    income: 10,
    income_type: 10,
    deductions: 9,
    investments: 8,
    goals: 5,
  },
  expense_reduction: {
    current_expenses: 10,
    discretionary: 10,
    essentials: 9,
    income: 8,
    goals: 6,
  },
  general_guidance: {
    income: 8,
    essentials: 8,
    savings: 7,
    debt: 7,
    goals: 7,
  },
  unknown: {
    income: 5,
    essentials: 5,
    savings: 5,
    debt: 5,
    goals: 5,
  },
};

const allQuestions: Record<string, SequencedQuestion> = {
  debt_type: {
    id: 'debt_type',
    text: 'What kind of debt are we talking about? Credit cards, student loans, car loan, mortgage?',
    priority: 10,
    relevantTo: ['debt_stress', 'budgeting_help', 'expense_reduction'],
    category: 'core',
  },
  debt_amount: {
    id: 'debt_amount',
    text: 'Roughly how much total debt do you have?',
    priority: 10,
    relevantTo: ['debt_stress', 'budgeting_help'],
    category: 'core',
  },
  interest_rate: {
    id: 'interest_rate',
    text: "What's the interest rate on your highest-interest debt?",
    priority: 9,
    relevantTo: ['debt_stress', 'expense_reduction'],
    category: 'core',
  },
  monthly_payment: {
    id: 'monthly_payment',
    text: 'How much are you paying toward debt each month?',
    priority: 9,
    relevantTo: ['debt_stress', 'budgeting_help'],
    category: 'core',
  },
  current_savings: {
    id: 'current_savings',
    text: 'How much do you currently have in savings?',
    priority: 10,
    relevantTo: ['savings_gap', 'emergency_fund', 'investing_interest', 'retirement'],
    category: 'core',
  },
  savings_goal: {
    id: 'savings_goal',
    text: 'What are you saving for? And roughly how much do you need?',
    priority: 10,
    relevantTo: ['savings_gap', 'emergency_fund'],
    category: 'core',
  },
  timeline: {
    id: 'timeline',
    text: 'When do you need this money? Next year, 5 years, 10+ years?',
    priority: 9,
    relevantTo: ['savings_gap', 'investing_interest', 'retirement'],
    category: 'core',
  },
  income: {
    id: 'income',
    text: "What's your monthly income after taxes?",
    priority: 10,
    relevantTo: ['debt_stress', 'savings_gap', 'budgeting_help', 'income_growth', 'emergency_fund', 'general_guidance'],
    category: 'core',
  },
  essentials: {
    id: 'essentials',
    text: 'How much do you spend on essentials each month? (rent, food, utilities, etc.)',
    priority: 10,
    relevantTo: ['debt_stress', 'savings_gap', 'budgeting_help', 'emergency_fund', 'expense_reduction'],
    category: 'core',
  },
  discretionary: {
    id: 'discretionary',
    text: 'How much do you spend on discretionary items? (dining out, entertainment, shopping, etc.)',
    priority: 9,
    relevantTo: ['budgeting_help', 'expense_reduction', 'savings_gap'],
    category: 'supporting',
  },
  risk_tolerance: {
    id: 'risk_tolerance',
    text: 'How comfortable are you with investment risk? Conservative, moderate, or aggressive?',
    priority: 10,
    relevantTo: ['investing_interest', 'retirement'],
    category: 'core',
  },
  goals: {
    id: 'goals',
    text: 'What are your biggest financial goals for the next 1-5 years?',
    priority: 8,
    relevantTo: ['debt_stress', 'savings_gap', 'budgeting_help', 'investing_interest', 'income_growth', 'general_guidance'],
    category: 'supporting',
  },
  experience: {
    id: 'experience',
    text: 'Do you have any experience with investing?',
    priority: 6,
    relevantTo: ['investing_interest'],
    category: 'supporting',
  },
  current_income: {
    id: 'current_income',
    text: "What's your current income?",
    priority: 10,
    relevantTo: ['income_growth'],
    category: 'core',
  },
  income_goal: {
    id: 'income_goal',
    text: "What income level are you aiming for?",
    priority: 10,
    relevantTo: ['income_growth'],
    category: 'core',
  },
  skills: {
    id: 'skills',
    text: 'What skills or expertise do you have that could increase your income?',
    priority: 8,
    relevantTo: ['income_growth'],
    category: 'supporting',
  },
  target_amount: {
    id: 'target_amount',
    text: 'How much should your emergency fund be? (typically 3-6 months of expenses)',
    priority: 9,
    relevantTo: ['emergency_fund'],
    category: 'core',
  },
  age: {
    id: 'age',
    text: 'How old are you?',
    priority: 10,
    relevantTo: ['retirement'],
    category: 'core',
  },
  retirement_age: {
    id: 'retirement_age',
    text: 'When do you want to retire?',
    priority: 10,
    relevantTo: ['retirement'],
    category: 'core',
  },
  income_type: {
    id: 'income_type',
    text: 'Are you employed, self-employed, or both?',
    priority: 10,
    relevantTo: ['tax_optimization'],
    category: 'core',
  },
  deductions: {
    id: 'deductions',
    text: 'Do you have significant deductions? (business expenses, mortgage interest, etc.)',
    priority: 9,
    relevantTo: ['tax_optimization'],
    category: 'supporting',
  },
  investments: {
    id: 'investments',
    text: 'Do you have investments outside of retirement accounts?',
    priority: 8,
    relevantTo: ['tax_optimization', 'investing_interest'],
    category: 'supporting',
  },
  current_expenses: {
    id: 'current_expenses',
    text: 'What are your total monthly expenses right now?',
    priority: 10,
    relevantTo: ['expense_reduction', 'budgeting_help'],
    category: 'core',
  },
  debt: {
    id: 'debt',
    text: 'Do you have any debt?',
    priority: 7,
    relevantTo: ['savings_gap', 'budgeting_help', 'general_guidance'],
    category: 'supporting',
  },
};

export function sequenceQuestionsForConcern(
  concern: FinancialConcern,
  answeredQuestionIds: Set<string> = new Set()
): QuestionSequence {
  const priorities = questionPriorities[concern] || questionPriorities.unknown;
  
  const relevantQuestions = Object.values(allQuestions)
    .filter(q => q.relevantTo.includes(concern) && !answeredQuestionIds.has(q.id))
    .sort((a, b) => {
      const priorityA = priorities[a.id] || 0;
      const priorityB = priorities[b.id] || 0;
      return priorityB - priorityA;
    });

  const coreQuestions = relevantQuestions.filter(q => q.category === 'core');
  const supportingQuestions = relevantQuestions.filter(q => q.category === 'supporting');
  const optionalQuestions = relevantQuestions.filter(q => q.category === 'optional');

  const sequenced = [...coreQuestions, ...supportingQuestions, ...optionalQuestions];

  const skipped = Object.values(allQuestions)
    .filter(q => !q.relevantTo.includes(concern) && !answeredQuestionIds.has(q.id))
    .map(q => q.id);

  return {
    questions: sequenced,
    skippedQuestions: skipped,
    reasoning: `Sequenced ${sequenced.length} questions for ${concern} concern. Skipped ${skipped.length} irrelevant questions.`,
  };
}

export function getNextQuestion(
  concern: FinancialConcern,
  answeredQuestionIds: Set<string> = new Set()
): SequencedQuestion | null {
  const sequence = sequenceQuestionsForConcern(concern, answeredQuestionIds);
  return sequence.questions.length > 0 ? sequence.questions[0] : null;
}

export function shouldSkipQuestion(questionId: string, concern: FinancialConcern): boolean {
  const question = allQuestions[questionId];
  if (!question) return false;
  return !question.relevantTo.includes(concern);
}

export function getReasonForQuestion(questionId: string, concern: FinancialConcern): string {
  const reasons: Record<FinancialConcern, Record<string, string>> = {
    debt_stress: {
      debt_type: 'To understand your debt situation, I need to know what types of debt you have.',
      debt_amount: 'This helps me understand the scale of what we\'re dealing with.',
      interest_rate: 'Interest rates are crucial—high-interest debt should be a priority.',
      monthly_payment: 'This shows me how much of your income is going to debt.',
      income: 'Your income determines how much you can put toward debt payoff.',
    },
    savings_gap: {
      current_savings: 'Let\'s start with where you are now.',
      savings_goal: 'Understanding your target helps me create a realistic plan.',
      timeline: 'The timeline affects how aggressively we need to save.',
      income: 'Your income determines how much you can save each month.',
    },
    budgeting_help: {
      income: 'Your income is the foundation of your budget.',
      essentials: 'We need to understand your fixed costs first.',
      discretionary: 'Then we can see where there\'s flexibility.',
    },
    investing_interest: {
      savings: 'We need to know what capital you have to invest.',
      risk_tolerance: 'Your comfort with risk shapes the right strategy for you.',
      timeline: 'Your timeline affects which investments make sense.',
    },
    income_growth: {
      current_income: 'Let\'s establish your baseline.',
      income_goal: 'What are we aiming for?',
    },
    emergency_fund: {
      current_savings: 'Where are you starting from?',
      essentials: 'Your essential expenses determine your emergency fund target.',
      target_amount: 'Let\'s set a realistic goal.',
    },
    retirement: {
      age: 'Your age affects how much time you have to save.',
      retirement_age: 'When do you want to stop working?',
    },
    tax_optimization: {
      income: 'Your income level affects your tax situation.',
      income_type: 'Self-employed and employed have different tax strategies.',
    },
    expense_reduction: {
      current_expenses: 'We need to see the full picture first.',
      discretionary: 'This is usually where we find the most savings.',
    },
    general_guidance: {
      income: 'Let\'s start with your income.',
    },
    unknown: {
      income: 'Understanding your income helps me give better advice.',
    },
  };

  const concernReasons = reasons[concern] || {};
  return concernReasons[questionId] || `This helps me understand your financial situation better.`;
}

export function adaptSequencingIfConcernChanges(
  oldConcern: FinancialConcern,
  newConcern: FinancialConcern,
  answeredQuestionIds: Set<string>
): QuestionSequence {
  const oldSequence = sequenceQuestionsForConcern(oldConcern, answeredQuestionIds);
  const newSequence = sequenceQuestionsForConcern(newConcern, answeredQuestionIds);

  return {
    ...newSequence,
    reasoning: `Concern shifted from ${oldConcern} to ${newConcern}. Resequenced questions accordingly.`,
  };
}
