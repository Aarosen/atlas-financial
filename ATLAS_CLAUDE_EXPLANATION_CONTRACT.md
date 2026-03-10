# Atlas Claude Explanation Contract

**Version:** 1.0  
**Status:** Specification  
**Date:** 2026-03-10

---

## Overview

Claude must receive structured decision data, not raw freedom to invent logic.

This contract prevents Claude from:
- Performing calculations independently
- Contradicting decision engine output
- Making assumptions about missing data
- Inventing financial recommendations
- Recomputing values differently than tools

---

## ExplanationInput Interface

```typescript
export interface ExplanationInput {
  // Decision metadata
  decisionType: "budgeting" | "affordability";
  decisionResult: "yes" | "no" | "maybe" | "defer";
  confidence: number; // 0-100
  
  // Decision summary (Claude must not contradict this)
  decisionSummary: string;
  // Example: "Spending exceeds income by $500/month"
  // Example: "A $700 car payment is affordable with $1,300 remaining"
  
  // Numeric facts (Claude must use these, not recompute)
  toolResults: {
    grossMonthlyIncome?: number;
    totalMonthlyExpenses?: number;
    monthlySurplus?: number;
    emergencyFundTarget?: number;
    emergencyFundCurrent?: number;
    emergencyFundShortfall?: number;
    proposedExpense?: number;
    remainingSurplus?: number;
    remainingPercent?: number;
    dtiAfter?: number;
    affordabilityReason?: string;
  };
  
  // What Claude must do next
  nextStep: "explain_decision" | "ask_question" | "defer";
  
  // If asking a question, which one
  nextQuestion?: string;
  
  // If deferring, why
  deferReason?: string;
  
  // Missing fields (Claude must acknowledge if relevant)
  missingFields: string[];
  
  // Tone context (Claude should adapt tone, not logic)
  toneContext: {
    emotion?: "anxious" | "ashamed" | "analytical" | "motivated" | "uncertain";
    riskLevel?: "safe" | "moderate" | "risky" | "dangerous";
    urgency?: "low" | "medium" | "high";
  };
  
  // Forbidden claims (Claude must never make these)
  forbiddenClaims: string[];
  // Examples:
  // - "You can afford this if you're careful"
  // - "Maybe try cutting back on dining out"
  // - "This should work out fine"
  // - "I calculated that you can save..."
  
  // Allowed explanation patterns
  allowedPatterns: string[];
  // Examples:
  // - "Your income is $X. Your expenses are $Y. That leaves $Z."
  // - "A $700 payment would leave you $1,300/month."
  // - "Your emergency fund is $8,000. The target is $13,200."
}
```

---

## Claude Prompt Contract

```
You are Atlas, a financial reasoning system that explains financial decisions.

CRITICAL RULES:
1. You ONLY explain decisions already made by the decision engine
2. You NEVER perform calculations
3. You NEVER contradict the decision provided
4. You NEVER make assumptions about missing data
5. You NEVER invent financial recommendations
6. You NEVER recompute values differently than the tools

INPUT YOU RECEIVE:
- decisionResult: The decision already made ("yes", "no", "defer")
- decisionSummary: Why the decision was made
- toolResults: All numeric facts (use these, don't recompute)
- nextStep: What you should do (explain, ask, or defer)
- nextQuestion: The exact question to ask (if nextStep = "ask_question")
- toneContext: How to adapt your tone
- forbiddenClaims: Claims you must NEVER make
- missingFields: Data that's missing (acknowledge if relevant)

YOUR JOB:
1. If nextStep = "explain_decision":
   - Acknowledge the user's situation with empathy
   - State the decision clearly
   - Show the math (reference toolResults)
   - Explain why this decision was made
   - Suggest next steps
   - NEVER contradict the decision

2. If nextStep = "ask_question":
   - Ask the exact question provided
   - Explain why this data matters
   - Be warm and helpful
   - NEVER ask a different question

3. If nextStep = "defer":
   - Explain why you can't decide yet
   - Ask for the highest-priority missing data
   - Be encouraging
   - NEVER guess or estimate

FORBIDDEN:
- Do not perform calculations (tools already did)
- Do not suggest different decisions
- Do not make assumptions about missing data
- Do not use vague language ("might", "could", "should")
- Do not invent recommendations
- Do not contradict the decision engine
- Do not make any claim in forbiddenClaims

EXAMPLE:

Input:
{
  decisionType: "affordability",
  decisionResult: "yes",
  decisionSummary: "A $700 car payment is affordable with $1,300 remaining",
  toolResults: {
    grossMonthlyIncome: 5200,
    totalMonthlyExpenses: 3200,
    monthlySurplus: 2000,
    proposedExpense: 700,
    remainingSurplus: 1300,
    remainingPercent: 6.2,
    affordabilityReason: "Affordable with good buffer"
  },
  nextStep: "explain_decision",
  toneContext: {
    emotion: "analytical",
    riskLevel: "safe"
  },
  forbiddenClaims: [
    "You might be able to afford it",
    "Try being careful with spending",
    "This could work out"
  ]
}

Your response:
"Yes, a $700 car payment is affordable.

Your monthly income is $5,200. After your current expenses ($3,200), 
you have $2,000 left over. A $700 payment would leave you $1,300/month, 
which is 6.2% of your income—a safe level.

However, I notice your emergency fund is $8,000, and ideally it should 
be $13,200. I'd recommend:
1. Build emergency fund to $13,200 (6 months)
2. Then comfortably afford the $700 payment

Or consider a $450 payment instead, which leaves more breathing room."

NOT: "You might be able to afford it if you're careful"
NOT: "I calculated that you can save..."
NOT: "This should work out fine"
```

---

## Implementation in ReasoningEngine

```typescript
export class ReasoningEngine {
  async reason(request: ReasoningRequest): Promise<ReasoningResponse> {
    // ... earlier steps ...

    // Step 7: Create ExplanationInput (structured data for Claude)
    const explanationInput = this.createExplanationInput(
      decision,
      toolOutputs,
      profile
    );

    // Step 8: Call Claude with strict contract
    const explanation = await this.callClaudeWithContract(explanationInput);

    // Step 9: Validate explanation against contract
    const explanationValid = this.validateExplanationAgainstContract(
      explanation,
      explanationInput
    );

    if (!explanationValid) {
      // Claude violated the contract - use fallback
      return {
        success: false,
        profile,
        errors: ["Explanation violated contract"],
        explanation: this.createFallbackExplanation(explanationInput)
      };
    }

    return {
      success: true,
      profile,
      decision,
      explanation
    };
  }

  private createExplanationInput(
    decision: DecisionResult,
    toolOutputs: Record<string, ToolResult<any>>,
    profile: FinancialProfile
  ): ExplanationInput {
    // Extract numeric facts from tool outputs
    const toolResults: Record<string, number | string | undefined> = {};

    if (toolOutputs.calculateMonthlySurplus?.result) {
      const result = toolOutputs.calculateMonthlySurplus.result;
      toolResults.grossMonthlyIncome = result.grossIncome;
      toolResults.totalMonthlyExpenses = result.totalExpenses;
      toolResults.monthlySurplus = result.monthlySurplus;
    }

    if (toolOutputs.calculateEmergencyFundTarget?.result) {
      const result = toolOutputs.calculateEmergencyFundTarget.result;
      toolResults.emergencyFundTarget = result.targetAmount;
      toolResults.emergencyFundCurrent = result.currentAmount;
      toolResults.emergencyFundShortfall = result.shortfall;
    }

    if (toolOutputs.checkAffordability?.result) {
      const result = toolOutputs.checkAffordability.result;
      toolResults.proposedExpense = result.proposedExpense;
      toolResults.remainingSurplus = result.remainingSurplus;
      toolResults.remainingPercent = result.remainingPercent;
      toolResults.dtiAfter = result.dtiAfter;
      toolResults.affordabilityReason = result.reason;
    }

    // Determine next step
    let nextStep: "explain_decision" | "ask_question" | "defer";
    let nextQuestion: string | undefined;
    let deferReason: string | undefined;

    if (decision.decisionResult === "defer") {
      nextStep = "defer";
      deferReason = decision.reasoning;
      nextQuestion = decision.nextSteps[0];
    } else if (!profile.completeness.decisionReady) {
      nextStep = "ask_question";
      nextQuestion = this.selectNextQuestion(profile);
    } else {
      nextStep = "explain_decision";
    }

    // Determine tone
    const toneContext = {
      emotion: this.detectEmotion(decision),
      riskLevel: this.detectRiskLevel(decision),
      urgency: this.detectUrgency(decision)
    };

    // Define forbidden claims
    const forbiddenClaims = [
      "might be able to afford",
      "could work out",
      "should be fine",
      "try cutting back",
      "I calculated",
      "I think you can",
      "maybe if you're careful",
      "approximately",
      "roughly",
      "about"
    ];

    return {
      decisionType: decision.decisionType as "budgeting" | "affordability",
      decisionResult: decision.decisionResult as "yes" | "no" | "maybe" | "defer",
      confidence: decision.confidence,
      decisionSummary: decision.reasoning,
      toolResults: toolResults as any,
      nextStep,
      nextQuestion,
      deferReason,
      missingFields: decision.missingData,
      toneContext,
      forbiddenClaims,
      allowedPatterns: [
        "Your income is $X. Your expenses are $Y. That leaves $Z.",
        "A $X payment would leave you $Y/month.",
        "Your emergency fund is $X. The target is $Y.",
        "You have $X in [category]. That's [status]."
      ]
    };
  }

  private async callClaudeWithContract(
    input: ExplanationInput
  ): Promise<string> {
    const prompt = this.buildPromptFromContract(input);

    const response = await anthropic.messages.create({
      model: "claude-3-opus-20250219",
      max_tokens: 500,
      system: `You are Atlas, a financial reasoning system that explains financial decisions.

CRITICAL RULES:
1. You ONLY explain decisions already made
2. You NEVER perform calculations
3. You NEVER contradict the decision provided
4. You NEVER make assumptions about missing data
5. You NEVER invent financial recommendations

The decision has already been made: ${input.decisionResult}
Decision summary: ${input.decisionSummary}

Numeric facts (use these, don't recompute):
${Object.entries(input.toolResults)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

FORBIDDEN CLAIMS (you must never make these):
${input.forbiddenClaims.map(claim => `- "${claim}"`).join("\n")}

ALLOWED PATTERNS:
${input.allowedPatterns.map(pattern => `- ${pattern}`).join("\n")}`,
      messages: [
        {
          role: "user",
          content: this.buildUserPromptFromContract(input)
        }
      ]
    });

    return response.content[0].type === "text" ? response.content[0].text : "";
  }

  private buildPromptFromContract(input: ExplanationInput): string {
    if (input.nextStep === "explain_decision") {
      return `Explain this decision to the user:
Decision: ${input.decisionResult}
Reason: ${input.decisionSummary}
Tone: ${input.toneContext.emotion}
Risk level: ${input.toneContext.riskLevel}`;
    } else if (input.nextStep === "ask_question") {
      return `Ask this question:
"${input.nextQuestion}"
Explain why this data matters.`;
    } else {
      return `Explain why we need more data:
Reason: ${input.deferReason}
Missing: ${input.missingFields.join(", ")}
Next question: "${input.nextQuestion}"`;
    }
  }

  private buildUserPromptFromContract(input: ExplanationInput): string {
    return `${this.buildPromptFromContract(input)}

Remember: Use only the numeric facts provided. Never recompute. Never contradict the decision.`;
  }

  private validateExplanationAgainstContract(
    explanation: string,
    input: ExplanationInput
  ): boolean {
    // Check 1: No forbidden claims
    for (const forbidden of input.forbiddenClaims) {
      if (explanation.toLowerCase().includes(forbidden.toLowerCase())) {
        console.warn(`Forbidden claim detected: "${forbidden}"`);
        return false;
      }
    }

    // Check 2: Decision is mentioned correctly
    if (input.nextStep === "explain_decision") {
      const hasDecision = 
        (input.decisionResult === "yes" && explanation.toLowerCase().includes("yes")) ||
        (input.decisionResult === "no" && explanation.toLowerCase().includes("no")) ||
        (input.decisionResult === "maybe" && explanation.toLowerCase().includes("maybe"));
      
      if (!hasDecision) {
        console.warn("Decision not mentioned in explanation");
        return false;
      }
    }

    // Check 3: Numbers match tool results (if mentioned)
    for (const [key, value] of Object.entries(input.toolResults)) {
      if (typeof value === "number" && value > 0) {
        // If Claude mentions a number, it should match tool output
        const numberPattern = new RegExp(`\\$?${Math.round(value)}`, "i");
        // Only check if the number is actually mentioned
        if (explanation.includes(String(value)) || explanation.includes(`$${value}`)) {
          // Number is mentioned, verify it matches
          if (!numberPattern.test(explanation)) {
            console.warn(`Number mismatch for ${key}: expected ${value}`);
            return false;
          }
        }
      }
    }

    return true;
  }

  private createFallbackExplanation(input: ExplanationInput): string {
    if (input.nextStep === "explain_decision") {
      return `${input.decisionSummary}

${Object.entries(input.toolResults)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}`;
    } else if (input.nextStep === "ask_question") {
      return input.nextQuestion || "I need more information to help you.";
    } else {
      return `I need more information: ${input.missingFields.join(", ")}`;
    }
  }

  private detectEmotion(decision: DecisionResult): string {
    if (decision.decisionResult === "no") return "anxious";
    if (decision.confidence < 70) return "uncertain";
    if (decision.decisionResult === "yes") return "motivated";
    return "analytical";
  }

  private detectRiskLevel(decision: DecisionResult): string {
    if (decision.confidence > 90) return "safe";
    if (decision.confidence > 70) return "moderate";
    return "risky";
  }

  private detectUrgency(decision: DecisionResult): string {
    if (decision.decisionResult === "no") return "high";
    if (decision.decisionResult === "defer") return "medium";
    return "low";
  }
}
```

---

## Validation Rules

Claude's explanation must:

1. **Match the decision**
   - If decision = "yes", explanation must affirm it
   - If decision = "no", explanation must explain why
   - If decision = "defer", explanation must ask for data

2. **Use only provided numbers**
   - Every number in explanation must come from toolResults
   - No recomputation
   - No rounding differently

3. **Avoid forbidden patterns**
   - No "might", "could", "should"
   - No "I calculated"
   - No "try this"
   - No assumptions

4. **Acknowledge missing data**
   - If missingFields provided, mention them
   - Explain why they matter
   - Ask for them clearly

5. **Maintain tone**
   - Match emotion context
   - Adapt to risk level
   - Respect urgency

---

## Testing the Contract

```typescript
describe("Claude Explanation Contract", () => {
  it("should reject explanations that contradict decision", () => {
    const input: ExplanationInput = {
      decisionResult: "yes",
      decisionSummary: "Affordable",
      // ...
    };
    const explanation = "No, this is not affordable.";
    expect(validateExplanationAgainstContract(explanation, input)).toBe(false);
  });

  it("should reject explanations with forbidden claims", () => {
    const input: ExplanationInput = {
      forbiddenClaims: ["might be able to afford"],
      // ...
    };
    const explanation = "You might be able to afford this.";
    expect(validateExplanationAgainstContract(explanation, input)).toBe(false);
  });

  it("should accept explanations that use tool results", () => {
    const input: ExplanationInput = {
      toolResults: {
        monthlySurplus: 1800
      },
      // ...
    };
    const explanation = "Your monthly surplus is $1,800.";
    expect(validateExplanationAgainstContract(explanation, input)).toBe(true);
  });

  it("should reject explanations with invented numbers", () => {
    const input: ExplanationInput = {
      toolResults: {
        monthlySurplus: 1800
      },
      // ...
    };
    const explanation = "Your monthly surplus is $2,000.";
    expect(validateExplanationAgainstContract(explanation, input)).toBe(false);
  });
});
```

---

## Summary

This contract ensures Claude:
- ✅ Never invents logic
- ✅ Never contradicts decisions
- ✅ Never recomputes values
- ✅ Only explains what the engine decided
- ✅ Uses only provided numeric facts
- ✅ Fails safely if it violates the contract

The contract is strict, testable, and prevents the most common failure modes.
