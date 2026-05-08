/**
 * TASK 1.1: Categorizer Class
 * Deterministic transaction categorization using rule-based regex patterns
 * Never uses AI - always deterministic for audit trail
 */

export type TransactionCategory = 
  | 'housing'
  | 'utilities'
  | 'food'
  | 'transportation'
  | 'healthcare'
  | 'insurance'
  | 'debt_payment'
  | 'savings'
  | 'investment'
  | 'entertainment'
  | 'dining'
  | 'shopping'
  | 'subscription'
  | 'education'
  | 'childcare'
  | 'personal_care'
  | 'gifts'
  | 'travel'
  | 'other';

export interface CategorizedTransaction {
  description: string;
  amount: number;
  category: TransactionCategory;
  confidence: number; // 0-1, how confident the categorization is
  rule: string; // Which rule matched
}

/**
 * Categorizer: Deterministic transaction categorization
 * Uses regex rules for 100% audit trail
 */
export class Categorizer {
  private rules: Array<{
    pattern: RegExp;
    category: TransactionCategory;
    confidence: number;
  }>;

  constructor() {
    this.rules = [
      // Housing
      { pattern: /mortgage|rent|lease|landlord|property tax|home insurance/i, category: 'housing', confidence: 0.95 },
      
      // Utilities
      { pattern: /electric|gas|water|internet|phone|cable|utility|power|verizon|at&t|comcast/i, category: 'utilities', confidence: 0.95 },
      
      // Food & Groceries
      { pattern: /grocery|whole foods|trader joe|safeway|kroger|walmart|costco|instacart|food delivery/i, category: 'food', confidence: 0.95 },
      { pattern: /supermarket|market|produce|farmers market/i, category: 'food', confidence: 0.90 },
      
      // Dining Out
      { pattern: /restaurant|cafe|coffee|pizza|burger|sushi|doordash|ubereats|grubhub|postmates|diner|bistro|bar|pub|grill/i, category: 'dining', confidence: 0.95 },
      
      // Transportation
      { pattern: /gas station|chevron|shell|bp|exxon|uber|lyft|taxi|parking|transit|metro|bus|train|amtrak|airline|flight|airbnb|hotel/i, category: 'transportation', confidence: 0.95 },
      { pattern: /car payment|auto loan|vehicle|registration|dmv/i, category: 'transportation', confidence: 0.90 },
      
      // Healthcare
      { pattern: /doctor|hospital|pharmacy|cvs|walgreens|medical|dental|dentist|clinic|health|prescription|medicine|therapy|mental health/i, category: 'healthcare', confidence: 0.95 },
      
      // Insurance
      { pattern: /insurance|premium|geico|state farm|allstate|aetna|blue cross|humana/i, category: 'insurance', confidence: 0.95 },
      
      // Debt Payment
      { pattern: /credit card payment|loan payment|debt payment|student loan|sallie mae|navient/i, category: 'debt_payment', confidence: 0.95 },
      
      // Savings & Investment
      { pattern: /transfer to savings|savings deposit|401k|ira|brokerage|vanguard|fidelity|schwab|etrade|investment|mutual fund/i, category: 'investment', confidence: 0.95 },
      { pattern: /savings account transfer|savings deposit/i, category: 'savings', confidence: 0.95 },
      
      // Entertainment
      { pattern: /netflix|hulu|disney|spotify|apple music|hbo|amazon prime|gaming|steam|playstation|xbox|movie|theater|cinema|concert|ticket/i, category: 'entertainment', confidence: 0.95 },
      
      // Shopping
      { pattern: /amazon|target|costco|walmart|mall|store|retail|clothing|apparel|shoes|fashion|department store|outlet/i, category: 'shopping', confidence: 0.90 },
      
      // Subscriptions
      { pattern: /subscription|membership|monthly fee|annual fee|recurring charge/i, category: 'subscription', confidence: 0.90 },
      
      // Education
      { pattern: /tuition|school|university|college|course|udemy|coursera|education|training|book|textbook/i, category: 'education', confidence: 0.95 },
      
      // Childcare
      { pattern: /daycare|babysitter|nanny|preschool|school tuition|child care|kids activity/i, category: 'childcare', confidence: 0.95 },
      
      // Personal Care
      { pattern: /gym|fitness|salon|haircut|spa|massage|beauty|cosmetics|personal care|dermatologist/i, category: 'personal_care', confidence: 0.95 },
      
      // Gifts
      { pattern: /gift|present|birthday|holiday|christmas|valentine|anniversary/i, category: 'gifts', confidence: 0.90 },
      
      // Travel
      { pattern: /hotel|airbnb|vacation|resort|cruise|travel|booking|expedia|kayak|trip|tour|luggage/i, category: 'travel', confidence: 0.90 },
    ];
  }

  /**
   * Categorize a transaction based on description
   */
  categorize(description: string, amount: number): CategorizedTransaction {
    // Try each rule in order
    for (const rule of this.rules) {
      if (rule.pattern.test(description)) {
        return {
          description,
          amount,
          category: rule.category,
          confidence: rule.confidence,
          rule: rule.pattern.source,
        };
      }
    }

    // Default to 'other' if no rule matches
    return {
      description,
      amount,
      category: 'other',
      confidence: 0.0,
      rule: 'default',
    };
  }

  /**
   * Categorize multiple transactions
   */
  categorizeMany(transactions: Array<{ description: string; amount: number }>): CategorizedTransaction[] {
    return transactions.map(t => this.categorize(t.description, t.amount));
  }

  /**
   * Get category totals from transactions
   */
  getCategoryTotals(transactions: CategorizedTransaction[]): Record<TransactionCategory, number> {
    const totals: Record<TransactionCategory, number> = {
      housing: 0,
      utilities: 0,
      food: 0,
      transportation: 0,
      healthcare: 0,
      insurance: 0,
      debt_payment: 0,
      savings: 0,
      investment: 0,
      entertainment: 0,
      dining: 0,
      shopping: 0,
      subscription: 0,
      education: 0,
      childcare: 0,
      personal_care: 0,
      gifts: 0,
      travel: 0,
      other: 0,
    };

    for (const txn of transactions) {
      totals[txn.category] += txn.amount;
    }

    return totals;
  }
}

// Singleton instance
export const categorizer = new Categorizer();
