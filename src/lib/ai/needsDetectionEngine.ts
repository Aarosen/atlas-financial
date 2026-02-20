/**
 * Needs Detection Engine
 * Requirement 1: Initial Needs Assessment
 * 
 * Detects customer's primary financial concern from their initial message.
 * Concerns: debt_stress, savings_gap, budgeting_help, investing_interest, 
 *           income_growth, emergency_fund, retirement, tax_optimization, etc.
 */

export type FinancialConcern = 
  | 'debt_stress'
  | 'savings_gap'
  | 'budgeting_help'
  | 'investing_interest'
  | 'income_growth'
  | 'emergency_fund'
  | 'retirement'
  | 'tax_optimization'
  | 'expense_reduction'
  | 'general_guidance'
  | 'unknown';

interface ConcernDetectionResult {
  concern: FinancialConcern;
  confidence: number; // 0-1
  keywords: string[];
  reasoning: string;
}

const concernPatterns: Record<FinancialConcern, { keywords: string[]; patterns: RegExp[] }> = {
  debt_stress: {
    keywords: ['debt', 'credit card', 'loan', 'owe', 'payment', 'interest', 'APR', 'balance'],
    patterns: [
      /\b(credit card|credit cards|debt|loans?|owe|owing|payment|payments|interest|APR)\b/gi,
      /\b(struggling|stressed|worried|concerned|anxious)\b.*\b(debt|payment|loan)\b/gi,
      /\b(high.*interest|interest.*high|compounding|pressure)\b/gi,
    ],
  },
  savings_gap: {
    keywords: ['save', 'savings', 'emergency', 'fund', 'buffer', 'cushion', 'rainy day'],
    patterns: [
      /\b(save|savings|emergency|fund|buffer|cushion|rainy day)\b/gi,
      /\b(don't have|no|zero|nothing|lack|gap)\b.*\b(savings|emergency|fund)\b/gi,
      /\b(need to|want to|should)\b.*\b(save|build|create)\b/gi,
    ],
  },
  budgeting_help: {
    keywords: ['budget', 'spending', 'expenses', 'control', 'track', 'manage', 'cut'],
    patterns: [
      /\b(budget|budgeting|spending|expenses|track|manage|control)\b/gi,
      /\b(too much|overspending|can't control|out of control)\b/gi,
      /\b(cut|reduce|lower|trim)\b.*\b(spending|expenses|costs)\b/gi,
    ],
  },
  investing_interest: {
    keywords: ['invest', 'investing', 'stocks', 'portfolio', 'market', 'growth', 'returns'],
    patterns: [
      /\b(invest|investing|investment|stocks?|portfolio|market|growth|returns)\b/gi,
      /\b(want to|interested in|ready to)\b.*\b(invest|grow|build wealth)\b/gi,
      /\b(401k|IRA|index fund|ETF|mutual fund)\b/gi,
    ],
  },
  income_growth: {
    keywords: ['income', 'earn', 'salary', 'raise', 'side hustle', 'business', 'revenue'],
    patterns: [
      /\b(income|earn|earning|salary|wage|raise|promotion)\b/gi,
      /\b(want to|need to|trying to)\b.*\b(earn|make|increase|grow)\b/gi,
      /\b(side hustle|side gig|freelance|business|passive income)\b/gi,
    ],
  },
  emergency_fund: {
    keywords: ['emergency', 'unexpected', 'crisis', 'job loss', 'medical', 'urgent'],
    patterns: [
      /\b(emergency|unexpected|crisis|urgent|disaster|catastrophe)\b/gi,
      /\b(job loss|medical|accident|emergency)\b/gi,
      /\b(what if|in case|just in case)\b/gi,
    ],
  },
  retirement: {
    keywords: ['retirement', 'retire', 'pension', 'FIRE', 'future', 'long-term'],
    patterns: [
      /\b(retirement|retire|retiring|pension|FIRE|financial independence)\b/gi,
      /\b(future|long-term|later|when I'm older)\b/gi,
      /\b(401k|IRA|retirement account)\b/gi,
    ],
  },
  tax_optimization: {
    keywords: ['tax', 'taxes', 'deduction', 'credit', 'refund', 'filing', 'W2', '1099'],
    patterns: [
      /\b(tax|taxes|taxation|deduction|credit|refund)\b/gi,
      /\b(W2|1099|self-employed|freelance.*tax)\b/gi,
      /\b(save.*tax|reduce.*tax|tax.*strategy)\b/gi,
    ],
  },
  expense_reduction: {
    keywords: ['cut', 'reduce', 'lower', 'save', 'cheaper', 'less', 'minimize'],
    patterns: [
      /\b(cut|reduce|lower|minimize|trim|slash)\b.*\b(spending|expenses|costs|bills)\b/gi,
      /\b(too expensive|costs too much|can't afford)\b/gi,
      /\b(find.*cheaper|save.*money|reduce.*bills)\b/gi,
    ],
  },
  general_guidance: {
    keywords: ['help', 'advice', 'guidance', 'plan', 'strategy', 'what should'],
    patterns: [
      /\b(help|advice|guidance|plan|strategy|what should|what do you think)\b/gi,
      /\b(confused|not sure|don't know|unclear)\b/gi,
    ],
  },
  unknown: {
    keywords: [],
    patterns: [],
  },
};

/**
 * Detect customer's primary financial concern from their message
 */
export function detectConcern(message: string): ConcernDetectionResult {
  const lowerMsg = message.toLowerCase();
  const scores: Record<FinancialConcern, { score: number; keywords: string[] }> = {
    debt_stress: { score: 0, keywords: [] },
    savings_gap: { score: 0, keywords: [] },
    budgeting_help: { score: 0, keywords: [] },
    investing_interest: { score: 0, keywords: [] },
    income_growth: { score: 0, keywords: [] },
    emergency_fund: { score: 0, keywords: [] },
    retirement: { score: 0, keywords: [] },
    tax_optimization: { score: 0, keywords: [] },
    expense_reduction: { score: 0, keywords: [] },
    general_guidance: { score: 0, keywords: [] },
    unknown: { score: 0, keywords: [] },
  };

  // Score each concern based on keyword and pattern matches
  for (const [concern, { keywords, patterns }] of Object.entries(concernPatterns)) {
    const concernKey = concern as FinancialConcern;
    
    // Keyword matches
    for (const keyword of keywords) {
      if (lowerMsg.includes(keyword.toLowerCase())) {
        scores[concernKey].score += 1;
        scores[concernKey].keywords.push(keyword);
      }
    }

    // Pattern matches
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        scores[concernKey].score += 2; // Patterns are weighted higher
      }
    }
  }

  // Find the concern with the highest score
  let topConcern: FinancialConcern = 'unknown';
  let topScore = 0;

  for (const [concern, { score }] of Object.entries(scores)) {
    if (score > topScore) {
      topScore = score;
      topConcern = concern as FinancialConcern;
    }
  }

  // Calculate confidence (0-1)
  const maxScore = Math.max(...Object.values(scores).map(s => s.score));
  const confidence = maxScore > 0 ? Math.min(topScore / (maxScore * 1.5), 1) : 0;

  return {
    concern: topConcern,
    confidence,
    keywords: scores[topConcern].keywords,
    reasoning: `Detected concern: ${topConcern} (confidence: ${(confidence * 100).toFixed(0)}%)`,
  };
}

/**
 * Get initial message based on detected concern
 */
export function getInitialMessage(concern: FinancialConcern): string {
  const messages: Record<FinancialConcern, string> = {
    debt_stress: "I hear you're dealing with debt. Let's talk about it. What's the situation like right now?",
    savings_gap: "Building savings is important. Tell me about your current situation and what you're aiming for.",
    budgeting_help: "Let's work on getting your spending under control. What's been the biggest challenge?",
    investing_interest: "Investing is a great way to build wealth. Tell me about your goals and what you're looking for.",
    income_growth: "Growing your income is powerful. What's your situation, and what would help most?",
    emergency_fund: "An emergency fund is crucial. Let's build one together. What's your situation?",
    retirement: "Planning for retirement is smart. Tell me about your goals and timeline.",
    tax_optimization: "Tax strategy matters. What's your situation, and what are you trying to optimize?",
    expense_reduction: "Let's find ways to reduce your expenses. What's been the biggest drain?",
    general_guidance: "I'm here to help. Tell me what's going on with your money right now.",
    unknown: "What's going on with your money right now? What's bothering you or what do you want help with?",
  };

  return messages[concern];
}

/**
 * Get relevant questions for a specific concern
 */
export function getRelevantQuestions(concern: FinancialConcern): string[] {
  const questionMap: Record<FinancialConcern, string[]> = {
    debt_stress: [
      "What kind of debt are we talking about? Credit cards, student loans, car loan?",
      "Roughly how much total debt do you have?",
      "What's the interest rate on your highest-interest debt?",
      "How much are you paying toward debt each month?",
      "What's your monthly income after taxes?",
    ],
    savings_gap: [
      "How much do you currently have saved?",
      "What's your monthly income after taxes?",
      "What are your essential monthly expenses?",
      "How much could you realistically save each month?",
      "What's your goal for emergency savings?",
    ],
    budgeting_help: [
      "What's your monthly income after taxes?",
      "What are your essential monthly expenses (rent, food, utilities)?",
      "Where do you think you're spending the most?",
      "What categories are hardest to control?",
      "How much could you realistically cut from your budget?",
    ],
    investing_interest: [
      "How much do you have available to invest?",
      "What's your timeline for this money?",
      "How comfortable are you with risk?",
      "Do you have an emergency fund first?",
      "Are you taking advantage of any employer retirement benefits?",
    ],
    income_growth: [
      "What's your current income?",
      "What's your income goal?",
      "What would help you earn more?",
      "Are you interested in a side income?",
      "What skills do you have that could generate income?",
    ],
    emergency_fund: [
      "How much do you currently have saved?",
      "What's your monthly essential expenses?",
      "How many months of expenses would feel safe?",
      "What's your monthly income after taxes?",
      "How much could you save toward this each month?",
    ],
    retirement: [
      "When are you hoping to retire?",
      "What's your current age?",
      "Do you have any retirement savings?",
      "What's your monthly income?",
      "Are you taking advantage of employer retirement benefits?",
    ],
    tax_optimization: [
      "Are you self-employed or W2?",
      "What's your approximate income?",
      "Do you have any deductions or credits you're aware of?",
      "Do you have access to a 401k or IRA?",
      "What's your filing status?",
    ],
    expense_reduction: [
      "What's your monthly income after taxes?",
      "What are your essential monthly expenses?",
      "Which categories have the most discretionary spending?",
      "What subscriptions or recurring charges do you have?",
      "Where do you think you could cut the most?",
    ],
    general_guidance: [
      "What's your monthly income after taxes?",
      "What are your essential monthly expenses?",
      "How much do you currently have saved?",
      "Do you have any debt?",
      "What's your biggest financial concern right now?",
    ],
    unknown: [
      "What's going on with your money right now?",
      "What's bothering you most about your financial situation?",
      "What would help you the most?",
    ],
  };

  return questionMap[concern] || questionMap.general_guidance;
}
