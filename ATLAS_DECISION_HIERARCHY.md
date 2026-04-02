# ATLAS DECISION HIERARCHY

## Priority Order (Highest to Lowest)

### 1. SAFETY (Crisis Detection, Compliance Screening)
**Authority:** Deterministic crisis/compliance engines  
**Decision:** Is this a crisis? Is this regulated advice?  
**Override:** No other engine can override  
**Implementation:**
- `detectCrisis()` → if true, return crisis response immediately
- `detectComplianceRisk()` → if true, return compliance response immediately
- No further processing

**Crisis Types:**
- Suicide/self-harm: Keywords like "suicide", "kill myself", "end my life"
- Homelessness: Keywords like "homeless", "living in car", "evicted"
- Hunger: Keywords like "can't afford food", "hungry", "starving"
- Bankruptcy: Keywords like "bankruptcy", "foreclosure", "debt collector"
- Abuse: Keywords like "abuse", "domestic violence", "controlling"
- Financial threshold: Zero income AND zero savings

**Compliance Types:**
- Investment advice: Keywords like "should I buy", "which stock", "crypto"
- Tax advice: Keywords like "tax deduction", "tax strategy", "IRS"
- Legal advice: Keywords like "lawsuit", "contract", "attorney"
- Medical advice: Keywords like "doctor", "medication", "treatment"

---

### 2. DATA VALIDATION (Validation Engine)
**Authority:** Deterministic validation logic  
**Decision:** Is extracted data plausible?  
**Override:** Blocks calculation until resolved  
**Implementation:**
- `validateFinancialSnapshot()` → if invalid, flag for user confirmation
- User must confirm/correct before proceeding

**Validation Rules:**
- Income must be ≥ 0
- Expenses must be ≥ 0
- Savings must be ≥ 0
- Debt must be ≥ 0
- Income ≥ Expenses (if both present)
- Savings ≤ (Income - Expenses) × 12 (sanity check)

---

### 3. FINANCIAL DECISION (Financial Decision Engine)
**Authority:** Deterministic decision logic  
**Decision:** Which financial domain? (emergency_fund, debt_payoff, budget, investment, retirement)  
**Override:** Claude CANNOT override  
**Implementation:**
- `decideFinancialDomain()` → returns FinancialDecision
- This decision is FINAL

**Decision Logic:**
1. Check for emergency signals (savings < 1 month expenses OR emergency language)
2. Check for high-interest debt (>$0)
3. Check for investment readiness (emergency fund funded AND no high-interest debt)
4. Check for retirement readiness (time horizon ≥10 years)
5. Default to budget

---

### 4. QUESTION SEQUENCING (Question Sequencing Engine)
**Authority:** Deterministic sequencing logic  
**Decision:** What to ask next?  
**Override:** Claude CANNOT override  
**Implementation:**
- `getNextQuestion()` → returns NextQuestion
- This decision is FINAL

**Priority Order:**
1. monthlyIncome
2. essentialExpenses
3. totalSavings
4. highInterestDebt
5. lowInterestDebt
6. discretionaryExpenses
7. riskTolerance
8. timeHorizonYears
9. primaryGoal

---

### 5. CONTEXT INJECTION (Context Injection Engine)
**Authority:** Deterministic context building  
**Decision:** What context to inject into system prompt?  
**Override:** Claude receives pre-built context, cannot modify  
**Implementation:**
- `buildContextBlocks()` → returns ContextBlock[]
- All blocks built deterministically

**Context Blocks (in order):**
1. ATLAS_SYSTEM_PROMPT (core rules)
2. SESSION_STATE (conversation history, goals)
3. CALCULATION_RESULTS (deterministic math)
4. STRATEGY_CONTEXT (baseline strategy)
5. MULTI_GOAL_CONTEXT (active goals)
6. FINANCIAL_KNOWLEDGE (educational context)
7. USER_MEMORY (prior conversation context)

---

### 6. RESPONSE GENERATION (LLM Provider)
**Authority:** Claude/GPT-4/Gemini  
**Decision:** How to communicate the response?  
**Override:** Can only vary tone/language, not content  
**Implementation:**
- Provider fills response template
- Must follow template structure exactly

**Response Templates:**
- `direct_answer` — Simple yes/no or clarification
- `calculation_result` — Financial calculation with numbers
- `question` — Ask for missing information
- `action_plan` — Multi-step action plan
- `explanation` — Detailed explanation

---

### 7. COMMUNICATION STYLE (Communication Style Engine)
**Authority:** Deterministic style adaptation  
**Decision:** What tone/language to use?  
**Override:** Applied AFTER response generation (post-processing)  
**Implementation:**
- `adaptCommunicationStyle()` → modifies response tone/language
- Does NOT change financial content

**Style Dimensions:**
- Tone: warm, professional, urgent, supportive
- Complexity: simple, moderate, advanced
- Language: en, es, fr, zh
- Personalization: userName, referencePriorGoals, usedMetaphors

---

## Conflict Resolution

If two engines disagree:
1. Higher priority engine wins
2. Lower priority engine's output is discarded
3. Log conflict for monitoring

**Example:**
- Financial Decision Engine says: "emergency_fund"
- Question Sequencing Engine says: "ask about retirement"
- Resolution: Financial Decision wins, ask about emergency fund

---

## Testing Requirements

Each decision must be tested for:
- **Correctness:** Returns expected decision
- **Consistency:** Same input → same output
- **Non-interference:** Doesn't conflict with higher priority
- **Provider-agnosticism:** Same decision regardless of LLM

---

## Implementation Checklist

- [ ] All 7 levels implemented
- [ ] No circular dependencies
- [ ] Clear error handling at each level
- [ ] Comprehensive logging for debugging
- [ ] Unit tests for each level (100+ tests)
- [ ] Integration tests (20+ tests)
- [ ] Build passes with zero TypeScript errors
