export interface TestScenario {
  id: number;
  input: string;
  expectedOutputs: string[];
  mustNotContain: string[];
  description: string;
}

export const SPRINT5_TEST_SCENARIOS: TestScenario[] = [
  {
    id: 1,
    input: 'I have $3000 income, $1500 expenses, $200 savings. What should I do?',
    expectedOutputs: ['$4,500', '$4,300', 'months', '$750'],
    mustNotContain: ['What it is', 'SMART goals', 'headers', 'bullet points'],
    description: 'Income + Expenses + Savings → Specific Numbers',
  },
  {
    id: 2,
    input: 'I have no income right now',
    expectedOutputs: ['acknowledge', 'situation'],
    mustNotContain: ['infinite loop', 'ask for income again'],
    description: 'Zero Income No Loop',
  },
  {
    id: 3,
    input: 'What is an emergency fund?',
    expectedOutputs: ['one sentence', 'your situation', 'numbers'],
    mustNotContain: ['definition', 'generic explanation'],
    description: 'Concept Question → Apply to Situation',
  },
  {
    id: 4,
    input: 'What should I do with my money?',
    expectedOutputs: ['clarifying question'],
    mustNotContain: ['generic', 'lecture', 'multiple questions'],
    description: 'Vague Question → One Clarifying Question',
  },
  {
    id: 5,
    input: 'I make $8000/month, spend $7800, have $0 savings',
    expectedOutputs: ['surplus', 'near-zero', 'variable expenses'],
    mustNotContain: ['generic advice'],
    description: 'Near-Zero Surplus Identification',
  },
  {
    id: 6,
    input: 'I make $150,000/year, have $500,000 saved, want to retire early',
    expectedOutputs: ['FIRE', 'number', 'years'],
    mustNotContain: ['generic retirement advice'],
    description: 'FIRE Calculation',
  },
  {
    id: 7,
    input: 'I have 3 credit cards: $2000 @ 18%, $3000 @ 24%, $1500 @ 12%',
    expectedOutputs: ['avalanche', 'highest rate', 'monthly interest'],
    mustNotContain: ['generic debt advice'],
    description: 'Debt Payoff Strategy',
  },
  {
    id: 8,
    input: 'My expenses went up $500 this month',
    expectedOutputs: ['recalculate', 'surplus impact', 'revised timeline'],
    mustNotContain: ['generic response'],
    description: 'Expense Change Impact',
  },
  {
    id: 9,
    input: 'What if I get a $10k raise?',
    expectedOutputs: ['scenario', 'delta', 'allocation'],
    mustNotContain: ['generic congratulations'],
    description: 'Scenario Simulation',
  },
  {
    id: 10,
    input: 'I want to save for a house down payment',
    expectedOutputs: ['target', 'timeline', 'monthly required', 'gap'],
    mustNotContain: ['generic goal advice'],
    description: 'Savings Goal Calculation',
  },
  {
    id: 11,
    input: 'Any response about finances',
    expectedOutputs: ['prose', 'numbers', 'action'],
    mustNotContain: ['##', 'bold titles', 'bullet points', 'numbered lists'],
    description: 'No Markdown Formatting',
  },
  {
    id: 12,
    input: 'Any financial recommendation',
    expectedOutputs: ['ONE action', 'dollar amount', 'timeframe'],
    mustNotContain: ['list of options', 'multiple suggestions'],
    description: 'One Specific Next Action',
  },
  {
    id: 13,
    input: 'I have $3000 income, $1500 expenses, $200 savings',
    expectedOutputs: ['$4,500', '$4,300', '$750'],
    mustNotContain: ['approximation', 'ranges without numbers'],
    description: 'Exact Numbers from Calculations',
  },
  {
    id: 14,
    input: 'Any financial question',
    expectedOutputs: ['no "consult a financial advisor"'],
    mustNotContain: ['consult a financial advisor mid-conversation'],
    description: 'No Mid-Conversation Disclaimers',
  },
  {
    id: 15,
    input: 'User returns after providing income before',
    expectedOutputs: ['no re-ask for income'],
    mustNotContain: ['ask for income again'],
    description: 'No Re-asking Known Information',
  },
  {
    id: 16,
    input: 'I have $3000 income, $1500 expenses, $200 savings',
    expectedOutputs: ['$4,500 target', '$4,300 gap', '6 months', '$750/month'],
    mustNotContain: ['SMART goals', 'What it is', 'Why it matters'],
    description: 'Emergency Fund Calculation Accuracy',
  },
  {
    id: 17,
    input: 'I make $5000/month, spend $3500, have $12000 saved',
    expectedOutputs: ['$1500 surplus', '$10,500 emergency fund target', '7 months'],
    mustNotContain: ['generic explanation'],
    description: 'Calculation Accuracy Test 2',
  },
  {
    id: 18,
    input: 'I have $0 income and $1500 in expenses',
    expectedOutputs: ['acknowledge', 'runway', 'months'],
    mustNotContain: ['infinite loop', 'ask for income again'],
    description: 'Zero Income Edge Case',
  },
  {
    id: 19,
    input: 'I have negative cashflow',
    expectedOutputs: ['identify expenses', 'cut', 'surplus'],
    mustNotContain: ['generic advice'],
    description: 'Negative Cashflow Handling',
  },
  {
    id: 20,
    input: 'Any conversation',
    expectedOutputs: ['response is prose', 'max 3 paragraphs', 'specific numbers'],
    mustNotContain: ['headers', 'bullets', 'numbered lists', 'markdown'],
    description: 'Response Format Compliance',
  },
];

export function evaluateScenario(
  scenario: TestScenario,
  response: string
): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  const lowerResponse = response.toLowerCase();

  // Check expected outputs
  for (const expected of scenario.expectedOutputs) {
    if (!lowerResponse.includes(expected.toLowerCase())) {
      issues.push(`Missing expected output: "${expected}"`);
    }
  }

  // Check must not contain
  for (const forbidden of scenario.mustNotContain) {
    if (lowerResponse.includes(forbidden.toLowerCase())) {
      issues.push(`Contains forbidden text: "${forbidden}"`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
