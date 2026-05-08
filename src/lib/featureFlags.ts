/**
 * TASK 0: Feature Flags System
 * Centralized feature flag management for production readiness
 * Allows toggling features without redeploy
 */

export interface FeatureFlags {
  // P1 Planning Modules
  txnLedger: boolean;        // Transaction ledger & categorization (S9)
  goalsCard: boolean;        // Goals card in dashboard (S6)
  plaidBridge: boolean;      // Plaid bank sync integration (S8)
  cashflowSim: boolean;      // Cashflow simulator & forecast (S10)
  
  // P2 UX Enhancements
  actionButtons: boolean;    // Responsive action buttons
  progressTracking: boolean; // Progress tracking for returning users
  
  // Experimental Features
  advancedTaxPlanning: boolean;
  investmentAllocation: boolean;
  estatePlanning: boolean;
}

// Default feature flags (all production-ready features enabled)
export const DEFAULT_FLAGS: FeatureFlags = {
  txnLedger: true,
  goalsCard: true,
  plaidBridge: false,       // Disabled by default until sandbox QA passes
  cashflowSim: true,
  actionButtons: true,
  progressTracking: true,
  advancedTaxPlanning: false,
  investmentAllocation: false,
  estatePlanning: false,
};

/**
 * Get feature flags from environment or defaults
 * Environment variables override defaults
 * Format: FEATURE_FLAG_TXNLEDGER=true
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    txnLedger: process.env.FEATURE_FLAG_TXNLEDGER === 'true' || DEFAULT_FLAGS.txnLedger,
    goalsCard: process.env.FEATURE_FLAG_GOALSCARD === 'true' || DEFAULT_FLAGS.goalsCard,
    plaidBridge: process.env.FEATURE_FLAG_PLAIDBRIDGE === 'true' || DEFAULT_FLAGS.plaidBridge,
    cashflowSim: process.env.FEATURE_FLAG_CASHFLOWSIM === 'true' || DEFAULT_FLAGS.cashflowSim,
    actionButtons: process.env.FEATURE_FLAG_ACTIONBUTTONS === 'true' || DEFAULT_FLAGS.actionButtons,
    progressTracking: process.env.FEATURE_FLAG_PROGRESSTRACKING === 'true' || DEFAULT_FLAGS.progressTracking,
    advancedTaxPlanning: process.env.FEATURE_FLAG_ADVANCEDTAXPLANNING === 'true' || DEFAULT_FLAGS.advancedTaxPlanning,
    investmentAllocation: process.env.FEATURE_FLAG_INVESTMENTALLOCATION === 'true' || DEFAULT_FLAGS.investmentAllocation,
    estatePlanning: process.env.FEATURE_FLAG_ESTATEPLANNING === 'true' || DEFAULT_FLAGS.estatePlanning,
  };
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature];
}

/**
 * Get feature flags for client-side use (public flags only)
 * Never expose sensitive flags to client
 */
export function getClientFeatureFlags(): Partial<FeatureFlags> {
  const flags = getFeatureFlags();
  return {
    txnLedger: flags.txnLedger,
    goalsCard: flags.goalsCard,
    plaidBridge: flags.plaidBridge,
    cashflowSim: flags.cashflowSim,
    actionButtons: flags.actionButtons,
    progressTracking: flags.progressTracking,
  };
}
