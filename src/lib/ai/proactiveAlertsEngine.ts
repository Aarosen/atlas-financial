/**
 * Proactive Alerts Engine
 * Surfaces financial needs and opportunities before users ask
 * Monitors for tax deadlines, subscription renewals, debt milestones, investment opportunities
 */

export interface ProactiveAlert {
  id: string;
  type: 'tax_deadline' | 'subscription_renewal' | 'debt_milestone' | 'savings_opportunity' | 'investment_opportunity' | 'credit_score_improvement';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  daysUntilEvent?: number;
  estimatedImpact?: string; // e.g., "Save $200/month"
}

export interface AlertContext {
  monthlyIncome: number;
  highInterestDebt: number;
  lowInterestDebt: number;
  totalSavings: number;
  monthlyExpenses: number;
  hasSubscriptions?: boolean;
  estimatedTaxableIncome?: number;
  creditScore?: number;
  investmentAmount?: number;
}

export class ProactiveAlertsEngine {
  /**
   * Detect tax-related alerts
   */
  detectTaxAlerts(): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();

    // Tax deadline alerts
    if (currentMonth === 3) {
      // April
      alerts.push({
        id: 'tax_deadline_april',
        type: 'tax_deadline',
        priority: 'critical',
        title: 'Tax Filing Deadline Approaching',
        description: 'April 15 is the federal tax filing deadline. Make sure you have all documents ready.',
        actionItems: [
          'Gather W-2s, 1099s, and other income documents',
          'Organize deductible expenses',
          'Consider consulting a CPA if you have complex income',
          'File early to avoid last-minute stress',
        ],
        daysUntilEvent: 15 - now.getDate(),
      });
    }

    // Estimated tax payment alerts (quarterly)
    const estimatedPaymentMonths = [3, 6, 8, 0]; // April, June, Sept, Jan
    if (estimatedPaymentMonths.includes(currentMonth)) {
      alerts.push({
        id: `estimated_tax_q${Math.floor(currentMonth / 3) + 1}`,
        type: 'tax_deadline',
        priority: 'high',
        title: 'Quarterly Estimated Tax Payment Due',
        description: 'Self-employed or high-income individuals should make quarterly estimated tax payments.',
        actionItems: [
          'Calculate estimated tax liability for the quarter',
          'Submit Form 1040-ES with payment',
          'Set a calendar reminder for next quarter',
        ],
      });
    }

    return alerts;
  }

  /**
   * Detect subscription and recurring expense alerts
   */
  detectSubscriptionAlerts(monthlyExpenses: number): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];

    // Generic subscription audit alert
    alerts.push({
      id: 'subscription_audit',
      type: 'subscription_renewal',
      priority: 'medium',
      title: 'Review Subscriptions and Recurring Charges',
      description: `You're spending ~$${monthlyExpenses}/month. Many people have forgotten subscriptions costing $50-200/month.`,
      actionItems: [
        'Review last 3 months of credit card statements',
        'Identify unused subscriptions (streaming, apps, memberships)',
        'Cancel services you no longer use',
        'Negotiate rates on services you keep (insurance, internet)',
      ],
      estimatedImpact: 'Potential savings: $50-200/month',
    });

    return alerts;
  }

  /**
   * Detect debt payoff milestones and opportunities
   */
  detectDebtAlerts(highInterestDebt: number, lowInterestDebt: number): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];

    // High-interest debt alert
    if (highInterestDebt > 1000) {
      alerts.push({
        id: 'high_interest_debt',
        type: 'debt_milestone',
        priority: 'high',
        title: 'High-Interest Debt Payoff Strategy',
        description: `You have $${highInterestDebt.toLocaleString()} in high-interest debt. This is costing you money every month.`,
        actionItems: [
          'List all high-interest debts with APR',
          'Consider debt avalanche (highest APR first) or snowball (smallest balance first)',
          'Look for balance transfer opportunities (0% APR for 6-12 months)',
          'Increase payments if possible to save on interest',
        ],
        estimatedImpact: `Paying off this debt could save $${Math.round(highInterestDebt * 0.15)}/year in interest`,
      });
    }

    // Debt payoff milestone
    if (highInterestDebt > 0 && highInterestDebt < 500) {
      alerts.push({
        id: 'debt_payoff_milestone',
        type: 'debt_milestone',
        priority: 'medium',
        title: 'You\'re Close to Debt Freedom!',
        description: `You're down to $${highInterestDebt.toLocaleString()} in high-interest debt. Keep pushing!`,
        actionItems: [
          'Make one final aggressive payment push',
          'Celebrate when you hit zero',
          'Redirect freed-up money to savings or investments',
        ],
      });
    }

    return alerts;
  }

  /**
   * Detect savings and investment opportunities
   */
  detectSavingsAlerts(totalSavings: number, monthlyIncome: number, investmentAmount: number): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];

    // Emergency fund alert
    const recommendedEmergency = monthlyIncome * 3;
    if (totalSavings < recommendedEmergency) {
      alerts.push({
        id: 'emergency_fund',
        type: 'savings_opportunity',
        priority: 'high',
        title: 'Build Your Emergency Fund',
        description: `You have $${totalSavings.toLocaleString()} saved. Aim for 3-6 months of expenses ($${recommendedEmergency.toLocaleString()}).`,
        actionItems: [
          'Open a high-yield savings account (currently 4-5% APY)',
          'Set up automatic transfers of $100-500/month',
          'Keep emergency fund separate from checking account',
          'Don\'t touch it except for true emergencies',
        ],
        estimatedImpact: `$${recommendedEmergency.toLocaleString()} emergency fund = peace of mind`,
      });
    }

    // Investment opportunity alert
    if (totalSavings > recommendedEmergency && investmentAmount === 0) {
      alerts.push({
        id: 'investment_opportunity',
        type: 'investment_opportunity',
        priority: 'medium',
        title: 'Start Investing for Long-Term Growth',
        description: 'Once your emergency fund is solid, investing can help your money grow faster than savings accounts.',
        actionItems: [
          'Open a brokerage account (Vanguard, Fidelity, Schwab)',
          'Start with low-cost index funds (S&P 500, total market)',
          'Invest consistently, even small amounts ($100/month)',
          'Ignore short-term market fluctuations',
        ],
        estimatedImpact: '7% average annual return = $10k becomes $20k in 10 years',
      });
    }

    return alerts;
  }

  /**
   * Detect credit score improvement opportunities
   */
  detectCreditAlerts(creditScore?: number): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];

    if (!creditScore || creditScore < 700) {
      alerts.push({
        id: 'credit_score_improvement',
        type: 'credit_score_improvement',
        priority: 'high',
        title: 'Improve Your Credit Score',
        description: `Your credit score is ${creditScore || 'unknown'}. Better credit = lower interest rates on loans.`,
        actionItems: [
          'Check your credit report at annualcreditreport.com (free)',
          'Dispute any errors on your report',
          'Pay all bills on time (35% of score)',
          'Keep credit card balances low (30% of score)',
          'Don\'t close old credit cards',
        ],
        estimatedImpact: 'Improving from 650 to 750 could save $100k+ over a lifetime',
      });
    }

    return alerts;
  }

  /**
   * Generate all relevant alerts for a user
   */
  generateAllAlerts(context: AlertContext): ProactiveAlert[] {
    const alerts: ProactiveAlert[] = [];

    alerts.push(...this.detectTaxAlerts());
    alerts.push(...this.detectSubscriptionAlerts(context.monthlyExpenses));
    alerts.push(...this.detectDebtAlerts(context.highInterestDebt, context.lowInterestDebt));
    alerts.push(...this.detectSavingsAlerts(context.totalSavings, context.monthlyIncome, context.investmentAmount || 0));
    alerts.push(...this.detectCreditAlerts(context.creditScore));

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return alerts;
  }

  /**
   * Format alerts for display in conversation
   */
  formatAlertsForConversation(alerts: ProactiveAlert[], maxAlerts: number = 2): string {
    if (alerts.length === 0) return '';

    const topAlerts = alerts.slice(0, maxAlerts);
    let formatted = '\n\n**Things I noticed that might help:**\n';

    topAlerts.forEach((alert) => {
      formatted += `\n• **${alert.title}** (${alert.priority} priority)\n`;
      formatted += `  ${alert.description}\n`;
      if (alert.estimatedImpact) {
        formatted += `  💡 ${alert.estimatedImpact}\n`;
      }
    });

    if (alerts.length > maxAlerts) {
      formatted += `\n(${alerts.length - maxAlerts} more alerts available)\n`;
    }

    return formatted;
  }
}

export const proactiveAlertsEngine = new ProactiveAlertsEngine();
