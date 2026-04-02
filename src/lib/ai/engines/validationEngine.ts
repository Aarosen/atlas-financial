/**
 * VALIDATION ENGINE
 * 
 * Deterministically validates extracted financial data.
 * 100% deterministic - threshold-based validation.
 * Catches errors before they propagate.
 */

import type { ExtractedFinancialData, ValidationResult, ValidationIssue } from './types';

export class ValidationEngine {
  /**
   * Validate financial data for plausibility
   */
  validateFinancialData(data: ExtractedFinancialData): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Validate income
    if (data.monthlyIncome !== undefined) {
      if (data.monthlyIncome < 0) {
        issues.push({
          field: 'monthlyIncome',
          issue: 'Income cannot be negative',
          severity: 'error',
          suggestedValue: 0,
        });
      }
      if (data.monthlyIncome > 1000000) {
        issues.push({
          field: 'monthlyIncome',
          issue: 'Income seems unusually high (>$1M/month). Please verify.',
          severity: 'warning',
        });
      }
    }

    // Validate expenses
    if (data.essentialExpenses !== undefined) {
      if (data.essentialExpenses < 0) {
        issues.push({
          field: 'essentialExpenses',
          issue: 'Expenses cannot be negative',
          severity: 'error',
          suggestedValue: 0,
        });
      }
      if (data.essentialExpenses > 500000) {
        issues.push({
          field: 'essentialExpenses',
          issue: 'Essential expenses seem unusually high (>$500k/month). Please verify.',
          severity: 'warning',
        });
      }
    }

    // Validate discretionary expenses
    if (data.discretionaryExpenses !== undefined) {
      if (data.discretionaryExpenses < 0) {
        issues.push({
          field: 'discretionaryExpenses',
          issue: 'Discretionary expenses cannot be negative',
          severity: 'error',
          suggestedValue: 0,
        });
      }
    }

    // Validate savings
    if (data.totalSavings !== undefined) {
      if (data.totalSavings < 0) {
        issues.push({
          field: 'totalSavings',
          issue: 'Savings cannot be negative',
          severity: 'error',
          suggestedValue: 0,
        });
      }
      if (data.totalSavings > 100000000) {
        issues.push({
          field: 'totalSavings',
          issue: 'Savings seem unusually high (>$100M). Please verify.',
          severity: 'warning',
        });
      }
    }

    // Validate debt
    if (data.highInterestDebt !== undefined) {
      if (data.highInterestDebt < 0) {
        issues.push({
          field: 'highInterestDebt',
          issue: 'Debt cannot be negative',
          severity: 'error',
          suggestedValue: 0,
        });
      }
    }

    if (data.lowInterestDebt !== undefined) {
      if (data.lowInterestDebt < 0) {
        issues.push({
          field: 'lowInterestDebt',
          issue: 'Debt cannot be negative',
          severity: 'error',
          suggestedValue: 0,
        });
      }
    }

    // Validate interest rates
    if (data.highInterestRate !== undefined) {
      if (data.highInterestRate < 0 || data.highInterestRate > 100) {
        issues.push({
          field: 'highInterestRate',
          issue: 'Interest rate should be between 0% and 100%',
          severity: 'warning',
        });
      }
    }

    if (data.lowInterestRate !== undefined) {
      if (data.lowInterestRate < 0 || data.lowInterestRate > 100) {
        issues.push({
          field: 'lowInterestRate',
          issue: 'Interest rate should be between 0% and 100%',
          severity: 'warning',
        });
      }
    }

    // Validate time horizon
    if (data.timeHorizonYears !== undefined) {
      if (data.timeHorizonYears < 0) {
        issues.push({
          field: 'timeHorizonYears',
          issue: 'Time horizon cannot be negative',
          severity: 'error',
          suggestedValue: 0,
        });
      }
      if (data.timeHorizonYears > 100) {
        issues.push({
          field: 'timeHorizonYears',
          issue: 'Time horizon seems unusually long (>100 years). Please verify.',
          severity: 'warning',
        });
      }
    }

    // Cross-field validation: Income >= Expenses
    if (
      data.monthlyIncome !== undefined &&
      data.essentialExpenses !== undefined &&
      data.monthlyIncome < data.essentialExpenses
    ) {
      issues.push({
        field: 'monthlyIncome',
        issue: `Income ($${data.monthlyIncome}) is less than essential expenses ($${data.essentialExpenses}). This indicates a critical shortfall.`,
        severity: 'error',
      });
    }

    // Cross-field validation: Savings <= (Income - Expenses) * 12
    if (
      data.monthlyIncome !== undefined &&
      data.essentialExpenses !== undefined &&
      data.totalSavings !== undefined &&
      data.totalSavings > (data.monthlyIncome - data.essentialExpenses) * 12 * 10
    ) {
      issues.push({
        field: 'totalSavings',
        issue: 'Savings seem unusually high relative to income. Please verify.',
        severity: 'warning',
      });
    }

    // Determine if validation passed
    const hasErrors = issues.some(i => i.severity === 'error');
    const requiresConfirmation = issues.some(i => i.severity === 'warning');

    return {
      isValid: !hasErrors,
      issues,
      requiresUserConfirmation: requiresConfirmation,
    };
  }
}

// Export singleton instance
export const validationEngine = new ValidationEngine();
