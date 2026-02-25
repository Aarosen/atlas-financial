import { describe, it, expect, beforeEach } from 'vitest';
import { userMemorySystem } from '../userMemorySystem';

describe('User Memory System', () => {
  beforeEach(() => {
    // Clear memories before each test
    userMemorySystem['memories'].clear();
  });

  it('initializes user profile on first access', () => {
    const profile = userMemorySystem.initializeProfile('user_123');
    expect(profile.userId).toBe('user_123');
    expect(profile.milestones).toEqual([]);
    expect(profile.progressNotes).toEqual([]);
  });

  it('records milestones correctly', () => {
    userMemorySystem.recordMilestone('user_123', {
      type: 'income_change',
      description: 'Got a raise from $4k to $5k/month',
      newValue: 5000,
      previousValue: 4000,
      timestamp: Date.now(),
    });

    const profile = userMemorySystem.initializeProfile('user_123');
    expect(profile.milestones.length).toBe(1);
    expect(profile.milestones[0].type).toBe('income_change');
  });

  it('updates financial snapshot', () => {
    userMemorySystem.updateFinancialSnapshot('user_123', {
      monthlyIncome: 5000,
      totalSavings: 10000,
      highInterestDebt: 2000,
    });

    const profile = userMemorySystem.initializeProfile('user_123');
    expect(profile.financialSnapshot.monthlyIncome).toBe(5000);
    expect(profile.financialSnapshot.totalSavings).toBe(10000);
  });

  it('generates memory summary for new user', () => {
    const summary = userMemorySystem.generateMemorySummary('new_user');
    expect(summary.progressSinceLastSession).toContain('first session');
    expect(summary.keyMilestones).toEqual([]);
    expect(summary.financialTrend).toBe('stable');
  });

  it('generates memory summary with recent milestones', () => {
    const now = Date.now();
    userMemorySystem.recordMilestone('user_456', {
      type: 'savings_milestone',
      description: 'Reached $5k emergency fund',
      newValue: 5000,
      timestamp: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
    });

    const summary = userMemorySystem.generateMemorySummary('user_456');
    expect(summary.progressSinceLastSession).toContain('1');
    expect(summary.keyMilestones.length).toBe(1);
  });

  it('generates memory context for LLM', () => {
    userMemorySystem.updateFinancialSnapshot('user_789', {
      monthlyIncome: 4500,
      totalSavings: 8000,
    });

    userMemorySystem.recordMilestone('user_789', {
      type: 'debt_payoff',
      description: 'Paid off $500 of credit card debt',
      newValue: 1500,
      previousValue: 2000,
      timestamp: Date.now(),
    });

    const context = userMemorySystem.getMemoryContext('user_789');
    expect(context).toContain('USER MEMORY');
    expect(context).toContain('4500');
    expect(context).toContain('Paid off');
  });

  it('clears old data for privacy', () => {
    const oldTimestamp = Date.now() - 200 * 24 * 60 * 60 * 1000; // 200 days ago
    const recentTimestamp = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago

    userMemorySystem.recordMilestone('user_old', {
      type: 'savings_milestone',
      description: 'Old milestone',
      timestamp: oldTimestamp,
    });

    userMemorySystem.recordMilestone('user_old', {
      type: 'income_change',
      description: 'Recent milestone',
      timestamp: recentTimestamp,
    });

    userMemorySystem.clearOldData('user_old', 180); // Keep 180 days

    const profile = userMemorySystem.initializeProfile('user_old');
    expect(profile.milestones.length).toBe(1);
    expect(profile.milestones[0].description).toBe('Recent milestone');
  });

  it('adds progress notes', () => {
    userMemorySystem.addProgressNote('user_notes', 'User is motivated to pay off debt');
    userMemorySystem.addProgressNote('user_notes', 'Discussed emergency fund strategy');

    const profile = userMemorySystem.initializeProfile('user_notes');
    expect(profile.progressNotes.length).toBe(2);
    expect(profile.progressNotes[0]).toContain('motivated');
  });
});
