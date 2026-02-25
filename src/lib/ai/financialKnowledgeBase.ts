// Financial Knowledge Base - RAG Layer for Accurate Information
// Phase 3C: Retrieval-Augmented Generation system

export interface KnowledgeEntry {
  id: string;
  category: 'tax' | 'retirement' | 'investing' | 'debt' | 'budgeting' | 'insurance' | 'general';
  topic: string;
  content: string;
  year: number;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  relevanceScore: number;
}

// 2025/2026 Tax Information
const TAX_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'tax_brackets_2025',
    category: 'tax',
    topic: 'Federal Tax Brackets 2025',
    content: `2025 Federal Tax Brackets:
Single:
- 10%: $0 - $11,600
- 12%: $11,601 - $47,150
- 22%: $47,151 - $100,525
- 24%: $100,526 - $191,950
- 32%: $191,951 - $243,725
- 35%: $243,726 - $609,350
- 37%: $609,351+

Married Filing Jointly:
- 10%: $0 - $23,200
- 12%: $23,201 - $94,300
- 22%: $94,301 - $201,050
- 24%: $201,051 - $383,900
- 32%: $383,901 - $487,450
- 35%: $487,451 - $731,200
- 37%: $731,201+`,
    year: 2025,
    source: 'IRS',
    confidence: 'high',
    lastUpdated: new Date('2025-01-01'),
  },
  {
    id: 'standard_deduction_2025',
    category: 'tax',
    topic: 'Standard Deduction 2025',
    content: `2025 Standard Deduction Amounts:
- Single: $15,000
- Married Filing Jointly: $30,000
- Head of Household: $22,500
- Married Filing Separately: $15,000
- Additional amount for age 65+: $1,950 (single/HOH), $1,550 (MFJ)`,
    year: 2025,
    source: 'IRS',
    confidence: 'high',
    lastUpdated: new Date('2025-01-01'),
  },
  {
    id: 'retirement_contribution_limits_2025',
    category: 'retirement',
    topic: '2025 Retirement Contribution Limits',
    content: `2025 Retirement Account Contribution Limits:
- 401(k): $23,500 (employee), $7,500 catch-up (50+)
- 403(b): $23,500 (employee), $7,500 catch-up (50+)
- SIMPLE IRA: $16,500 (employee), $3,500 catch-up (50+)
- Traditional/Roth IRA: $7,000, $1,000 catch-up (50+)
- SEP-IRA: 25% of compensation or $69,000 max
- Solo 401(k): $69,000 total (employee + employer)
- SECURE 2.0 Catch-up (60-63): Additional $11,250 for 401(k)`,
    year: 2025,
    source: 'IRS',
    confidence: 'high',
    lastUpdated: new Date('2025-01-01'),
  },
  {
    id: 'rmd_rules_2025',
    category: 'retirement',
    topic: 'Required Minimum Distribution Rules',
    content: `RMD Rules (SECURE 2.0):
- RMD Start Age: 73 (changed from 72 in 2023)
- Applies to: Traditional IRA, 401(k), 403(b), SEP-IRA, SIMPLE IRA
- Calculation: Account balance / IRS life expectancy factor
- Penalty for non-compliance: 25% of shortfall (reduced to 10% if corrected timely)
- Roth IRAs: No RMD during account owner's lifetime
- Inherited accounts: Different rules apply (SECURE Act changes)`,
    year: 2025,
    source: 'IRS',
    confidence: 'high',
    lastUpdated: new Date('2025-01-01'),
  },
];

// Investing Knowledge
const INVESTING_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'asset_allocation_basics',
    category: 'investing',
    topic: 'Asset Allocation Fundamentals',
    content: `Asset Allocation Basics:
- Stocks: Higher growth potential, higher volatility
- Bonds: Lower growth, more stable, income-generating
- Cash: Lowest growth, highest stability
- Real Estate: Diversification, inflation hedge
- Commodities: Inflation protection, diversification

Common Allocation Models:
- Age-based: 110 - age = stock %, rest bonds
- Risk-based: Conservative (30/70), Moderate (60/40), Aggressive (80/20)
- Diversification reduces risk without reducing expected returns`,
    year: 2025,
    source: 'CFA Institute',
    confidence: 'high',
    lastUpdated: new Date('2025-01-01'),
  },
  {
    id: 'index_vs_active',
    category: 'investing',
    topic: 'Index Funds vs Active Management',
    content: `Index Funds vs Active Management:
- Index funds: Track market index, lower fees (0.03-0.20%), consistent performance
- Active management: Attempt to beat market, higher fees (0.5-2%+), inconsistent results
- Research shows: 80-90% of active managers underperform index after fees
- Cost matters: 1% fee difference = 25% less wealth over 30 years
- Best practice: Low-cost index funds for core holdings`,
    year: 2025,
    source: 'Vanguard Research',
    confidence: 'high',
    lastUpdated: new Date('2025-01-01'),
  },
];

// Debt Management Knowledge
const DEBT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'debt_payoff_strategies',
    category: 'debt',
    topic: 'Debt Payoff Strategies',
    content: `Debt Payoff Strategies:
- Avalanche: Pay highest interest rate first (mathematically optimal)
- Snowball: Pay smallest balance first (psychological wins)
- Consolidation: Combine multiple debts at lower rate
- Refinancing: Replace high-rate debt with lower-rate debt
- Negotiation: Contact creditors for lower rates or settlements

Interest Rate Context:
- Credit cards: 15-25% APR (high priority)
- Personal loans: 5-15% APR (medium priority)
- Student loans: 4-8% APR (lower priority)
- Mortgages: 3-7% APR (lowest priority)`,
    year: 2025,
    source: 'Financial Planning Standards Board',
    confidence: 'high',
    lastUpdated: new Date('2025-01-01'),
  },
];

// Budgeting Knowledge
const BUDGETING_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'budgeting_frameworks',
    category: 'budgeting',
    topic: 'Common Budgeting Frameworks',
    content: `Popular Budgeting Frameworks:
- 50/30/20: 50% needs, 30% wants, 20% savings/debt
- 60/20/20: 60% living expenses, 20% debt, 20% savings
- Zero-based: Every dollar assigned a purpose
- Envelope: Physical or digital envelopes for categories
- Percentage-based: Allocate percentages of income

Emergency Fund Guidelines:
- Beginner: $1,000 starter fund
- Intermediate: 3-6 months of expenses
- Advanced: 6-12 months of expenses
- High-income/variable: 12+ months of expenses`,
    year: 2025,
    source: 'National Foundation for Credit Counseling',
    confidence: 'high',
    lastUpdated: new Date('2025-01-01'),
  },
];

// Combine all knowledge entries
const KNOWLEDGE_BASE: KnowledgeEntry[] = [...TAX_KNOWLEDGE, ...INVESTING_KNOWLEDGE, ...DEBT_KNOWLEDGE, ...BUDGETING_KNOWLEDGE];

export class FinancialKnowledgeBase {
  private entries: KnowledgeEntry[] = KNOWLEDGE_BASE;

  /**
   * Search knowledge base by query
   */
  search(query: string, limit: number = 3): SearchResult[] {
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const entry of this.entries) {
      let relevanceScore = 0;

      // Check topic match
      if (entry.topic.toLowerCase().includes(queryLower)) {
        relevanceScore += 10;
      }

      // Check content match
      if (entry.content.toLowerCase().includes(queryLower)) {
        relevanceScore += 5;
      }

      // Check category match
      const categoryKeywords: Record<string, string[]> = {
        tax: ['tax', 'deduction', 'bracket', 'irs', 'filing'],
        retirement: ['retirement', 'rmd', '401k', 'ira', 'pension'],
        investing: ['invest', 'stock', 'bond', 'portfolio', 'allocation'],
        debt: ['debt', 'loan', 'credit', 'payoff', 'interest'],
        budgeting: ['budget', 'expense', 'spending', 'income', 'cash flow'],
      };

      if (categoryKeywords[entry.category]?.some((kw) => queryLower.includes(kw))) {
        relevanceScore += 3;
      }

      if (relevanceScore > 0) {
        results.push({ entry, relevanceScore });
      }
    }

    // Sort by relevance and return top results
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
  }

  /**
   * Get knowledge by category
   */
  getByCategory(category: KnowledgeEntry['category']): KnowledgeEntry[] {
    return this.entries.filter((e) => e.category === category);
  }

  /**
   * Get knowledge by topic
   */
  getByTopic(topic: string): KnowledgeEntry | undefined {
    return this.entries.find((e) => e.topic.toLowerCase().includes(topic.toLowerCase()));
  }

  /**
   * Add custom knowledge entry
   */
  addEntry(entry: KnowledgeEntry): void {
    this.entries.push(entry);
  }

  /**
   * Get all entries
   */
  getAllEntries(): KnowledgeEntry[] {
    return [...this.entries];
  }

  /**
   * Format search results for Claude context
   */
  formatForContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    let context = 'RELEVANT FINANCIAL KNOWLEDGE:\n\n';
    for (const result of results) {
      context += `[${result.entry.topic} - ${result.entry.year}]\n`;
      context += `${result.entry.content}\n`;
      context += `Source: ${result.entry.source}\n\n`;
    }

    return context;
  }
}

// Singleton instance
let knowledgeBaseInstance: FinancialKnowledgeBase | null = null;

export function getFinancialKnowledgeBase(): FinancialKnowledgeBase {
  if (!knowledgeBaseInstance) {
    knowledgeBaseInstance = new FinancialKnowledgeBase();
  }
  return knowledgeBaseInstance;
}
