/**
 * Improved Data Extraction Engine
 * Handles extraction of financial data from natural language with high precision
 * Supports slang, approximations, multiple formats, and cross-validation
 */

export interface ExtractionResult {
  value: number | null;
  confidence: number; // 0-1
  format: string; // e.g., "monthly", "annual", "range"
  rawInput: string;
  warnings: string[];
}

export interface ExtractionContext {
  field: string;
  userText: string;
  previousContext?: Record<string, number>;
}

const SLANG_MAPPINGS: Record<string, number> = {
  broke: 0,
  stash: 1,
  gig: 1,
  side_hustle: 1,
  hustle: 1,
  paycheck: 1,
  salary: 1,
  wage: 1,
  rent: 1,
  mortgage: 1,
  utilities: 1,
  groceries: 1,
  food: 1,
  debt: 1,
  loan: 1,
  credit_card: 1,
  cc: 1,
  savings: 1,
  emergency_fund: 1,
  buffer: 1,
};

export class ImprovedDataExtractor {
  /**
   * Extract numeric value from text with high precision
   */
  extractNumber(text: string): ExtractionResult {
    const cleanText = text.toLowerCase().trim();
    const warnings: string[] = [];

    // Pattern 1: Dollar amounts with various formats
    const dollarPatterns = [
      /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(?:k|thousand)?/i,
      /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|usd)/i,
      /(?:about|around|approximately|roughly|~)\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:k|thousand)?/i,
    ];

    for (const pattern of dollarPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let value = parseFloat(match[1].replace(/,/g, ''));
        if (/k|thousand/i.test(match[0])) {
          value *= 1000;
        }
        return {
          value,
          confidence: /^(?:about|around|approximately|roughly|~)/.test(match[0]) ? 0.85 : 0.95,
          format: 'absolute',
          rawInput: match[0],
          warnings,
        };
      }
    }

    // Pattern 2: Percentage values
    const percentPattern = /(\d+(?:\.\d+)?)\s*%/;
    const percentMatch = cleanText.match(percentPattern);
    if (percentMatch) {
      return {
        value: parseFloat(percentMatch[1]),
        confidence: 0.95,
        format: 'percentage',
        rawInput: percentMatch[0],
        warnings,
      };
    }

    // Pattern 3: Range values (use midpoint)
    const rangePattern = /(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(\d+(?:\.\d+)?)/;
    const rangeMatch = cleanText.match(rangePattern);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      const midpoint = (min + max) / 2;
      warnings.push('Range detected; using midpoint value');
      return {
        value: midpoint,
        confidence: 0.75,
        format: 'range',
        rawInput: rangeMatch[0],
        warnings,
      };
    }

    // Pattern 4: Frequency-based amounts (monthly, annual, etc.)
    const frequencyPatterns = [
      { regex: /(\d+(?:\.\d+)?)\s*(?:per\s*)?month|\/mo|a\s*month/i, multiplier: 1, format: 'monthly' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:per\s*)?year|\/yr|a\s*year|annually/i, multiplier: 1 / 12, format: 'annual' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:per\s*)?week|\/wk|a\s*week/i, multiplier: 4.33, format: 'weekly' },
      { regex: /(\d+(?:\.\d+)?)\s*(?:per\s*)?hour|\/hr|an\s*hour/i, multiplier: 160, format: 'hourly' }, // 40 hrs/week
    ];

    for (const { regex, multiplier, format } of frequencyPatterns) {
      const match = cleanText.match(regex);
      if (match) {
        const value = parseFloat(match[1]) * multiplier;
        return {
          value,
          confidence: 0.9,
          format,
          rawInput: match[0],
          warnings,
        };
      }
    }

    // Pattern 5: No savings/debt indicators
    if (/no\s+(?:savings?|debt|money|cash)|zero|nothing|broke|flat broke/.test(cleanText)) {
      return {
        value: 0,
        confidence: 0.95,
        format: 'absolute',
        rawInput: cleanText,
        warnings: ['User explicitly stated zero'],
      };
    }

    return {
      value: null,
      confidence: 0,
      format: 'unknown',
      rawInput: text,
      warnings: ['Could not extract numeric value'],
    };
  }

  /**
   * Extract with confirmation prompt if confidence is low
   */
  shouldConfirmExtraction(result: ExtractionResult): boolean {
    return result.confidence < 0.85 && result.value !== null;
  }

  /**
   * Generate confirmation prompt
   */
  generateConfirmationPrompt(field: string, result: ExtractionResult): string {
    const fieldLabels: Record<string, string> = {
      monthlyIncome: 'monthly take-home income',
      essentialExpenses: 'monthly essential expenses',
      totalSavings: 'total savings',
      highInterestDebt: 'high-interest debt',
      lowInterestDebt: 'low-interest debt',
    };

    const label = fieldLabels[field] || field;
    const value = result.value?.toLocaleString() || 'unknown';

    return `So you're saying your ${label} is about $${value}? Just want to make sure I got that right.`;
  }

  /**
   * Detect contradictions in extracted data
   */
  detectContradictions(extracted: Record<string, number>): string[] {
    const contradictions: string[] = [];

    // Check if income is less than essential expenses
    if (extracted.monthlyIncome && extracted.essentialExpenses && extracted.monthlyIncome < extracted.essentialExpenses) {
      contradictions.push(
        `Your essential expenses ($${extracted.essentialExpenses}) exceed your income ($${extracted.monthlyIncome}). Let's clarify these numbers.`
      );
    }

    // Check if total debt exceeds reasonable amount relative to income
    const totalDebt = (extracted.highInterestDebt || 0) + (extracted.lowInterestDebt || 0);
    if (extracted.monthlyIncome && totalDebt > extracted.monthlyIncome * 36) {
      contradictions.push(
        `Your total debt ($${totalDebt.toLocaleString()}) is very high relative to your income. Let's review this carefully.`
      );
    }

    return contradictions;
  }

  /**
   * Extract multiple fields from a single message
   */
  extractMultipleFields(
    text: string,
    fieldsToExtract: string[]
  ): Record<string, ExtractionResult> {
    const results: Record<string, ExtractionResult> = {};

    // Income patterns
    if (fieldsToExtract.includes('monthlyIncome')) {
      const incomePatterns = [
        /(?:make|earn|salary|income|take.home|bring.in)[^\d$]*(\$?[\d,]+(?:\.\d+)?(?:\s*k|thousand)?)/i,
        /(\$?[\d,]+(?:\.\d+)?(?:\s*k|thousand)?)\s*(?:per.month|\/mo|a.month|monthly)/i,
      ];

      for (const pattern of incomePatterns) {
        const match = text.match(pattern);
        if (match) {
          results.monthlyIncome = this.extractNumber(match[1]);
          break;
        }
      }
    }

    // Expenses patterns
    if (fieldsToExtract.includes('essentialExpenses')) {
      const expensePatterns = [
        /(?:spend|expense|rent|bill|essential)[^\d$]*(\$?[\d,]+(?:\.\d+)?)/i,
        /(?:rent|mortgage)[^\d$]*(\$?[\d,]+(?:\.\d+)?)/i,
      ];

      for (const pattern of expensePatterns) {
        const match = text.match(pattern);
        if (match) {
          results.essentialExpenses = this.extractNumber(match[1]);
          break;
        }
      }
    }

    // Savings patterns
    if (fieldsToExtract.includes('totalSavings')) {
      const savingsPatterns = [
        /(?:saved?|savings?|emergency)[^\d$]*(\$?[\d,]+(?:\.\d+)?(?:\s*k|thousand)?)/i,
        /(\$?[\d,]+(?:\.\d+)?(?:\s*k|thousand)?)\s*(?:saved?|in.savings)/i,
      ];

      for (const pattern of savingsPatterns) {
        const match = text.match(pattern);
        if (match) {
          results.totalSavings = this.extractNumber(match[1]);
          break;
        }
      }
    }

    // Debt patterns
    if (fieldsToExtract.includes('highInterestDebt')) {
      const debtPattern = /(?:credit.card|high.interest)[^\d$]*(\$?[\d,]+(?:\.\d+)?(?:\s*k|thousand)?)/i;
      const match = text.match(debtPattern);
      if (match) {
        results.highInterestDebt = this.extractNumber(match[1]);
      }
    }

    if (fieldsToExtract.includes('lowInterestDebt')) {
      const debtPattern = /(?:student.loan|car.loan|mortgage)[^\d$]*(\$?[\d,]+(?:\.\d+)?(?:\s*k|thousand)?)/i;
      const match = text.match(debtPattern);
      if (match) {
        results.lowInterestDebt = this.extractNumber(match[1]);
      }
    }

    return results;
  }
}

export const improvedDataExtractor = new ImprovedDataExtractor();
