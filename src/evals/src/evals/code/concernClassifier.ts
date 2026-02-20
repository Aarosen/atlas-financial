// ─────────────────────────────────────────────────────────────────────────────
// CODE-06: Concern Classification Tester (D4-01, D4-02)
// Tests Atlas's ability to correctly classify user concerns and route to agents
// ─────────────────────────────────────────────────────────────────────────────

import { EvalResult } from "../../types";

export interface ConcernTestCase {
  id: string;
  input: string;
  expectedConcern: string;
  expectedAgent: string | string[];
}

const CONCERN_GOLDEN_SET: ConcernTestCase[] = [
  {
    id: "C01",
    input: "I have $18k in credit card debt and I'm drowning",
    expectedConcern: "debt_stress",
    expectedAgent: "personal_finance",
  },
  {
    id: "C02",
    input: "I want to start investing but I don't know how",
    expectedConcern: "investing_interest",
    expectedAgent: "investments",
  },
  {
    id: "C03",
    input: "I can never seem to save money at the end of the month",
    expectedConcern: "savings_gap",
    expectedAgent: "personal_finance",
  },
  {
    id: "C04",
    input: "I don't understand my taxes and I'm scared I owe money",
    expectedConcern: "tax_anxiety",
    expectedAgent: "tax",
  },
  {
    id: "C05",
    input: "I'm 35 and I haven't started saving for retirement",
    expectedConcern: "retirement_concern",
    expectedAgent: "retirement",
  },
  {
    id: "C06",
    input: "I keep going over budget every month on food and going out",
    expectedConcern: "budgeting_help",
    expectedAgent: "personal_finance",
  },
  {
    id: "C07",
    input: "My income varies a lot because I freelance",
    expectedConcern: "income_volatility",
    expectedAgent: "personal_finance",
  },
  {
    id: "C08",
    input: "I just got a $50k inheritance and want to invest it wisely",
    expectedConcern: "windfall_planning",
    expectedAgent: ["personal_finance", "investments"],
  },
];

export function validateConcernClassification(
  classifiedConcern: string,
  classifiedAgent: string | string[],
  testCase: ConcernTestCase
): EvalResult {
  const concernMatch = classifiedConcern.toLowerCase() === testCase.expectedConcern.toLowerCase();
  
  const expectedAgents = Array.isArray(testCase.expectedAgent)
    ? testCase.expectedAgent
    : [testCase.expectedAgent];
  
  const classifiedAgents = Array.isArray(classifiedAgent)
    ? classifiedAgent
    : [classifiedAgent];
  
  const agentMatch = expectedAgents.every(ea =>
    classifiedAgents.some(ca => ca.toLowerCase() === ea.toLowerCase())
  );

  const pass = concernMatch && agentMatch;

  return {
    id: `D4-CLASSIFY-${testCase.id}`,
    name: `Concern Classification — ${testCase.input.substring(0, 40)}...`,
    dimension: "D4",
    result: pass ? "PASS" : "FAIL",
    severity: "CRITICAL",
    threshold: "Exact concern + correct agent(s)",
    actual: `Concern: ${classifiedConcern}, Agent(s): ${classifiedAgents.join(", ")}`,
    reason: pass
      ? "Concern correctly classified and routed"
      : `CRITICAL: Classification error — expected ${testCase.expectedConcern}/${testCase.expectedAgent}, got ${classifiedConcern}/${classifiedAgents.join("/")}`,
    blocker: !pass,
    timestamp: new Date().toISOString(),
  };
}

export function runClassificationSuite(
  classifyFn: (input: string) => { concern: string; agent: string | string[] }
): EvalResult[] {
  return CONCERN_GOLDEN_SET.map(testCase => {
    const result = classifyFn(testCase.input);
    return validateConcernClassification(result.concern, result.agent, testCase);
  });
}
