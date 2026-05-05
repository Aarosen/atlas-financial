/**
 * TASK 2.4: Goal Conflict Resolution Module
 * Resolves conflicts when user has multiple competing financial goals
 */

export interface FinancialGoal {
  name: string;
  type: 'debt_payoff' | 'emergency_fund' | 'savings' | 'investment' | 'retirement' | 'home_purchase';
  targetAmount: number;
  currentAmount: number;
  deadline?: number; // months
  priority: 'critical' | 'high' | 'medium' | 'low';
  urgency: number; // 0-100, higher = more urgent
}

export interface GoalConflictResolution {
  goals: FinancialGoal[];
  priorityOrder: string[]; // goal names in priority order
  allocation: Record<string, number>; // goal name -> monthly allocation
  rationale: string;
  warningFlags: string[];
}

/**
 * Resolve conflicts between competing goals using priority waterfall
 * Priority order:
 * 1. Critical goals (debt crisis, emergency fund gap)
 * 2. High-priority goals (retirement, home purchase)
 * 3. Medium-priority goals (savings, investments)
 * 4. Low-priority goals (discretionary)
 */
export function resolveGoalConflicts(
  goals: FinancialGoal[],
  monthlySurplus: number
): GoalConflictResolution {
  // Sort goals by priority and urgency
  const sortedGoals = [...goals].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.urgency - a.urgency;
  });
  
  const allocation: Record<string, number> = {};
  const priorityOrder: string[] = [];
  const warningFlags: string[] = [];
  let remainingSurplus = monthlySurplus;
  
  // Allocate surplus to goals in priority order
  for (const goal of sortedGoals) {
    const monthsRemaining = goal.deadline || 36; // default 3-year timeline
    const monthlyNeeded = Math.ceil((goal.targetAmount - goal.currentAmount) / monthsRemaining);
    
    if (remainingSurplus >= monthlyNeeded) {
      // Allocate full amount needed
      allocation[goal.name] = monthlyNeeded;
      remainingSurplus -= monthlyNeeded;
      priorityOrder.push(goal.name);
    } else if (remainingSurplus > 0) {
      // Allocate partial amount
      allocation[goal.name] = remainingSurplus;
      warningFlags.push(`${goal.name}: Only allocating $${remainingSurplus}/month (need $${monthlyNeeded}/month)`);
      remainingSurplus = 0;
      priorityOrder.push(goal.name);
      break;
    } else {
      // No surplus left
      allocation[goal.name] = 0;
      warningFlags.push(`${goal.name}: No surplus available. Prioritize other goals first.`);
    }
  }
  
  // Check for critical conflicts
  const criticalGoals = goals.filter(g => g.priority === 'critical');
  if (criticalGoals.length > 1) {
    const criticalSurplus = criticalGoals.reduce((sum, g) => sum + (allocation[g.name] || 0), 0);
    if (criticalSurplus < monthlySurplus * 0.5) {
      warningFlags.push('Multiple critical goals detected. Consider increasing income or reducing expenses.');
    }
  }
  
  const rationale = buildConflictRationale(sortedGoals, allocation, monthlySurplus);
  
  return {
    goals: sortedGoals,
    priorityOrder,
    allocation,
    rationale,
    warningFlags,
  };
}

function buildConflictRationale(
  goals: FinancialGoal[],
  allocation: Record<string, number>,
  monthlySurplus: number
): string {
  const parts: string[] = [];
  
  parts.push(`You have $${monthlySurplus}/month available. Here's the priority order:`);
  
  for (const goal of goals) {
    const allocated = allocation[goal.name] || 0;
    const gap = goal.targetAmount - goal.currentAmount;
    const monthsToComplete = gap > 0 ? Math.ceil(gap / allocated) : 0;
    
    if (allocated > 0) {
      parts.push(`${goal.name}: $${allocated}/month (${monthsToComplete} months to complete)`);
    } else {
      parts.push(`${goal.name}: $0/month (deprioritized)`);
    }
  }
  
  return parts.join('. ');
}

/**
 * Build system prompt context for goal conflict resolution
 */
export function buildGoalConflictContext(resolution: GoalConflictResolution): string {
  const allocationLines = Object.entries(resolution.allocation)
    .map(([goal, amount]) => `  ${goal}: $${amount}/month`)
    .join('\n');
  
  const warningSection = resolution.warningFlags.length > 0
    ? `\nWARNING FLAGS:\n${resolution.warningFlags.map(w => `  - ${w}`).join('\n')}`
    : '';
  
  return `GOAL CONFLICT RESOLUTION:
Priority order: ${resolution.priorityOrder.join(' → ')}
Monthly allocation:
${allocationLines}
Rationale: ${resolution.rationale}${warningSection}`;
}

/**
 * Detect if user is discussing multiple competing goals
 */
export function isGoalConflictContext(text: string): boolean {
  const patterns = [
    /\b(both|either|choose|prioritize|which|first).{0,30}(goal|debt|save|invest)\b/i,
    /\b(conflicting|competing|competing).{0,30}(goal|priority)\b/i,
    /\b(can't|cannot).{0,30}(afford|do).{0,30}(both|all)\b/i,
  ];
  
  return patterns.some(p => p.test(text));
}
