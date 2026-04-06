/**
 * Maps raw reason codes from the strategy engine to human-readable explanations.
 * Used in the "Why this?" transparency feature to explain lever selection.
 */

export const reasonCodeLabels: Record<string, string> = {
  // Emergency fund related
  BUFFER_LT_3MO: 'Your emergency cushion is under 3 months — the professional minimum. Investing before this is secured risks drawing from growth assets in an emergency.',
  BUFFER_LT_6MO: 'Your emergency cushion is under 6 months. For your income stability, building this floor first is the priority.',
  BUFFER_ZERO: 'You have no emergency cushion. Any unexpected expense forces you to add debt or pause other goals.',
  
  // High-interest debt related
  HIGH_INTEREST_DEBT: 'With high-interest debt, you\'re paying interest costs that compound against you. Paying it down first is the highest guaranteed return you can get.',
  HIGH_INTEREST_DEBT_SIGNIFICANT: 'Your high-interest debt is significant relative to your income. Eliminating this is the foundation for everything else.',
  DEBT_COSTING_MONTHLY: 'Your debt is costing you money every month in interest. That\'s money that could be yours.',
  
  // Cashflow related
  NEGATIVE_CASHFLOW: 'You\'re spending more than you earn each month. Everything else — debt payoff, investing, saving — requires fixing this first.',
  LOW_CASHFLOW: 'Your monthly surplus is tight. Stabilizing cashflow creates the foundation for all other financial moves.',
  ZERO_CASHFLOW: 'You\'re breaking even each month. You need positive cashflow to build wealth.',
  
  // Growth/readiness related
  GROWTH_READY: 'No high-interest debt, solid emergency cushion, positive monthly surplus. You\'re ready to grow.',
  DEBT_FREE_BUFFER_SOLID: 'You\'re debt-free with a solid emergency fund. Growth is the natural next step.',
  STRONG_POSITION: 'Your financial foundation is strong. You can focus on growth and wealth building.',
  
  // Discretionary spend related
  DISCRETIONARY_AVAILABLE: 'You have discretionary spending available. Optimizing this creates the fuel for your other goals.',
  DISCRETIONARY_HIGH: 'Your discretionary spending is higher than typical. Optimizing here unlocks significant monthly surplus.',
  
  // Income/expense related
  INCOME_STABLE: 'Your income is stable. This allows for a more aggressive financial plan.',
  EXPENSES_HIGH: 'Your essential expenses are high relative to income. Stabilizing cashflow is the priority.',
  
  // Goal alignment
  GOAL_STABILITY: 'Your goal is stability. The first step is ensuring you\'re not losing ground each month.',
  GOAL_GROWTH: 'Your goal is growth. We build the foundation first, then accelerate.',
  GOAL_WEALTH: 'Your goal is wealth building. We eliminate the obstacles first, then compound aggressively.',
};

/**
 * Convert a reason code to human-readable text.
 * Falls back to the raw code if no mapping exists.
 */
export function humanizeReasonCode(code: string): string {
  return reasonCodeLabels[code] || code;
}

/**
 * Convert an array of reason codes to human-readable explanations.
 */
export function humanizeReasonCodes(codes: string[]): string[] {
  return codes.map(humanizeReasonCode);
}
