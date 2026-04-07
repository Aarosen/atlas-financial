import type { Strategy, Tier, Lever, Confidence } from '@/lib/state/types';

export function buildStrategyContextBlock(baseline: Strategy | null | undefined): string {
  if (!baseline) return '';

  const tierDescriptions: Record<Tier, string> = {
    Foundation: 'User is in Foundation tier: stabilizing income/expenses, building emergency buffer (< 1 month savings)',
    Stabilizing: 'User is in Stabilizing tier: reducing debt pressure, building 3-month buffer',
    Strategic: 'User is in Strategic tier: building momentum with intent, working toward 6-month buffer',
    GrowthReady: 'User is in GrowthReady tier: strong foundation, ready to lean into growth and wealth building',
  };

  const leverDescriptions: Record<Lever, string> = {
    stabilize_cashflow: 'PRIMARY LEVER: Stabilize cashflow - Get to break-even or positive monthly surplus',
    eliminate_high_interest_debt: 'PRIMARY LEVER: Eliminate high-interest debt - Reduce compounding interest pressure',
    build_emergency_buffer: 'PRIMARY LEVER: Build emergency buffer - Create financial safety net (3-6 months expenses)',
    increase_future_allocation: 'PRIMARY LEVER: Increase future allocation - Grow retirement/investment savings toward 15% of income',
    optimize_discretionary_spend: 'PRIMARY LEVER: Optimize discretionary spend - Fine-tune lifestyle spending for efficiency',
    maximize_retirement_contributions: 'PRIMARY LEVER: Maximize retirement contributions - Increase tax-advantaged retirement savings toward 15% of income',
  };

  const urgencyDescriptions: Record<string, string> = {
    Protective: 'URGENCY: Protective - User is in financial crisis or immediate danger. Prioritize survival and stabilization.',
    Advisory: 'URGENCY: Advisory - User has significant financial pressure. Recommend action but not emergency.',
    Calm: 'URGENCY: Calm - User is stable. Can explore options and optimization.',
  };

  const confidenceDescriptions: Record<Confidence, string> = {
    high: 'CONFIDENCE: High - User has provided explicit, complete financial data. Recommendations are well-grounded.',
    med: 'CONFIDENCE: Medium - User has provided some data but gaps remain. Recommendations are directional.',
    low: 'CONFIDENCE: Low - User has provided minimal data. Ask clarifying questions before recommending.',
  };

  const metrics = baseline.metrics as any || {};
  const explainability = baseline.explainability || {};

  return `[STRATEGY_CONTEXT]
${tierDescriptions[baseline.tier]}
${leverDescriptions[baseline.lever]}
${urgencyDescriptions[baseline.urgency]}
${confidenceDescriptions[baseline.confidence]}

KEY METRICS:
- Monthly Net Cashflow: $${metrics.net?.toFixed(0) || '?'}
- Emergency Buffer: ${metrics.bufMo?.toFixed(1) || '?'} months (target: 6 months)
- Future Savings Rate: ${(metrics.futPct * 100)?.toFixed(1) || '?'}% of income (target: 15%)
- Debt Pressure: ${metrics.dExp || 'Unknown'}
- Debt-to-Income Ratio: ${(metrics.dti * 100)?.toFixed(1) || '?'}%

DECISION TRACE:
${explainability.decisionTrace?.map((step: any) => `- ${step.title}: ${step.detail}`).join('\n') || 'N/A'}

NEXT ACTION:
${explainability.nextAction?.title || 'Gather more information'}
Suggested: ${explainability.nextAction?.prompt || 'N/A'}`;
}
