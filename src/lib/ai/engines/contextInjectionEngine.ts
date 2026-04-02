/**
 * CONTEXT INJECTION ENGINE
 * 
 * Deterministically builds context blocks for system prompt.
 * 100% deterministic - no LLM calls.
 * Manages token budget and priority ordering.
 */

import type {
  ContextBlock,
  ExtractedFinancialData,
  FinancialDecision,
  Message,
  Goal,
} from './types';

export class ContextInjectionEngine {
  private readonly MAX_CONTEXT_TOKENS = 4000; // Conservative estimate: 1 token ≈ 4 chars
  private readonly MAX_CONTEXT_CHARS = this.MAX_CONTEXT_TOKENS * 4;

  /**
   * Build context blocks for system prompt
   * 
   * Priority order:
   * 1. ATLAS_SYSTEM_PROMPT (core rules)
   * 2. SESSION_STATE (conversation history, goals)
   * 3. CALCULATION_RESULTS (deterministic math)
   * 4. STRATEGY_CONTEXT (baseline strategy)
   * 5. MULTI_GOAL_CONTEXT (active goals)
   * 6. FINANCIAL_KNOWLEDGE (educational context)
   * 7. USER_MEMORY (prior conversation context)
   */
  buildContextBlocks(
    data: ExtractedFinancialData,
    decision: FinancialDecision,
    conversationHistory: Message[],
    priorGoals: Goal[]
  ): ContextBlock[] {
    const blocks: ContextBlock[] = [];
    let totalChars = 0;

    // 1. SESSION STATE BLOCK
    const sessionStateBlock = this.buildSessionStateBlock(data, decision, conversationHistory);
    if (totalChars + sessionStateBlock.characterCount <= this.MAX_CONTEXT_CHARS) {
      blocks.push(sessionStateBlock);
      totalChars += sessionStateBlock.characterCount;
    }

    // 2. FINANCIAL KNOWLEDGE BLOCK
    const knowledgeBlock = this.buildFinancialKnowledgeBlock(decision);
    if (totalChars + knowledgeBlock.characterCount <= this.MAX_CONTEXT_CHARS) {
      blocks.push(knowledgeBlock);
      totalChars += knowledgeBlock.characterCount;
    }

    // 3. GOAL CONTEXT BLOCK
    if (priorGoals.length > 0) {
      const goalBlock = this.buildGoalContextBlock(priorGoals);
      if (totalChars + goalBlock.characterCount <= this.MAX_CONTEXT_CHARS) {
        blocks.push(goalBlock);
        totalChars += goalBlock.characterCount;
      }
    }

    // 4. USER MEMORY BLOCK
    const memoryBlock = this.buildUserMemoryBlock(conversationHistory);
    if (totalChars + memoryBlock.characterCount <= this.MAX_CONTEXT_CHARS) {
      blocks.push(memoryBlock);
      totalChars += memoryBlock.characterCount;
    }

    return blocks;
  }

  /**
   * Build session state context block
   */
  private buildSessionStateBlock(
    data: ExtractedFinancialData,
    decision: FinancialDecision,
    conversationHistory: Message[]
  ): ContextBlock {
    const lines: string[] = [
      '[SESSION_STATE]',
      `Financial Domain: ${decision.domain}`,
      `Urgency: ${decision.urgency}`,
      `Confidence: ${(decision.confidence * 100).toFixed(0)}%`,
    ];

    if (data.monthlyIncome !== undefined) {
      lines.push(`Monthly Income: $${data.monthlyIncome.toLocaleString()}`);
    }
    if (data.essentialExpenses !== undefined) {
      lines.push(`Essential Expenses: $${data.essentialExpenses.toLocaleString()}`);
    }
    if (data.totalSavings !== undefined) {
      lines.push(`Total Savings: $${data.totalSavings.toLocaleString()}`);
    }
    if (data.highInterestDebt !== undefined && data.highInterestDebt > 0) {
      lines.push(`High-Interest Debt: $${data.highInterestDebt.toLocaleString()} @ ${data.highInterestRate || 18}% APR`);
    }
    if (data.lowInterestDebt !== undefined && data.lowInterestDebt > 0) {
      lines.push(`Low-Interest Debt: $${data.lowInterestDebt.toLocaleString()} @ ${data.lowInterestRate || 5}% APR`);
    }

    lines.push(`Messages in Conversation: ${conversationHistory.length}`);
    lines.push(`Missing Fields: ${decision.missingFields.join(', ') || 'none'}`);

    const content = lines.join('\n');

    return {
      name: 'SESSION_STATE',
      content,
      priority: 1,
      characterCount: content.length,
      type: 'state',
    };
  }

  /**
   * Build financial knowledge context block
   */
  private buildFinancialKnowledgeBlock(decision: FinancialDecision): ContextBlock {
    const knowledgeMap: Record<string, string> = {
      emergency_fund: `Emergency Fund Guidance:
- Target: 3-6 months of essential expenses
- Purpose: Financial safety net for unexpected events
- Where to keep: High-yield savings account (liquid, safe)
- Priority: Build before investing or paying down low-interest debt`,

      debt_payoff: `Debt Payoff Strategies:
- Avalanche Method: Pay highest interest rate first (saves most money)
- Snowball Method: Pay smallest balance first (psychological wins)
- Both methods work - choose what motivates you
- Focus on high-interest debt (>10% APR) first`,

      budget: `Budgeting Framework:
- 50/30/20 Rule: 50% essential, 30% discretionary, 20% savings
- Track spending in categories to identify patterns
- Adjust as needed based on your situation
- Review monthly to stay on track`,

      investment: `Investment Fundamentals:
- Diversification: Spread investments across asset classes
- Time Horizon: Longer horizon = more risk tolerance
- Dollar-Cost Averaging: Invest regularly over time
- Compound Interest: Start early to maximize growth`,

      retirement: `Retirement Planning:
- FIRE Number: 25x annual expenses (4% withdrawal rule)
- Retirement Accounts: 401k, IRA, Roth IRA (tax advantages)
- Social Security: Supplement, not primary source
- Healthcare: Plan for pre-Medicare years`,

      general: `Financial Wellness:
- Build emergency fund first
- Pay off high-interest debt
- Create a budget to track spending
- Start investing for long-term goals`,
    };

    const content = knowledgeMap[decision.domain] || knowledgeMap.general;

    return {
      name: 'FINANCIAL_KNOWLEDGE',
      content: `[FINANCIAL_KNOWLEDGE]\n${content}`,
      priority: 3,
      characterCount: content.length + 23,
      type: 'knowledge',
    };
  }

  /**
   * Build goal context block
   */
  private buildGoalContextBlock(goals: Goal[]): ContextBlock {
    const lines: string[] = ['[GOAL_CONTEXT]', `Active Goals: ${goals.length}`];

    for (const goal of goals) {
      lines.push(`- ${goal.type} (${goal.status}, priority: ${goal.priority})`);
    }

    const content = lines.join('\n');

    return {
      name: 'GOAL_CONTEXT',
      content,
      priority: 4,
      characterCount: content.length,
      type: 'goal',
    };
  }

  /**
   * Build user memory context block
   */
  private buildUserMemoryBlock(conversationHistory: Message[]): ContextBlock {
    const lines: string[] = ['[USER_MEMORY]'];

    // Extract key facts from conversation
    const userMessages = conversationHistory.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      lines.push(`User has asked ${userMessages.length} questions`);
      lines.push('Key topics discussed:');

      // Extract topics from messages
      const topics = new Set<string>();
      for (const msg of userMessages) {
        if (/emergency|fund|save/i.test(msg.content)) topics.add('emergency fund');
        if (/debt|loan|credit/i.test(msg.content)) topics.add('debt payoff');
        if (/budget|spend|expense/i.test(msg.content)) topics.add('budgeting');
        if (/invest|stock|portfolio/i.test(msg.content)) topics.add('investing');
        if (/retire|retirement|fire/i.test(msg.content)) topics.add('retirement');
      }

      for (const topic of Array.from(topics).slice(0, 3)) {
        lines.push(`- ${topic}`);
      }
    }

    const content = lines.join('\n');

    return {
      name: 'USER_MEMORY',
      content,
      priority: 5,
      characterCount: content.length,
      type: 'memory',
    };
  }
}

// Export singleton instance
export const contextInjectionEngine = new ContextInjectionEngine();
