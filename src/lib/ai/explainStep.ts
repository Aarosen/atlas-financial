export type StepExplanation = {
  step: string;
  whyThisStep: string;
  expectedOutcome: string;
  riskIfSkipped: string;
};

export function explainNextStep(lever: string): StepExplanation {
  const explanations: Record<string, StepExplanation> = {
    stabilize_cashflow: {
      step: 'Stabilize cashflow',
      whyThisStep: "You're spending more than you earn. Stabilizing cashflow is the foundation for any other progress.",
      expectedOutcome: 'Monthly income >= expenses, giving you breathing room.',
      riskIfSkipped: 'Without cashflow stability, debt will grow and savings will drain.',
    },
    eliminate_high_interest_debt: {
      step: 'Eliminate high-interest debt',
      whyThisStep: 'High-interest debt compounds against you fastest. Eliminating it frees up cashflow and saves interest.',
      expectedOutcome: 'Lower monthly debt payments and interest charges.',
      riskIfSkipped: 'Interest compounds, erasing progress on savings and future goals.',
    },
    build_emergency_buffer: {
      step: 'Build an emergency cushion',
      whyThisStep: "A cushion protects you from unexpected costs turning into debt. It's your financial safety net.",
      expectedOutcome: '3-6 months of essentials in savings.',
      riskIfSkipped: 'One surprise expense can force you back into debt.',
    },
    increase_future_allocation: {
      step: 'Grow future savings',
      whyThisStep: 'Once stable, directing more toward long-term goals (retirement, investing) compounds your wealth.',
      expectedOutcome: '15%+ of income going toward future goals.',
      riskIfSkipped: "You'll miss years of compound growth.",
    },
    optimize_discretionary_spend: {
      step: 'Optimize discretionary spend',
      whyThisStep: 'Small cuts in discretionary categories unlock cashflow without sacrificing essentials.',
      expectedOutcome: 'More cashflow for debt payoff or savings.',
      riskIfSkipped: 'Missed opportunity to accelerate progress.',
    },
  };

  return explanations[lever] || {
    step: lever,
    whyThisStep: 'This lever addresses your highest-impact financial priority.',
    expectedOutcome: 'Measurable progress toward your financial goals.',
    riskIfSkipped: 'Delayed progress and compounding financial stress.',
  };
}
