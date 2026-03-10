# Atlas Phase 1a Build Specification

**Version:** 1.0  
**Status:** Implementation Ready  
**Date:** 2026-03-10  
**Duration:** 2-3 weeks  
**Scope:** Prove the backbone with minimal viable implementation

---

## Overview

Phase 1a implements the core loop that proves the architecture works:

```
Raw User Input
    ↓
Parse & Normalize (Data Reliability Layer)
    ↓
Canonical Financial Profile
    ↓
3 Deterministic Tools (surplus, emergency fund, affordability)
    ↓
2 Decision Flows (budgeting, affordability)
    ↓
Decision Trace Log
    ↓
Self-Check Validation
    ↓
Claude Explanation
    ↓
Response
```

This is enough to replace fragile LLM reasoning with reliable deterministic logic.

---

## File Structure

```
src/lib/reasoning/
├── types/
│   ├── FinancialProfile.ts          # Canonical profile types
│   ├── DataReliability.ts           # Confidence, source, provisional types
│   ├── ToolOutput.ts                # Tool result types
│   ├── Decision.ts                  # Decision result types
│   ├── DecisionTrace.ts             # Trace log types
│   └── index.ts                     # Export all types
│
├── profile/
│   ├── FinancialProfileManager.ts   # Create, update, validate profile
│   ├── CompletenessTracker.ts       # Track provided/inferred/missing
│   └── index.ts
│
├── reliability/
│   ├── InputParser.ts               # Parse raw user input
│   ├── ConfidenceScorer.ts          # Estimate confidence (0-100)
│   ├── ConflictDetector.ts          # Detect contradictions
│   ├── DataQualityAssessor.ts       # Overall quality score
│   └── index.ts
│
├── tools/
│   ├── calculateMonthlySurplus.ts   # Tool 1
│   ├── calculateEmergencyFundTarget.ts # Tool 2
│   ├── checkAffordability.ts        # Tool 3
│   ├── ToolRegistry.ts              # Tool discovery and execution
│   └── index.ts
│
├── decisions/
│   ├── BudgetingDecision.ts         # Decision flow 1
│   ├── AffordabilityDecision.ts     # Decision flow 2
│   ├── DecisionEngine.ts            # Orchestrator
│   └── index.ts
│
├── validation/
│   ├── SelfCheckValidator.ts        # Math + consistency checks
│   ├── SafetyRules.ts               # Safety rule enforcement
│   └── index.ts
│
├── trace/
│   ├── DecisionTraceLog.ts          # Trace log schema and storage
│   ├── TraceLogWriter.ts            # Append to trace log
│   └── index.ts
│
├── explanation/
│   ├── ExplanationPrompt.ts         # Claude prompt contract
│   ├── ExplanationFormatter.ts      # Format decision for Claude
│   └── index.ts
│
└── ReasoningEngine.ts               # Main orchestrator
```

---

## Core Types

### 1. FinancialProfile.ts

```typescript
// Minimal profile for Phase 1a
export interface FinancialProfile {
  id: string;
  userId: string;
  timestamp: string; // ISO 8601

  // Income (required for decisions)
  income: {
    grossMonthly: number | null;
    netMonthly: number | null;
    confidence: number; // 0-100
    source: "user_provided" | "inferred" | "derived";
    isProvisional: boolean;
    lastUpdated: string;
  };

  // Fixed Expenses (required for decisions)
  fixedExpenses: {
    rentOrMortgage: number | null;
    utilities: number | null;
    insurance: number | null;
    debtPayments: number | null;
    otherFixed: number | null;
    // Each with: confidence, source, isProvisional, lastUpdated
  };

  // Variable Expenses (optional, can estimate)
  variableExpenses: {
    groceries: number | null;
    transportation: number | null;
    diningOut: number | null;
    entertainment: number | null;
    otherVariable: number | null;
    // Each with: confidence, source, isProvisional, lastUpdated
  };

  // Assets (required for affordability)
  assets: {
    emergencyFund: number | null;
    savings: number | null;
    // Each with: confidence, source, isProvisional, lastUpdated
  };

  // Metadata
  metadata: {
    employmentStability: "stable" | "variable" | "unstable" | null;
    dependents: number;
    lastUpdated: string;
  };

  // Completeness tracking
  completeness: {
    providedFields: string[];
    inferredFields: string[];
    provisionalFields: string[];
    missingCriticalFields: string[];
    completenessScore: number; // 0-100
    decisionReady: boolean;
    decisionReadyFor: string[]; // ["budgeting", "affordability"]
  };
}
```

### 2. DataReliability.ts

```typescript
export interface FieldValue<T> {
  value: T | null;
  confidence: number; // 0-100
  source: "user_provided" | "inferred" | "derived" | "imported";
  isProvisional: boolean;
  dataQuality: "confirmed" | "estimate" | "rough";
  lastUpdated: string;
  metadata?: Record<string, any>;
}

export interface ConflictFlag {
  field: string;
  oldValue: any;
  newValue: any;
  severity: "warning" | "error";
  message: string;
}

export interface DataQualityScore {
  overallScore: number; // 0-100
  providedFieldsPercent: number;
  averageConfidence: number;
  conflictCount: number;
  assessment: "high" | "acceptable" | "low" | "very_low";
}
```

### 3. ToolOutput.ts

```typescript
export interface ToolResult<T> {
  toolName: string;
  success: boolean;
  result: T | null;
  inputsUsed: string[];
  assumptions: string[];
  confidence: number; // 0-100
  error?: string;
  requiredForDecision?: string[];
}

export interface MonthlySurplusResult {
  grossIncome: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalExpenses: number;
  monthlySurplus: number;
  surplusRate: number; // percentage
  status: "positive" | "negative" | "breakeven";
}

export interface EmergencyFundTargetResult {
  monthlyExpenses: number;
  monthsRecommended: number; // 3-6
  targetAmount: number;
  currentAmount: number;
  shortfall: number;
  status: "healthy" | "low" | "critical";
}

export interface AffordabilityCheckResult {
  proposedExpense: number;
  remainingSurplus: number;
  remainingPercent: number; // % of income
  dtiAfter: number;
  isAffordable: boolean;
  riskLevel: "safe" | "moderate" | "risky" | "dangerous";
  reason: string;
}
```

### 4. Decision.ts

```typescript
export interface DecisionResult {
  decisionType: "budgeting" | "affordability";
  decisionResult: "yes" | "no" | "maybe" | "defer";
  confidence: number; // 0-100
  reasoning: string;
  nextSteps: string[];
  missingData: string[];
  
  // Rules triggered
  rulesTriggered: Array<{
    ruleId: string;
    ruleName: string;
    condition: string;
    result: boolean;
    weight: number;
  }>;

  // Blocking conditions
  blockingConditions: Array<{
    condition: string;
    met: boolean;
    impact: string;
  }>;
}
```

### 5. DecisionTrace.ts

```typescript
export interface DecisionTraceLog {
  traceId: string;
  timestamp: string;
  sessionId: string;
  decisionType: string;

  // Input
  input: {
    userMessage: string;
    financialProfile: FinancialProfile;
    profileCompleteness: {
      completenessScore: number;
      missingCriticalFields: string[];
      decisionReady: boolean;
    };
    dataQualityScore: number;
  };

  // Processing
  processing: {
    dataReliability: {
      extractedFields: Record<string, any>;
      confidenceScores: Record<string, number>;
      conflictsDetected: ConflictFlag[];
      qualityAssessment: string;
    };
    toolOutputs: Record<string, ToolResult<any>>;
  };

  // Decision
  decision: DecisionResult;

  // Explanation
  explanation: {
    explanationText: string;
    consistencyChecks: Array<{
      checkName: string;
      passed: boolean;
      details: string;
    }>;
  };

  // Validation
  validation: {
    selfCheckPassed: boolean;
    selfCheckIssues: string[];
    safetyRulesEnforced: boolean;
    safetyViolations: string[];
  };

  // Metadata
  metadata: {
    modelUsed: string;
    latencyMs: number;
    tokensUsed: {
      input: number;
      output: number;
    };
    version: string;
  };
}
```

---

## Request/Response Contracts

### 1. Reasoning Request

```typescript
export interface ReasoningRequest {
  userMessage: string;
  sessionId: string;
  userId: string;
  existingProfile?: FinancialProfile;
  decisionType?: "budgeting" | "affordability"; // Optional hint
}
```

### 2. Reasoning Response

```typescript
export interface ReasoningResponse {
  success: boolean;
  
  // Updated profile
  profile: FinancialProfile;
  
  // Decision (if ready)
  decision?: DecisionResult;
  
  // Explanation (if decision made)
  explanation?: string;
  
  // Next question (if more data needed)
  nextQuestion?: string;
  
  // Trace log for debugging/eval
  traceLog: DecisionTraceLog;
  
  // Errors
  errors?: string[];
}
```

### 3. Tool Execution Request

```typescript
export interface ToolExecutionRequest {
  toolName: "calculateMonthlySurplus" | "calculateEmergencyFundTarget" | "checkAffordability";
  inputs: Record<string, any>;
  profile: FinancialProfile;
}
```

### 4. Tool Execution Response

```typescript
export interface ToolExecutionResponse<T> {
  success: boolean;
  result?: T;
  error?: string;
  inputsUsed: string[];
  assumptions: string[];
  confidence: number;
}
```

---

## Tool Implementations

### Tool 1: calculateMonthlySurplus

```typescript
export async function calculateMonthlySurplus(
  profile: FinancialProfile
): Promise<ToolResult<MonthlySurplusResult>> {
  // Validation
  if (!profile.income.grossMonthly && !profile.income.netMonthly) {
    return {
      toolName: "calculateMonthlySurplus",
      success: false,
      result: null,
      inputsUsed: [],
      assumptions: [],
      confidence: 0,
      error: "Missing income (gross or net)",
      requiredForDecision: ["income"]
    };
  }

  // Use gross if available, else infer from net
  const grossIncome = profile.income.grossMonthly || 
    (profile.income.netMonthly! / 0.75); // Rough estimate

  // Sum fixed expenses
  const fixedTotal = 
    (profile.fixedExpenses.rentOrMortgage || 0) +
    (profile.fixedExpenses.utilities || 0) +
    (profile.fixedExpenses.insurance || 0) +
    (profile.fixedExpenses.debtPayments || 0) +
    (profile.fixedExpenses.otherFixed || 0);

  // Sum variable expenses (with defaults if missing)
  const variableTotal =
    (profile.variableExpenses.groceries || 300) +
    (profile.variableExpenses.transportation || 200) +
    (profile.variableExpenses.diningOut || 200) +
    (profile.variableExpenses.entertainment || 100) +
    (profile.variableExpenses.otherVariable || 50);

  const totalExpenses = fixedTotal + variableTotal;
  const surplus = grossIncome - totalExpenses;

  // Calculate confidence
  const incomeConfidence = profile.income.grossMonthly ? 
    profile.income.confidence : 40;
  const expenseConfidence = Math.min(
    profile.fixedExpenses.rentOrMortgage ? 90 : 50,
    profile.variableExpenses.groceries ? 70 : 40
  );
  const confidence = (incomeConfidence + expenseConfidence) / 2;

  return {
    toolName: "calculateMonthlySurplus",
    success: true,
    result: {
      grossIncome,
      totalFixedExpenses: fixedTotal,
      totalVariableExpenses: variableTotal,
      totalExpenses,
      monthlySurplus: surplus,
      surplusRate: (surplus / grossIncome) * 100,
      status: surplus > 0 ? "positive" : surplus < 0 ? "negative" : "breakeven"
    },
    inputsUsed: [
      "income.grossMonthly",
      "fixedExpenses.*",
      "variableExpenses.*"
    ],
    assumptions: [
      profile.variableExpenses.groceries ? "" : "Estimated groceries at $300",
      profile.variableExpenses.transportation ? "" : "Estimated transportation at $200"
    ].filter(Boolean),
    confidence
  };
}
```

### Tool 2: calculateEmergencyFundTarget

```typescript
export async function calculateEmergencyFundTarget(
  profile: FinancialProfile
): Promise<ToolResult<EmergencyFundTargetResult>> {
  // Validation
  if (!profile.fixedExpenses.rentOrMortgage) {
    return {
      toolName: "calculateEmergencyFundTarget",
      success: false,
      result: null,
      inputsUsed: [],
      assumptions: [],
      confidence: 0,
      error: "Missing rent/mortgage to calculate expenses",
      requiredForDecision: ["fixedExpenses.rentOrMortgage"]
    };
  }

  // Calculate monthly expenses
  const monthlyExpenses =
    (profile.fixedExpenses.rentOrMortgage || 0) +
    (profile.fixedExpenses.utilities || 150) +
    (profile.fixedExpenses.insurance || 200) +
    (profile.fixedExpenses.debtPayments || 0) +
    (profile.variableExpenses.groceries || 300) +
    (profile.variableExpenses.transportation || 200);

  // Determine months based on stability
  let monthsRecommended = 3;
  if (profile.metadata.employmentStability === "unstable") {
    monthsRecommended = 6;
  } else if (profile.metadata.employmentStability === "variable") {
    monthsRecommended = 4;
  }

  // Add 1 month per dependent
  monthsRecommended += profile.metadata.dependents || 0;

  const targetAmount = monthlyExpenses * monthsRecommended;
  const currentAmount = profile.assets.emergencyFund || 0;
  const shortfall = Math.max(0, targetAmount - currentAmount);

  // Status
  let status: "healthy" | "low" | "critical";
  if (currentAmount >= targetAmount) {
    status = "healthy";
  } else if (currentAmount >= targetAmount * 0.5) {
    status = "low";
  } else {
    status = "critical";
  }

  return {
    toolName: "calculateEmergencyFundTarget",
    success: true,
    result: {
      monthlyExpenses,
      monthsRecommended,
      targetAmount,
      currentAmount,
      shortfall,
      status
    },
    inputsUsed: [
      "fixedExpenses.*",
      "variableExpenses.*",
      "metadata.employmentStability",
      "assets.emergencyFund"
    ],
    assumptions: [
      profile.fixedExpenses.utilities ? "" : "Estimated utilities at $150",
      profile.fixedExpenses.insurance ? "" : "Estimated insurance at $200",
      profile.variableExpenses.groceries ? "" : "Estimated groceries at $300",
      profile.variableExpenses.transportation ? "" : "Estimated transportation at $200"
    ].filter(Boolean),
    confidence: 85
  };
}
```

### Tool 3: checkAffordability

```typescript
export async function checkAffordability(
  profile: FinancialProfile,
  proposedExpense: number
): Promise<ToolResult<AffordabilityCheckResult>> {
  // Get monthly surplus
  const surplusResult = await calculateMonthlySurplus(profile);
  if (!surplusResult.success || !surplusResult.result) {
    return {
      toolName: "checkAffordability",
      success: false,
      result: null,
      inputsUsed: [],
      assumptions: [],
      confidence: 0,
      error: "Cannot calculate surplus"
    };
  }

  const currentSurplus = surplusResult.result.monthlySurplus;
  const remainingSurplus = currentSurplus - proposedExpense;
  const grossIncome = surplusResult.result.grossIncome;
  const remainingPercent = (remainingSurplus / grossIncome) * 100;

  // Calculate DTI
  const totalDebtPayments = 
    (profile.fixedExpenses.debtPayments || 0) + proposedExpense;
  const dtiAfter = (totalDebtPayments / grossIncome) * 100;

  // Determine affordability
  let isAffordable = true;
  let riskLevel: "safe" | "moderate" | "risky" | "dangerous" = "safe";
  let reason = "";

  // Check emergency fund first
  const emergencyFundStatus = profile.assets.emergencyFund || 0;
  const emergencyFundTarget = 
    (surplusResult.result.totalExpenses * 3); // Rough target

  if (emergencyFundStatus < emergencyFundTarget * 0.5) {
    isAffordable = false;
    riskLevel = "dangerous";
    reason = "Emergency fund is critically low";
  } else if (remainingPercent < 5) {
    isAffordable = false;
    riskLevel = "risky";
    reason = "Remaining surplus too low";
  } else if (remainingPercent < 10) {
    isAffordable = true;
    riskLevel = "moderate";
    reason = "Affordable but tight";
  } else if (dtiAfter > 50) {
    isAffordable = false;
    riskLevel = "dangerous";
    reason = "DTI would exceed safe limits";
  } else if (dtiAfter > 43) {
    isAffordable = true;
    riskLevel = "risky";
    reason = "DTI is concerning";
  } else {
    isAffordable = true;
    riskLevel = "safe";
    reason = "Affordable with good buffer";
  }

  return {
    toolName: "checkAffordability",
    success: true,
    result: {
      proposedExpense,
      remainingSurplus,
      remainingPercent,
      dtiAfter,
      isAffordable,
      riskLevel,
      reason
    },
    inputsUsed: [
      "income.grossMonthly",
      "fixedExpenses.*",
      "variableExpenses.*",
      "assets.emergencyFund"
    ],
    assumptions: surplusResult.assumptions,
    confidence: 80
  };
}
```

---

## Decision Flows

### Decision Flow 1: Budgeting Decision

```typescript
export async function budgetingDecision(
  profile: FinancialProfile
): Promise<DecisionResult> {
  // Step 1: Check blocking fields
  if (!profile.income.grossMonthly && !profile.income.netMonthly) {
    return {
      decisionType: "budgeting",
      decisionResult: "defer",
      confidence: 0,
      reasoning: "Missing income data",
      nextSteps: ["Provide monthly income (gross or net)"],
      missingData: ["income"],
      rulesTriggered: [],
      blockingConditions: [
        {
          condition: "income_provided",
          met: false,
          impact: "Cannot calculate budget"
        }
      ]
    };
  }

  if (!profile.fixedExpenses.rentOrMortgage) {
    return {
      decisionType: "budgeting",
      decisionResult: "defer",
      confidence: 0,
      reasoning: "Missing rent/mortgage",
      nextSteps: ["Provide rent or mortgage payment"],
      missingData: ["fixedExpenses.rentOrMortgage"],
      rulesTriggered: [],
      blockingConditions: [
        {
          condition: "rent_provided",
          met: false,
          impact: "Cannot calculate fixed expenses"
        }
      ]
    };
  }

  // Step 2: Calculate surplus
  const surplusResult = await calculateMonthlySurplus(profile);
  if (!surplusResult.success) {
    return {
      decisionType: "budgeting",
      decisionResult: "defer",
      confidence: 0,
      reasoning: "Cannot calculate surplus",
      nextSteps: ["Provide expense data"],
      missingData: ["expenses"],
      rulesTriggered: [],
      blockingConditions: []
    };
  }

  const surplus = surplusResult.result!.monthlySurplus;

  // Step 3: Apply decision rules
  const rulesTriggered: Array<any> = [];

  if (surplus < 0) {
    rulesTriggered.push({
      ruleId: "budget_rule_1",
      ruleName: "negative_surplus",
      condition: "surplus < 0",
      result: true,
      weight: 1.0
    });

    return {
      decisionType: "budgeting",
      decisionResult: "no",
      confidence: 95,
      reasoning: "Spending exceeds income. Need to cut expenses.",
      nextSteps: [
        "Identify which expenses can be reduced",
        "Target: reduce spending by $" + Math.abs(surplus)
      ],
      missingData: [],
      rulesTriggered,
      blockingConditions: [
        {
          condition: "surplus_positive",
          met: false,
          impact: "Cannot allocate surplus"
        }
      ]
    };
  }

  // Check emergency fund status
  const emergencyFundResult = await calculateEmergencyFundTarget(profile);
  const emergencyFundGap = emergencyFundResult.success && emergencyFundResult.result
    ? emergencyFundResult.result.shortfall
    : 0;

  if (emergencyFundGap > 0) {
    rulesTriggered.push({
      ruleId: "budget_rule_2",
      ruleName: "emergency_fund_gap",
      condition: "emergency_fund < target",
      result: true,
      weight: 1.0
    });

    return {
      decisionType: "budgeting",
      decisionResult: "yes",
      confidence: 90,
      reasoning: "You have positive surplus. Recommend building emergency fund first.",
      nextSteps: [
        `Allocate $${Math.ceil(emergencyFundGap / 6)}/month to emergency fund`,
        "Timeline: 6 months to reach target",
        "Then allocate remaining surplus to savings/debt"
      ],
      missingData: [],
      rulesTriggered,
      blockingConditions: []
    };
  }

  // Surplus is positive and emergency fund is healthy
  rulesTriggered.push({
    ruleId: "budget_rule_3",
    ruleName: "healthy_budget",
    condition: "surplus > 0 AND emergency_fund >= target",
    result: true,
    weight: 1.0
  });

  return {
    decisionType: "budgeting",
    decisionResult: "yes",
    confidence: 95,
    reasoning: "Budget is healthy with positive surplus and adequate emergency fund.",
    nextSteps: [
      `Monthly surplus: $${Math.round(surplus)}`,
      "Allocation options:",
      "  - Debt payoff (if high-interest debt)",
      "  - Investing (if risk-tolerant)",
      "  - Additional savings (if conservative)"
    ],
    missingData: [],
    rulesTriggered,
    blockingConditions: []
  };
}
```

### Decision Flow 2: Affordability Decision

```typescript
export async function affordabilityDecision(
  profile: FinancialProfile,
  proposedExpense: number
): Promise<DecisionResult> {
  // Step 1: Check blocking fields
  if (!profile.income.grossMonthly && !profile.income.netMonthly) {
    return {
      decisionType: "affordability",
      decisionResult: "defer",
      confidence: 0,
      reasoning: "Missing income",
      nextSteps: ["Provide monthly income"],
      missingData: ["income"],
      rulesTriggered: [],
      blockingConditions: [
        { condition: "income_provided", met: false, impact: "Cannot assess affordability" }
      ]
    };
  }

  // Step 2: Check emergency fund
  const emergencyFundResult = await calculateEmergencyFundTarget(profile);
  if (emergencyFundResult.success && emergencyFundResult.result) {
    const { status } = emergencyFundResult.result;
    if (status === "critical") {
      return {
        decisionType: "affordability",
        decisionResult: "no",
        confidence: 95,
        reasoning: "Emergency fund is critically low. Build it first.",
        nextSteps: [
          `Build emergency fund to $${emergencyFundResult.result.targetAmount}`,
          "Then reconsider this expense"
        ],
        missingData: [],
        rulesTriggered: [
          {
            ruleId: "afford_rule_1",
            ruleName: "emergency_fund_critical",
            condition: "emergency_fund < 50% of target",
            result: true,
            weight: 1.0
          }
        ],
        blockingConditions: [
          { condition: "emergency_fund_healthy", met: false, impact: "Blocks affordability" }
        ]
      };
    }
  }

  // Step 3: Check affordability
  const affordabilityResult = await checkAffordability(profile, proposedExpense);
  if (!affordabilityResult.success) {
    return {
      decisionType: "affordability",
      decisionResult: "defer",
      confidence: 0,
      reasoning: "Cannot calculate affordability",
      nextSteps: ["Provide expense data"],
      missingData: ["expenses"],
      rulesTriggered: [],
      blockingConditions: []
    };
  }

  const { isAffordable, riskLevel, reason, remainingPercent } = affordabilityResult.result!;

  const rulesTriggered: Array<any> = [];

  if (!isAffordable) {
    rulesTriggered.push({
      ruleId: "afford_rule_2",
      ruleName: "not_affordable",
      condition: "remaining_surplus < 5% OR dti > 50%",
      result: true,
      weight: 1.0
    });

    return {
      decisionType: "affordability",
      decisionResult: "no",
      confidence: 90,
      reasoning: reason,
      nextSteps: [
        `Consider a lower payment (target: $${Math.round(proposedExpense * 0.6)})`,
        "Or wait 6 months to save more"
      ],
      missingData: [],
      rulesTriggered,
      blockingConditions: [
        { condition: "affordable", met: false, impact: "Blocks decision" }
      ]
    };
  }

  rulesTriggered.push({
    ruleId: "afford_rule_3",
    ruleName: "affordable",
    condition: "remaining_surplus >= 5% AND dti <= 50%",
    result: true,
    weight: 1.0
  });

  return {
    decisionType: "affordability",
    decisionResult: "yes",
    confidence: 85,
    reasoning: reason,
    nextSteps: [
      `Monthly payment: $${Math.round(proposedExpense)}`,
      `Remaining surplus: $${Math.round(affordabilityResult.result!.remainingSurplus)}/month`,
      `Risk level: ${riskLevel}`,
      riskLevel === "moderate" ? "Consider a lower payment for more comfort" : ""
    ].filter(Boolean),
    missingData: [],
    rulesTriggered,
    blockingConditions: []
  };
}
```

---

## Self-Check Validation

```typescript
export interface SelfCheckResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  issues: string[];
}

export async function validateResponse(
  decision: DecisionResult,
  explanation: string,
  toolOutputs: Record<string, ToolResult<any>>
): Promise<SelfCheckResult> {
  const checks: Array<any> = [];
  const issues: string[] = [];

  // Check 1: Decision consistency
  const decisionConsistency = explanation.toLowerCase().includes(
    decision.decisionResult === "yes" ? "yes" : "no"
  );
  checks.push({
    name: "decision_consistency",
    passed: decisionConsistency,
    details: decisionConsistency 
      ? "Explanation matches decision"
      : "Explanation contradicts decision"
  });
  if (!decisionConsistency) {
    issues.push("Explanation contradicts decision");
  }

  // Check 2: Math accuracy
  let mathAccurate = true;
  for (const [toolName, output] of Object.entries(toolOutputs)) {
    if (output.result) {
      // Verify numbers in explanation match tool output
      const resultStr = JSON.stringify(output.result);
      // Simple check: if explanation mentions numbers, they should be in tool output
      const numberMatches = explanation.match(/\$?[\d,]+/g) || [];
      for (const match of numberMatches) {
        if (!resultStr.includes(match.replace(/[$,]/g, ""))) {
          mathAccurate = false;
          break;
        }
      }
    }
  }
  checks.push({
    name: "math_accuracy",
    passed: mathAccurate,
    details: mathAccurate ? "Numbers match tool outputs" : "Numbers may not match"
  });
  if (!mathAccurate) {
    issues.push("Numbers in explanation don't match tool outputs");
  }

  // Check 3: Safety rules
  const unsafePatterns = [
    /eliminate.*emergency.*fund/i,
    /spend.*more.*than.*income/i,
    /ignore.*debt/i
  ];
  let safetyPassed = true;
  for (const pattern of unsafePatterns) {
    if (pattern.test(explanation)) {
      safetyPassed = false;
      issues.push(`Unsafe pattern detected: ${pattern}`);
    }
  }
  checks.push({
    name: "safety_rules",
    passed: safetyPassed,
    details: safetyPassed ? "No unsafe recommendations" : "Unsafe pattern detected"
  });

  // Check 4: Missing data handling
  const missingDataMentioned = decision.missingData.length === 0 ||
    decision.missingData.some(field => explanation.includes(field));
  checks.push({
    name: "missing_data_handling",
    passed: missingDataMentioned,
    details: missingDataMentioned 
      ? "Missing data acknowledged"
      : "Missing data not mentioned"
  });

  return {
    passed: issues.length === 0,
    checks,
    issues
  };
}
```

---

## Trace Log Storage

```typescript
export class DecisionTraceLogWriter {
  private logPath: string;

  constructor(logPath: string = "src/evals/decision-trace-logs.jsonl") {
    this.logPath = logPath;
  }

  async write(trace: DecisionTraceLog): Promise<void> {
    const fs = await import("fs").then(m => m.promises);
    const line = JSON.stringify(trace) + "\n";
    await fs.appendFile(this.logPath, line);
  }

  async read(traceId: string): Promise<DecisionTraceLog | null> {
    const fs = await import("fs").then(m => m.promises);
    const content = await fs.readFile(this.logPath, "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    for (const line of lines) {
      const trace = JSON.parse(line) as DecisionTraceLog;
      if (trace.traceId === traceId) {
        return trace;
      }
    }
    return null;
  }
}
```

---

## Main Orchestrator

```typescript
export class ReasoningEngine {
  private traceLogWriter: DecisionTraceLogWriter;

  constructor() {
    this.traceLogWriter = new DecisionTraceLogWriter();
  }

  async reason(request: ReasoningRequest): Promise<ReasoningResponse> {
    const traceId = generateTraceId();
    const startTime = Date.now();

    try {
      // Step 1: Parse and normalize input
      const parser = new InputParser();
      const extractedFields = parser.parse(request.userMessage);

      // Step 2: Create or update profile
      const profileManager = new FinancialProfileManager();
      let profile = request.existingProfile || 
        profileManager.createEmpty(request.userId);
      
      // Step 3: Apply data reliability layer
      const reliabilityLayer = new DataReliabilityLayer();
      profile = await reliabilityLayer.processInput(profile, extractedFields);

      // Step 4: Check if decision can be made
      if (!profile.completeness.decisionReady) {
        const nextQuestion = this.selectNextQuestion(profile);
        return {
          success: true,
          profile,
          nextQuestion,
          traceLog: this.createTraceLog(traceId, request, profile, null, null, null)
        };
      }

      // Step 5: Execute tools
      const toolRegistry = new ToolRegistry();
      const toolOutputs: Record<string, ToolResult<any>> = {};

      toolOutputs["calculateMonthlySurplus"] = 
        await calculateMonthlySurplus(profile);
      toolOutputs["calculateEmergencyFundTarget"] = 
        await calculateEmergencyFundTarget(profile);

      // Step 6: Make decision
      const decisionEngine = new DecisionEngine();
      const decision = await decisionEngine.decide(profile, toolOutputs);

      // Step 7: Generate explanation
      const explanationFormatter = new ExplanationFormatter();
      const explanation = await explanationFormatter.format(
        decision,
        profile,
        toolOutputs
      );

      // Step 8: Validate response
      const validator = new SelfCheckValidator();
      const validation = await validator.validate(
        decision,
        explanation,
        toolOutputs
      );

      if (!validation.passed) {
        return {
          success: false,
          profile,
          errors: validation.issues,
          traceLog: this.createTraceLog(
            traceId,
            request,
            profile,
            decision,
            explanation,
            validation
          )
        };
      }

      // Step 9: Write trace log
      const trace = this.createTraceLog(
        traceId,
        request,
        profile,
        decision,
        explanation,
        validation
      );
      await this.traceLogWriter.write(trace);

      return {
        success: true,
        profile,
        decision,
        explanation,
        traceLog: trace
      };
    } catch (error) {
      return {
        success: false,
        profile: request.existingProfile || {},
        errors: [String(error)],
        traceLog: this.createTraceLog(traceId, request, {}, null, null, null)
      };
    }
  }

  private selectNextQuestion(profile: FinancialProfile): string {
    // Priority: income → rent → debt → expenses
    if (!profile.income.grossMonthly && !profile.income.netMonthly) {
      return "What's your monthly income (gross or take-home)?";
    }
    if (!profile.fixedExpenses.rentOrMortgage) {
      return "What's your rent or mortgage payment?";
    }
    if (!profile.fixedExpenses.debtPayments) {
      return "What are your monthly debt payments?";
    }
    if (!profile.variableExpenses.groceries) {
      return "What do you spend on groceries and transportation?";
    }
    return "Any other expenses I should know about?";
  }

  private createTraceLog(
    traceId: string,
    request: ReasoningRequest,
    profile: FinancialProfile,
    decision: DecisionResult | null,
    explanation: string | null,
    validation: SelfCheckResult | null
  ): DecisionTraceLog {
    return {
      traceId,
      timestamp: new Date().toISOString(),
      sessionId: request.sessionId,
      decisionType: request.decisionType || "unknown",
      input: {
        userMessage: request.userMessage,
        financialProfile: profile,
        profileCompleteness: profile.completeness || {},
        dataQualityScore: 0
      },
      processing: {
        dataReliability: {},
        toolOutputs: {}
      },
      decision: decision || {},
      explanation: {
        explanationText: explanation || "",
        consistencyChecks: []
      },
      validation: {
        selfCheckPassed: validation?.passed || false,
        selfCheckIssues: validation?.issues || [],
        safetyRulesEnforced: true,
        safetyViolations: []
      },
      metadata: {
        modelUsed: "claude-3-opus",
        latencyMs: 0,
        tokensUsed: { input: 0, output: 0 },
        version: "1.0"
      }
    };
  }
}
```

---

## Test Plan

### Unit Tests (100% coverage target)

#### Tool Tests
- `calculateMonthlySurplus.test.ts`
  - Happy path: all data provided
  - Missing income (gross and net)
  - Missing rent
  - Inferred variable expenses
  - Edge cases: zero income, zero expenses

- `calculateEmergencyFundTarget.test.ts`
  - Stable employment (3 months)
  - Unstable employment (6 months)
  - With dependents (+1 month each)
  - Missing expenses
  - Edge cases: zero expenses

- `checkAffordability.test.ts`
  - Affordable (>10% remaining)
  - Moderate (5-10% remaining)
  - Risky (<5% remaining)
  - Emergency fund critical
  - DTI threshold violations

#### Decision Flow Tests
- `budgetingDecision.test.ts`
  - Missing income → defer
  - Missing rent → defer
  - Negative surplus → no
  - Emergency fund gap → yes (with allocation)
  - Healthy budget → yes

- `affordabilityDecision.test.ts`
  - Missing income → defer
  - Emergency fund critical → no
  - Not affordable → no
  - Affordable → yes
  - Moderate risk → yes (with warning)

#### Data Reliability Tests
- `InputParser.test.ts`
  - Parse monthly income
  - Parse annual income (convert)
  - Parse biweekly income (convert)
  - Detect provisional ("about", "roughly")
  - Detect ranges
  - Detect gross vs net

- `ConfidenceScorer.test.ts`
  - User provided: 90 base
  - Inferred: 60 base
  - Provisional modifier: -20
  - Range modifier: -15
  - Recency modifiers

#### Validation Tests
- `SelfCheckValidator.test.ts`
  - Decision consistency check
  - Math accuracy check
  - Safety rules check
  - Missing data handling check

### Integration Tests

- `ReasoningEngine.test.ts`
  - Full flow: input → decision → explanation
  - Missing data → next question
  - Trace log generation
  - Error handling

### Test Data

Create `test/fixtures/profiles.ts`:
```typescript
export const minimalProfile: FinancialProfile = {
  income: { grossMonthly: 5200, confidence: 90 },
  fixedExpenses: { rentOrMortgage: 2200, confidence: 90 },
  // ...
};

export const lowConfidenceProfile: FinancialProfile = {
  income: { grossMonthly: 5200, confidence: 40, isProvisional: true },
  // ...
};

export const incompleteProfile: FinancialProfile = {
  income: { grossMonthly: null },
  // ...
};
```

---

## Success Criteria for Phase 1a

- ✅ All tools have 100% test coverage
- ✅ All decision flows have 100% test coverage
- ✅ Decision traces generated for every decision
- ✅ Explanation never contradicts decision output
- ✅ Missing required fields always trigger correct next question
- ✅ No response with invented calculations
- ✅ Graceful fallback when profile confidence is low
- ✅ All numbers in explanations traceable to tool outputs
- ✅ Self-check validation catches all safety violations

---

## Implementation Order

1. **Week 1:**
   - Create type definitions
   - Implement FinancialProfileManager
   - Implement InputParser
   - Implement ConfidenceScorer

2. **Week 2:**
   - Implement 3 tools with full tests
   - Implement 2 decision flows with full tests
   - Implement SelfCheckValidator

3. **Week 3:**
   - Implement ReasoningEngine orchestrator
   - Implement DecisionTraceLogWriter
   - Integration tests
   - Wire to Claude explanation layer

---

## Key Implementation Rules

1. **Every number must be traceable** — if it's in the explanation, it came from a tool output
2. **No invented calculations** — tools return null if data is missing
3. **Fail-safe design** — validation catches issues before response
4. **Immutable trace logs** — append-only for auditability
5. **High test coverage** — 100% on all tools and decision flows

---

**Status:** Ready for implementation  
**Estimated Duration:** 2-3 weeks  
**Next Step:** Begin Week 1 implementation
