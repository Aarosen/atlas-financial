/**
 * TASK 1.2: Goals Card Component
 * Displays active financial goals with progress tracking
 * Integrated into S6 Dashboard
 */

'use client';

import React from 'react';
import type { FinancialGoal } from '@/lib/state/types';
import { Card } from '@/components/Card';

interface GoalsCardProps {
  goals: FinancialGoal[];
  onGoalClick?: (goal: FinancialGoal) => void;
}

export function GoalsCard({ goals, onGoalClick }: GoalsCardProps) {
  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  if (activeGoals.length === 0 && completedGoals.length === 0) {
    return (
      <Card>
        <h3 style={{ marginBottom: 8 }}>Financial Goals</h3>
        <p style={{ color: 'var(--ink3)', fontSize: 14 }}>No goals yet. Start by setting your first financial goal!</p>
      </Card>
    );
  }

  const calculateProgress = (goal: FinancialGoal): number => {
    const target = goal.targetAmount || 0;
    if (target === 0) return 0;
    const progress = ((goal.currentAmount || 0) / target) * 100;
    return Math.min(progress, 100);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGoalIcon = (type: string): string => {
    const icons: Record<string, string> = {
      debt_payoff: '💳',
      emergency_fund: '🛡️',
      savings: '🏦',
      investment: '📈',
      retirement: '🏖️',
      home_purchase: '🏠',
      education: '🎓',
      other: '⭐',
    };
    return icons[type] || '⭐';
  };

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Financial Goals</h3>
        <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>{activeGoals.length} active</span>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Current Goals</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeGoals.map((goal) => {
              const progress = calculateProgress(goal);
              const target = goal.targetAmount || 0;
              const remaining = Math.max(0, target - (goal.currentAmount || 0));

              return (
                <div
                  key={goal.id}
                  onClick={() => onGoalClick?.(goal)}
                  role="button"
                  tabIndex={0}
                  style={{
                    padding: 12,
                    border: '1px solid var(--bdr)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 20 }}>{getGoalIcon(goal.type)}</span>
                      <div>
                        <h5 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700 }}>{goal.title}</h5>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--ink3)' }}>{goal.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 4,
                      backgroundColor: goal.priority === 'critical' ? '#fee2e2' : goal.priority === 'high' ? '#fef3c7' : '#dbeafe',
                      color: goal.priority === 'critical' ? '#991b1b' : goal.priority === 'high' ? '#92400e' : '#1e40af',
                    }}>
                      {goal.priority}
                    </span>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--bg3)', overflow: 'hidden', marginBottom: 6 }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progress}%`,
                          backgroundColor: '#3b82f6',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>{formatCurrency(goal.currentAmount || 0)}</span>
                      <span style={{ color: 'var(--ink3)' }}>of {formatCurrency(target)}</span>
                    </div>
                  </div>

                  {goal.deadline && (
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink3)' }}>Target Date: </span>
                      <span>{new Date(goal.deadline).toLocaleDateString()}</span>
                    </div>
                  )}

                  {remaining > 0 && (
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--ink3)' }}>Remaining: </span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(remaining)}</span>
                    </div>
                  )}

                  {goal.monthlyContribution && (
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: 'var(--ink3)' }}>Monthly: </span>
                      <span>{formatCurrency(goal.monthlyContribution)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Completed Goals ({completedGoals.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {completedGoals.map((goal) => (
              <div key={goal.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, backgroundColor: 'var(--bg2)', borderRadius: 6 }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <span style={{ flex: 1, fontSize: 14 }}>{goal.title}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{formatCurrency(goal.targetAmount || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
