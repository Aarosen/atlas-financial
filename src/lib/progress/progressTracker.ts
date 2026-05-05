/**
 * TASK 4.5: Progress Tracking Module
 * Tracks user financial progress and shows returning users their improvements
 */

export interface ProgressMetric {
  name: string;
  category: 'debt' | 'savings' | 'income' | 'goals' | 'behavior';
  previousValue: number;
  currentValue: number;
  unit: string;
  isPositive: boolean; // true = improvement (higher is better for savings, lower for debt)
  percentChange: number;
  lastUpdated: number; // timestamp
}

export interface ProgressSnapshot {
  userId: string;
  sessionId: string;
  timestamp: number;
  metrics: ProgressMetric[];
  totalDebt: number;
  totalSavings: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  surplus: number;
}

export interface ProgressReport {
  currentSnapshot: ProgressSnapshot;
  previousSnapshot: ProgressSnapshot | null;
  improvements: ProgressMetric[];
  challenges: ProgressMetric[];
  daysSinceLast: number;
  streak: number; // consecutive days of engagement
  summary: string;
}

/**
 * Calculate progress metrics by comparing current and previous snapshots
 */
export function calculateProgressMetrics(
  current: ProgressSnapshot,
  previous: ProgressSnapshot | null
): ProgressMetric[] {
  if (!previous) return [];

  const metrics: ProgressMetric[] = [];

  // DEBT METRICS
  const debtReduction = previous.totalDebt - current.totalDebt;
  if (debtReduction !== 0) {
    metrics.push({
      name: 'Total Debt Reduction',
      category: 'debt',
      previousValue: previous.totalDebt,
      currentValue: current.totalDebt,
      unit: '$',
      isPositive: debtReduction > 0,
      percentChange: previous.totalDebt > 0 ? (debtReduction / previous.totalDebt) * 100 : 0,
      lastUpdated: current.timestamp,
    });
  }

  // SAVINGS METRICS
  const savingsIncrease = current.totalSavings - previous.totalSavings;
  if (savingsIncrease !== 0) {
    metrics.push({
      name: 'Savings Growth',
      category: 'savings',
      previousValue: previous.totalSavings,
      currentValue: current.totalSavings,
      unit: '$',
      isPositive: savingsIncrease > 0,
      percentChange: previous.totalSavings > 0 ? (savingsIncrease / previous.totalSavings) * 100 : savingsIncrease > 0 ? 100 : 0,
      lastUpdated: current.timestamp,
    });
  }

  // INCOME METRICS
  const incomeIncrease = current.monthlyIncome - previous.monthlyIncome;
  if (incomeIncrease !== 0) {
    metrics.push({
      name: 'Monthly Income',
      category: 'income',
      previousValue: previous.monthlyIncome,
      currentValue: current.monthlyIncome,
      unit: '$',
      isPositive: incomeIncrease > 0,
      percentChange: previous.monthlyIncome > 0 ? (incomeIncrease / previous.monthlyIncome) * 100 : 0,
      lastUpdated: current.timestamp,
    });
  }

  // SURPLUS METRICS
  const surplusChange = current.surplus - previous.surplus;
  if (surplusChange !== 0) {
    metrics.push({
      name: 'Monthly Surplus',
      category: 'goals',
      previousValue: previous.surplus,
      currentValue: current.surplus,
      unit: '$',
      isPositive: surplusChange > 0,
      percentChange: previous.surplus > 0 ? (surplusChange / previous.surplus) * 100 : surplusChange > 0 ? 100 : 0,
      lastUpdated: current.timestamp,
    });
  }

  return metrics;
}

/**
 * Build progress report for returning user
 */
export function buildProgressReport(
  current: ProgressSnapshot,
  previous: ProgressSnapshot | null,
  daysSinceLast: number
): ProgressReport {
  const metrics = calculateProgressMetrics(current, previous);
  
  const improvements = metrics.filter(m => m.isPositive);
  const challenges = metrics.filter(m => !m.isPositive);

  // Calculate streak (simplified: assume daily engagement if < 2 days gap)
  const streak = daysSinceLast <= 1 ? (previous ? 2 : 1) : 1;

  // Build summary
  let summary = '';
  if (improvements.length > 0) {
    const topImprovement = improvements[0];
    summary = `Great progress! You've ${topImprovement.name.toLowerCase()} by ${Math.abs(topImprovement.percentChange).toFixed(1)}% since last visit.`;
  } else if (challenges.length > 0) {
    summary = `You're working on some challenges. Let's focus on the most impactful changes.`;
  } else {
    summary = `Welcome back! Let's continue building your financial plan.`;
  }

  return {
    currentSnapshot: current,
    previousSnapshot: previous,
    improvements,
    challenges,
    daysSinceLast,
    streak,
    summary,
  };
}

/**
 * Create progress snapshot from financial state
 */
export function createProgressSnapshot(
  userId: string,
  sessionId: string,
  monthlyIncome: number,
  monthlyExpenses: number,
  totalSavings: number,
  highInterestDebt: number,
  lowInterestDebt: number
): ProgressSnapshot {
  const totalDebt = (highInterestDebt || 0) + (lowInterestDebt || 0);
  const surplus = monthlyIncome - monthlyExpenses;

  return {
    userId,
    sessionId,
    timestamp: Date.now(),
    metrics: [],
    totalDebt,
    totalSavings,
    monthlyIncome,
    monthlyExpenses,
    surplus,
  };
}

/**
 * Format progress report for display
 */
export function formatProgressReport(report: ProgressReport): string {
  const lines: string[] = [];

  lines.push(`📊 Welcome back! It's been ${report.daysSinceLast} day${report.daysSinceLast !== 1 ? 's' : ''} since your last visit.`);
  lines.push('');
  lines.push(report.summary);

  if (report.improvements.length > 0) {
    lines.push('');
    lines.push('✅ Your wins:');
    for (const metric of report.improvements) {
      const change = Math.abs(metric.percentChange).toFixed(1);
      lines.push(`  • ${metric.name}: ${change}% improvement`);
    }
  }

  if (report.challenges.length > 0) {
    lines.push('');
    lines.push('⚠️ Areas to focus:');
    for (const metric of report.challenges) {
      const change = Math.abs(metric.percentChange).toFixed(1);
      lines.push(`  • ${metric.name}: ${change}% change`);
    }
  }

  if (report.streak > 1) {
    lines.push('');
    lines.push(`🔥 You're on a ${report.streak}-day engagement streak!`);
  }

  return lines.join('\n');
}
