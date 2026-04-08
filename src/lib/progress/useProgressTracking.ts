/**
 * AUDIT 17 FIX P2: Progress Tracking
 * Lightweight client-side progress tracking using localStorage
 * Enables continuity between sessions without backend infrastructure
 */

import { useEffect, useState } from 'react';
import type { FinancialState, Strategy } from '@/lib/state/types';

export interface ProgressState {
  lastVisit: number; // timestamp
  selectedLever: string | null;
  financialSnapshot: {
    surplus: number;
    savings: number;
    hiDebt: number;
    income: number;
    expenses: number;
  };
  nextMilestone: string | null;
  daysAgo: number;
}

const STORAGE_KEY = 'atlas_progress';

export function useProgressTracking() {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ProgressState;
        // Calculate days since last visit
        const now = Date.now();
        const daysSince = Math.floor((now - parsed.lastVisit) / (1000 * 60 * 60 * 24));
        parsed.daysAgo = daysSince;
        setProgress(parsed);
      }
    } catch (e) {
      // ignore parse errors
    }
    setIsLoaded(true);
  }, []);

  // Save progress to localStorage
  const saveProgress = (fin: Partial<FinancialState>, lever: string | null) => {
    try {
      const state: ProgressState = {
        lastVisit: Date.now(),
        selectedLever: lever,
        financialSnapshot: {
          surplus: (fin.monthlyIncome || 0) - (fin.essentialExpenses || 0),
          savings: fin.totalSavings || 0,
          hiDebt: fin.highInterestDebt || 0,
          income: fin.monthlyIncome || 0,
          expenses: fin.essentialExpenses || 0,
        },
        nextMilestone: null,
        daysAgo: 0,
      };

      // Calculate next milestone based on current lever
      if (lever === 'build_emergency_buffer' && state.financialSnapshot.savings > 0) {
        const target = state.financialSnapshot.expenses * 3;
        const gap = Math.max(0, target - state.financialSnapshot.savings);
        state.nextMilestone = `Emergency fund: $${state.financialSnapshot.savings.toLocaleString()} → $${target.toLocaleString()}`;
      } else if (lever === 'eliminate_high_interest_debt' && state.financialSnapshot.hiDebt > 0) {
        state.nextMilestone = `Pay off $${state.financialSnapshot.hiDebt.toLocaleString()} high-interest debt`;
      } else if (lever === 'stabilize_cashflow') {
        state.nextMilestone = `Build monthly surplus to $${Math.round(state.financialSnapshot.expenses * 0.15).toLocaleString()}`;
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setProgress(state);
    } catch (e) {
      // ignore storage errors
    }
  };

  // Clear progress (on reset)
  const clearProgress = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setProgress(null);
    } catch (e) {
      // ignore
    }
  };

  return {
    progress,
    isLoaded,
    saveProgress,
    clearProgress,
  };
}

/**
 * Generate a progress-aware greeting for returning users
 */
export function generateProgressGreeting(progress: ProgressState | null, language: string = 'en'): string | null {
  if (!progress || progress.daysAgo === undefined || progress.daysAgo < 1) {
    return null; // Not a returning user or visited today
  }

  const greetings: Record<string, Record<number, string>> = {
    en: {
      1: `Welcome back! Last time your focus was: ${progress.selectedLever?.replace(/_/g, ' ')}. How's that going?`,
      3: `Back again! It's been a few days. Last time we were working on: ${progress.selectedLever?.replace(/_/g, ' ')}. Still on track?`,
      7: `Good to see you again! It's been a week. Let's check in on your progress with: ${progress.selectedLever?.replace(/_/g, ' ')}.`,
      30: `Welcome back! It's been a month. Let's see where you're at now and what's changed.`,
    },
    es: {
      1: `¡Bienvenido de nuevo! La última vez tu enfoque fue: ${progress.selectedLever?.replace(/_/g, ' ')}. ¿Cómo va?`,
      3: `¡De vuelta! Han pasado unos días. La última vez trabajábamos en: ${progress.selectedLever?.replace(/_/g, ' ')}. ¿Sigues en el camino?`,
      7: `¡Me alegra verte de nuevo! Ha pasado una semana. Hagamos un seguimiento de tu progreso con: ${progress.selectedLever?.replace(/_/g, ' ')}.`,
      30: `¡Bienvenido de nuevo! Ha pasado un mes. Veamos dónde estás ahora y qué ha cambiado.`,
    },
    fr: {
      1: `Re-bienvenue! La dernière fois, tu te concentrais sur: ${progress.selectedLever?.replace(/_/g, ' ')}. Comment ça va?`,
      3: `Te revoilà! Quelques jours ont passé. La dernière fois, on travaillait sur: ${progress.selectedLever?.replace(/_/g, ' ')}. Tu es toujours sur la bonne voie?`,
      7: `Content de te revoir! Une semaine a passé. Faisons le point sur tes progrès avec: ${progress.selectedLever?.replace(/_/g, ' ')}.`,
      30: `Re-bienvenue! Un mois a passé. Voyons où tu en es maintenant et ce qui a changé.`,
    },
  };

  const langGreetings = greetings[language] || greetings.en;
  
  // Select greeting based on days since last visit
  if (progress.daysAgo === 1) {
    return langGreetings[1];
  } else if (progress.daysAgo <= 3) {
    return langGreetings[3];
  } else if (progress.daysAgo <= 7) {
    return langGreetings[7];
  } else {
    return langGreetings[30];
  }
}
