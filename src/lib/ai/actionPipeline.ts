/**
 * Action Pipeline System
 * Structures financial recommendations as sequential actions with dependencies
 * Enables progression from Action 1 → Action 2 → Action 3 → ... → Action 10+
 */

export interface ActionStep {
  stepNumber: number;
  title: string;
  description: string;
  specificAction: string; // e.g., "Pay $200 extra to credit card this month"
  dueDate?: string; // ISO date
  estimatedImpact: string; // e.g., "Saves $50/month in interest"
  blockedBy?: number[]; // step numbers that must complete first
  unlocksNext?: number; // step number that becomes available after completion
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'debt' | 'savings' | 'income' | 'expenses' | 'investment' | 'other';
}

export interface ActionPipeline {
  userId: string;
  sessionId: string;
  goal: string; // e.g., "Pay off $12,000 credit card debt"
  totalSteps: number;
  currentStep: number;
  steps: ActionStep[];
  createdAt: string;
  updatedAt: string;
  completedSteps: number[];
}

/**
 * Generate a 90-day action pipeline for debt payoff
 * Structures the journey from crisis to stability
 */
export function generateDebtPayoffPipeline(
  debtAmount: number,
  monthlyIncome: number,
  essentialExpenses: number
): ActionStep[] {
  const monthlySurplus = monthlyIncome - essentialExpenses;
  const aggressivePayment = Math.max(monthlySurplus * 0.3, 100); // 30% of surplus, min $100

  return [
    {
      stepNumber: 1,
      title: 'Stop the bleeding',
      description: 'Prevent debt from growing while you pay it down',
      specificAction: `Stop adding to this debt. If it's a credit card, remove it from your wallet or freeze it.`,
      priority: 'critical',
      category: 'debt',
      estimatedImpact: 'Prevents interest from compounding',
    },
    {
      stepNumber: 2,
      title: 'Make the first extra payment',
      description: 'Start building momentum with your first aggressive payment',
      specificAction: `Pay $${Math.round(aggressivePayment)} extra toward this debt this month (beyond minimum).`,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      blockedBy: [1],
      unlocksNext: 3,
      priority: 'high',
      category: 'debt',
      estimatedImpact: `Saves ~$${Math.round(aggressivePayment * 0.15)}/month in interest`,
    },
    {
      stepNumber: 3,
      title: 'Build a $1,000 emergency buffer',
      description: 'Prevent new debt if an emergency happens while paying off',
      specificAction: `Save $${Math.round(monthlySurplus * 0.1)} toward a $1,000 emergency fund.`,
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      blockedBy: [2],
      unlocksNext: 4,
      priority: 'high',
      category: 'savings',
      estimatedImpact: 'Prevents new debt from emergencies',
    },
    {
      stepNumber: 4,
      title: 'Accelerate the payoff',
      description: 'Increase payment to finish debt faster',
      specificAction: `Increase extra payment to $${Math.round(aggressivePayment * 1.5)} per month.`,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      blockedBy: [3],
      unlocksNext: 5,
      priority: 'high',
      category: 'debt',
      estimatedImpact: `Reduces payoff timeline by ~${Math.round((debtAmount / aggressivePayment) * 0.2)} months`,
    },
    {
      stepNumber: 5,
      title: 'Celebrate the payoff',
      description: 'Acknowledge the milestone when debt is eliminated',
      specificAction: `When this debt reaches $0, pause and celebrate. You did it.`,
      blockedBy: [4],
      unlocksNext: 6,
      priority: 'medium',
      category: 'other',
      estimatedImpact: 'Psychological momentum for next goal',
    },
    {
      stepNumber: 6,
      title: 'Build full emergency fund',
      description: 'Expand buffer to 3-6 months of expenses',
      specificAction: `Save the freed-up payment amount ($${Math.round(aggressivePayment)}) toward a 3-month emergency fund.`,
      blockedBy: [5],
      unlocksNext: 7,
      priority: 'high',
      category: 'savings',
      estimatedImpact: 'Financial stability and peace of mind',
    },
    {
      stepNumber: 7,
      title: 'Start investing for the future',
      description: 'Begin building wealth through investments',
      specificAction: `Invest $${Math.round(monthlySurplus * 0.15)} per month in a low-cost total market index fund — a standard brokerage or your employer's 401k are both fine places to start.`,
      blockedBy: [6],
      priority: 'medium',
      category: 'investment',
      estimatedImpact: 'Compound growth over 30+ years',
    },
  ];
}

/**
 * Generate a 90-day action pipeline for emergency fund building
 */
export function generateEmergencyFundPipeline(
  targetAmount: number,
  monthlyIncome: number,
  essentialExpenses: number
): ActionStep[] {
  const monthlySurplus = monthlyIncome - essentialExpenses;
  const monthlyContribution = Math.max(monthlySurplus * 0.2, 50); // 20% of surplus, min $50

  return [
    {
      stepNumber: 1,
      title: 'Open a separate savings account',
      description: 'Create a dedicated account for emergencies only',
      specificAction: `Open a high-yield savings account (e.g., Marcus, Ally) for your emergency fund.`,
      priority: 'high',
      category: 'savings',
      estimatedImpact: 'Earns ~4-5% APY on your savings',
    },
    {
      stepNumber: 2,
      title: 'Make your first deposit',
      description: 'Start building the fund with your first contribution',
      specificAction: `Deposit $${Math.round(monthlyContribution)} into your emergency fund.`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      blockedBy: [1],
      unlocksNext: 3,
      priority: 'high',
      category: 'savings',
      estimatedImpact: 'Builds momentum and habit',
    },
    {
      stepNumber: 3,
      title: 'Automate monthly contributions',
      description: 'Set up automatic transfers so you never miss a deposit',
      specificAction: `Set up automatic transfer of $${Math.round(monthlyContribution)} on the 1st of each month.`,
      blockedBy: [2],
      unlocksNext: 4,
      priority: 'high',
      category: 'savings',
      estimatedImpact: 'Removes willpower from the equation',
    },
    {
      stepNumber: 4,
      title: 'Reach $1,000 milestone',
      description: 'Hit your first milestone — enough for most emergencies',
      specificAction: `Continue monthly deposits until you reach $1,000.`,
      dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      blockedBy: [3],
      unlocksNext: 5,
      priority: 'high',
      category: 'savings',
      estimatedImpact: 'Covers most car repairs, medical bills, etc.',
    },
    {
      stepNumber: 5,
      title: 'Reach full emergency fund',
      description: 'Build to 3-6 months of essential expenses',
      specificAction: `Continue monthly deposits until you reach $${Math.round(essentialExpenses * 3)}.`,
      blockedBy: [4],
      unlocksNext: 6,
      priority: 'high',
      category: 'savings',
      estimatedImpact: 'Can handle job loss or major life event',
    },
    {
      stepNumber: 6,
      title: 'Celebrate financial stability',
      description: 'Acknowledge the safety net you\'ve built',
      specificAction: `You now have ${Math.round(essentialExpenses * 3 / essentialExpenses)}-month safety net. Sleep better.`,
      blockedBy: [5],
      unlocksNext: 7,
      priority: 'medium',
      category: 'other',
      estimatedImpact: 'Psychological peace and reduced stress',
    },
    {
      stepNumber: 7,
      title: 'Redirect surplus to next goal',
      description: 'Now that emergency fund is full, redirect savings to next priority',
      specificAction: `Redirect the $${Math.round(monthlyContribution)} to debt payoff or investing.`,
      blockedBy: [6],
      priority: 'medium',
      category: 'other',
      estimatedImpact: 'Accelerates progress on next goal',
    },
  ];
}

/**
 * Get the next available action in a pipeline
 */
export function getNextAction(pipeline: ActionPipeline): ActionStep | null {
  const nextStep = pipeline.steps.find((step) => {
    // Already completed
    if (pipeline.completedSteps.includes(step.stepNumber)) return false;
    // Check if blocked by incomplete steps
    if (step.blockedBy) {
      const allBlockersComplete = step.blockedBy.every((blocker) =>
        pipeline.completedSteps.includes(blocker)
      );
      return allBlockersComplete;
    }
    // First step is always available
    return step.stepNumber === 1;
  });

  return nextStep || null;
}

/**
 * Mark an action as complete and unlock next steps
 */
export function completeAction(
  pipeline: ActionPipeline,
  stepNumber: number
): ActionPipeline {
  return {
    ...pipeline,
    completedSteps: [...new Set([...pipeline.completedSteps, stepNumber])],
    currentStep: stepNumber,
    updatedAt: new Date().toISOString(),
  };
}
