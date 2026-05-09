/**
 * C0.6 — Handle "no" to high-interest debt by explicitly asking about low-interest debt.
 * A "no" to high-interest debt commonly means "no debt at all", but we should confirm
 * low-interest debt explicitly rather than leaving it as Unknown.
 */

export function shouldAskLowInterestDebtAfterHighNo(userText: string): boolean {
  // Check if user said "no" to high-interest debt
  return /^\s*(no|none|nope|nah|zero|nothing)\s*$/i.test(userText);
}

export const LOW_INTEREST_DEBT_QUESTION =
  'And anything else — student loans, car, mortgage?';
