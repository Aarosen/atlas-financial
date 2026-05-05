/**
 * TASK 1.4: Field correction handler
 * Processes single-field edits and generates confirmation messages
 */

import type { FinancialState } from '@/lib/state/types';

export interface FieldCorrection {
  field: keyof FinancialState;
  previousValue: number | string | null;
  newValue: number | string;
  displayLabel: string;
}

const FIELD_LABELS: Record<keyof FinancialState, string> = {
  monthlyIncome: 'monthly income',
  essentialExpenses: 'essential expenses',
  totalSavings: 'savings',
  highInterestDebt: 'high-interest debt',
  lowInterestDebt: 'low-interest debt',
  highInterestDebtAPR: 'high-interest debt APR',
  lowInterestDebtAPR: 'low-interest debt APR',
  retirementSavings: 'retirement savings',
  monthlyDebtPayments: 'monthly debt payments',
  primaryGoal: 'primary goal',
  secondaryGoal: 'secondary goal',
  riskTolerance: 'risk tolerance',
  timeHorizonYears: 'time horizon',
  proposedPayment: 'proposed payment',
  age: 'age',
};

export function buildCorrectionConfirmation(correction: FieldCorrection): string {
  const oldDisplay = correction.previousValue
    ? `$${Number(correction.previousValue).toLocaleString()}`
    : 'not set';
  const newDisplay = `$${Number(correction.newValue).toLocaleString()}`;

  return `Got it — I've updated your ${correction.displayLabel} from ${oldDisplay} to ${newDisplay}.`;
}

export function getFieldLabel(field: keyof FinancialState): string {
  return FIELD_LABELS[field] || field;
}

export function isValidFieldCorrection(
  field: keyof FinancialState,
  newValue: number | string
): boolean {
  if (typeof newValue === 'string') {
    const num = parseFloat(newValue);
    if (!Number.isFinite(num)) return false;
    newValue = num;
  }

  // Validate based on field type
  switch (field) {
    case 'monthlyIncome':
    case 'essentialExpenses':
    case 'totalSavings':
    case 'highInterestDebt':
    case 'lowInterestDebt':
    case 'retirementSavings':
    case 'monthlyDebtPayments':
    case 'proposedPayment':
      return typeof newValue === 'number' && newValue >= 0;

    case 'highInterestDebtAPR':
    case 'lowInterestDebtAPR':
      return typeof newValue === 'number' && newValue > 0 && newValue < 100;

    case 'timeHorizonYears':
      return typeof newValue === 'number' && newValue > 0 && newValue <= 100;

    case 'age':
      return typeof newValue === 'number' && newValue > 0 && newValue < 150;

    default:
      return true;
  }
}
