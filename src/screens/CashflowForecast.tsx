/**
 * TASK 1.4: S10 - Cashflow Forecast Screen
 * 12-month projection with adjustable sliders
 * Interactive scenario modeling
 */

'use client';

import React, { useState, useMemo } from 'react';
import { cashflowSimulator, type CashflowProjection } from '@/lib/calculations/cashflowSimulator';

interface CashflowForecastProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  onClose?: () => void;
}

export function CashflowForecast({
  monthlyIncome,
  monthlyExpenses,
  currentSavings,
  onClose,
}: CashflowForecastProps) {
  const [incomeAdjustment, setIncomeAdjustment] = useState(0);
  const [expenseAdjustment, setExpenseAdjustment] = useState(0);

  const adjustedIncome = Math.max(0, monthlyIncome + incomeAdjustment);
  const adjustedExpenses = Math.max(0, monthlyExpenses + expenseAdjustment);
  const adjustedSavings = adjustedIncome - adjustedExpenses;

  const projection = useMemo(() => {
    return cashflowSimulator.project(
      adjustedIncome,
      adjustedExpenses,
      currentSavings
    );
  }, [adjustedIncome, adjustedExpenses, currentSavings]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getHealthColor = (balance: number): string => {
    if (balance < 0) return '#ef4444'; // red
    if (balance < currentSavings * 0.5) return '#f97316'; // orange
    return '#22c55e'; // green
  };

  const maxBalance = Math.max(...projection.months.map(m => m.balance), currentSavings);
  const minBalance = Math.min(...projection.months.map(m => m.balance), currentSavings);
  const range = maxBalance - minBalance || 1;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Cashflow Forecast</h2>
        {onClose && <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid var(--bdr)', cursor: 'pointer' }}>Close</button>}
      </div>

      <div>
        {/* Sliders */}
        <div style={{ padding: 16, border: '1px solid var(--bdr)', borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Adjust Scenario</h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Monthly Income: {formatCurrency(adjustedIncome)}
              <span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 8 }}>
                {incomeAdjustment > 0 ? '+' : ''}{formatCurrency(incomeAdjustment)}
              </span>
            </label>
            <input
              type="range"
              min={-monthlyIncome * 0.5}
              max={monthlyIncome}
              value={incomeAdjustment}
              onChange={(e) => setIncomeAdjustment(Number(e.target.value))}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink3)' }}>
              <span>-50%</span>
              <span>Current</span>
              <span>+100%</span>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Monthly Expenses: {formatCurrency(adjustedExpenses)}
              <span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 8 }}>
                {expenseAdjustment > 0 ? '+' : ''}{formatCurrency(expenseAdjustment)}
              </span>
            </label>
            <input
              type="range"
              min={-monthlyExpenses * 0.5}
              max={monthlyExpenses}
              value={expenseAdjustment}
              onChange={(e) => setExpenseAdjustment(Number(e.target.value))}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink3)' }}>
              <span>-50%</span>
              <span>Current</span>
              <span>+100%</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ padding: 16, border: '1px solid var(--bdr)', borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>12-Month Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>Monthly Savings</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: adjustedSavings >= 0 ? '#22c55e' : '#ef4444' }}>
                {adjustedSavings >= 0 ? '+' : ''}{formatCurrency(adjustedSavings)}
              </div>
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>Total Income</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(projection.totalIncome)}</div>
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>Total Expenses</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(projection.totalExpenses)}</div>
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>Total Savings</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: projection.totalSavings >= 0 ? '#22c55e' : '#ef4444' }}>
                {projection.totalSavings >= 0 ? '+' : ''}{formatCurrency(projection.totalSavings)}
              </div>
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>Final Balance</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: getHealthColor(projection.months[11].balance) }}>
                {formatCurrency(projection.months[11].balance)}
              </div>
            </div>
            <div style={{ padding: 12, backgroundColor: 'var(--bg2)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 4 }}>Health Status</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: projection.isHealthy ? '#22c55e' : '#ef4444' }}>
                {projection.isHealthy ? '✓ Healthy' : '⚠ At Risk'}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: 16, border: '1px solid var(--bdr)', borderRadius: 8, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Balance Projection</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: 200, gap: 4, padding: '12px 0' }}>
              {projection.months.map((month, idx) => {
                const normalizedBalance = (month.balance - minBalance) / range;
                const height = Math.max(5, normalizedBalance * 100);
                const color = getHealthColor(month.balance);

                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div
                      style={{
                        width: '100%',
                        height: `${height}%`,
                        backgroundColor: color,
                        borderRadius: 4,
                      }}
                      title={`Month ${month.month}: ${formatCurrency(month.balance)}`}
                    />
                    <div style={{ fontSize: 10, marginTop: 4, color: 'var(--ink3)' }}>M{month.month}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#22c55e', borderRadius: 2 }} />
                Healthy
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#f97316', borderRadius: 2 }} />
                Caution
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, backgroundColor: '#ef4444', borderRadius: 2 }} />
                Critical
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div style={{ padding: 16, border: '1px solid var(--bdr)', borderRadius: 8 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Monthly Breakdown</h3>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, minWidth: 500 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink3)', paddingBottom: 8, borderBottom: '1px solid var(--bdr)' }}>Month</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink3)', paddingBottom: 8, borderBottom: '1px solid var(--bdr)' }}>Income</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink3)', paddingBottom: 8, borderBottom: '1px solid var(--bdr)' }}>Expenses</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink3)', paddingBottom: 8, borderBottom: '1px solid var(--bdr)' }}>Savings</div>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--ink3)', paddingBottom: 8, borderBottom: '1px solid var(--bdr)' }}>Balance</div>
              
              {projection.months.map((month) => (
                <React.Fragment key={month.month}>
                  <div style={{ fontSize: 12, padding: 8 }}>M{month.month}</div>
                  <div style={{ fontSize: 12, padding: 8, color: '#22c55e' }}>{formatCurrency(month.income)}</div>
                  <div style={{ fontSize: 12, padding: 8, color: '#ef4444' }}>{formatCurrency(month.expenses)}</div>
                  <div style={{ fontSize: 12, padding: 8, color: month.savings >= 0 ? '#22c55e' : '#ef4444' }}>
                    {month.savings >= 0 ? '+' : ''}{formatCurrency(month.savings)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      padding: 8,
                      color: getHealthColor(month.balance),
                      fontWeight: 'bold',
                    }}
                  >
                    {formatCurrency(month.balance)}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
