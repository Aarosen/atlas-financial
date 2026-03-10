# Atlas Phase 1a Sprint Breakdown

**Version:** 1.0  
**Status:** Sprint Ready  
**Date:** 2026-03-10  
**Duration:** 3 weeks  
**Team Size:** 1-2 engineers

---

## Success Metric

**Phase 1a is successful when:**

Percentage of budgeting/affordability answers whose numeric claims come 100% from deterministic tools and pass self-check validation approaches **100%**.

Not "did it answer nicely." Success is **numeric truth from tools, always**.

---

## Week 1: Foundation (Types, Profile, Parsing)

### Task 1.1: Core Type Definitions

**Module:** `src/lib/reasoning/types/index.ts`

**Owner:** Lead Engineer

**Dependencies:** None

**Done Criteria:**
- [ ] All 5 type files created (FinancialProfile, DataReliability, ToolOutput, Decision, DecisionTrace)
- [ ] TypeScript compilation passes
- [ ] All types exported from index.ts
- [ ] No `any` types (use strict typing)

**Tests Required:**
- [ ] Type compilation tests
- [ ] Type narrowing tests (e.g., FieldValue<T> generic)

**Estimated Time:** 4 hours

**Files to Create:**
```
src/lib/reasoning/types/
├── FinancialProfile.ts
├── DataReliability.ts
├── ToolOutput.ts
├── Decision.ts
├── DecisionTrace.ts
└── index.ts
```

---

### Task 1.2: Financial Profile Manager

**Module:** `src/lib/reasoning/profile/FinancialProfileManager.ts`

**Owner:** Lead Engineer

**Dependencies:** Task 1.1 (types)

**Done Criteria:**
- [ ] `createEmpty(userId)` creates valid empty profile
- [ ] `updateField(profile, fieldPath, value)` updates with validation
- [ ] `validate(profile)` checks required fields
- [ ] All field updates preserve metadata (confidence, source, timestamp)
- [ ] Completeness tracking updates automatically

**Tests Required:**
- [ ] Create empty profile
- [ ] Update single field
- [ ] Update nested field (e.g., fixedExpenses.rent)
- [ ] Validate complete profile
- [ ] Validate incomplete profile
- [ ] Completeness score calculation
- [ ] Decision readiness detection

**Estimated Time:** 6 hours

**Test Coverage Target:** 100%

---

### Task 1.3: Input Parser

**Module:** `src/lib/reasoning/reliability/InputParser.ts`

**Owner:** Engineer 2

**Dependencies:** Task 1.1 (types)

**Done Criteria:**
- [ ] Parse monthly income ("$5,200")
- [ ] Parse annual income ("$62,400") and convert
- [ ] Parse biweekly income ("$2,600 biweekly") and convert
- [ ] Detect gross vs net ("take home $3,900")
- [ ] Detect provisional ("about", "roughly", "approximately")
- [ ] Detect ranges ("between $4,500 and $5,500")
- [ ] Extract expense amounts
- [ ] Extract debt information
- [ ] Extract asset amounts

**Tests Required:**
- [ ] Parse monthly income
- [ ] Parse annual income (verify conversion)
- [ ] Parse biweekly income (verify conversion)
- [ ] Detect gross vs net
- [ ] Detect provisional data
- [ ] Parse ranges (verify midpoint)
- [ ] Parse multiple expenses in one message
- [ ] Handle edge cases (zero, negative, very large)

**Estimated Time:** 8 hours

**Test Coverage Target:** 100%

---

### Task 1.4: Confidence Scorer

**Module:** `src/lib/reasoning/reliability/ConfidenceScorer.ts`

**Owner:** Engineer 2

**Dependencies:** Task 1.1 (types), Task 1.3 (InputParser)

**Done Criteria:**
- [ ] Base confidence by source (user_provided: 90, inferred: 60, derived: 40)
- [ ] Provisional modifier (-20 for "about", "roughly")
- [ ] Range modifier (-15 for ranges)
- [ ] Recency modifier (fresh: 0, 1 month: -5, 3 months: -15, >3 months: -30)
- [ ] Source detail modifier (+10 for "W2", -20 for "memory")
- [ ] Final confidence capped 0-100

**Tests Required:**
- [ ] User provided + confirmed = 90
- [ ] User provided + estimate = 75
- [ ] Provisional modifier applied correctly
- [ ] Range modifier applied correctly
- [ ] Recency modifiers applied correctly
- [ ] Source detail modifiers applied correctly
- [ ] Final score capped at 100
- [ ] Final score floored at 0

**Estimated Time:** 4 hours

**Test Coverage Target:** 100%

---

### Week 1 Deliverable

- ✅ Type system complete and tested
- ✅ Profile manager working
- ✅ Input parser handles all common formats
- ✅ Confidence scoring deterministic and testable
- ✅ All Week 1 tests passing
- ✅ Ready for Week 2 tools

---

## Week 2: Tools & Decisions (Deterministic Logic)

### Task 2.1: calculateMonthlySurplus Tool

**Module:** `src/lib/reasoning/tools/calculateMonthlySurplus.ts`

**Owner:** Lead Engineer

**Dependencies:** Task 1.1 (types)

**Done Criteria:**
- [ ] Validates income present (gross or net)
- [ ] Sums fixed expenses
- [ ] Sums variable expenses (with defaults if missing)
- [ ] Calculates surplus = income - total expenses
- [ ] Returns ToolResult with confidence score
- [ ] Fails safely if income missing
- [ ] Documents all assumptions

**Tests Required:**
- [ ] Happy path: all data provided
- [ ] Missing gross income (use net)
- [ ] Missing net income (use gross)
- [ ] Missing both incomes → error
- [ ] Missing rent → error
- [ ] Variable expenses missing → use defaults
- [ ] Negative surplus
- [ ] Zero surplus
- [ ] Confidence calculation correct
- [ ] Assumptions documented

**Estimated Time:** 4 hours

**Test Coverage Target:** 100%

---

### Task 2.2: calculateEmergencyFundTarget Tool

**Module:** `src/lib/reasoning/tools/calculateEmergencyFundTarget.ts`

**Owner:** Engineer 2

**Dependencies:** Task 1.1 (types), Task 2.1 (calculateMonthlySurplus)

**Done Criteria:**
- [ ] Calculates monthly expenses
- [ ] Applies stability rules (stable: 3mo, unstable: 6mo)
- [ ] Adds 1 month per dependent
- [ ] Calculates target = monthly_expenses × months
- [ ] Calculates shortfall
- [ ] Returns status (healthy/low/critical)
- [ ] Fails safely if expenses missing

**Tests Required:**
- [ ] Stable employment: 3 months
- [ ] Unstable employment: 6 months
- [ ] With dependents: +1 month each
- [ ] Missing expenses → error
- [ ] Healthy status (current ≥ target)
- [ ] Low status (current ≥ 50% target)
- [ ] Critical status (current < 50% target)
- [ ] Shortfall calculation correct

**Estimated Time:** 3 hours

**Test Coverage Target:** 100%

---

### Task 2.3: checkAffordability Tool

**Module:** `src/lib/reasoning/tools/checkAffordability.ts`

**Owner:** Engineer 2

**Dependencies:** Task 1.1 (types), Task 2.1 (calculateMonthlySurplus)

**Done Criteria:**
- [ ] Takes proposed expense as input
- [ ] Calculates remaining surplus
- [ ] Calculates DTI after expense
- [ ] Applies affordability rules (safe/moderate/risky/dangerous)
- [ ] Checks emergency fund status (blocks if critical)
- [ ] Returns reason for decision
- [ ] Fails safely if surplus calculation fails

**Tests Required:**
- [ ] Affordable (>10% remaining)
- [ ] Moderate (5-10% remaining)
- [ ] Risky (<5% remaining)
- [ ] Dangerous (DTI > 50%)
- [ ] Emergency fund critical → blocks
- [ ] Emergency fund low → warning
- [ ] DTI calculation correct
- [ ] Risk level assignment correct

**Estimated Time:** 4 hours

**Test Coverage Target:** 100%

---

### Task 2.4: Budgeting Decision Flow

**Module:** `src/lib/reasoning/decisions/BudgetingDecision.ts`

**Owner:** Lead Engineer

**Dependencies:** Task 1.1 (types), Task 2.1, Task 2.2 (tools)

**Done Criteria:**
- [ ] Checks blocking fields (income, rent)
- [ ] Calculates surplus
- [ ] If negative: decision = "no" (spending > income)
- [ ] If positive: checks emergency fund
- [ ] If fund gap: decision = "yes" (build fund first)
- [ ] If fund healthy: decision = "yes" (balanced approach)
- [ ] Returns rules triggered
- [ ] Returns next steps

**Tests Required:**
- [ ] Missing income → defer
- [ ] Missing rent → defer
- [ ] Negative surplus → no
- [ ] Emergency fund gap → yes (with allocation)
- [ ] Healthy budget → yes (with options)
- [ ] Rules triggered documented
- [ ] Next steps clear and actionable

**Estimated Time:** 4 hours

**Test Coverage Target:** 100%

---

### Task 2.5: Affordability Decision Flow

**Module:** `src/lib/reasoning/decisions/AffordabilityDecision.ts`

**Owner:** Engineer 2

**Dependencies:** Task 1.1 (types), Task 2.2, Task 2.3 (tools)

**Done Criteria:**
- [ ] Checks blocking fields (income, rent, debt, emergency fund)
- [ ] Checks emergency fund status (critical → block)
- [ ] Calls checkAffordability tool
- [ ] If not affordable: decision = "no"
- [ ] If affordable: decision = "yes"
- [ ] Returns risk level
- [ ] Returns remaining surplus
- [ ] Returns next steps

**Tests Required:**
- [ ] Missing income → defer
- [ ] Emergency fund critical → no
- [ ] Not affordable → no (with alternatives)
- [ ] Affordable → yes (with risk level)
- [ ] Moderate risk → yes (with warning)
- [ ] Risk level assignment correct
- [ ] Alternatives suggested

**Estimated Time:** 4 hours

**Test Coverage Target:** 100%

---

### Task 2.6: Self-Check Validator

**Module:** `src/lib/reasoning/validation/SelfCheckValidator.ts`

**Owner:** Lead Engineer

**Dependencies:** Task 1.1 (types)

**Done Criteria:**
- [ ] Check 1: Decision consistency (explanation matches result)
- [ ] Check 2: Math accuracy (numbers match tool outputs)
- [ ] Check 3: Safety rules (no unsafe recommendations)
- [ ] Check 4: Missing data handling (acknowledged if relevant)
- [ ] Check 5: Tone consistency (matches risk level)
- [ ] Returns passed/failed status
- [ ] Returns detailed issues if failed

**Tests Required:**
- [ ] Decision consistency check passes
- [ ] Decision consistency check fails (contradiction)
- [ ] Math accuracy check passes
- [ ] Math accuracy check fails (wrong numbers)
- [ ] Safety rules check passes
- [ ] Safety rules check fails (unsafe pattern)
- [ ] Missing data check passes
- [ ] Missing data check fails (not acknowledged)
- [ ] Tone check passes
- [ ] Tone check fails (mismatch)

**Estimated Time:** 3 hours

**Test Coverage Target:** 100%

---

### Week 2 Deliverable

- ✅ 3 tools fully implemented and tested
- ✅ 2 decision flows fully implemented and tested
- ✅ Self-check validation working
- ✅ All Week 2 tests passing (100% coverage)
- ✅ Ready for Week 3 integration

---

## Week 3: Integration & Deployment

### Task 3.1: ReasoningEngine Orchestrator

**Module:** `src/lib/reasoning/ReasoningEngine.ts`

**Owner:** Lead Engineer

**Dependencies:** All Week 1 & Week 2 tasks

**Done Criteria:**
- [ ] `reason(request)` orchestrates full flow
- [ ] Calls InputParser → ConfidenceScorer → ProfileManager
- [ ] Calls appropriate tools based on decision type
- [ ] Calls decision engine
- [ ] Creates ExplanationInput for Claude
- [ ] Validates response against contract
- [ ] Writes trace log
- [ ] Returns ReasoningResponse

**Tests Required:**
- [ ] Full flow: input → decision → explanation
- [ ] Missing data → next question
- [ ] Error handling (tool failure)
- [ ] Trace log generation
- [ ] Response validation

**Estimated Time:** 6 hours

**Test Coverage Target:** 100%

---

### Task 3.2: Decision Trace Log Writer

**Module:** `src/lib/reasoning/trace/DecisionTraceLogWriter.ts`

**Owner:** Engineer 2

**Dependencies:** Task 1.1 (types)

**Done Criteria:**
- [ ] Append-only JSONL format
- [ ] Write trace log to file
- [ ] Read trace log by ID
- [ ] Query trace logs by decision type
- [ ] Query trace logs by confidence range

**Tests Required:**
- [ ] Write single trace
- [ ] Read trace by ID
- [ ] Query by decision type
- [ ] Query by confidence
- [ ] File format valid JSON lines

**Estimated Time:** 3 hours

**Test Coverage Target:** 100%

---

### Task 3.3: Claude Explanation Adapter

**Module:** `src/lib/reasoning/explanation/ExplanationAdapter.ts`

**Owner:** Engineer 2

**Dependencies:** Task 1.1 (types), Task 3.1 (ReasoningEngine)

**Done Criteria:**
- [ ] Creates ExplanationInput from decision
- [ ] Calls Claude with strict contract
- [ ] Validates explanation against contract
- [ ] Returns explanation or fallback
- [ ] Logs contract violations

**Tests Required:**
- [ ] ExplanationInput creation correct
- [ ] Claude call with correct prompt
- [ ] Explanation validation passes
- [ ] Explanation validation fails (contract violation)
- [ ] Fallback explanation generated

**Estimated Time:** 4 hours

**Test Coverage Target:** 100%

---

### Task 3.4: Feature Flag Route

**Module:** `app/api/reasoning/route.ts`

**Owner:** Lead Engineer

**Dependencies:** Task 3.1, Task 3.3

**Done Criteria:**
- [ ] New route `/api/reasoning`
- [ ] Feature flag: `ENABLE_PHASE_1A_REASONING`
- [ ] Only handles budgeting/affordability questions
- [ ] Falls back to current chat flow for other questions
- [ ] Returns ReasoningResponse
- [ ] Logs all requests for analysis

**Tests Required:**
- [ ] Budgeting question → reasoning engine
- [ ] Affordability question → reasoning engine
- [ ] Other question → fallback to chat
- [ ] Feature flag disabled → fallback
- [ ] Request logging working

**Estimated Time:** 3 hours

**Test Coverage Target:** 100%

---

### Task 3.5: Integration Tests

**Module:** `src/lib/reasoning/__tests__/integration.test.ts`

**Owner:** Both engineers

**Dependencies:** All previous tasks

**Done Criteria:**
- [ ] End-to-end test: input → decision → explanation
- [ ] Test with real user scenarios
- [ ] Test error paths
- [ ] Test trace log generation
- [ ] Test contract validation

**Tests Required:**
- [ ] Budgeting scenario: negative surplus
- [ ] Budgeting scenario: emergency fund gap
- [ ] Affordability scenario: safe
- [ ] Affordability scenario: risky
- [ ] Missing data → next question
- [ ] Error handling

**Estimated Time:** 4 hours

**Test Coverage Target:** 100%

---

### Task 3.6: Documentation & Deployment

**Module:** Documentation

**Owner:** Lead Engineer

**Dependencies:** All tasks complete

**Done Criteria:**
- [ ] README for Phase 1a
- [ ] Feature flag documentation
- [ ] Trace log analysis guide
- [ ] Success metric dashboard setup
- [ ] Rollout plan documented

**Estimated Time:** 2 hours

---

### Week 3 Deliverable

- ✅ Full reasoning engine integrated
- ✅ Claude explanation adapter working
- ✅ Feature flag route deployed
- ✅ All integration tests passing
- ✅ Trace logs being generated
- ✅ Ready for controlled rollout

---

## Rollout Plan

### Phase 1a Rollout (Controlled)

**Week 4:**
1. Deploy with feature flag disabled
2. Verify no impact on current flow
3. Enable for 5% of budgeting/affordability questions
4. Monitor trace logs for errors
5. Check success metric: numeric truth %

**Week 5:**
1. If success metric > 95%: increase to 25%
2. If success metric < 90%: investigate failures
3. Monitor for contract violations
4. Collect user feedback

**Week 6:**
1. If success metric > 98%: increase to 100%
2. Full rollout for budgeting/affordability
3. Prepare Phase 2 (more decision types)

---

## Success Criteria Checklist

### Code Quality
- [ ] 100% test coverage on all tools
- [ ] 100% test coverage on all decision flows
- [ ] 100% test coverage on validation
- [ ] All TypeScript strict mode
- [ ] No `any` types
- [ ] No console.log in production code

### Functionality
- [ ] Every number traceable to tool output
- [ ] No invented calculations
- [ ] Missing data fails safely
- [ ] Trace logs generated for every decision
- [ ] Self-check validation working
- [ ] Claude contract enforced

### Metrics
- [ ] Numeric truth % approaches 100%
- [ ] Contract violations < 1%
- [ ] Tool errors < 0.1%
- [ ] Trace log completeness 100%

### Deployment
- [ ] Feature flag working
- [ ] Fallback to current chat working
- [ ] Monitoring/logging in place
- [ ] Rollout plan documented

---

## Risk Mitigation

### Risk: Claude violates contract

**Mitigation:**
- Strict contract validation before response
- Fallback explanation if validation fails
- Log all violations for analysis
- Test with adversarial prompts

### Risk: Tool calculation errors

**Mitigation:**
- 100% unit test coverage
- Edge case testing (zero, negative, large values)
- Validation of inputs before calculation
- Confidence scoring reflects data quality

### Risk: Missing data not handled

**Mitigation:**
- Tools return null if data missing
- Decision engine checks completeness
- Next question selection deterministic
- Test with incomplete profiles

### Risk: Trace logs incomplete

**Mitigation:**
- Trace log written before response
- Append-only format (immutable)
- Validation that trace is complete
- Monitoring for missing traces

---

## Team Coordination

### Daily Standup
- 15 minutes
- What did you complete?
- What's blocking you?
- What's next?

### Code Review
- All PRs require review
- Focus on: correctness, test coverage, contract compliance
- Merge only when tests pass

### Integration Points
- Week 1 → Week 2: Types must be stable
- Week 2 → Week 3: Tools must be tested
- Week 3: Integration tests verify everything works together

---

## Definition of Done

A task is done when:
1. Code written and reviewed
2. All tests passing (100% coverage)
3. No TypeScript errors
4. Documented (comments on complex logic)
5. Integrated with dependent tasks
6. Ready for next task

---

## Success Metric Dashboard

Track these metrics continuously:

```
Numeric Truth %: [target: 100%]
  = (decisions with all numbers from tools) / (total decisions)

Contract Violations: [target: <1%]
  = (Claude explanations violating contract) / (total explanations)

Tool Errors: [target: <0.1%]
  = (tool failures) / (tool calls)

Trace Log Completeness: [target: 100%]
  = (decisions with trace logs) / (total decisions)

Test Coverage: [target: 100%]
  = (lines covered by tests) / (total lines)
```

---

**Status:** Ready for implementation  
**Start Date:** Week of 2026-03-10  
**Expected Completion:** Week of 2026-03-31
