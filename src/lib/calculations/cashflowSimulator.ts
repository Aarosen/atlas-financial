/**
 * TASK 1.4: Cashflow Simulator
 * 12-month projection with adjustable income/expense sliders
 * Deterministic calculations for audit trail
 */

export interface CashflowMonth {
  month: number;
  date: string;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
  cumulativeSavings: number;
}

export interface CashflowProjection {
  months: CashflowMonth[];
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  averageMonthlyBalance: number;
  minBalance: number;
  maxBalance: number;
  isHealthy: boolean;
}

/**
 * CashflowSimulator: 12-month projection engine
 */
export class CashflowSimulator {
  /**
   * Project 12-month cashflow
   */
  project(
    monthlyIncome: number,
    monthlyExpenses: number,
    startingBalance: number,
    incomeAdjustment: number = 0,
    expenseAdjustment: number = 0
  ): CashflowProjection {
    const months: CashflowMonth[] = [];
    let cumulativeSavings = startingBalance;
    let totalIncome = 0;
    let totalExpenses = 0;
    let minBalance = startingBalance;
    let maxBalance = startingBalance;

    const now = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const dateStr = date.toISOString().split('T')[0];

      // Apply adjustments
      const adjustedIncome = Math.max(0, monthlyIncome + incomeAdjustment);
      const adjustedExpenses = Math.max(0, monthlyExpenses + expenseAdjustment);

      const savings = adjustedIncome - adjustedExpenses;
      cumulativeSavings += savings;

      totalIncome += adjustedIncome;
      totalExpenses += adjustedExpenses;

      minBalance = Math.min(minBalance, cumulativeSavings);
      maxBalance = Math.max(maxBalance, cumulativeSavings);

      months.push({
        month: i + 1,
        date: dateStr,
        income: adjustedIncome,
        expenses: adjustedExpenses,
        savings,
        balance: cumulativeSavings,
        cumulativeSavings,
      });
    }

    const totalSavings = cumulativeSavings - startingBalance;
    const averageMonthlyBalance = months.reduce((sum, m) => sum + m.balance, 0) / months.length;

    // Health check: positive balance and positive trend
    const isHealthy = minBalance >= 0 && totalSavings > 0;

    return {
      months,
      totalIncome,
      totalExpenses,
      totalSavings,
      averageMonthlyBalance,
      minBalance,
      maxBalance,
      isHealthy,
    };
  }

  /**
   * Simulate income change impact
   */
  simulateIncomeChange(
    baseProjection: CashflowProjection,
    incomeChange: number
  ): CashflowProjection {
    const firstMonth = baseProjection.months[0];
    const baseIncome = firstMonth.income;
    const baseExpenses = firstMonth.expenses;
    const startingBalance = baseProjection.months[0].balance - firstMonth.savings;

    return this.project(
      baseIncome,
      baseExpenses,
      startingBalance,
      incomeChange,
      0
    );
  }

  /**
   * Simulate expense change impact
   */
  simulateExpenseChange(
    baseProjection: CashflowProjection,
    expenseChange: number
  ): CashflowProjection {
    const firstMonth = baseProjection.months[0];
    const baseIncome = firstMonth.income;
    const baseExpenses = firstMonth.expenses;
    const startingBalance = baseProjection.months[0].balance - firstMonth.savings;

    return this.project(
      baseIncome,
      baseExpenses,
      startingBalance,
      0,
      expenseChange
    );
  }

  /**
   * Find breakeven point (where balance = 0)
   */
  findBreakeven(
    monthlyIncome: number,
    monthlyExpenses: number,
    startingBalance: number
  ): number | null {
    if (monthlyIncome >= monthlyExpenses) {
      return 0; // Already positive
    }

    const monthlyDeficit = monthlyExpenses - monthlyIncome;
    const monthsToBreakeven = startingBalance / monthlyDeficit;

    return monthsToBreakeven > 12 ? null : monthsToBreakeven;
  }

  /**
   * Calculate savings goal timeline
   */
  calculateSavingsTimeline(
    monthlyIncome: number,
    monthlyExpenses: number,
    startingBalance: number,
    savingsGoal: number
  ): number | null {
    const monthlySavings = monthlyIncome - monthlyExpenses;

    if (monthlySavings <= 0) {
      return null; // Cannot save with negative cashflow
    }

    const remainingGoal = Math.max(0, savingsGoal - startingBalance);
    const monthsNeeded = remainingGoal / monthlySavings;

    return monthsNeeded;
  }

  /**
   * Get scenario comparison
   */
  compareScenarios(
    baseProjection: CashflowProjection,
    scenarios: Array<{
      name: string;
      incomeAdjustment: number;
      expenseAdjustment: number;
    }>
  ): Array<{
    name: string;
    projection: CashflowProjection;
    totalSavings: number;
    finalBalance: number;
    isHealthy: boolean;
  }> {
    const firstMonth = baseProjection.months[0];
    const baseIncome = firstMonth.income;
    const baseExpenses = firstMonth.expenses;
    const startingBalance = baseProjection.months[0].balance - firstMonth.savings;

    return scenarios.map(scenario => {
      const projection = this.project(
        baseIncome,
        baseExpenses,
        startingBalance,
        scenario.incomeAdjustment,
        scenario.expenseAdjustment
      );

      return {
        name: scenario.name,
        projection,
        totalSavings: projection.totalSavings,
        finalBalance: projection.months[11].balance,
        isHealthy: projection.isHealthy,
      };
    });
  }
}

// Singleton instance
export const cashflowSimulator = new CashflowSimulator();
