/**
 * TASK 2.3: Multi-Goal Allocation Engine
 * 
 * Allocates monthly surplus across multiple financial goals:
 * 1. Debt payoff (highest interest first)
 * 2. Emergency fund (3-6 months expenses)
 * 3. Investments (retirement + taxable)
 * 4. Other goals (savings, home, education)
 * 
 * Uses waterfall approach: complete each goal before moving to next
 */

export interface AllocationGoal {
  id: string;
  name: string;
  type: 'debt_payoff' | 'emergency_fund' | 'investment' | 'retirement' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  targetAmount: number;
  currentAmount: number;
  monthlyAllocation: number;
  monthsToComplete: number;
  percentComplete: number;
}

export interface AllocationPlan {
  monthlySurplus: number;
  goals: AllocationGoal[];
  totalMonthlyAllocation: number;
  isBalanced: boolean;
  recommendations: string[];
}

/**
 * Allocate monthly surplus across goals using waterfall approach
 * 
 * Priority order:
 * 1. CRITICAL: Debt payoff (high-interest first)
 * 2. HIGH: Emergency fund (3-6 months expenses)
 * 3. MEDIUM: Retirement contributions
 * 4. MEDIUM: Investments
 * 5. LOW: Other goals
 */
export function allocateSurplus(
  monthlySurplus: number,
  essentialExpenses: number,
  debts: Array<{ balance: number; apr: number; minimumPayment?: number }>,
  currentSavings: number,
  retirementSavings: number,
  goals: Array<{ id: string; name: string; type: string; targetAmount: number; currentAmount: number }>
): AllocationPlan {
  const allocationGoals: AllocationGoal[] = [];
  let remainingSurplus = monthlySurplus;

  // CRITICAL: High-interest debt payoff
  if (debts.length > 0) {
    const highInterestDebt = debts.filter(d => d.apr > 0.15);
    if (highInterestDebt.length > 0) {
      const totalHighInterestDebt = highInterestDebt.reduce((sum, d) => sum + d.balance, 0);
      const debtAllocation = Math.min(remainingSurplus * 0.4, remainingSurplus); // Up to 40% of surplus
      
      if (debtAllocation > 0) {
        const monthsToPayoff = Math.ceil(totalHighInterestDebt / debtAllocation);
        allocationGoals.push({
          id: 'high_interest_debt',
          name: 'High-Interest Debt Payoff',
          type: 'debt_payoff',
          priority: 'critical',
          targetAmount: totalHighInterestDebt,
          currentAmount: 0,
          monthlyAllocation: debtAllocation,
          monthsToComplete: monthsToPayoff,
          percentComplete: 0,
        });
        remainingSurplus -= debtAllocation;
      }
    }
  }

  // HIGH: Emergency fund (3-6 months expenses)
  const emergencyFundTarget = essentialExpenses * 6;
  const emergencyFundGap = Math.max(0, emergencyFundTarget - currentSavings);
  
  if (emergencyFundGap > 0) {
    const emergencyAllocation = Math.min(remainingSurplus * 0.3, remainingSurplus);
    
    if (emergencyAllocation > 0) {
      const monthsToComplete = Math.ceil(emergencyFundGap / emergencyAllocation);
      allocationGoals.push({
        id: 'emergency_fund',
        name: 'Emergency Fund (6 months)',
        type: 'emergency_fund',
        priority: 'high',
        targetAmount: emergencyFundTarget,
        currentAmount: currentSavings,
        monthlyAllocation: emergencyAllocation,
        monthsToComplete,
        percentComplete: (currentSavings / emergencyFundTarget) * 100,
      });
      remainingSurplus -= emergencyAllocation;
    }
  }

  // MEDIUM: Retirement contributions (15% of surplus)
  const retirementAllocation = remainingSurplus * 0.15;
  if (retirementAllocation > 0) {
    allocationGoals.push({
      id: 'retirement',
      name: 'Retirement Contributions',
      type: 'retirement',
      priority: 'medium',
      targetAmount: 1000000, // Placeholder FIRE number
      currentAmount: retirementSavings,
      monthlyAllocation: retirementAllocation,
      monthsToComplete: 999, // Long-term goal
      percentComplete: Math.min(100, (retirementSavings / 1000000) * 100),
    });
    remainingSurplus -= retirementAllocation;
  }

  // MEDIUM: Investments (10% of surplus)
  const investmentAllocation = remainingSurplus * 0.1;
  if (investmentAllocation > 0) {
    allocationGoals.push({
      id: 'investments',
      name: 'Investment Account',
      type: 'investment',
      priority: 'medium',
      targetAmount: 100000, // Placeholder target
      currentAmount: 0,
      monthlyAllocation: investmentAllocation,
      monthsToComplete: 999,
      percentComplete: 0,
    });
    remainingSurplus -= investmentAllocation;
  }

  // LOW: Other user-defined goals
  if (goals && goals.length > 0) {
    const otherGoals = goals.filter(g => g.type !== 'debt_payoff' && g.type !== 'emergency_fund');
    const perGoalAllocation = remainingSurplus / Math.max(1, otherGoals.length);

    for (const goal of otherGoals) {
      const gap = Math.max(0, goal.targetAmount - goal.currentAmount);
      if (gap > 0 && perGoalAllocation > 0) {
        const monthsToComplete = Math.ceil(gap / perGoalAllocation);
        allocationGoals.push({
          id: goal.id,
          name: goal.name,
          type: 'other',
          priority: 'low',
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          monthlyAllocation: perGoalAllocation,
          monthsToComplete,
          percentComplete: (goal.currentAmount / goal.targetAmount) * 100,
        });
      }
    }
  }

  // Check if allocation is balanced (no goal starved)
  const isBalanced = allocationGoals.every(g => g.monthlyAllocation > 0 || g.priority === 'low');

  // Generate recommendations
  const recommendations = generateRecommendations(allocationGoals, monthlySurplus, remainingSurplus);

  return {
    monthlySurplus,
    goals: allocationGoals,
    totalMonthlyAllocation: monthlySurplus - remainingSurplus,
    isBalanced,
    recommendations,
  };
}

/**
 * Generate recommendations based on allocation plan
 */
function generateRecommendations(
  goals: AllocationGoal[],
  totalSurplus: number,
  remainingSurplus: number
): string[] {
  const recommendations: string[] = [];

  // Check for unallocated surplus
  if (remainingSurplus > 0) {
    recommendations.push(
      `You have $${Math.round(remainingSurplus)}/month unallocated. Consider increasing contributions to retirement or investments.`
    );
  }

  // Check for high-interest debt
  const debtGoal = goals.find(g => g.type === 'debt_payoff');
  if (debtGoal && debtGoal.monthsToComplete > 24) {
    recommendations.push(
      `High-interest debt will take ${debtGoal.monthsToComplete} months to pay off at current rate. Consider increasing allocation to accelerate payoff.`
    );
  }

  // Check for emergency fund
  const emergencyGoal = goals.find(g => g.type === 'emergency_fund');
  if (emergencyGoal && emergencyGoal.percentComplete < 50) {
    recommendations.push(
      `Build your emergency fund to 6 months of expenses. Currently at ${Math.round(emergencyGoal.percentComplete)}% of target.`
    );
  }

  // Check for retirement
  const retirementGoal = goals.find(g => g.type === 'retirement');
  if (retirementGoal && retirementGoal.monthlyAllocation === 0) {
    recommendations.push(
      `Consider allocating at least 10-15% of surplus to retirement savings for long-term wealth building.`
    );
  }

  return recommendations;
}

/**
 * Format allocation plan for display
 */
export function formatAllocationPlan(plan: AllocationPlan): string {
  let output = `MONTHLY SURPLUS ALLOCATION: $${Math.round(plan.monthlySurplus)}\n\n`;

  for (const goal of plan.goals) {
    output += `${goal.name}\n`;
    output += `  Priority: ${goal.priority}\n`;
    output += `  Monthly: $${Math.round(goal.monthlyAllocation)}\n`;
    output += `  Progress: ${Math.round(goal.percentComplete)}% ($${Math.round(goal.currentAmount)} / $${Math.round(goal.targetAmount)})\n`;
    output += `  Timeline: ${goal.monthsToComplete} months\n\n`;
  }

  if (plan.recommendations.length > 0) {
    output += `RECOMMENDATIONS:\n`;
    for (const rec of plan.recommendations) {
      output += `• ${rec}\n`;
    }
  }

  return output;
}
