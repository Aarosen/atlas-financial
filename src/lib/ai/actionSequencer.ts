import { FinancialProfile } from '@/lib/db/supabaseRepository';

export interface WaterfallPhase {
  phase: number;
  name: string;
  description: string;
  action: string;
  category: 'income' | 'savings' | 'debt_payoff' | 'invest';
  target?: (profile: FinancialProfile) => number;
  condition: (profile: FinancialProfile) => boolean;
}

export const FINANCIAL_WATERFALL: WaterfallPhase[] = [
  {
    phase: 1,
    name: 'Crisis Stabilization',
    description: 'Cover essential expenses immediately',
    action: 'Address income gap before any other financial move.',
    category: 'income',
    condition: (profile) =>
      (profile.monthly_income || 0) < (profile.essential_expenses || 0),
  },
  {
    phase: 2,
    name: 'Minimum Emergency Buffer',
    description: 'Build 1 month of essential expenses as safety buffer',
    action: 'Build 1 month of essential expenses as a minimum safety buffer before attacking debt.',
    category: 'savings',
    target: (profile) => profile.essential_expenses || 0,
    condition: (profile) =>
      (profile.total_savings || 0) / (profile.essential_expenses || 1) < 1,
  },
  {
    phase: 3,
    name: 'Eliminate High-Interest Debt',
    description: 'Attack highest-APR debt first (avalanche method)',
    action: 'Attack highest-APR debt first (avalanche method). Direct all surplus after minimum buffer.',
    category: 'debt_payoff',
    target: (profile) => profile.high_interest_debt || 0,
    condition: (profile) => (profile.high_interest_debt || 0) > 0,
  },
  {
    phase: 4,
    name: 'Full Emergency Fund',
    description: 'Build emergency fund to 3–6 months of essential expenses',
    action: 'Build emergency fund to 3–6 months of essential expenses.',
    category: 'savings',
    target: (profile) => (profile.essential_expenses || 0) * 4,
    condition: (profile) =>
      (profile.total_savings || 0) / (profile.essential_expenses || 1) < 3,
  },
  {
    phase: 5,
    name: 'Eliminate Low-Interest Debt',
    description: 'Pay off remaining low-interest debt',
    action: 'Pay off remaining low-interest debt (student loans, car loans).',
    category: 'debt_payoff',
    target: (profile) => profile.low_interest_debt || 0,
    condition: (profile) => (profile.low_interest_debt || 0) > 0,
  },
  {
    phase: 6,
    name: 'Begin Investing',
    description: 'Start with employer 401(k) match, then Roth IRA',
    action: 'Start with employer 401(k) match if available, then Roth IRA, then taxable accounts.',
    category: 'invest',
    condition: () => true,
  },
];

/**
 * Get the current phase based on financial profile
 */
export function getCurrentPhase(profile: FinancialProfile): WaterfallPhase {
  for (const phase of FINANCIAL_WATERFALL) {
    if (phase.condition(profile)) {
      return phase;
    }
  }
  // Default to last phase if all conditions are met
  return FINANCIAL_WATERFALL[FINANCIAL_WATERFALL.length - 1];
}

/**
 * Get the next phase after current
 */
export function getNextPhase(profile: FinancialProfile): WaterfallPhase | null {
  const currentPhase = getCurrentPhase(profile);
  const nextPhaseIndex = currentPhase.phase;

  if (nextPhaseIndex >= FINANCIAL_WATERFALL.length) {
    return null;
  }

  return FINANCIAL_WATERFALL[nextPhaseIndex] || null;
}

/**
 * Get a summary of the roadmap for the user
 */
export function getRoadmapSummary(profile: FinancialProfile): string {
  const currentPhase = getCurrentPhase(profile);
  const nextPhase = getNextPhase(profile);

  let summary = `Current phase: Phase ${currentPhase.phase} — ${currentPhase.name}\n`;
  summary += `  ${currentPhase.action}\n\n`;

  if (nextPhase) {
    summary += `Next phase (after current is complete): Phase ${nextPhase.phase} — ${nextPhase.name}\n`;
    summary += `  ${nextPhase.action}\n`;
  } else {
    summary += 'You are on the final phase of the financial waterfall.\n';
  }

  return summary;
}

/**
 * Build roadmap context block for system prompt
 */
export function buildRoadmapBlock(profile: FinancialProfile): string {
  const currentPhase = getCurrentPhase(profile);
  const nextPhase = getNextPhase(profile);

  let block = '━━━ ACTION ROADMAP ━━━\n';
  block += `Current phase: Phase ${currentPhase.phase} — ${currentPhase.name}\n`;
  block += `  User is working on: ${currentPhase.action}\n\n`;

  if (nextPhase) {
    block += `Next phase (after current is complete): Phase ${nextPhase.phase} — ${nextPhase.name}\n`;
    block += `  ${nextPhase.action}\n\n`;
  }

  block += `RULE: If the user asks "what's next?" or "what happens after this?" — describe the next phase\n`;
  block += `in one or two sentences. Do NOT present the full roadmap unprompted. The user is focused on\n`;
  block += `the current step. Roadmap is available if they ask.\n`;
  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}

/**
 * Detect if user has transitioned to a new phase
 * Returns the new phase if transition occurred
 */
export function detectPhaseTransition(
  previousPhase: WaterfallPhase,
  currentProfile: FinancialProfile
): WaterfallPhase | null {
  const newPhase = getCurrentPhase(currentProfile);

  if (newPhase.phase !== previousPhase.phase) {
    return newPhase;
  }

  return null;
}

/**
 * Build phase transition context block
 */
export function buildPhaseTransitionBlock(
  completedPhase: WaterfallPhase,
  newPhase: WaterfallPhase
): string {
  let block = '━━━ PHASE TRANSITION ━━━\n';
  block += `COMPLETED: Phase ${completedPhase.phase} — ${completedPhase.name}\n`;
  block += `  ${completedPhase.action}\n\n`;

  block += `ENTERING: Phase ${newPhase.phase} — ${newPhase.name}\n`;
  block += `  ${newPhase.action}\n\n`;

  block += `RULE: Open this session by acknowledging the phase transition. The user just finished something\n`;
  block += `significant. Name it. Then immediately pivot to the new objective without over-celebrating.\n`;
  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}
