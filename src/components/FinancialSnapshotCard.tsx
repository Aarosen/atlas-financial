'use client';

interface FinancialSnapshot {
  monthlyIncome?: number;
  essentialExpenses?: number;
  totalSavings?: number;
  totalDebt?: number;
  highInterestDebt?: number;
  lowInterestDebt?: number;
  netWorth?: number;
}

interface FinancialSnapshotCardProps {
  snapshot: FinancialSnapshot;
  isLoading?: boolean;
}

export function FinancialSnapshotCard({
  snapshot,
  isLoading = false,
}: FinancialSnapshotCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Financial Snapshot
        </h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const monthlyIncome = snapshot.monthlyIncome || 0;
  const essentialExpenses = snapshot.essentialExpenses || 0;
  const monthlySurplus = monthlyIncome - essentialExpenses;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
        Financial Snapshot
      </h3>

      <div className="space-y-3">
        {/* Income */}
        {snapshot.monthlyIncome !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Monthly Income</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatCurrency(snapshot.monthlyIncome)}
            </span>
          </div>
        )}

        {/* Expenses */}
        {snapshot.essentialExpenses !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Essential Expenses</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatCurrency(snapshot.essentialExpenses)}
            </span>
          </div>
        )}

        {/* Monthly Surplus */}
        {monthlyIncome > 0 && essentialExpenses > 0 && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Monthly Surplus
            </span>
            <span
              className={`font-semibold ${
                monthlySurplus > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(monthlySurplus)}
            </span>
          </div>
        )}

        {/* Savings */}
        {snapshot.totalSavings !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Savings</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {formatCurrency(snapshot.totalSavings)}
            </span>
          </div>
        )}

        {/* Debt */}
        {snapshot.totalDebt !== undefined && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Debt</span>
            <span
              className={`font-medium ${
                snapshot.totalDebt > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {formatCurrency(snapshot.totalDebt)}
            </span>
          </div>
        )}

        {/* Net Worth */}
        {snapshot.netWorth !== undefined && (
          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Net Worth
            </span>
            <span
              className={`font-semibold ${
                snapshot.netWorth > 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(snapshot.netWorth)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
