/**
 * Dashboard Engine
 * Requirement 12: Dashboard Accessible in Conversation (Not Separate)
 * Requirement 13: Progressive Data Visualization
 * Requirement 14: Metric Explanations
 * 
 * Manages dashboard data, visualization, and accessibility within conversation flow.
 */

export interface DashboardMetric {
  id: string;
  label: string;
  value: number | string;
  unit: string;
  category: 'income' | 'expenses' | 'debt' | 'savings' | 'goals' | 'health';
  trend?: 'up' | 'down' | 'stable';
  explanation?: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  lastUpdated: number;
  completeness: number; // 0-100, percentage of data collected
  readyToDisplay: boolean;
}

export interface VisualizationConfig {
  type: 'card' | 'chart' | 'progress' | 'comparison';
  title: string;
  metrics: string[]; // metric IDs
  layout: 'horizontal' | 'vertical';
}

export interface MetricExplanation {
  metricId: string;
  explanation: string;
  impact: string;
  actionable: boolean;
  suggestedAction?: string;
}

export function initializeDashboard(): DashboardData {
  return {
    metrics: [],
    lastUpdated: Date.now(),
    completeness: 0,
    readyToDisplay: false,
  };
}

export function addMetricToDashboard(
  dashboard: DashboardData,
  metric: DashboardMetric
): DashboardData {
  const existingIndex = dashboard.metrics.findIndex(m => m.id === metric.id);
  
  if (existingIndex >= 0) {
    dashboard.metrics[existingIndex] = metric;
  } else {
    dashboard.metrics.push(metric);
  }

  dashboard.lastUpdated = Date.now();
  dashboard.completeness = calculateCompleteness(dashboard);
  dashboard.readyToDisplay = dashboard.completeness >= 30;

  return dashboard;
}

export function calculateCompleteness(dashboard: DashboardData): number {
  const requiredMetrics = ['income', 'expenses', 'savings', 'debt'];
  const collectedMetrics = new Set(dashboard.metrics.map(m => m.category));
  const collected = requiredMetrics.filter(m => collectedMetrics.has(m as any)).length;
  return Math.round((collected / requiredMetrics.length) * 100);
}

export function shouldDisplayDashboard(dashboard: DashboardData): boolean {
  return dashboard.readyToDisplay && dashboard.metrics.length > 0;
}

export function getDashboardSummary(dashboard: DashboardData): string {
  if (!shouldDisplayDashboard(dashboard)) {
    return `Dashboard is ${dashboard.completeness}% complete. We need more information to show your full financial picture.`;
  }

  const incomeMetric = dashboard.metrics.find(m => m.id === 'monthly_income');
  const expensesMetric = dashboard.metrics.find(m => m.id === 'monthly_expenses');
  const savingsMetric = dashboard.metrics.find(m => m.id === 'current_savings');
  const debtMetric = dashboard.metrics.find(m => m.id === 'total_debt');

  let summary = 'Here\'s your financial snapshot: ';
  
  if (incomeMetric) summary += `Monthly income: $${incomeMetric.value}. `;
  if (expensesMetric) summary += `Monthly expenses: $${expensesMetric.value}. `;
  if (savingsMetric) summary += `Current savings: $${savingsMetric.value}. `;
  if (debtMetric) summary += `Total debt: $${debtMetric.value}. `;

  return summary;
}

export function getMetricExplanation(metric: DashboardMetric): MetricExplanation {
  const explanations: Record<string, MetricExplanation> = {
    monthly_income: {
      metricId: 'monthly_income',
      explanation: 'Your monthly income is the total money you earn after taxes.',
      impact: 'This is the foundation of your budget and determines how much you can save or spend.',
      actionable: true,
      suggestedAction: 'Track any changes in income and update this number regularly.',
    },
    monthly_expenses: {
      metricId: 'monthly_expenses',
      explanation: 'Your monthly expenses are all the money you spend each month.',
      impact: 'Lower expenses mean more money available for savings or debt payoff.',
      actionable: true,
      suggestedAction: 'Review your expenses and identify areas where you can cut back.',
    },
    current_savings: {
      metricId: 'current_savings',
      explanation: 'Your current savings is the money you have set aside.',
      impact: 'Savings provide security and options for your future.',
      actionable: true,
      suggestedAction: 'Aim to build your savings to at least 3 months of expenses.',
    },
    total_debt: {
      metricId: 'total_debt',
      explanation: 'Your total debt is all the money you owe.',
      impact: 'Debt costs you money in interest and limits your financial flexibility.',
      actionable: true,
      suggestedAction: 'Focus on paying down high-interest debt first.',
    },
    debt_to_income_ratio: {
      metricId: 'debt_to_income_ratio',
      explanation: 'Your debt-to-income ratio compares your total debt to your annual income.',
      impact: 'A lower ratio is better. Ideally, it should be below 0.36.',
      actionable: true,
      suggestedAction: 'Work on reducing debt or increasing income to improve this ratio.',
    },
    savings_rate: {
      metricId: 'savings_rate',
      explanation: 'Your savings rate is the percentage of your income that you save.',
      impact: 'A higher savings rate means faster wealth building.',
      actionable: true,
      suggestedAction: 'Aim for a savings rate of at least 20% of your income.',
    },
  };

  return explanations[metric.id] || {
    metricId: metric.id,
    explanation: `This metric tracks your ${metric.label.toLowerCase()}.`,
    impact: 'This helps you understand your financial situation.',
    actionable: false,
  };
}

export function getVisualizationConfig(dashboard: DashboardData): VisualizationConfig[] {
  const configs: VisualizationConfig[] = [];

  // Income vs Expenses comparison
  if (dashboard.metrics.some(m => m.id === 'monthly_income') && 
      dashboard.metrics.some(m => m.id === 'monthly_expenses')) {
    configs.push({
      type: 'comparison',
      title: 'Income vs Expenses',
      metrics: ['monthly_income', 'monthly_expenses'],
      layout: 'horizontal',
    });
  }

  // Savings progress
  if (dashboard.metrics.some(m => m.id === 'current_savings') && 
      dashboard.metrics.some(m => m.id === 'savings_goal')) {
    configs.push({
      type: 'progress',
      title: 'Savings Progress',
      metrics: ['current_savings', 'savings_goal'],
      layout: 'vertical',
    });
  }

  // Debt overview
  if (dashboard.metrics.some(m => m.id === 'total_debt')) {
    configs.push({
      type: 'card',
      title: 'Debt Overview',
      metrics: ['total_debt'],
      layout: 'vertical',
    });
  }

  // Financial health chart
  if (dashboard.metrics.length >= 3) {
    configs.push({
      type: 'chart',
      title: 'Financial Health',
      metrics: dashboard.metrics.slice(0, 5).map(m => m.id),
      layout: 'horizontal',
    });
  }

  return configs;
}

export function formatDashboardForConversation(dashboard: DashboardData): string {
  if (!shouldDisplayDashboard(dashboard)) {
    return '';
  }

  let output = '📊 **Your Financial Dashboard**\n\n';

  const categories = ['income', 'expenses', 'savings', 'debt'];
  
  for (const category of categories) {
    const categoryMetrics = dashboard.metrics.filter(m => m.category === category);
    if (categoryMetrics.length > 0) {
      output += `**${category.charAt(0).toUpperCase() + category.slice(1)}**\n`;
      for (const metric of categoryMetrics) {
        output += `- ${metric.label}: $${metric.value} ${metric.unit}\n`;
      }
      output += '\n';
    }
  }

  output += `Dashboard is ${dashboard.completeness}% complete.`;
  return output;
}
