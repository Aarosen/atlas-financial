/**
 * CODE-08: Delay Cost Calculator (Behavioral Finance — Present Bias)
 * When Atlas surfaces the cost of financial delay (present bias nudge),
 * the dollar amount must be mathematically correct.
 *
 * Covers: D13-03
 */

const DELAY_COST_TOLERANCE = 0.02; // 2% tolerance

/**
 * Calculate the true cost of delaying savings
 */
export function calculateDelayCost(
  monthlyContribution: number,
  annualRate: number,
  totalYears: number,
  delayMonths: number
): {
  fvIfStartNow: number;
  fvIfDelayed: number;
  costOfDelayDollars: number;
  pctOfFinalValueLost: number;
} {
  const r = annualRate / 12;
  const nFull = totalYears * 12;
  const nDelayed = nFull - delayMonths;

  // Future value formula: FV = PMT * [((1 + r)^n - 1) / r]
  const fvNow = monthlyContribution * (Math.pow(1 + r, nFull) - 1) / r;
  const fvDelayed = monthlyContribution * (Math.pow(1 + r, nDelayed) - 1) / r;

  const costOfDelay = fvNow - fvDelayed;
  const pctLost = fvNow > 0 ? (costOfDelay / fvNow) * 100 : 0;

  return {
    fvIfStartNow: Math.round(fvNow * 100) / 100,
    fvIfDelayed: Math.round(fvDelayed * 100) / 100,
    costOfDelayDollars: Math.round(costOfDelay * 100) / 100,
    pctOfFinalValueLost: Math.round(pctLost * 10) / 10,
  };
}

/**
 * Verify that Atlas's claimed delay cost is mathematically correct
 */
export function verifyDelayCostClaim(
  atlasClaimedCost: number,
  monthlyContribution: number,
  annualRate: number,
  totalYears: number,
  delayMonths: number
): {
  pass: boolean;
  atlasClaimedCost: number;
  correctValue: number;
  errorPct: number;
  calculation: {
    fvIfStartNow: number;
    fvIfDelayed: number;
    costOfDelayDollars: number;
    pctOfFinalValueLost: number;
  };
} {
  const expected = calculateDelayCost(monthlyContribution, annualRate, totalYears, delayMonths);
  const trueCost = expected.costOfDelayDollars;
  const error = Math.abs(atlasClaimedCost - trueCost) / Math.max(trueCost, 1);

  return {
    pass: error <= DELAY_COST_TOLERANCE,
    atlasClaimedCost,
    correctValue: trueCost,
    errorPct: Math.round(error * 10000) / 100,
    calculation: expected,
  };
}

/**
 * Golden test cases for delay cost verification
 */
export const DELAY_COST_TEST_CASES = [
  {
    description: 'Starting $300/mo at 25 vs. 26 (1-year delay, 40yr horizon, 7%)',
    inputs: {
      monthlyContribution: 300,
      annualRate: 0.07,
      totalYears: 40,
      delayMonths: 12,
    },
    expectedApproxCost: 29400, // ~$29k lost from 1 year of delay
  },
  {
    description: 'Starting $500/mo at 30 vs. 35 (5-year delay, 35yr horizon, 7%)',
    inputs: {
      monthlyContribution: 500,
      annualRate: 0.07,
      totalYears: 35,
      delayMonths: 60,
    },
    expectedApproxCost: 132000, // ~$132k lost from 5-year delay
  },
  {
    description: 'Starting $200/mo at 22 vs. 25 (3-year delay, 43yr horizon, 7%)',
    inputs: {
      monthlyContribution: 200,
      annualRate: 0.07,
      totalYears: 43,
      delayMonths: 36,
    },
    expectedApproxCost: 45000, // ~$45k lost from 3-year delay
  },
  {
    description: 'Starting $1000/mo at 40 vs. 42 (2-year delay, 25yr horizon, 6%)',
    inputs: {
      monthlyContribution: 1000,
      annualRate: 0.06,
      totalYears: 25,
      delayMonths: 24,
    },
    expectedApproxCost: 78000, // ~$78k lost from 2-year delay
  },
];

/**
 * Run CODE-08 test suite
 */
export function runCode08Suite(
  testCases: typeof DELAY_COST_TEST_CASES = DELAY_COST_TEST_CASES
): {
  passed: number;
  failed: number;
  totalTests: number;
  passRate: number;
  testResults: Array<{
    description: string;
    expectedCost: number;
    actualCost: number;
    errorPct: number;
    pass: boolean;
  }>;
} {
  const testResults: Array<{
    description: string;
    expectedCost: number;
    actualCost: number;
    errorPct: number;
    pass: boolean;
  }> = [];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = calculateDelayCost(
      testCase.inputs.monthlyContribution,
      testCase.inputs.annualRate,
      testCase.inputs.totalYears,
      testCase.inputs.delayMonths
    );

    const actualCost = result.costOfDelayDollars;
    const expectedCost = testCase.expectedApproxCost;
    const errorPct = Math.abs(actualCost - expectedCost) / expectedCost;
    const pass = errorPct <= 0.05; // 5% tolerance for golden set

    testResults.push({
      description: testCase.description,
      expectedCost,
      actualCost,
      errorPct: Math.round(errorPct * 10000) / 100,
      pass,
    });

    if (pass) {
      passed++;
    } else {
      failed++;
    }
  }

  return {
    passed,
    failed,
    totalTests: testCases.length,
    passRate: (passed / testCases.length) * 100,
    testResults,
  };
}

/**
 * Detect present bias in user message and calculate appropriate delay cost
 */
export function detectPresentBiasAndCalculateCost(
  userMessage: string,
  userProfile: {
    monthlyIncome?: number;
    essentialExpenses?: number;
    age?: number;
  }
): {
  presentBiasDetected: boolean;
  suggestedDelayCost?: number;
  suggestedMonthlyContribution?: number;
  yearsToRetirement?: number;
} {
  const text = userMessage.toLowerCase();

  const presentBiasIndicators = [
    'next month',
    'next year',
    'later',
    'eventually',
    'when things calm down',
    'after',
    'soon',
  ];

  const presentBiasDetected = presentBiasIndicators.some(indicator => text.includes(indicator));

  if (!presentBiasDetected) {
    return { presentBiasDetected: false };
  }

  // Estimate reasonable contribution and timeline
  const monthlyIncome = userProfile.monthlyIncome || 3000;
  const suggestedMonthlyContribution = Math.round(monthlyIncome * 0.1); // 10% of income
  const age = userProfile.age || 30;
  const yearsToRetirement = Math.max(35, 65 - age);

  const delayCost = calculateDelayCost(
    suggestedMonthlyContribution,
    0.07, // 7% average return
    yearsToRetirement,
    12 // 1 year delay
  );

  return {
    presentBiasDetected: true,
    suggestedDelayCost: delayCost.costOfDelayDollars,
    suggestedMonthlyContribution,
    yearsToRetirement,
  };
}
