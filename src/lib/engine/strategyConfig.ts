import type { Confidence, FinancialState, Lever, Tier } from '../state/types';

export type StrategyConfig = {
  tiers: {
    foundation: {
      bufferMonthsLt: number;
      netLt: number;
    };
    stabilizing: {
      bufferMonthsLt: number;
      hiDebtGtIncomeMult: number;
    };
    strategic: {
      bufferMonthsLt: number;
      dtiGt: number;
    };
  };
  levers: {
    priorityOrder: Lever[];
    futureTargetPct: number;
  };
  urgency: {
    protectiveIf: {
      lever: Lever[];
      debtPressure: Array<'Critical'>;
    };
    advisoryIf: {
      lever: Lever[];
      debtPressure: Array<'High'>;
      bufferMonthsLt: number;
    };
  };
  confidence: {
    minAnsweredForHigh: number;
    minAnsweredForMed: number;
    implausibleIncomeLt: number;
    implausibleEssentialsLt: number;
    implausibleEssentialsGtIncomeMult: number;
  };
};

export const strategyConfig: StrategyConfig = {
  tiers: {
    foundation: { bufferMonthsLt: 1, netLt: 0 },
    stabilizing: { bufferMonthsLt: 3, hiDebtGtIncomeMult: 2 },
    strategic: { bufferMonthsLt: 6, dtiGt: 0.3 },
  },
  levers: {
    priorityOrder: ['stabilize_cashflow', 'eliminate_high_interest_debt', 'build_emergency_buffer', 'increase_future_allocation', 'optimize_discretionary_spend'],
    futureTargetPct: 0.15,
  },
  urgency: {
    protectiveIf: {
      lever: ['stabilize_cashflow'],
      debtPressure: ['Critical'],
    },
    advisoryIf: {
      lever: ['eliminate_high_interest_debt'],
      debtPressure: ['High'],
      bufferMonthsLt: 1,
    },
  },
  confidence: {
    minAnsweredForHigh: 5,
    minAnsweredForMed: 3,
    implausibleIncomeLt: 200,
    implausibleEssentialsLt: 100,
    implausibleEssentialsGtIncomeMult: 1.3,
  },
};

export type StrategyContext = {
  answered?: Partial<Record<keyof FinancialState, boolean>>;
  unknown?: Partial<Record<keyof FinancialState, boolean>>;
};

export type ConfidenceResult = {
  confidence: Confidence;
  reasons: string[];
  followupKey?: keyof FinancialState;
};

export function pickTier(args: { net: number; bufMo: number; hiDebt: number; income: number; dti: number }): Tier {
  const { net, bufMo, hiDebt, income, dti } = args;
  if (net < strategyConfig.tiers.foundation.netLt || bufMo < strategyConfig.tiers.foundation.bufferMonthsLt) return 'Foundation';
  if (bufMo < strategyConfig.tiers.stabilizing.bufferMonthsLt || hiDebt > income * strategyConfig.tiers.stabilizing.hiDebtGtIncomeMult) return 'Stabilizing';
  if (bufMo < strategyConfig.tiers.strategic.bufferMonthsLt || dti > strategyConfig.tiers.strategic.dtiGt) return 'Strategic';
  return 'GrowthReady';
}

export function pickLever(args: { net: number; bufMo: number; hiDebt: number; income: number; futPct: number }): Lever {
  const { net, bufMo, hiDebt, income, futPct } = args;
  if (net < 0) return 'stabilize_cashflow';
  if (hiDebt > income) return 'eliminate_high_interest_debt';
  if (bufMo < 3) return 'build_emergency_buffer';
  
  // AUDIT 15 FIX DEFECT-15A-WRONG-LEVER: When all prerequisites are met (no debt, funded cushion, positive cashflow),
  // skip discretionary optimization and go directly to growth/retirement tier
  const cushionFunded = bufMo >= 3;
  const noHighDebt = hiDebt === 0;
  const positiveCashflow = net > 0;
  
  if (noHighDebt && cushionFunded && positiveCashflow) {
    // User is in the Long-Term tier — recommend growth lever
    // Prefer retirement contributions if available, otherwise future allocation
    if (futPct < strategyConfig.levers.futureTargetPct) {
      return 'increase_future_allocation';
    }
    return 'maximize_retirement_contributions';
  }
  
  if (futPct < strategyConfig.levers.futureTargetPct) return 'increase_future_allocation';
  return 'optimize_discretionary_spend';
}

export function pickUrgency(args: { lever: Lever; dExp: 'Low' | 'Moderate' | 'High' | 'Critical'; bufMo: number }): 'Calm' | 'Advisory' | 'Protective' {
  const { lever, dExp, bufMo } = args;
  if (strategyConfig.urgency.protectiveIf.lever.includes(lever) || strategyConfig.urgency.protectiveIf.debtPressure.includes(dExp as any)) return 'Protective';
  if (strategyConfig.urgency.advisoryIf.lever.includes(lever) || strategyConfig.urgency.advisoryIf.debtPressure.includes(dExp as any) || bufMo < strategyConfig.urgency.advisoryIf.bufferMonthsLt) return 'Advisory';
  return 'Calm';
}

export function scoreConfidence(d: Partial<FinancialState>, ctx: StrategyContext = {}): ConfidenceResult {
  const answered = ctx.answered || {};
  const unknown = ctx.unknown || {};

  const reasons: string[] = [];

  const answeredCount = Object.values(answered).filter(Boolean).length;
  const unknownDebt = unknown.highInterestDebt === true || unknown.lowInterestDebt === true;
  if (unknownDebt) reasons.push('UNKNOWN_DEBT');

  const inc = Number(d.monthlyIncome ?? 0);
  const ess = Number(d.essentialExpenses ?? 0);

  if (!Number.isFinite(inc) || inc <= 0) reasons.push('INCOME_MISSING_OR_NONPOSITIVE');
  if (!Number.isFinite(ess) || ess <= 0) reasons.push('ESSENTIALS_MISSING_OR_NONPOSITIVE');

  if (Number.isFinite(inc) && inc > 0 && inc < strategyConfig.confidence.implausibleIncomeLt) reasons.push('INCOME_IMPLAUSIBLE_LOW');
  if (Number.isFinite(ess) && ess > 0 && ess < strategyConfig.confidence.implausibleEssentialsLt) reasons.push('ESSENTIALS_IMPLAUSIBLE_LOW');
  if (Number.isFinite(inc) && inc > 0 && Number.isFinite(ess) && ess > inc * strategyConfig.confidence.implausibleEssentialsGtIncomeMult) reasons.push('ESSENTIALS_GT_INCOME');

  if (answeredCount < strategyConfig.confidence.minAnsweredForMed) reasons.push('TOO_FEW_EXPLICIT_VALUES');

  const followupKey =
    reasons.includes('INCOME_MISSING_OR_NONPOSITIVE') || reasons.includes('INCOME_IMPLAUSIBLE_LOW')
      ? ('monthlyIncome' as const)
      : reasons.includes('ESSENTIALS_MISSING_OR_NONPOSITIVE') || reasons.includes('ESSENTIALS_GT_INCOME') || reasons.includes('ESSENTIALS_IMPLAUSIBLE_LOW')
        ? ('essentialExpenses' as const)
        : unknownDebt
          ? ('highInterestDebt' as const)
          : undefined;

  const confidence: Confidence =
    reasons.length === 0 && answeredCount >= strategyConfig.confidence.minAnsweredForHigh
      ? 'high'
      : reasons.length <= 1 && answeredCount >= strategyConfig.confidence.minAnsweredForMed
        ? 'med'
        : 'low';

  return { confidence, reasons, followupKey };
}
