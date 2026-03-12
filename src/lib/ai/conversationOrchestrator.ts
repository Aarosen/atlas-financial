/**
 * Atlas Conversation Orchestrator
 * 
 * This is the missing wiring layer. It runs BEFORE every Claude API call
 * and injects session state, goal tracking, and missing field awareness
 * into the context — so Claude operates as a guide, not a stateless responder.
 *
 * DROP-IN REPLACEMENT for the chat handler in route.ts
 */

import { detectObjections, generateObjectionHandlingInstruction, type Objection } from './objectionHandlingEngine';
import { calculateFinancials, formatAffordabilityBlock, formatEmergencyFundBlock } from './financialCalculations';
import { formatDebtPayoffBlock } from './debtPayoffCalculations';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionPhase = 'greeting' | 'discovery' | 'analysis' | 'guidance' | 'action';

export type ConversationGoal =
  | 'affordability_check'
  | 'emergency_fund'
  | 'debt_payoff'
  | 'budget_build'
  | 'investment_start'
  | 'retirement_planning'
  | 'general_guidance'
  | 'unknown';

export interface FinancialProfile {
  monthlyIncome?: number;
  essentialExpenses?: number;
  discretionaryExpenses?: number;
  totalSavings?: number;
  highInterestDebt?: number;
  lowInterestDebt?: number;
  monthlyDebtPayments?: number;
  primaryGoal?: 'stability' | 'growth' | 'flexibility' | 'wealth_building';
  timeHorizonYears?: number;
  riskTolerance?: 'cautious' | 'balanced' | 'growth';
  biggestConcern?: string;
  proposedPayment?: number; // For affordability checks: the payment amount being evaluated
}

export interface SessionState {
  goal: ConversationGoal;
  phase: SessionPhase;
  profile: FinancialProfile;
  missingFields: string[];
  openLoops: string[];
  turnCount: number;
  hasGreeted: boolean;
  urgencyLevel: 'calm' | 'advisory' | 'protective';
}

// ─── Goal Detection ───────────────────────────────────────────────────────────

const GOAL_PATTERNS: Array<{ goal: ConversationGoal; patterns: RegExp[] }> = [
  {
    goal: 'affordability_check',
    patterns: [
      /\bcan i afford\b/i,
      /\b(afford|afford to buy|afford to get)\b.*\b(car|house|apartment|rent|laptop|phone)\b/i,
      /\b(car|house|apartment)\b.*\bpayment\b/i,
    ],
  },
  {
    goal: 'emergency_fund',
    patterns: [
      /\bemergency fund\b/i,
      /\b(rainy day|safety net|cushion)\b/i,
      /\bhow much.*save.*emergency\b/i,
    ],
  },
  {
    goal: 'debt_payoff',
    patterns: [
      /\b(pay off|pay down|get out of)\b.*(debt|loan|credit card|student loan)\b/i,
      /\b(debt free|debt-free)\b/i,
      /\b(avalanche|snowball)\b/i,
    ],
  },
  {
    goal: 'budget_build',
    patterns: [
      /\b(budget|budgeting|track.*spending|where.*money.*going)\b/i,
      /\b(50.30.20|50\/30\/20)\b/i,
      /\bhow.*spend\b/i,
    ],
  },
  {
    goal: 'investment_start',
    patterns: [
      /\b(invest|investing|stock|etf|index fund|roth|401k|brokerage)\b/i,
      /\b(start investing|where to invest|how to invest)\b/i,
    ],
  },
  {
    goal: 'retirement_planning',
    patterns: [
      /\b(retire|retirement|fire|financial independence)\b/i,
      /\bhow.*retire\b/i,
      /\bwhen.*retire\b/i,
    ],
  },
];

export function detectGoal(
  messages: Array<{ role: string; content: string }>,
  existingGoal: ConversationGoal = 'unknown'
): ConversationGoal {
  // Don't override an established goal unless conversation clearly shifts
  if (existingGoal !== 'unknown' && existingGoal !== 'general_guidance') return existingGoal;

  const recentText = messages
    .slice(-4)
    .filter((m) => m.role === 'user')
    .map((m) => String(m.content || ''))
    .join(' ');

  for (const { goal, patterns } of GOAL_PATTERNS) {
    if (patterns.some((p) => p.test(recentText))) return goal;
  }

  return existingGoal === 'unknown' ? 'general_guidance' : existingGoal;
}

// ─── Required Fields Per Goal ─────────────────────────────────────────────────

const REQUIRED_FIELDS: Record<ConversationGoal, Array<keyof FinancialProfile>> = {
  affordability_check: ['monthlyIncome', 'essentialExpenses'],
  emergency_fund: ['monthlyIncome', 'essentialExpenses', 'totalSavings'],
  debt_payoff: ['monthlyIncome', 'essentialExpenses', 'highInterestDebt', 'monthlyDebtPayments'],
  budget_build: ['monthlyIncome', 'essentialExpenses', 'discretionaryExpenses'],
  investment_start: ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'highInterestDebt'],
  retirement_planning: ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'timeHorizonYears'],
  general_guidance: ['monthlyIncome'],
  unknown: [],
};

const FIELD_LABELS: Record<keyof FinancialProfile, string> = {
  monthlyIncome: 'monthly take-home income',
  essentialExpenses: 'monthly essential expenses (rent, utilities, groceries)',
  discretionaryExpenses: 'monthly discretionary spending',
  totalSavings: 'total savings',
  highInterestDebt: 'high-interest debt balance',
  lowInterestDebt: 'low-interest debt balance',
  monthlyDebtPayments: 'monthly debt payments',
  primaryGoal: 'primary financial goal',
  timeHorizonYears: 'time horizon',
  riskTolerance: 'risk tolerance',
  biggestConcern: 'biggest financial concern',
  proposedPayment: 'proposed payment amount',
};

export function getMissingFields(goal: ConversationGoal, profile: FinancialProfile): string[] {
  const required = REQUIRED_FIELDS[goal] || [];
  return required
    .filter((field) => profile[field] === undefined || profile[field] === null)
    .map((field) => FIELD_LABELS[field]);
}

// ─── Phase Detection ──────────────────────────────────────────────────────────

export function detectPhase(
  turnCount: number,
  missingFields: string[],
  profile: FinancialProfile,
  goal: ConversationGoal
): SessionPhase {
  if (turnCount === 0) return 'greeting';
  if (missingFields.length > 0) return 'discovery';

  // All required fields are known
  const hasCalculable =
    (profile.monthlyIncome ?? 0) > 0 && (profile.essentialExpenses ?? 0) > 0;

  if (!hasCalculable) return 'discovery';
  if (goal === 'general_guidance') return 'guidance';
  return 'analysis';
}

// ─── Session State Block Builder ──────────────────────────────────────────────
// This is injected into every Claude call so the model has full situational
// awareness — not amnesia. This is the core fix.

export function buildSessionStateBlock(state: SessionState): string {
  const profileLines = Object.entries(state.profile)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  const profileSection = profileLines
    ? `KNOWN FINANCIAL PROFILE:\n${profileLines}`
    : 'KNOWN FINANCIAL PROFILE: none yet — still gathering';

  const missingSection =
    state.missingFields.length > 0
      ? `MISSING (ask for these in order, one at a time):\n${state.missingFields.map((f, i) => `  ${i + 1}. ${f}`).join('\n')}`
      : 'MISSING: none — you have enough data to calculate and guide';

  const loopSection =
    state.openLoops.length > 0
      ? `OPEN LOOPS (topics raised but not resolved):\n${state.openLoops.map((l) => `  - ${l}`).join('\n')}`
      : '';

  return `
━━━ ATLAS SESSION STATE ━━━
GOAL: ${state.goal.replace(/_/g, ' ')}
PHASE: ${state.phase.toUpperCase()}
TURN: ${state.turnCount}
URGENCY: ${state.urgencyLevel}

${profileSection}

${missingSection}
${loopSection ? '\n' + loopSection : ''}

PHASE INSTRUCTIONS:
${getPhaseInstructions(state.phase, state.missingFields, state.goal)}
━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
}

function getPhaseInstructions(
  phase: SessionPhase,
  missingFields: string[],
  goal: ConversationGoal
): string {
  switch (phase) {
    case 'greeting':
      return 'Open warmly. Ask ONE grounding question to understand what brought them here today. Do not ask for numbers yet.';
    case 'discovery':
      return `Ask for the first missing field only: "${missingFields[0]}". Keep it conversational and warm. Accept approximate values.`;
    case 'analysis':
      return `You have enough data. Run the calculation for ${goal.replace(/_/g, ' ')}. Show specific numbers, not ranges. Then offer one next step and one scenario.`;
    case 'guidance':
      return 'Provide a clear recommendation with a single action and concrete amount/cadence. End with one follow-up question that deepens understanding.';
    case 'action':
      return 'Confirm the action plan. Summarize what was decided. Propose the single most important next move.';
    default:
      return 'Continue the conversation naturally.';
  }
}

// ─── Open Loop Tracker ────────────────────────────────────────────────────────

const LOOP_TRIGGERS = [
  /\bwhat about\b/i,
  /\bI also\b/i,
  /\boh and\b/i,
  /\bone more thing\b/i,
  /\bby the way\b/i,
];

export function detectOpenLoops(
  messages: Array<{ role: string; content: string }>,
  existingLoops: string[]
): string[] {
  const recentUser = messages
    .slice(-2)
    .filter((m) => m.role === 'user')
    .map((m) => String(m.content || ''));

  const newLoops = recentUser
    .filter((msg) => LOOP_TRIGGERS.some((p) => p.test(msg)))
    .map((msg) => msg.slice(0, 60).trim());

  // Deduplicate
  return Array.from(new Set([...existingLoops, ...newLoops])).slice(0, 3);
}

// ─── Urgency Detection ────────────────────────────────────────────────────────

export function detectUrgency(
  profile: FinancialProfile,
  messages: Array<{ role: string; content: string }>
): 'calm' | 'advisory' | 'protective' {
  const income = profile.monthlyIncome ?? 0;
  const essential = profile.essentialExpenses ?? 0;
  const hiDebt = profile.highInterestDebt ?? 0;
  const savings = profile.totalSavings ?? 0;

  // Protective: negative cashflow or can't cover essentials
  if (income > 0 && essential > 0 && essential >= income * 0.95) return 'protective';

  // Advisory: significant high-interest debt with low savings
  if (hiDebt > income * 3 && savings < income) return 'advisory';

  // Protective signals in message text
  const lastMsg = String(messages.slice(-1)[0]?.content || '').toLowerCase();
  if (/can't pay|can not pay|behind on|eviction|shut off|collections|paycheck to paycheck/i.test(lastMsg)) {
    return 'protective';
  }

  return 'calm';
}

// ─── Objection Handling ───────────────────────────────────────────────────────

function buildObjectionBlock(detectedObjections: Objection[], userMessage: string): string {
  if (detectedObjections.length === 0) return '';

  let block = '\n━━━ PSYCHOLOGICAL BARRIER DETECTED ━━━\n';
  block += 'The user is expressing a concern or objection. Address this BEFORE asking for more data.\n\n';

  for (const objection of detectedObjections.slice(0, 2)) {
    // Only address top 2 objections
    block += `**${objection.concern}**\n`;
    block += `Response: ${objection.proactiveResponse}\n\n`;
  }

  block += 'INSTRUCTION: Acknowledge the objection by name, reframe with one CONCRETE counterexample (specific number, timeframe, or method), then ask ONE follow-up question.\n';
  block += 'Do NOT use generic encouragement like "you can do this" or "I believe in you."\n';
  block += 'Do NOT ask for data before addressing the objection — it will feel tone-deaf.\n';
  
  // Add specific instruction for this objection type
  block += generateObjectionHandlingInstruction(detectedObjections);
  
  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export interface OrchestratorInput {
  messages: Array<{ role: string; content: string }>;
  financialProfile: FinancialProfile;
  previousState?: Partial<SessionState>;
}

export interface OrchestratorOutput {
  sessionStateBlock: string;       // Inject this into the system prompt
  missingFields: string[];         // Pass as `missing` to the prompt template
  state: SessionState;             // Store this client-side for next turn
  shouldCalculate: boolean;        // True when ready to show numbers
  objectionBlock?: string;         // Inject if objections detected
  detectedObjections?: Objection[]; // For logging/analysis
  calculationBlock?: string;       // Inject pre-calculated financial metrics
}

export function orchestrate(input: OrchestratorInput): OrchestratorOutput {
  const { messages, financialProfile, previousState } = input;

  const turnCount = messages.filter((m) => m.role === 'user').length;
  const goal = detectGoal(messages, previousState?.goal ?? 'unknown');
  const missingFields = getMissingFields(goal, financialProfile);
  const phase = detectPhase(turnCount, missingFields, financialProfile, goal);
  const openLoops = detectOpenLoops(messages, previousState?.openLoops ?? []);
  const urgencyLevel = detectUrgency(financialProfile, messages);

  // Detect objections in the last user message
  const lastUserMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === 'user')?.content || '';
  const detectedObjections = detectObjections(lastUserMessage);

  const state: SessionState = {
    goal,
    phase,
    profile: financialProfile,
    missingFields,
    openLoops,
    turnCount,
    hasGreeted: turnCount > 0,
    urgencyLevel,
  };

  const sessionStateBlock = buildSessionStateBlock(state);
  const shouldCalculate = missingFields.length === 0 && phase !== 'greeting';

  // Build objection block if objections detected
  let objectionBlock: string | undefined;
  if (detectedObjections.length > 0) {
    objectionBlock = buildObjectionBlock(detectedObjections, lastUserMessage);
  }

  // Run deterministic calculations if we have enough data
  let calculationBlock: string | undefined;
  if (shouldCalculate) {
    const calculations = calculateFinancials(financialProfile, goal);
    
    if (calculations.affordability) {
      calculationBlock = formatAffordabilityBlock(calculations.affordability);
    } else if (calculations.emergencyFund) {
      calculationBlock = formatEmergencyFundBlock(calculations.emergencyFund);
    } else if (calculations.debtPayoff) {
      calculationBlock = formatDebtPayoffBlock(calculations.debtPayoff);
    }
  }

  return { sessionStateBlock, missingFields, state, shouldCalculate, objectionBlock, detectedObjections, calculationBlock };
}
