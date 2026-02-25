// Financial Profile Database Layer - P0-2 requirement
import type { FinancialProfile, FinancialGoal, DebtAccount } from '../types/financial';

export class FinancialProfileDb {
  // In-memory storage for MVP (will be replaced with Supabase)
  private profiles: Map<string, FinancialProfile> = new Map();

  async createProfile(userId: string, data: Partial<FinancialProfile>): Promise<FinancialProfile> {
    const profile: FinancialProfile = {
      userId,
      name: data.name || 'User',
      lifeStage: data.lifeStage || 'early_career',
      monthlyIncome: data.monthlyIncome || 0,
      monthlyExpenses: data.monthlyExpenses || 0,
      debtAccounts: data.debtAccounts || [],
      savingsBalance: data.savingsBalance || 0,
      monthlySavings: data.monthlySavings || 0,
      financialGoals: data.financialGoals || [],
      knowledgeLevel: data.knowledgeLevel || 'novice',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.profiles.set(userId, profile);
    return profile;
  }

  async getProfile(userId: string): Promise<FinancialProfile | null> {
    return this.profiles.get(userId) || null;
  }

  async updateProfile(userId: string, updates: Partial<FinancialProfile>): Promise<FinancialProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    const updated: FinancialProfile = {
      ...profile,
      ...updates,
      userId: profile.userId, // Prevent userId from being changed
      createdAt: profile.createdAt, // Prevent createdAt from being changed
      updatedAt: new Date(),
    };

    this.profiles.set(userId, updated);
    return updated;
  }

  async addDebtAccount(userId: string, debt: DebtAccount): Promise<FinancialProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    profile.debtAccounts.push(debt);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);
    return profile;
  }

  async addFinancialGoal(userId: string, goal: FinancialGoal): Promise<FinancialProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    profile.financialGoals.push(goal);
    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);
    return profile;
  }

  async updateFinancialGoal(userId: string, goalId: string, updates: Partial<FinancialGoal>): Promise<FinancialProfile> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    const goalIndex = profile.financialGoals.findIndex((g) => g.id === goalId);
    if (goalIndex === -1) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    profile.financialGoals[goalIndex] = {
      ...profile.financialGoals[goalIndex],
      ...updates,
      id: profile.financialGoals[goalIndex].id,
      createdAt: profile.financialGoals[goalIndex].createdAt,
    };

    profile.updatedAt = new Date();
    this.profiles.set(userId, profile);
    return profile;
  }

  // Calculate financial metrics from profile
  calculateMetrics(profile: FinancialProfile) {
    const monthlyNetCashFlow = profile.monthlyIncome - profile.monthlyExpenses;
    const bufferMonths = profile.monthlyExpenses > 0 ? profile.savingsBalance / profile.monthlyExpenses : 0;

    // Calculate debt urgency based on total high-interest debt
    const highInterestDebt = profile.debtAccounts
      .filter((d) => d.apr >= 15)
      .reduce((sum, d) => sum + d.balance, 0);

    let debtUrgency: 'low' | 'moderate' | 'high' | 'critical' = 'low';
    if (highInterestDebt > profile.monthlyIncome * 3) {
      debtUrgency = 'critical';
    } else if (highInterestDebt > profile.monthlyIncome * 1.5) {
      debtUrgency = 'high';
    } else if (highInterestDebt > 0) {
      debtUrgency = 'moderate';
    }

    // Future outlook: estimated annual savings growth (simplified)
    const savingsRate = profile.monthlySavings / profile.monthlyIncome;
    const futureOutlook = Math.min(savingsRate * 100 * 1.5, 15); // Cap at 15%

    return {
      bufferMonths: Math.max(0, bufferMonths),
      futureOutlook: Math.max(0, futureOutlook),
      debtUrgency,
      monthlyNetCashFlow,
      confidence: bufferMonths > 0 && monthlyNetCashFlow > 0 ? 'high' : 'medium',
    };
  }
}
