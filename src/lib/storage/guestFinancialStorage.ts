// REM-31-G: Guest user localStorage persistence
// Allows guest users to have minimal cross-session memory without authentication
// Stores financial data in localStorage under 'atlas_guest_fin' key

import type { FinancialState } from '@/lib/state/types';

const GUEST_FIN_KEY = 'atlas_guest_fin';

export function saveGuestFinancialData(fin: Partial<FinancialState>): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Only save meaningful financial data (non-zero, non-null values)
    const toSave: Partial<FinancialState> = {};
    
    if (fin.monthlyIncome && fin.monthlyIncome > 0) {
      toSave.monthlyIncome = fin.monthlyIncome;
    }
    if (fin.essentialExpenses && fin.essentialExpenses > 0) {
      toSave.essentialExpenses = fin.essentialExpenses;
    }
    if (fin.totalSavings !== undefined && fin.totalSavings !== null) {
      toSave.totalSavings = fin.totalSavings;
    }
    if (fin.highInterestDebt && fin.highInterestDebt > 0) {
      toSave.highInterestDebt = fin.highInterestDebt;
    }
    if (fin.highInterestDebtAPR && fin.highInterestDebtAPR > 0) {
      toSave.highInterestDebtAPR = fin.highInterestDebtAPR;
    }
    if (fin.lowInterestDebt && fin.lowInterestDebt > 0) {
      toSave.lowInterestDebt = fin.lowInterestDebt;
    }
    if (fin.primaryGoal) {
      toSave.primaryGoal = fin.primaryGoal;
    }
    
    if (Object.keys(toSave).length > 0) {
      localStorage.setItem(GUEST_FIN_KEY, JSON.stringify(toSave));
    }
  } catch (e) {
    console.warn('[guest-storage] Failed to save financial data:', e);
  }
}

export function loadGuestFinancialData(): Partial<FinancialState> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(GUEST_FIN_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as Partial<FinancialState>;
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch (e) {
    console.warn('[guest-storage] Failed to load financial data:', e);
    return null;
  }
}

export function clearGuestFinancialData(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(GUEST_FIN_KEY);
  } catch (e) {
    console.warn('[guest-storage] Failed to clear financial data:', e);
  }
}
