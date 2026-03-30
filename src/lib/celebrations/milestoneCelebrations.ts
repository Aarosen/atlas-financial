/**
 * Milestone celebration system for Atlas Financial
 * Generates celebratory messages and rewards at key progress points
 */

export interface Milestone {
  id: string;
  type: 'debt_payoff' | 'savings_goal' | 'emergency_fund' | 'goal_completion' | 'streak' | 'first_action';
  title: string;
  description: string;
  celebrationMessage: string;
  icon: string;
  reward?: string;
  unlockCondition: (data: any) => boolean;
}

const milestones: Milestone[] = [
  {
    id: 'first_action',
    type: 'first_action',
    title: 'First Step',
    description: 'Completed your first financial action',
    celebrationMessage: 'You took your first step toward financial freedom! This is huge. Every journey starts with a single step, and you just took yours. 🎉',
    icon: '🚀',
    reward: 'Unlocked: Action Tracking',
    unlockCondition: (data) => data.actionsCompleted === 1,
  },
  {
    id: 'debt_payoff_25',
    type: 'debt_payoff',
    title: '25% Debt Payoff',
    description: 'Paid off 25% of high-interest debt',
    celebrationMessage: 'You\'ve paid off 25% of your high-interest debt! That\'s real progress. Keep the momentum going! 💪',
    icon: '📉',
    reward: 'Unlocked: Debt Payoff Strategy',
    unlockCondition: (data) => data.debtPayoffProgress >= 0.25,
  },
  {
    id: 'debt_payoff_50',
    type: 'debt_payoff',
    title: '50% Debt Payoff',
    description: 'Paid off 50% of high-interest debt',
    celebrationMessage: 'Halfway there! You\'ve eliminated half of your high-interest debt. You\'re unstoppable! 🔥',
    icon: '📉',
    reward: 'Unlocked: Advanced Payoff Plans',
    unlockCondition: (data) => data.debtPayoffProgress >= 0.5,
  },
  {
    id: 'debt_payoff_100',
    type: 'debt_payoff',
    title: 'Debt Free',
    description: 'Eliminated all high-interest debt',
    celebrationMessage: 'You did it! You\'re officially high-interest debt free! This is a massive achievement. Celebrate this moment! 🎊',
    icon: '✨',
    reward: 'Unlocked: Wealth Building Mode',
    unlockCondition: (data) => data.highInterestDebt === 0,
  },
  {
    id: 'emergency_fund_25',
    type: 'emergency_fund',
    title: 'Emergency Fund Started',
    description: 'Built 25% of emergency fund',
    celebrationMessage: 'You\'ve started your emergency fund! This safety net will give you peace of mind. 🛡️',
    icon: '🏦',
    reward: 'Unlocked: Emergency Fund Tracking',
    unlockCondition: (data) => data.emergencyFundProgress >= 0.25,
  },
  {
    id: 'emergency_fund_50',
    type: 'emergency_fund',
    title: 'Emergency Fund Halfway',
    description: 'Built 50% of emergency fund',
    celebrationMessage: 'You\'re halfway to a fully funded emergency fund! You\'re building real financial security. 💎',
    icon: '🏦',
    reward: 'Unlocked: Financial Security Badge',
    unlockCondition: (data) => data.emergencyFundProgress >= 0.5,
  },
  {
    id: 'emergency_fund_100',
    type: 'emergency_fund',
    title: 'Emergency Fund Complete',
    description: 'Fully funded emergency fund',
    celebrationMessage: 'Your emergency fund is complete! You now have a solid financial cushion. You\'re officially financially secure! 🎯',
    icon: '✨',
    reward: 'Unlocked: Wealth Building Path',
    unlockCondition: (data) => data.emergencyFundProgress >= 1.0,
  },
  {
    id: 'savings_goal_25',
    type: 'savings_goal',
    title: '25% Savings Goal',
    description: 'Reached 25% of savings goal',
    celebrationMessage: 'You\'re making progress on your savings goal! Keep building that nest egg. 💰',
    icon: '📈',
    reward: 'Unlocked: Savings Insights',
    unlockCondition: (data) => data.savingsProgress >= 0.25,
  },
  {
    id: 'savings_goal_50',
    type: 'savings_goal',
    title: '50% Savings Goal',
    description: 'Reached 50% of savings goal',
    celebrationMessage: 'Halfway to your savings goal! You\'re building real wealth. 🌟',
    icon: '📈',
    reward: 'Unlocked: Investment Strategies',
    unlockCondition: (data) => data.savingsProgress >= 0.5,
  },
  {
    id: 'savings_goal_100',
    type: 'savings_goal',
    title: 'Savings Goal Achieved',
    description: 'Reached savings goal',
    celebrationMessage: 'You achieved your savings goal! This is a major milestone. What\'s next? 🚀',
    icon: '✨',
    reward: 'Unlocked: Advanced Wealth Building',
    unlockCondition: (data) => data.savingsProgress >= 1.0,
  },
  {
    id: 'streak_7',
    type: 'streak',
    title: '7-Day Streak',
    description: 'Maintained 7-day action streak',
    celebrationMessage: 'You\'ve been consistent for 7 days! Consistency is the key to financial success. 🔥',
    icon: '🔥',
    reward: 'Unlocked: Streak Bonus',
    unlockCondition: (data) => data.actionStreak >= 7,
  },
  {
    id: 'streak_30',
    type: 'streak',
    title: '30-Day Streak',
    description: 'Maintained 30-day action streak',
    celebrationMessage: 'A full month of consistency! You\'re building unstoppable momentum. 💪',
    icon: '🔥',
    reward: 'Unlocked: Platinum Status',
    unlockCondition: (data) => data.actionStreak >= 30,
  },
  {
    id: 'goal_completion',
    type: 'goal_completion',
    title: 'Goal Completed',
    description: 'Completed a major financial goal',
    celebrationMessage: 'You completed a major goal! This is proof that you can achieve anything you set your mind to. 🏆',
    icon: '🏆',
    reward: 'Unlocked: Goal Master Badge',
    unlockCondition: (data) => data.goalsCompleted > 0,
  },
];

export function checkMilestones(data: any): Milestone[] {
  return milestones.filter((m) => m.unlockCondition(data));
}

export function getNewMilestones(previousData: any, currentData: any): Milestone[] {
  const previousMilestones = checkMilestones(previousData);
  const currentMilestones = checkMilestones(currentData);

  return currentMilestones.filter(
    (m) => !previousMilestones.find((pm) => pm.id === m.id)
  );
}

export function formatMilestoneMessage(milestone: Milestone): string {
  return `${milestone.icon} ${milestone.celebrationMessage}${
    milestone.reward ? `\n\n${milestone.reward}` : ''
  }`;
}
