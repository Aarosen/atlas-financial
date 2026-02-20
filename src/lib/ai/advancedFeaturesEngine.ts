/**
 * Advanced Features Engine
 * Requirements 28-31: Action suggestions, progress tracking, habit formation, benchmarking
 */

export interface ActionSuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact: number;
  timeframe: string;
}

export interface ProgressTracker {
  goalId: string;
  goalName: string;
  currentValue: number;
  targetValue: number;
  startDate: number;
  lastUpdated: number;
  progressPercentage: number;
}

export interface HabitFormation {
  habitId: string;
  habitName: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  streak: number;
  completionRate: number;
  nextDueDate: number;
}

export interface Benchmark {
  metric: string;
  userValue: number;
  averageValue: number;
  percentile: number;
  recommendation: string;
}

export function generateActionSuggestions(concern: string, metrics: Record<string, number>): ActionSuggestion[] {
  const suggestions: ActionSuggestion[] = [];

  if (concern === 'debt_stress' && metrics.totalDebt > 0) {
    suggestions.push({
      id: 'pay_extra_principal',
      title: 'Pay Extra Toward Principal',
      description: 'Allocate additional funds to reduce debt faster',
      priority: 'high',
      estimatedImpact: 0.9,
      timeframe: 'Immediate',
    });
  }

  if (metrics.currentSavings < metrics.savingsGoal) {
    suggestions.push({
      id: 'increase_savings_rate',
      title: 'Increase Savings Rate',
      description: 'Boost monthly savings contributions',
      priority: 'high',
      estimatedImpact: 0.85,
      timeframe: 'This month',
    });
  }

  if (metrics.monthlyExpenses > metrics.monthlyIncome * 0.7) {
    suggestions.push({
      id: 'reduce_expenses',
      title: 'Review and Reduce Expenses',
      description: 'Identify and cut unnecessary spending',
      priority: 'medium',
      estimatedImpact: 0.8,
      timeframe: 'This week',
    });
  }

  return suggestions;
}

export function initializeProgressTracker(goalId: string, goalName: string, targetValue: number): ProgressTracker {
  return {
    goalId,
    goalName,
    currentValue: 0,
    targetValue,
    startDate: Date.now(),
    lastUpdated: Date.now(),
    progressPercentage: 0,
  };
}

export function updateProgress(tracker: ProgressTracker, newValue: number): ProgressTracker {
  tracker.currentValue = newValue;
  tracker.lastUpdated = Date.now();
  tracker.progressPercentage = (newValue / tracker.targetValue) * 100;
  return tracker;
}

export function initializeHabit(habitId: string, habitName: string, frequency: 'daily' | 'weekly' | 'monthly'): HabitFormation {
  return {
    habitId,
    habitName,
    frequency,
    streak: 0,
    completionRate: 0,
    nextDueDate: Date.now(),
  };
}

export function recordHabitCompletion(habit: HabitFormation): HabitFormation {
  habit.streak++;
  habit.completionRate = Math.min(1, habit.completionRate + 0.1);
  habit.nextDueDate = Date.now() + (habit.frequency === 'daily' ? 86400000 : habit.frequency === 'weekly' ? 604800000 : 2592000000);
  return habit;
}

export function calculateBenchmark(userValue: number, averageValue: number, maxValue: number): Benchmark {
  const percentile = (userValue / maxValue) * 100;
  const recommendation = userValue > averageValue ? 'Above average - keep it up!' : 'Below average - room for improvement';

  return {
    metric: 'Financial Health',
    userValue,
    averageValue,
    percentile,
    recommendation,
  };
}

export function getProgressSummary(trackers: ProgressTracker[]): string {
  const completed = trackers.filter(t => t.progressPercentage >= 100).length;
  const total = trackers.length;
  return `Progress: ${completed}/${total} goals completed. Overall: ${Math.round((completed / total) * 100)}% complete`;
}

export function getHabitSummary(habits: HabitFormation[]): string {
  const activeHabits = habits.filter(h => h.streak > 0).length;
  return `Habits: ${activeHabits} active habits with average ${Math.round(habits.reduce((a, h) => a + h.completionRate, 0) / habits.length * 100)}% completion`;
}
