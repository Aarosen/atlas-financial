/**
 * Input validation layer for financial numbers
 * Prevents implausible values from being silently accepted
 */

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

export interface FinancialSnapshot {
  monthlyIncome?: number;
  essentialExpenses?: number;
  discretionaryExpenses?: number;
  totalSavings?: number;
  highInterestDebt?: number;
  lowInterestDebt?: number;
}

/**
 * Validate financial snapshot for implausible values
 */
export function validateFinancialSnapshot(snapshot: FinancialSnapshot): ValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const income = snapshot.monthlyIncome || 0;
  const essentialExpenses = snapshot.essentialExpenses || 0;
  const discretionaryExpenses = snapshot.discretionaryExpenses || 0;
  const totalExpenses = essentialExpenses + discretionaryExpenses;
  const savings = snapshot.totalSavings || 0;
  const highDebt = snapshot.highInterestDebt || 0;
  const lowDebt = snapshot.lowInterestDebt || 0;
  const totalDebt = highDebt + lowDebt;

  // Check for implausible income values
  if (income > 0 && income < 500) {
    issues.push('Monthly income seems very low ($' + income.toLocaleString() + ')');
    suggestions.push('Is this correct? Most full-time jobs pay at least $1,500/month.');
  }

  if (income > 500000) {
    issues.push('Monthly income seems very high ($' + income.toLocaleString() + ')');
    suggestions.push('Did you mean annual income? Or is this a special situation?');
  }

  // Check for expenses > income (unsustainable)
  if (income > 0 && totalExpenses > income * 1.5) {
    issues.push('Monthly expenses ($' + totalExpenses.toLocaleString() + ') exceed income by a lot');
    suggestions.push('This is unsustainable. Are you spending from savings? Or is one of these numbers wrong?');
  }

  // Check for implausible debt amounts
  if (totalDebt > 0 && totalDebt > income * 100) {
    issues.push('Total debt ($' + totalDebt.toLocaleString() + ') is extremely high relative to income');
    suggestions.push('This would take 100+ years to pay off. Is this number correct?');
  }

  // Check for negative surplus with no debt
  if (income > 0 && totalExpenses > income && totalDebt === 0) {
    issues.push('You spend more than you earn but have no debt');
    suggestions.push('Where is the extra money coming from? Savings? Loans? Family support?');
  }

  // Check for unrealistic savings with negative surplus
  if (savings > 0 && income > 0 && totalExpenses > income) {
    const monthsToDeplete = savings / (totalExpenses - income);
    if (monthsToDeplete < 12) {
      suggestions.push(
        'At your current spending, your savings will run out in about ' +
          Math.round(monthsToDeplete) +
          ' months. This is urgent.'
      );
    }
  }

  // Check for zero income but positive expenses
  if (income === 0 && totalExpenses > 0) {
    issues.push('You have no income but have monthly expenses');
    suggestions.push('How are you covering these expenses? Savings? Unemployment? Family support?');
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}

/**
 * Generate validation prompt for Claude to ask clarifying questions
 */
export function buildValidationPrompt(validation: ValidationResult): string {
  if (validation.isValid) {
    return '';
  }

  const issueText = validation.issues.join('\n- ');
  const suggestionText = validation.suggestions.join('\n- ');

  return `VALIDATION_ISSUES:\n- ${issueText}\n\nBefore proceeding with analysis, ask the user to clarify these issues:\n- ${suggestionText}`;
}
