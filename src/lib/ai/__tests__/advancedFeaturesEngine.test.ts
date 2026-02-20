import {
  generateActionSuggestions,
  initializeProgressTracker,
  updateProgress,
  initializeHabit,
  recordHabitCompletion,
  calculateBenchmark,
  getProgressSummary,
  getHabitSummary,
} from '../advancedFeaturesEngine';

describe('Advanced Features Engine', () => {
  describe('generateActionSuggestions', () => {
    it('should suggest debt payoff actions', () => {
      const suggestions = generateActionSuggestions('debt_stress', { totalDebt: 20000, currentSavings: 5000, savingsGoal: 15000, monthlyExpenses: 3000, monthlyIncome: 5000 });
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.id === 'pay_extra_principal')).toBe(true);
    });

    it('should suggest savings actions', () => {
      const suggestions = generateActionSuggestions('savings_gap', { totalDebt: 0, currentSavings: 5000, savingsGoal: 20000, monthlyExpenses: 3000, monthlyIncome: 5000 });
      expect(suggestions.some(s => s.id === 'increase_savings_rate')).toBe(true);
    });

    it('should suggest expense reduction', () => {
      const suggestions = generateActionSuggestions('budgeting_help', { totalDebt: 0, currentSavings: 5000, savingsGoal: 15000, monthlyExpenses: 4000, monthlyIncome: 5000 });
      expect(suggestions.some(s => s.id === 'reduce_expenses')).toBe(true);
    });
  });

  describe('initializeProgressTracker', () => {
    it('should create progress tracker', () => {
      const tracker = initializeProgressTracker('goal1', 'Save $20k', 20000);
      expect(tracker.goalId).toBe('goal1');
      expect(tracker.goalName).toBe('Save $20k');
      expect(tracker.targetValue).toBe(20000);
      expect(tracker.progressPercentage).toBe(0);
    });
  });

  describe('updateProgress', () => {
    it('should update progress percentage', () => {
      let tracker = initializeProgressTracker('goal1', 'Save $20k', 20000);
      tracker = updateProgress(tracker, 10000);
      expect(tracker.currentValue).toBe(10000);
      expect(tracker.progressPercentage).toBe(50);
    });
  });

  describe('initializeHabit', () => {
    it('should create habit tracker', () => {
      const habit = initializeHabit('habit1', 'Daily budgeting', 'daily');
      expect(habit.habitId).toBe('habit1');
      expect(habit.habitName).toBe('Daily budgeting');
      expect(habit.frequency).toBe('daily');
      expect(habit.streak).toBe(0);
    });
  });

  describe('recordHabitCompletion', () => {
    it('should increment streak', () => {
      let habit = initializeHabit('habit1', 'Daily budgeting', 'daily');
      habit = recordHabitCompletion(habit);
      expect(habit.streak).toBe(1);
      expect(habit.completionRate).toBeGreaterThan(0);
    });
  });

  describe('calculateBenchmark', () => {
    it('should calculate percentile', () => {
      const benchmark = calculateBenchmark(7500, 5000, 10000);
      expect(benchmark.percentile).toBe(75);
      expect(benchmark.recommendation).toContain('Above average');
    });

    it('should recommend improvement when below average', () => {
      const benchmark = calculateBenchmark(3000, 5000, 10000);
      expect(benchmark.recommendation).toContain('Below average');
    });
  });

  describe('getProgressSummary', () => {
    it('should summarize progress', () => {
      const tracker1 = initializeProgressTracker('goal1', 'Save $20k', 20000);
      const tracker2 = updateProgress(initializeProgressTracker('goal2', 'Pay debt', 10000), 10000);
      const summary = getProgressSummary([tracker1, tracker2]);
      expect(summary).toContain('Progress');
      expect(summary).toContain('50%');
    });
  });

  describe('getHabitSummary', () => {
    it('should summarize habits', () => {
      let habit1 = initializeHabit('habit1', 'Daily budgeting', 'daily');
      habit1 = recordHabitCompletion(habit1);
      const summary = getHabitSummary([habit1]);
      expect(summary).toContain('Habits');
      expect(summary).toContain('active');
    });
  });
});
