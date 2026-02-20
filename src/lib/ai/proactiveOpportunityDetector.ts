/**
 * Proactive Opportunity Detector (D10)
 * Surfaces financial opportunities before users ask
 * Implements: D10-01 through D10-05
 */

import type { FinancialState } from '@/lib/state/types';

export interface FinancialOpportunity {
  id: string;
  category: 'savings' | 'debt_reduction' | 'tax_optimization' | 'investment' | 'income';
  title: string;
  description: string;
  potentialImpact: string;
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  actionStep: string;
}

/**
 * Detect high-impact opportunities from financial profile
 */
export function detectOpportunities(fin: FinancialState): FinancialOpportunity[] {
  const opportunities: FinancialOpportunity[] = [];

  // D10-01: High-interest debt opportunity
  if (fin.highInterestDebt && fin.highInterestDebt > 0) {
    const monthlyInterest = (fin.highInterestDebt * 0.24) / 12; // Assume 24% APR
    opportunities.push({
      id: 'D10-HID-01',
      category: 'debt_reduction',
      title: 'High-Interest Debt Payoff Opportunity',
      description: `You're paying ~$${monthlyInterest.toFixed(0)}/month in interest alone. This is the highest-ROI move you can make.`,
      potentialImpact: `Save $${(monthlyInterest * 12).toFixed(0)}/year in interest`,
      urgency: 'immediate',
      actionStep: 'Allocate any extra cash to high-interest debt first — every dollar saves you 24% in interest.',
    });
  }

  // D10-02: Emergency fund gap
  const essentialMonthly = fin.essentialExpenses || 0;
  const targetEmergencyFund = essentialMonthly * 6;
  if (fin.totalSavings && fin.totalSavings < targetEmergencyFund) {
    const gap = targetEmergencyFund - fin.totalSavings;
    opportunities.push({
      id: 'D10-EF-02',
      category: 'savings',
      title: 'Emergency Fund Gap',
      description: `You have ${(fin.totalSavings / essentialMonthly).toFixed(1)} months of expenses saved. Aim for 6 months.`,
      potentialImpact: `Build $${gap.toFixed(0)} safety net`,
      urgency: 'high',
      actionStep: 'Before investing, build your emergency fund to 6 months of expenses.',
    });
  }

  // D10-03: Retirement contribution opportunity
  const monthlyIncome = fin.monthlyIncome || 0;
  if (monthlyIncome > 3000) {
    opportunities.push({
      id: 'D10-RET-03',
      category: 'investment',
      title: 'Retirement Account Optimization',
      description: 'You may be leaving employer match on the table or missing tax-advantaged growth.',
      potentialImpact: 'Maximize tax-deferred growth + employer match',
      urgency: 'high',
      actionStep: 'Contribute enough to 401k to get full employer match — that\'s free money.',
    });
  }

  // D10-04: Savings rate opportunity
  const discretionary = monthlyIncome - essentialMonthly;
  if (discretionary > 500) {
    const savingsRate = (discretionary / monthlyIncome) * 100;
    if (savingsRate < 20) {
      opportunities.push({
        id: 'D10-SR-04',
        category: 'savings',
        title: 'Savings Rate Optimization',
        description: `Your discretionary income is $${discretionary.toFixed(0)}/month. Even small increases compound powerfully.`,
        potentialImpact: `$${(discretionary * 0.1 * 12).toFixed(0)}/year additional savings at 10% rate`,
        urgency: 'medium',
        actionStep: 'Automate savings: set aside 10-20% of discretionary income before you spend it.',
      });
    }
  }

  // D10-05: Low-interest debt strategy
  if (fin.lowInterestDebt && fin.lowInterestDebt > 0 && !fin.highInterestDebt) {
    opportunities.push({
      id: 'D10-LID-05',
      category: 'investment',
      title: 'Low-Interest Debt Strategy',
      description: 'With low-interest debt, investing may be smarter than aggressive payoff.',
      potentialImpact: 'Optimize debt vs. investment tradeoff',
      urgency: 'low',
      actionStep: 'Compare your debt interest rate to expected investment returns (7% historically).',
    });
  }

  return opportunities;
}

/**
 * Format opportunities for conversational presentation
 */
export function formatOpportunitiesForResponse(opportunities: FinancialOpportunity[]): string {
  if (opportunities.length === 0) return '';

  const immediate = opportunities.filter(o => o.urgency === 'immediate');
  const high = opportunities.filter(o => o.urgency === 'high');

  let response = '';

  if (immediate.length > 0) {
    response += '\n**Quick win — do this first:**\n';
    immediate.forEach(opp => {
      response += `\n• ${opp.title}: ${opp.description}\n  → ${opp.actionStep}`;
    });
  }

  if (high.length > 0) {
    response += '\n\n**Also important:**\n';
    high.forEach(opp => {
      response += `\n• ${opp.title}: ${opp.description}\n  → ${opp.actionStep}`;
    });
  }

  return response;
}
