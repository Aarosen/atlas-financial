/**
 * Atlas tunable constants. Centralized to make adjustments auditable.
 * Any change here affects user-facing recommendations — review with the
 * compliance section of STRATEGY.md before tweaking.
 */

export const FINANCIAL_THRESHOLDS = {
  /** Above this aggregate dollar amount we treat the user as having "meaningful" debt. */
  HIGH_INTEREST_DEBT_THRESHOLD: 5000,
  /** Below this annual income we suppress tax planning topics (out of scope, not useful). */
  TAX_ADVICE_INCOME_FLOOR: 30000,
  /** Above this net worth we surface estate-planning prompts. */
  ESTATE_PLANNING_NET_WORTH: 5_000_000,
} as const;

export const EXTRACTION = {
  /** Number of consecutive failed extractions on the same field before we route the
   *  next user message to the LLM with the EXTRACTION_LOOP protocol. */
  RETRY_LIMIT: 2,
} as const;

export const CONVERSATION = {
  /** How many trailing turns to send to the LLM as context. */
  HISTORY_WINDOW: 10,
  /** Client-side safety timeout guarding against permanent deadlocks. */
  SAFETY_TIMEOUT_MS: 20_000,
  /** Server-side guard on full system+history token count. */
  TOKEN_LIMIT: 32_000,
} as const;

export type FinancialThresholds = typeof FINANCIAL_THRESHOLDS;
export type ExtractionConfig = typeof EXTRACTION;
export type ConversationConfig = typeof CONVERSATION;
