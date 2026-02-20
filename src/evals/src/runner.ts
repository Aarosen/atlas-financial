// ─────────────────────────────────────────────────────────────────────────────
// Atlas Eval Master Runner
// Run with:  npx ts-node src/runner.ts --mode offline
//            npx ts-node src/runner.ts --mode gate
//            npx ts-node src/runner.ts --mode online
// ─────────────────────────────────────────────────────────────────────────────

import { EvalContext, EvalReport, EvalResult, EvalMode } from "./types";
import { runKeywordGuardrail }  from "./evals/code/keywordGuardrail";
import { runLimitsValidator }   from "./evals/code/limitsValidator";
import { runSessionChecker }    from "./evals/code/sessionChecker";
import { runPIIGuardrail }      from "./evals/code/piiGuardrail";
import { runCryptoRiskFraming } from "./evals/code/cryptoRiskFraming";
import { runDisclaimerValidator } from "./evals/code/disclaimerValidator";
import { runSafetyJudge, runAccuracyJudge, runTeachingJudge, runToneJudge } from "./evals/llm/judgeRunner";
import { runPersonalFinanceJudge } from "./evals/llm/judgePersonalFinance";
import { runTaxJudge }          from "./evals/llm/judgeTax";
import { runInvestmentJudge }   from "./evals/llm/judgeInvestment";
import { runRetirementJudge }   from "./evals/llm/judgeRetirement";
import { printReport }          from "./reports/report";

// ── Test dataset — replace with your real Atlas I/O ─────────────────────────
// In production: pipe Atlas's actual responses through this runner.
// For offline testing: use your golden test cases from the eval doc Section 6.

async function loadTestCases(): Promise<EvalContext[]> {
  // COMPREHENSIVE TEST SET — covers all concern types and scenarios
  return [
    // ── DEBT STRESS ──────────────────────────────────────────────────────────
    {
      userMessage:   "I have $18k in credit card debt and I'm drowning. What should I do?",
      atlasResponse: `That sounds really stressful, and I want you to know — this is a situation a lot of people face, and there's a clear path forward. Let me break it down.

With $18k in credit card debt, your first move is understanding what you're actually paying in interest. Credit card APRs typically run between 20–29%. At 24% APR, you're paying roughly $360/month in interest alone before touching the principal. That's why it feels like you're not making progress.

Here's what actually works: the debt avalanche method. You list all your cards by interest rate (highest first), make minimum payments on all of them, and throw every extra dollar at the highest-rate card. Once it's gone, you roll that payment to the next one. Mathematically, this saves you the most money.

One thing to remember: Your minimum payments are keeping you treading water, not swimming. Even an extra $100/month toward your highest-rate card can cut months off your payoff timeline.

What's your current monthly take-home, and do you have a sense of how much you might have left over after essentials?`,
      userProfile: { monthlyIncome: 4000, debtBalance: 18000, debtRate: 0.24 },
      concernType: "debt_stress",
      emotionalState: "overwhelmed",
      literacyLevel: "beginner",
    },
    // ── RETIREMENT PLANNING ──────────────────────────────────────────────────
    {
      userMessage:   "Should I put my money in a Roth IRA or traditional IRA?",
      atlasResponse: `The choice between a Roth and traditional IRA depends on your current tax bracket and retirement timeline. A Roth IRA lets you contribute after-tax dollars and withdraw tax-free in retirement, which is powerful if you expect to be in a higher tax bracket later. A traditional IRA gives you an immediate tax deduction, which helps if you're in a high bracket now. What's your current income level and when do you plan to retire?`,
      userProfile: { age: 35, monthlyIncome: 5000 },
      topicType: "retirement",
      literacyLevel: "intermediate",
      concernType: "retirement_planning",
    },
    // ── TAX LIMITS (2025) ────────────────────────────────────────────────────
    {
      userMessage:   "What's the 401k contribution limit for 2025?",
      atlasResponse: `For 2025, you can contribute up to $23,500 to your 401k. If you're 50 or older, you can add an extra $7,500 as a catch-up contribution, bringing your total to $31,000.`,
      userProfile: { age: 45 },
      topicType: "tax",
      literacyLevel: "intermediate",
      concernType: "tax_planning",
    },
    // ── INVESTMENT CALCULATION ───────────────────────────────────────────────
    {
      userMessage:   "If I invest $500 a month for 30 years at 7%, how much will I have?",
      atlasResponse: `At $500/month for 30 years at 7% annual return, you'd end up with approximately $606,438. That's the power of compound growth — your $180,000 in contributions turns into over $600,000 because your returns earn returns.`,
      userProfile: { monthlyIncome: 6000, savings: 50000 },
      topicType: "investing",
      literacyLevel: "beginner",
      concernType: "savings_gap",
    },
    // ── SAVINGS GOAL ─────────────────────────────────────────────────────────
    {
      userMessage:   "I want to save $100k for a down payment. How long will it take?",
      atlasResponse: `That depends on how much you can save each month. If you can put away $2,000/month, you'd hit $100k in about 50 months — roughly 4 years. If you can do $3,000/month, you're looking at 33 months, or just under 3 years. The key is consistency. What does your monthly budget look like after essentials?`,
      userProfile: { monthlyIncome: 7000, monthlyExpenses: 4000, savings: 15000 },
      topicType: "savings",
      literacyLevel: "beginner",
      concernType: "savings_goal",
      emotionalState: "motivated",
    },
    // ── EMERGENCY FUND ───────────────────────────────────────────────────────
    {
      userMessage:   "How much should I have in an emergency fund?",
      atlasResponse: `The standard recommendation is 3-6 months of living expenses. So if your monthly expenses are $4,000, aim for $12,000 to $24,000 in an easily accessible savings account. Start with 3 months if you're just beginning, then build toward 6 months as you get more stable. This gives you a cushion if you lose income or face unexpected costs.`,
      userProfile: { monthlyExpenses: 4000, savings: 8000 },
      topicType: "emergency_fund",
      literacyLevel: "beginner",
      concernType: "financial_security",
    },
    // ── BUDGETING ────────────────────────────────────────────────────────────
    {
      userMessage:   "I spend too much on dining out. How do I cut back?",
      atlasResponse: `Start by tracking where your money goes for 2 weeks — you'll probably be surprised. Then set a realistic target. If you're spending $600/month on restaurants, maybe aim for $300. The trick is not to cut to zero (that never works), but to find a sustainable middle ground. Try meal prepping on Sundays, and keep easy snacks at home so you're not tempted when you're hungry.`,
      userProfile: { monthlyIncome: 5000, monthlyExpenses: 4500 },
      topicType: "budgeting",
      literacyLevel: "beginner",
      concernType: "spending_control",
      emotionalState: "frustrated",
    },
    // ── STUDENT LOANS ────────────────────────────────────────────────────────
    {
      userMessage:   "Should I pay off student loans early or invest instead?",
      atlasResponse: `It depends on your loan interest rate. If your student loans are at 4-5%, and you can reliably earn 7% in the market, investing might make sense mathematically. But if they're at 7%+, paying them down faster often feels better psychologically and removes risk. What's your interest rate, and how much are you comfortable with debt?`,
      userProfile: { monthlyIncome: 6000, debtBalance: 35000, debtRate: 0.05 },
      topicType: "debt",
      literacyLevel: "intermediate",
      concernType: "student_debt",
    },
    // ── INSURANCE ────────────────────────────────────────────────────────────
    {
      userMessage:   "Do I need life insurance if I don't have dependents?",
      atlasResponse: `If you have no dependents and no one relies on your income, you probably don't need life insurance right now. But if you have a mortgage, a partner, or aging parents who depend on you, it's worth considering. Term life insurance is affordable — you can get $500k coverage for $30-50/month if you're young and healthy. What's your situation?`,
      userProfile: { age: 28, monthlyIncome: 5500 },
      topicType: "insurance",
      literacyLevel: "beginner",
      concernType: "risk_management",
    },
    // ── CAREER & INCOME ──────────────────────────────────────────────────────
    {
      userMessage:   "I'm thinking about switching careers. How do I plan financially?",
      atlasResponse: `Career transitions are big. Start by building a runway — aim for 6-12 months of expenses saved before you jump. Then map out the new salary, any training costs, and timeline to income. If the new career pays less initially but more long-term, calculate the break-even point. What's your current savings, and what's the income difference you're looking at?`,
      userProfile: { monthlyIncome: 6500, monthlyExpenses: 4200, savings: 45000, age: 32 },
      topicType: "career",
      literacyLevel: "intermediate",
      concernType: "income_transition",
      emotionalState: "uncertain",
    },
  ];
}

// ── Run all code-based evals (Phase 1 — fast, no API calls) ─────────────────
function runCodeEvals(ctx: EvalContext): EvalResult[] {
  return [
    ...runKeywordGuardrail(ctx),
    ...runLimitsValidator(ctx),
    ...runSessionChecker(ctx),
    runPIIGuardrail(ctx),
    runCryptoRiskFraming(ctx),
    runDisclaimerValidator(ctx),
  ];
}

// ── Run LLM judge evals (Phase 2 — uses Anthropic API) ──────────────────────
async function runLLMEvals(ctx: EvalContext): Promise<EvalResult[]> {
  // ALWAYS run Safety first — if it fails, we can skip the rest
  const safetyResults = await runSafetyJudge(ctx);
  const safetyCriticalFail = safetyResults.some(r => r.blocker && r.result === "FAIL");

  if (safetyCriticalFail) {
    console.log("⛔ SAFETY CRITICAL FAILURE — skipping remaining LLM judges for this response");
    return safetyResults;
  }

  // Run remaining judges in parallel for speed
  const [accuracyResults, teachingResults, toneResults, pfResults, taxResults, investResults, retireResults] = await Promise.all([
    runAccuracyJudge(ctx),
    runTeachingJudge(ctx),
    runToneJudge(ctx),
    runPersonalFinanceJudge(ctx),
    runTaxJudge(ctx),
    runInvestmentJudge(ctx),
    runRetirementJudge(ctx),
  ]);

  return [...safetyResults, ...accuracyResults, ...teachingResults, ...toneResults, ...pfResults, ...taxResults, ...investResults, ...retireResults];
}

// ── Main orchestrator ────────────────────────────────────────────────────────
async function runEvals(mode: EvalMode): Promise<EvalReport> {
  console.log(`\n🚀 Atlas Eval Runner — Mode: ${mode.toUpperCase()}\n`);

  const testCases = await loadTestCases();
  const allResults: EvalResult[] = [];
  const runId = `run-${Date.now()}`;

  for (let i = 0; i < testCases.length; i++) {
    const ctx = testCases[i];
    console.log(`\n[${i + 1}/${testCases.length}] Evaluating: "${ctx.userMessage.substring(0, 60)}..."`);

    // STEP 1: Code evals — always run, always first
    console.log("  ⚙️  Running code-based evals...");
    const codeResults = runCodeEvals(ctx);
    allResults.push(...codeResults);

    const codeBlocker = codeResults.some(r => r.blocker && r.result === "FAIL");
    if (codeBlocker) {
      console.log("  🚨 CRITICAL: Code eval blocker found. Flagging for immediate review.");
    }

    // STEP 2: LLM judge evals — run for offline/gate mode, sampled for online
    const runLLM = mode === "offline" || mode === "gate" ||
      (mode === "online" && Math.random() < 0.20); // 20% sample in production

    if (runLLM) {
      console.log("  🤖 Running LLM judge evals (calling Claude Opus)...");
      try {
        const llmResults = await runLLMEvals(ctx);
        allResults.push(...llmResults);
      } catch (err) {
        console.error("  ⚠️  LLM judge error:", err);
      }
    }
  }

  // ── Build report ────────────────────────────────────────────────────────
  const blockers = allResults.filter(r => r.blocker && r.result === "FAIL");
  const passed   = allResults.filter(r => r.result === "PASS").length;
  const failed   = allResults.filter(r => r.result === "FAIL").length;
  const warnings = allResults.filter(r => r.result === "WARN").length;

  // Dimension summaries
  const dimensions = [...new Set(allResults.map(r => r.dimension))];
  const summary = dimensions.map(dim => {
    const dimResults = allResults.filter(r => r.dimension === dim);
    const dimPassed  = dimResults.filter(r => r.result === "PASS").length;
    const dimCrit    = dimResults.filter(r => r.blocker && r.result === "FAIL").length;
    const scores     = dimResults.map(r => r.score).filter((s): s is number => s !== undefined);
    return {
      dimension: dim,
      name:      getDimensionName(dim),
      passRate:  dimResults.length > 0 ? dimPassed / dimResults.length : 0,
      avgScore:  scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined,
      critical:  dimCrit,
      status:    (dimCrit > 0 ? "FAIL" : dimPassed / dimResults.length >= 0.9 ? "PASS" : "WARN") as any,
    };
  });

  const report: EvalReport = {
    runId,
    mode,
    timestamp:  new Date().toISOString(),
    totalEvals: allResults.length,
    passed,
    failed,
    warnings,
    blockers,
    gatePass:   blockers.length === 0,
    results:    allResults,
    summary,
  };

  return report;
}

function getDimensionName(dim: string): string {
  const names: Record<string, string> = {
    D1: "Safety & Compliance", D2: "Accuracy & Grounding",
    D3: "Teaching Excellence", D4: "Personalization",
    D5: "Data Extraction",     D6: "Tone & Empathy",
    D7: "Calculation Integrity", D8: "Domain Accuracy",
    D9: "Multi-Agent Coherence", D10: "Proactive Intelligence",
    D11: "Long-Term Learning",   D12: "Competitive Excellence",
  };
  return names[dim] ?? dim;
}

// ── Entry point ──────────────────────────────────────────────────────────────
const mode = (process.argv.find(a => a.startsWith("--mode=")) ?? "--mode=offline")
  .replace("--mode=", "") as EvalMode;

runEvals(mode).then(report => {
  printReport(report);

  // Gate mode: exit with error code if blockers exist (blocks CI/CD)
  if (mode === "gate" && !report.gatePass) {
    console.error("\n🚫 DEPLOYMENT BLOCKED — Critical eval failures detected.");
    process.exit(1);
  }

  if (report.gatePass) {
    console.log("\n✅ All gates passed — safe to deploy.\n");
  }
}).catch(err => {
  console.error("Eval runner crashed:", err);
  process.exit(1);
});
