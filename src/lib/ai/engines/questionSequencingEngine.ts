/**
 * QUESTION SEQUENCING ENGINE
 * 
 * Deterministically decides what to ask next.
 * 100% deterministic - priority-based sequencing.
 * Same input always produces same output.
 */

import type { NextQuestion, ExtractedFinancialData, FinancialDecision, Message } from './types';

export class QuestionSequencingEngine {
  /**
   * Priority order for financial data collection
   */
  private readonly FIELD_PRIORITY = [
    { field: 'monthlyIncome', priority: 1, question: 'What is your monthly income (before taxes)?' },
    { field: 'essentialExpenses', priority: 2, question: 'What are your essential monthly expenses (rent, utilities, food, insurance)?' },
    { field: 'totalSavings', priority: 3, question: 'How much do you have in savings right now?' },
    { field: 'highInterestDebt', priority: 4, question: 'Do you have any high-interest debt (credit cards, personal loans)? If so, how much?' },
    { field: 'lowInterestDebt', priority: 5, question: 'Do you have any low-interest debt (student loans, mortgages)? If so, how much?' },
    { field: 'discretionaryExpenses', priority: 6, question: 'What are your discretionary monthly expenses (entertainment, dining out, shopping)?' },
    { field: 'riskTolerance', priority: 7, question: 'How do you feel about investment risk? (cautious, balanced, or growth-oriented)' },
    { field: 'timeHorizonYears', priority: 8, question: 'What is your time horizon for this goal (in years)?' },
    { field: 'primaryGoal', priority: 9, question: 'What is your primary financial goal? (stability, growth, flexibility, or wealth building)' },
  ];

  /**
   * Get the next question to ask
   * 
   * Returns null if all required fields are collected
   */
  getNextQuestion(
    data: ExtractedFinancialData,
    decision: FinancialDecision,
    conversationHistory: Message[]
  ): NextQuestion | null {
    // Find the first missing required field
    for (const requiredField of decision.requiredFields) {
      if (!this.hasField(data, requiredField)) {
        const fieldConfig = this.FIELD_PRIORITY.find(f => f.field === requiredField);
        if (fieldConfig) {
          return {
            field: requiredField,
            question: fieldConfig.question,
            context: `To help you with ${decision.domain}, I need to know your ${requiredField}.`,
            priority: fieldConfig.priority,
            helpText: this.getHelpText(requiredField),
          };
        }
      }
    }

    // All required fields collected
    return null;
  }

  /**
   * Check if a field has been provided
   */
  private hasField(data: ExtractedFinancialData, field: string): boolean {
    const value = (data as any)[field];
    return value !== undefined && value !== null && value !== '';
  }

  /**
   * Get help text for a field
   */
  private getHelpText(field: string): string {
    const helpTexts: Record<string, string> = {
      monthlyIncome: 'Include all sources of income (salary, side gigs, investments, etc.)',
      essentialExpenses: 'Include rent/mortgage, utilities, groceries, insurance, transportation',
      totalSavings: 'Include savings accounts, emergency fund, and other liquid savings',
      highInterestDebt: 'Credit cards, personal loans, payday loans (typically >10% APR)',
      lowInterestDebt: 'Student loans, mortgages, car loans (typically <10% APR)',
      discretionaryExpenses: 'Entertainment, dining out, shopping, hobbies, subscriptions',
      riskTolerance: 'Cautious = prefer safety, Balanced = mix of safety and growth, Growth = willing to take risks',
      timeHorizonYears: 'How many years until you need this money?',
      primaryGoal: 'Stability = preserve capital, Growth = increase wealth, Flexibility = access to funds, Wealth building = long-term growth',
    };
    return helpTexts[field] || '';
  }
}

// Export singleton instance
export const questionSequencingEngine = new QuestionSequencingEngine();
