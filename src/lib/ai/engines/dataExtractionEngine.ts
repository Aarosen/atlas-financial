/**
 * DATA EXTRACTION ENGINE
 * 
 * Deterministically extracts financial data from user messages.
 * 100% deterministic - regex-based extraction.
 * Handles edge cases: $0 values, "k" notation, ranges, etc.
 */

import type { ExtractedFinancialData, ExtractionResult, Message } from './types';

export class DataExtractionEngine {
  /**
   * Extract financial data from user message and conversation history
   */
  extractFinancialData(
    userMessage: string,
    conversationHistory: Message[]
  ): ExtractionResult {
    const data: ExtractedFinancialData = {};
    const uncertainFields: string[] = [];
    let confidence = 1.0;

    // Combine all messages for context
    const allText = [userMessage, ...conversationHistory.map(m => m.content)].join(' ');

    // Extract income - more flexible pattern
    const incomeMatch = this.extractCurrency(allText, /(?:income|earn|make|salary|wage|pay)[\s\w]*?(\$?[\d,]+(?:\.\d{2})?k?)\s*(?:per month|\/month|monthly|a month|\/mo|\/yr|per year)/i);
    if (incomeMatch !== null) {
      data.monthlyIncome = incomeMatch;
    }

    // Extract essential expenses - strict pattern for rent, utilities, food, bills, essentials
    const essentialMatch = this.extractCurrency(allText, /(?:my\s+)?(?:rent|essential|utilities|groceries|food|bills|expenses)\s+(?:is|are)\s+(\$?[\d,]+(?:\.\d{2})?k?)\s*(?:per month|\/month|monthly|a month|\/mo)?|(?:essential\s+)?expenses\s+are\s+(\$?[\d,]+(?:\.\d{2})?k?)\s*(?:per month|\/month|monthly|a month|\/mo)?|(?:spend|spend on)\s+(\$?[\d,]+(?:\.\d{2})?k?)\s+(?:per month\s+)?on\s+essentials/i);
    if (essentialMatch !== null) {
      data.essentialExpenses = essentialMatch;
    }

    // Extract discretionary expenses - strict pattern for entertainment, dining, shopping
    const discretionaryMatch = this.extractCurrency(allText, /(?:spend|spend on)\s+(\$?[\d,]+(?:\.\d{2})?k?)\s+(?:on\s+)?(?:entertainment|dining|shopping|hobbies)\s+(?:per month|\/month|monthly|a month|\/mo)?/i);
    if (discretionaryMatch !== null) {
      data.discretionaryExpenses = discretionaryMatch;
    }

    // Extract total savings - more flexible pattern
    const savingsMatch = this.extractCurrency(allText, /(?:savings|saved|have|emergency fund)[\s\w]*?(\$?[\d,]+(?:\.\d{2})?k?)/i);
    if (savingsMatch !== null) {
      data.totalSavings = savingsMatch;
    }

    // Extract high-interest debt - strict pattern for credit card debt
    const highDebtMatch = this.extractCurrency(allText, /\$?(\d+(?:,\d{3})*(?:\.\d{2})?k?)\s*(?:in credit card debt|credit card debt|high.?interest debt)/i);
    if (highDebtMatch !== null) {
      data.highInterestDebt = highDebtMatch;
    }

    // Extract high-interest rate - strict pattern for APR
    const highRateMatch = this.extractPercentage(allText, /(\d+(?:\.\d{1,2})?)\s*%\s*(?:apr|apr|interest rate|apy)/i);
    if (highRateMatch !== null) {
      data.highInterestRate = highRateMatch;
    }

    // Extract low-interest debt - strict pattern for student loan
    const lowDebtMatch = this.extractCurrency(allText, /\$?(\d+(?:,\d{3})*(?:\.\d{2})?k?)\s*(?:student loan|mortgage|car loan)/i);
    if (lowDebtMatch !== null) {
      data.lowInterestDebt = lowDebtMatch;
    }

    // Extract low-interest rate
    const lowRateMatch = this.extractPercentage(allText, /(?:student loan|mortgage|car loan)[\s\w]*?(\d+(?:\.\d{1,2})?)\s*%/i);
    if (lowRateMatch !== null) {
      data.lowInterestRate = lowRateMatch;
    }

    // Extract time horizon - strict pattern for years
    const timeMatch = this.extractNumber(allText, /(\d+)\s*(?:years?|yrs?)\s*(?:until|before|from now|ago)?/i);
    if (timeMatch !== null) {
      data.timeHorizonYears = timeMatch;
    }

    // Extract risk tolerance
    if (/cautious|conservative|risk.?averse|safe/i.test(allText)) {
      data.riskTolerance = 'cautious';
    } else if (/balanced|moderate/i.test(allText)) {
      data.riskTolerance = 'balanced';
    } else if (/growth|aggressive|risk.?tolerant|willing to take risk/i.test(allText)) {
      data.riskTolerance = 'growth';
    }

    // Extract primary goal
    if (/stability|preserve|safe|security/i.test(allText)) {
      data.primaryGoal = 'stability';
    } else if (/growth|wealth|build|increase/i.test(allText)) {
      data.primaryGoal = 'growth';
    } else if (/flexibility|access|liquid|available/i.test(allText)) {
      data.primaryGoal = 'flexibility';
    } else if (/wealth.?building|long.?term|retire/i.test(allText)) {
      data.primaryGoal = 'wealth_building';
    }

    // Calculate confidence based on data completeness
    const fieldsProvided = Object.values(data).filter(v => v !== undefined).length;
    confidence = Math.min(1.0, fieldsProvided / 9); // 9 possible fields

    return {
      data,
      confidence,
      uncertainFields,
      timestamp: Date.now(),
    };
  }

  /**
   * Extract currency amount from text
   * Handles: $5000, $5,000, 5000, 5k, 5K
   */
  private extractCurrency(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match) return null;

    // Handle multiple capture groups - use first non-undefined group
    let amount = match[1] || match[2] || match[3];
    if (!amount) return null;

    // Handle "k" notation (e.g., "5k" = 5000)
    if (/k$/i.test(amount)) {
      amount = amount.replace(/k$/i, '');
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? null : parsed * 1000;
    }

    // Remove currency symbols and commas
    amount = amount.replace(/[$,]/g, '');

    const parsed = parseFloat(amount);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Extract percentage from text
   */
  private extractPercentage(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match || !match[1]) return null;

    const parsed = parseFloat(match[1]);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Extract number from text
   */
  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match || !match[1]) return null;

    const parsed = parseInt(match[1], 10);
    return isNaN(parsed) ? null : parsed;
  }
}

// Export singleton instance
export const dataExtractionEngine = new DataExtractionEngine();
