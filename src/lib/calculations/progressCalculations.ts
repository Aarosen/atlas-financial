import { FinancialSnapshot } from '@/lib/db/supabaseRepository';

export interface MetricChange {
  from: number;
  to: number;
  change: number;
  changePct: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface DebtProgress {
  startingDebt: number;
  currentDebt: number;
  totalPaid: number;
  percentComplete: number;
  monthsElapsed: number;
  estimatedMonthsRemaining: number;
  onTrack: boolean;
}

export interface SavingsProgress {
  startingSavings: number;
  currentSavings: number;
  totalAdded: number;
  percentOfGoal: number;
  estimatedMonthsRemaining: number;
}

export interface NetWorthTrend {
  trend: 'improving' | 'stable' | 'declining';
  monthlyRateOfChange: number;
  projectedNetWorthIn12Months: number;
}

export interface StagnationDetection {
  stagnated: boolean;
  daysSinceLastChange: number;
  stagnationReason: 'no_action_taken' | 'income_offset' | 'unknown' | null;
}

/**
 * Calculate the change in a metric between oldest and newest snapshot
 */
export function calculateMetricChange(
  snapshots: FinancialSnapshot[],
  metric: keyof FinancialSnapshot
): MetricChange | null {
  if (snapshots.length < 2) {
    return null;
  }

  const oldest = snapshots[0];
  const newest = snapshots[snapshots.length - 1];

  const fromValue = (oldest[metric] as number) || 0;
  const toValue = (newest[metric] as number) || 0;

  if (fromValue === 0 && toValue === 0) {
    return null;
  }

  const change = toValue - fromValue;
  const changePct = fromValue !== 0 ? (change / Math.abs(fromValue)) * 100 : 0;

  // Determine trend based on metric type
  let trend: 'improving' | 'stable' | 'declining' = 'stable';

  if (metric === 'total_savings' || metric === 'monthly_surplus' || metric === 'net_worth') {
    // For these metrics, increasing is good
    trend = change > 0 ? 'improving' : change < 0 ? 'declining' : 'stable';
  } else if (
    metric === 'high_interest_debt' ||
    metric === 'low_interest_debt'
  ) {
    // For debt, decreasing is good
    trend = change < 0 ? 'improving' : change > 0 ? 'declining' : 'stable';
  }

  return {
    from: fromValue,
    to: toValue,
    change,
    changePct,
    trend,
  };
}

/**
 * Calculate debt payoff progress
 */
export function calculateDebtProgress(
  snapshots: FinancialSnapshot[],
  debtType: 'high_interest_debt' | 'low_interest_debt' = 'high_interest_debt'
): DebtProgress | null {
  if (snapshots.length < 2) {
    return null;
  }

  const oldest = snapshots[0];
  const newest = snapshots[snapshots.length - 1];

  const startingDebt = (oldest[debtType] as number) || 0;
  const currentDebt = (newest[debtType] as number) || 0;

  if (startingDebt === 0) {
    return null;
  }

  const totalPaid = Math.max(0, startingDebt - currentDebt);
  const percentComplete = (totalPaid / startingDebt) * 100;

  // Calculate time elapsed in months
  const oldestDate = new Date(oldest.snapshot_date);
  const newestDate = new Date(newest.snapshot_date);
  const monthsElapsed =
    (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  // Estimate months remaining
  let estimatedMonthsRemaining = 0;
  if (monthsElapsed > 0 && totalPaid > 0) {
    const monthlyPayment = totalPaid / monthsElapsed;
    estimatedMonthsRemaining = monthlyPayment > 0 ? currentDebt / monthlyPayment : 0;
  }

  // Determine if on track (assuming linear progress)
  const expectedDebtAtCurrentPace = startingDebt - (totalPaid / monthsElapsed) * 12;
  const onTrack = currentDebt <= expectedDebtAtCurrentPace;

  return {
    startingDebt,
    currentDebt,
    totalPaid,
    percentComplete,
    monthsElapsed: Math.round(monthsElapsed * 10) / 10,
    estimatedMonthsRemaining: Math.round(estimatedMonthsRemaining * 10) / 10,
    onTrack,
  };
}

/**
 * Calculate savings progress toward a goal
 */
export function calculateSavingsProgress(
  snapshots: FinancialSnapshot[],
  targetAmount: number
): SavingsProgress | null {
  if (snapshots.length < 2 || targetAmount <= 0) {
    return null;
  }

  const oldest = snapshots[0];
  const newest = snapshots[snapshots.length - 1];

  const startingSavings = (oldest.total_savings as number) || 0;
  const currentSavings = (newest.total_savings as number) || 0;
  const totalAdded = Math.max(0, currentSavings - startingSavings);

  const percentOfGoal = (currentSavings / targetAmount) * 100;

  // Calculate time elapsed in months
  const oldestDate = new Date(oldest.snapshot_date);
  const newestDate = new Date(newest.snapshot_date);
  const monthsElapsed =
    (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  // Estimate months remaining
  let estimatedMonthsRemaining = 0;
  if (monthsElapsed > 0 && totalAdded > 0) {
    const monthlySavings = totalAdded / monthsElapsed;
    const remainingToGoal = Math.max(0, targetAmount - currentSavings);
    estimatedMonthsRemaining = monthlySavings > 0 ? remainingToGoal / monthlySavings : 0;
  }

  return {
    startingSavings,
    currentSavings,
    totalAdded,
    percentOfGoal,
    estimatedMonthsRemaining: Math.round(estimatedMonthsRemaining * 10) / 10,
  };
}

/**
 * Calculate overall net worth trend
 */
export function calculateNetWorthTrend(snapshots: FinancialSnapshot[]): NetWorthTrend | null {
  if (snapshots.length < 2) {
    return null;
  }

  const oldest = snapshots[0];
  const newest = snapshots[snapshots.length - 1];

  const oldestNetWorth = (oldest.net_worth as number) || 0;
  const newestNetWorth = (newest.net_worth as number) || 0;

  const change = newestNetWorth - oldestNetWorth;

  // Calculate time elapsed in months
  const oldestDate = new Date(oldest.snapshot_date);
  const newestDate = new Date(newest.snapshot_date);
  const monthsElapsed =
    (newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  const monthlyRateOfChange = monthsElapsed > 0 ? change / monthsElapsed : 0;

  // Project 12 months ahead
  const projectedNetWorthIn12Months = newestNetWorth + monthlyRateOfChange * 12;

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (monthlyRateOfChange > 100) {
    trend = 'improving';
  } else if (monthlyRateOfChange < -100) {
    trend = 'declining';
  }

  return {
    trend,
    monthlyRateOfChange: Math.round(monthlyRateOfChange * 100) / 100,
    projectedNetWorthIn12Months: Math.round(projectedNetWorthIn12Months),
  };
}

/**
 * Detect if user has stagnated (no meaningful change in 60+ days)
 */
export function detectStagnation(snapshots: FinancialSnapshot[]): StagnationDetection {
  if (snapshots.length < 2) {
    return {
      stagnated: false,
      daysSinceLastChange: 0,
      stagnationReason: null,
    };
  }

  const newest = snapshots[snapshots.length - 1];
  const newestDate = new Date(newest.snapshot_date);
  const daysSinceLastSnapshot = Math.floor(
    (Date.now() - newestDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Look for meaningful changes in the last 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const recentSnapshots = snapshots.filter(
    (s) => new Date(s.snapshot_date) >= sixtyDaysAgo
  );

  if (recentSnapshots.length < 2) {
    return {
      stagnated: false,
      daysSinceLastChange: daysSinceLastSnapshot,
      stagnationReason: null,
    };
  }

  const oldestRecent = recentSnapshots[0];
  const newestRecent = recentSnapshots[recentSnapshots.length - 1];

  // Check for meaningful changes
  const savingsChange = Math.abs(
    ((newestRecent.total_savings || 0) - (oldestRecent.total_savings || 0)) / 100
  );
  const debtChange = Math.abs(
    ((newestRecent.high_interest_debt || 0) - (oldestRecent.high_interest_debt || 0)) / 100
  );
  const surplusChange = Math.abs(
    ((newestRecent.monthly_surplus || 0) - (oldestRecent.monthly_surplus || 0)) / 100
  );

  const hasChange = savingsChange > 50 || debtChange > 50 || surplusChange > 50;

  if (!hasChange && daysSinceLastSnapshot > 60) {
    // Determine reason for stagnation
    let stagnationReason: 'no_action_taken' | 'income_offset' | 'unknown' | null = null;

    if (
      (newestRecent.monthly_surplus || 0) > 0 &&
      (newestRecent.total_savings || 0) === (oldestRecent.total_savings || 0)
    ) {
      stagnationReason = 'no_action_taken';
    } else if (
      (newestRecent.monthly_income || 0) < (oldestRecent.monthly_income || 0)
    ) {
      stagnationReason = 'income_offset';
    } else {
      stagnationReason = 'unknown';
    }

    return {
      stagnated: true,
      daysSinceLastChange: daysSinceLastSnapshot,
      stagnationReason,
    };
  }

  return {
    stagnated: false,
    daysSinceLastChange: daysSinceLastSnapshot,
    stagnationReason: null,
  };
}
