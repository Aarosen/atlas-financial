# Atlas Decision Trace Log Schema

**Version:** 1.0  
**Status:** Design Specification  
**Date:** 2026-03-10

---

## Overview

Every Atlas decision generates a machine-readable audit trail.

This trace log enables:
- **Debugging** — why did Atlas recommend X?
- **Eval verification** — did the decision engine work correctly?
- **Compliance** — prove the decision was sound
- **Explainability** — show the user the reasoning
- **Learning** — improve future decisions

---

## Decision Trace Log Schema

```typescript
interface DecisionTraceLog {
  // Metadata
  trace_id: string; // unique identifier
  timestamp: string; // ISO 8601
  session_id: string; // user session
  decision_type: string; // budgeting, affordability, etc.
  
  // Input State
  input: {
    user_message: string; // what user asked
    financial_profile: FinancialProfile; // canonical profile at time of decision
    profile_completeness: {
      completeness_score: number;
      missing_critical_fields: string[];
      decision_ready: boolean;
    };
    data_quality_score: number; // 0-100
  };
  
  // Processing
  processing: {
    // Data reliability layer output
    data_reliability: {
      extracted_fields: Record<string, any>;
      confidence_scores: Record<string, number>;
      conflicts_detected: ConflictFlag[];
      quality_assessment: string;
    };
    
    // Missing data orchestration
    missing_data: {
      blocking_fields_missing: string[];
      required_fields_missing: string[];
      next_question: string | null;
      questions_asked: string[];
    };
    
    // Tool outputs
    tool_outputs: {
      [toolName: string]: {
        inputs_used: string[];
        result: any;
        confidence: number;
        assumptions: string[];
      };
    };
  };
  
  // Decision Logic
  decision: {
    decision_type: string;
    decision_result: string; // "yes", "no", "maybe", "defer"
    confidence: number; // 0-100
    
    // Rules triggered
    rules_triggered: Array<{
      rule_id: string;
      rule_name: string;
      condition: string;
      result: string;
      weight: number;
    }>;
    
    // Decision path
    decision_path: Array<{
      step: number;
      condition: string;
      evaluation: boolean;
      action: string;
    }>;
    
    // Blocking conditions
    blocking_conditions: Array<{
      condition: string;
      met: boolean;
      impact: string;
    }>;
    
    // Precedence rules applied
    precedence_rules: Array<{
      rule: string;
      applied: boolean;
      reason: string;
    }>;
  };
  
  // Explanation
  explanation: {
    explanation_text: string; // what was told to user
    explanation_structure: {
      acknowledgment: string;
      reasoning: string;
      recommendation: string;
      next_steps: string[];
    };
    
    // Consistency checks
    consistency_checks: Array<{
      check_name: string;
      passed: boolean;
      details: string;
    }>;
  };
  
  // Scenarios (if generated)
  scenarios: Array<{
    scenario_name: string;
    modifications: ScenarioModification[];
    results: ScenarioResults;
  }> | null;
  
  // Validation
  validation: {
    self_check_passed: boolean;
    self_check_issues: string[];
    safety_rules_enforced: boolean;
    safety_violations: string[];
    governance_rules_enforced: boolean;
    governance_violations: string[];
  };
  
  // Metadata
  metadata: {
    model_used: string; // "claude-3-opus", etc.
    model_temperature: number;
    latency_ms: number;
    tokens_used: {
      input: number;
      output: number;
    };
    version: string; // architecture version
  };
}
```

---

## Example: Affordability Decision Trace

```json
{
  "trace_id": "trace_20260310_001",
  "timestamp": "2026-03-10T01:25:00Z",
  "session_id": "session_user123_001",
  "decision_type": "affordability",
  
  "input": {
    "user_message": "Can I afford a $700 car payment?",
    "financial_profile": {
      "income": {
        "gross_monthly_income": {
          "value": 5200,
          "confidence": 75,
          "is_provisional": true
        }
      },
      "fixed_expenses": {
        "rent_or_mortgage": {
          "value": 2200,
          "confidence": 90
        },
        "debt_payments": {
          "value": 400,
          "confidence": 90
        }
      },
      "variable_expenses": {
        "groceries": {
          "value": 400,
          "confidence": 70
        },
        "transportation": {
          "value": 200,
          "confidence": 75
        }
      },
      "assets": {
        "emergency_fund": {
          "value": 8000,
          "confidence": 85
        }
      }
    },
    "profile_completeness": {
      "completeness_score": 72,
      "missing_critical_fields": [],
      "decision_ready": true
    },
    "data_quality_score": 72
  },
  
  "processing": {
    "data_reliability": {
      "extracted_fields": {
        "proposed_expense": 700
      },
      "confidence_scores": {
        "proposed_expense": 95
      },
      "conflicts_detected": [],
      "quality_assessment": "High quality input"
    },
    
    "missing_data": {
      "blocking_fields_missing": [],
      "required_fields_missing": [],
      "next_question": null,
      "questions_asked": []
    },
    
    "tool_outputs": {
      "calculate_monthly_surplus": {
        "inputs_used": [
          "gross_monthly_income",
          "fixed_expenses.rent_or_mortgage",
          "fixed_expenses.debt_payments",
          "variable_expenses.groceries",
          "variable_expenses.transportation"
        ],
        "result": {
          "gross_income": 5200,
          "total_expenses": 3200,
          "monthly_surplus": 2000
        },
        "confidence": 85,
        "assumptions": [
          "Estimated other variable expenses at $100",
          "Estimated utilities/insurance at $100"
        ]
      },
      
      "check_affordability": {
        "inputs_used": [
          "monthly_surplus",
          "proposed_expense",
          "emergency_fund_status"
        ],
        "result": {
          "proposed_expense": 700,
          "remaining_surplus": 1300,
          "dti_after": 38,
          "is_affordable": true,
          "risk_level": "safe"
        },
        "confidence": 90,
        "assumptions": []
      }
    }
  },
  
  "decision": {
    "decision_type": "affordability",
    "decision_result": "yes",
    "confidence": 88,
    
    "rules_triggered": [
      {
        "rule_id": "affordability_rule_1",
        "rule_name": "remaining_surplus_check",
        "condition": "remaining_surplus > 10% of income",
        "result": "true (1300 > 520)",
        "weight": 1.0
      },
      {
        "rule_id": "affordability_rule_2",
        "rule_name": "dti_check",
        "condition": "dti_after < 43%",
        "result": "true (38% < 43%)",
        "weight": 1.0
      },
      {
        "rule_id": "affordability_rule_3",
        "rule_name": "emergency_fund_check",
        "condition": "emergency_fund >= target",
        "result": "true (8000 >= 13200 - not met, but acceptable)",
        "weight": 0.8
      }
    ],
    
    "decision_path": [
      {
        "step": 1,
        "condition": "Is emergency fund healthy?",
        "evaluation": false,
        "action": "Flag as concern, but continue"
      },
      {
        "step": 2,
        "condition": "Is remaining surplus > 10% of income?",
        "evaluation": true,
        "action": "Continue to next check"
      },
      {
        "step": 3,
        "condition": "Is DTI < 43%?",
        "evaluation": true,
        "action": "Decision: AFFORDABLE"
      }
    ],
    
    "blocking_conditions": [
      {
        "condition": "emergency_fund < target",
        "met": true,
        "impact": "Reduces confidence but doesn't block decision"
      }
    ],
    
    "precedence_rules": [
      {
        "rule": "emergency_fund_blocks_affordability",
        "applied": false,
        "reason": "Emergency fund is low but not critically low"
      }
    ]
  },
  
  "explanation": {
    "explanation_text": "Yes, a $700 car payment is affordable. Here's why:\n\nYour monthly income is $5,200. After your current expenses ($3,200), you have $2,000 left over. A $700 payment would leave you $1,300/month, which is 6.2% of your income—a safe level.\n\nHowever, I notice your emergency fund is $8,000, and ideally it should be $13,200. I'd recommend:\n1. Build emergency fund to $13,200 (6 months)\n2. Then comfortably afford the $700 payment\n\nOr consider a $450 payment instead, which leaves more breathing room.",
    
    "explanation_structure": {
      "acknowledgment": "You're asking about a $700 car payment.",
      "reasoning": "Your surplus is $2,000. After the payment, you'd have $1,300 left, which is safe.",
      "recommendation": "It's affordable, but consider building emergency fund first.",
      "next_steps": [
        "Build emergency fund to $13,200",
        "Then afford $700 payment comfortably",
        "Or consider $450 payment now"
      ]
    },
    
    "consistency_checks": [
      {
        "check_name": "explanation_matches_decision",
        "passed": true,
        "details": "Explanation recommends 'yes' which matches decision_result"
      },
      {
        "check_name": "numbers_match_tool_outputs",
        "passed": true,
        "details": "All numbers in explanation match tool results"
      },
      {
        "check_name": "safety_rules_followed",
        "passed": true,
        "details": "Explanation acknowledges emergency fund gap"
      },
      {
        "check_name": "tone_appropriate",
        "passed": true,
        "details": "Tone is warm and helpful"
      }
    ]
  },
  
  "scenarios": [
    {
      "scenario_name": "$700 payment now",
      "modifications": [
        {
          "type": "expense_change",
          "field": "new_car_payment",
          "oldValue": 0,
          "newValue": 700,
          "timeline": "immediate"
        }
      ],
      "results": {
        "projectedProfile": { "..." },
        "monthlyImpact": {
          "surplus_change": -700,
          "dti_change": 2,
          "emergency_fund_impact": 0
        },
        "riskAssessment": {
          "safety_level": "safe",
          "buffer_remaining": 1300,
          "emergency_fund_impact": "low"
        }
      }
    },
    {
      "scenario_name": "$450 payment now",
      "modifications": [
        {
          "type": "expense_change",
          "field": "new_car_payment",
          "oldValue": 0,
          "newValue": 450,
          "timeline": "immediate"
        }
      ],
      "results": {
        "projectedProfile": { "..." },
        "monthlyImpact": {
          "surplus_change": -450,
          "dti_change": 1,
          "emergency_fund_impact": 0
        },
        "riskAssessment": {
          "safety_level": "safe",
          "buffer_remaining": 1550,
          "emergency_fund_impact": "low"
        }
      }
    },
    {
      "scenario_name": "Wait 6 months, save $3,000",
      "modifications": [
        {
          "type": "asset_change",
          "field": "savings_accumulation",
          "oldValue": 0,
          "newValue": 3000,
          "timeline": "6 months"
        },
        {
          "type": "expense_change",
          "field": "new_car_payment",
          "oldValue": 0,
          "newValue": 550,
          "timeline": "6 months"
        }
      ],
      "results": {
        "projectedProfile": { "..." },
        "monthlyImpact": {
          "surplus_change": -550,
          "dti_change": 1,
          "emergency_fund_impact": 3000
        },
        "riskAssessment": {
          "safety_level": "safe",
          "buffer_remaining": 1450,
          "emergency_fund_impact": "healthy"
        }
      }
    }
  ],
  
  "validation": {
    "self_check_passed": true,
    "self_check_issues": [],
    "safety_rules_enforced": true,
    "safety_violations": [],
    "governance_rules_enforced": true,
    "governance_violations": []
  },
  
  "metadata": {
    "model_used": "claude-3-opus",
    "model_temperature": 0.7,
    "latency_ms": 1240,
    "tokens_used": {
      "input": 2840,
      "output": 520
    },
    "version": "1.0"
  }
}
```

---

## Trace Log Usage

### For Debugging

```
Question: "Why did Atlas say I can afford the payment?"

Answer: Look at trace_id trace_20260310_001
  → decision.decision_result: "yes"
  → decision.rules_triggered: [affordability_rule_1, affordability_rule_2, affordability_rule_3]
  → decision.decision_path: Shows step-by-step logic
  → explanation.consistency_checks: All passed
  
Conclusion: Decision was sound and well-reasoned.
```

### For Eval Verification

```
Test: "Affordability decision correctness"

Verification steps:
1. Check tool_outputs.calculate_monthly_surplus
   → Verify calculation: 5200 - 3200 = 2000 ✓
   
2. Check tool_outputs.check_affordability
   → Verify: 2000 - 700 = 1300 ✓
   → Verify: 1300 / 5200 = 6.2% > 5% ✓
   
3. Check decision.rules_triggered
   → All rules passed ✓
   
4. Check explanation.consistency_checks
   → All checks passed ✓
   
Result: Decision is correct ✓
```

### For Compliance

```
Audit question: "Can you prove this decision was sound?"

Evidence from trace log:
1. Input state: Profile was complete (completeness_score: 72)
2. Data quality: High (data_quality_score: 72)
3. Tool outputs: All correct and verified
4. Decision logic: Followed documented rules
5. Explanation: Consistent with decision
6. Validation: All checks passed
7. Scenarios: Showed alternatives

Conclusion: Decision was made with full transparency and rigor.
```

### For Explainability

```
User question: "Why did you recommend waiting 6 months?"

Answer from trace log:
  → scenarios[2].scenario_name: "Wait 6 months, save $3,000"
  → scenarios[2].results.riskAssessment.safety_level: "safe"
  → scenarios[2].results.riskAssessment.emergency_fund_impact: "healthy"
  → explanation.next_steps[0]: "Build emergency fund to $13,200"
  
Explanation: "Waiting 6 months lets you build your emergency fund
  to a healthy level while saving $3,000 for a down payment.
  This makes the $550 payment very comfortable instead of tight."
```

### For Learning

```
Analysis: "What decisions work best?"

Query trace logs:
  → Filter by decision_type: "affordability"
  → Filter by decision.confidence: > 85
  → Analyze explanation.consistency_checks: all passed
  
Pattern: Decisions with high confidence and all consistency checks
  passed have 98% user satisfaction.
  
Recommendation: Prioritize decisions with this profile.
```

---

## Trace Log Storage

### Append-Only Log

```
File: src/evals/decision-trace-logs.jsonl

Each line is a complete trace log (JSON):
{"trace_id": "trace_20260310_001", ...}
{"trace_id": "trace_20260310_002", ...}
{"trace_id": "trace_20260310_003", ...}
```

### Indexed Access

```typescript
interface TraceLogIndex {
  trace_id: string;
  timestamp: string;
  session_id: string;
  decision_type: string;
  decision_result: string;
  confidence: number;
  file_offset: number; // byte offset in log file
}

// Index enables fast queries:
// - Find all affordability decisions
// - Find decisions with confidence < 70
// - Find decisions for specific user
// - Find decisions in time range
```

### Retention Policy

```
Keep all trace logs for:
- 90 days: Full detail
- 1 year: Summarized (remove large objects like full profile)
- 3 years: Metadata only (trace_id, timestamp, decision_type, result)

This balances auditability with storage efficiency.
```

---

## Trace Log Queries

### Example 1: Find low-confidence decisions

```typescript
const lowConfidenceDecisions = traceLogIndex
  .filter(log => log.confidence < 70)
  .sort((a, b) => a.confidence - b.confidence);

// Returns decisions that need review
```

### Example 2: Find decisions with failed validation

```typescript
const failedValidation = traceLogIndex
  .filter(log => !log.validation.self_check_passed)
  .map(log => ({
    trace_id: log.trace_id,
    issues: log.validation.self_check_issues
  }));

// Returns decisions that failed safety checks
```

### Example 3: Analyze decision accuracy over time

```typescript
const decisionAccuracy = traceLogIndex
  .filter(log => log.decision_type === "affordability")
  .groupBy(log => log.timestamp.split('T')[0]) // by day
  .map(day => ({
    date: day.date,
    avg_confidence: avg(day.map(log => log.confidence)),
    all_validated: all(day.map(log => log.validation.self_check_passed))
  }));

// Returns daily accuracy trends
```

---

## Summary

The Decision Trace Log:

1. **Records everything** — inputs, processing, decision, explanation, validation
2. **Enables debugging** — understand why any decision was made
3. **Supports compliance** — prove decisions were sound
4. **Improves learning** — analyze patterns in decisions
5. **Maintains audit trail** — immutable record for accountability

This is the foundation for trustworthy, explainable financial reasoning.

---

**Next:** Updated architecture diagram showing all six layers integrated end-to-end
