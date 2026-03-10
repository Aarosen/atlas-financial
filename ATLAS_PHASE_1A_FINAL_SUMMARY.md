# Atlas Phase 1a: Final Implementation Summary

**Version:** 1.0  
**Status:** Ready for Implementation  
**Date:** 2026-03-10  
**Duration:** 3 weeks  
**Team:** 1-2 engineers

---

## What Phase 1a Accomplishes

Atlas transitions from **AI advice bot** to **AI-powered financial reasoning system**.

### Before Phase 1a
- LLM generates responses with no structured logic
- Math errors possible (Claude miscalculates)
- Context fragile (conversation reconstruction)
- No auditability (no trace of reasoning)
- Unsafe recommendations possible (no guardrails)

### After Phase 1a
- ✅ Deterministic math (tools never guess)
- ✅ Structured financial state (canonical profile)
- ✅ Rule-based decisions (transparent logic)
- ✅ Immutable trace logs (full auditability)
- ✅ Safety guardrails (blocks unsafe recommendations)
- ✅ Contract-validated explanations (Claude constrained)

---

## Architecture Overview

```
User Input
    ↓
Parse & Normalize (Data Reliability Layer)
    ↓
Canonical Financial Profile (single source of truth)
    ↓
Deterministic Tools (3 core: surplus, emergency fund, affordability)
    ↓
Decision Engine (2 flows: budgeting, affordability)
    ↓
Safety Guardrails (block unsafe recommendations)
    ↓
Decision Confidence Scoring (expose decision quality)
    ↓
Numeric Claim Extraction (catch invented numbers)
    ↓
Claude Explanation (structured prompts, constrained)
    ↓
Self-Check Validation (math + consistency + safety)
    ↓
Decision Trace Log (immutable audit trail)
    ↓
Response to User
```

---

## Core Modules

### Week 1: Foundation

| Task | Module | Owner | Time | Tests |
|------|--------|-------|------|-------|
| 1.1 | Core Types | Lead | 4h | Compilation |
| 1.2 | ProfileManager | Lead | 6h | Create/update/validate |
| 1.3 | InputParser | Eng2 | 8h | Parse all formats |
| 1.4 | ConfidenceScorer | Eng2 | 4h | Score calculation |

**Deliverable:** Type system, profile management, input parsing

### Week 2: Tools & Decisions

| Task | Module | Owner | Time | Tests |
|------|--------|-------|------|-------|
| 2.1 | calculateMonthlySurplus | Lead | 4h | Happy path + edge cases |
| 2.2 | calculateEmergencyFundTarget | Eng2 | 3h | Stability rules |
| 2.3 | checkAffordability | Eng2 | 4h | Risk levels |
| 2.4 | BudgetingDecision | Lead | 4h | All decision paths |
| 2.5 | AffordabilityDecision | Eng2 | 4h | All decision paths |
| 2.6 | SelfCheckValidator | Lead | 3h | All validation checks |
| 2.7 | NumericClaimExtractor | Eng2 | 3h | Extract & verify numbers |
| 2.8 | DecisionConfidence | Lead | 2h | Confidence scoring |
| 2.9 | SafetyGuardrails | Eng2 | 3h | Guardrail application |

**Deliverable:** All tools, decisions, validation, safety

### Week 3: Integration & Deployment

| Task | Module | Owner | Time | Tests |
|------|--------|-------|------|-------|
| 3.1 | ReasoningEngine | Lead | 6h | Full flow |
| 3.2 | TraceLogWriter | Eng2 | 3h | Write/read/query |
| 3.3 | ClaudeAdapter | Eng2 | 4h | Structured prompts |
| 3.4 | FeatureFlagRoute | Lead | 3h | Shadow mode + rollout |
| 3.5 | IntegrationTests | Both | 4h | End-to-end scenarios |
| 3.6 | Documentation | Lead | 2h | README + guides |

**Deliverable:** Full system integrated, ready for rollout

---

## Three Non-Negotiables

### 1. Tool outputs are the source of numeric truth

**Rule:** Every number shown to user must map to:
- Profile field, OR
- Tool output

**Never:** Claude recomputes values independently

**Enforcement:** NumericClaimExtractor catches invented numbers

### 2. Missing data fails safely

**Rule:** If tool cannot compute:
- Return status: incomplete
- List missing required fields
- No guessed numbers

**Never:** Invent data or proceed with incomplete information

**Enforcement:** Tools return null + required fields if data missing

### 3. Trace logs present in every path

**Rule:** Every deterministic decision generates trace log

**Never:** Make tracing optional

**Enforcement:** Trace written before response, append-only format

---

## Five Production Safety Corrections

### 1. NumericClaimExtractor

**What:** Extracts every number from Claude output, verifies against tool results

**Why:** Catches subtle LLM drift ("about $1,000" when tool said $1,127)

**How:** Regex patterns, normalization, tolerance checking

**Test:** Extract $1,200, 1200, 1.2k formats; verify against tool results

### 2. Decision Confidence Scoring

**What:** Exposes decision quality (high/medium/low)

**Why:** Users should know if decision is based on complete or estimated data

**How:** Score from profile completeness + data reliability + tool assumptions

**Test:** High confidence (complete data), Medium (some estimates), Low (missing data)

### 3. Safety Guardrails

**What:** Hard caps on unsafe recommendations

**Why:** Blocks recommendations even if decision engine misfires

**How:** Rules like "DTI > 50% → block", "surplus < 5% → downgrade"

**Test:** Trigger guardrails, verify decision downgraded/blocked

### 4. Shadow Mode Rollout

**What:** Run reasoning engine without showing output

**Why:** Safe baseline comparison before user exposure

**How:** Phase 0: 100% shadow, Phase 1: 5% visible, Phase 2: 25%, Phase 3: 100%

**Test:** Compare legacy vs reasoning responses, measure agreement

### 5. Simplified Claude Adapter

**What:** Send only structured decision data, not raw trace

**Why:** Constrains Claude, prevents invented logic

**How:** StructuredDecisionPrompt with numbers + rules + tone

**Test:** Claude receives structured input, generates explanation

---

## Success Metrics

### Numeric Truth (Critical)
```
Invented Numbers: 0%
All Numbers Traceable: 100%
```

### Decision Quality
```
High Confidence Decisions: >60%
Medium Confidence: 30-40%
Low Confidence: <10%
```

### Safety
```
Guardrails Triggered: <5%
Unsafe Recommendations Blocked: 100%
```

### Shadow Mode
```
Agreement Rate: >90%
Numeric Truth: 100%
Safety Score: 100%
```

### Code Quality
```
Test Coverage: 100%
TypeScript Strict: Yes
Contract Violations: 0%
```

---

## Rollout Schedule

### Phase 0: Shadow Mode (Week 4)
- 100% of users
- No user-facing output
- Compare legacy vs reasoning
- Measure agreement rate
- **Gate:** >90% agreement before proceeding

### Phase 1: 5% Visible (Week 4-5)
- 5% of budgeting/affordability questions
- Real users see reasoning output
- Monitor trace logs
- Measure numeric truth %
- **Gate:** >95% numeric truth before proceeding

### Phase 2: 25% Visible (Week 5)
- 25% of budgeting/affordability questions
- Monitor for contract violations
- Collect user feedback
- **Gate:** <1% contract violations before proceeding

### Phase 3: 100% Visible (Week 6)
- Full rollout for budgeting/affordability
- All other questions fall back to legacy chat
- Prepare Phase 2 (more decision types)

---

## File Structure

```
src/lib/reasoning/
├── types/
│   ├── FinancialProfile.ts
│   ├── DataReliability.ts
│   ├── ToolOutput.ts
│   ├── Decision.ts
│   ├── DecisionTrace.ts
│   └── index.ts
├── profile/
│   ├── FinancialProfileManager.ts
│   └── index.ts
├── reliability/
│   ├── InputParser.ts
│   ├── ConfidenceScorer.ts
│   └── index.ts
├── tools/
│   ├── calculateMonthlySurplus.ts
│   ├── calculateEmergencyFundTarget.ts
│   ├── checkAffordability.ts
│   └── index.ts
├── decisions/
│   ├── BudgetingDecision.ts
│   ├── AffordabilityDecision.ts
│   └── index.ts
├── validation/
│   ├── SelfCheckValidator.ts
│   ├── NumericClaimExtractor.ts
│   ├── SafetyGuardrails.ts
│   └── index.ts
├── trace/
│   ├── DecisionTraceLog.ts
│   └── index.ts
├── explanation/
│   ├── ExplanationAdapter.ts
│   └── index.ts
├── ReasoningEngine.ts
└── __tests__/
    ├── integration.test.ts
    └── (unit tests for each module)

app/api/
├── reasoning/
│   └── route.ts (feature flag route)
└── (existing routes)
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Read all specification documents
- [ ] Set up feature flag infrastructure
- [ ] Create monitoring dashboard
- [ ] Set up trace log storage

### Week 1
- [ ] Task 1.1: Core types (4h)
- [ ] Task 1.2: ProfileManager (6h)
- [ ] Task 1.3: InputParser (8h)
- [ ] Task 1.4: ConfidenceScorer (4h)
- [ ] All Week 1 tests passing
- [ ] Code review + merge

### Week 2
- [ ] Task 2.1-2.6: Tools, decisions, validation (26h)
- [ ] Task 2.7-2.9: Safety corrections (8h)
- [ ] All Week 2 tests passing
- [ ] Code review + merge

### Week 3
- [ ] Task 3.1-3.6: Integration (22h)
- [ ] All integration tests passing
- [ ] Feature flag working
- [ ] Documentation complete
- [ ] Code review + merge

### Week 4+
- [ ] Deploy with feature flag disabled
- [ ] Shadow mode: 100% of users
- [ ] Monitor agreement rate
- [ ] Visible rollout: 5% → 25% → 100%

---

## Key Decision Points

### Decision 1: Tool Calculation Tolerance
**Question:** How much rounding tolerance in numeric verification?
**Answer:** 5% tolerance for rounding, but flag if exceeded

### Decision 2: Confidence Thresholds
**Question:** What confidence scores trigger different behaviors?
**Answer:** High (≥80), Medium (60-79), Low (<60)

### Decision 3: Guardrail Severity
**Question:** Which guardrails block vs downgrade vs warn?
**Answer:** DTI >50% blocks, surplus <5% downgrades, DTI >43% warns

### Decision 4: Shadow Mode Duration
**Question:** How long to run shadow mode?
**Answer:** Until agreement rate >90%, minimum 1 week

### Decision 5: Fallback Strategy
**Question:** What happens if reasoning engine fails?
**Answer:** Return to legacy chat flow, log error, alert team

---

## Risk Mitigation

### Risk: Claude violates contract
**Mitigation:** NumericClaimExtractor catches invented numbers, fallback explanation

### Risk: Tool calculation errors
**Mitigation:** 100% unit test coverage, edge case testing, validation

### Risk: Missing data not handled
**Mitigation:** Tools return null, decision engine checks completeness

### Risk: Trace logs incomplete
**Mitigation:** Append-only format, validation before response

### Risk: Guardrails too aggressive
**Mitigation:** Shadow mode comparison, monitor false positives

---

## Documentation References

### Architecture
- `ATLAS_FINANCIAL_PROFILE_SCHEMA.md` — Canonical profile structure
- `ATLAS_DATA_RELIABILITY_LAYER.md` — Input parsing and confidence
- `ATLAS_MISSING_DATA_ORCHESTRATION.md` — Question prioritization
- `ATLAS_SCENARIO_SIMULATION_ENGINE.md` — Scenario analysis
- `ATLAS_DECISION_TRACE_LOG_SCHEMA.md` — Audit trail
- `ATLAS_COMPLETE_ARCHITECTURE.md` — End-to-end system

### Implementation
- `ATLAS_PHASE_1A_BUILD_SPEC.md` — Concrete engineering blueprint
- `ATLAS_PHASE_1A_SPRINT_BREAKDOWN.md` — Task-by-task execution
- `ATLAS_CLAUDE_EXPLANATION_CONTRACT.md` — Claude constraint contract
- `ATLAS_PHASE_1A_PRODUCTION_SAFETY.md` — Five safety corrections

---

## Success Criteria

**Phase 1a is successful when:**

1. ✅ 100% of numeric claims traceable to tools
2. ✅ 0% invented numbers in Claude output
3. ✅ 100% test coverage on all tools and decisions
4. ✅ >90% agreement in shadow mode
5. ✅ <1% contract violations in visible rollout
6. ✅ 100% of decisions have trace logs
7. ✅ All guardrails working correctly
8. ✅ Decision confidence scoring accurate

---

## Next Steps After Phase 1a

### Phase 1b: Decision Coverage Expansion
Add deterministic logic for:
1. Debt payoff strategy
2. Emergency fund planning
3. Debt vs investing comparison

### Phase 2: Scenario Simulation
Enable users to explore tradeoffs:
- "What if I get a raise?"
- "What if I move to a cheaper apartment?"
- "What if I pay off this debt?"

### Phase 3: Missing Data Orchestration
Smart question selection:
- Priority maps by decision type
- One-question follow-ups
- Graceful degradation

---

## Team Coordination

### Daily Standup (15 min)
- What did you complete?
- What's blocking you?
- What's next?

### Code Review
- All PRs require review
- Focus: correctness, test coverage, contract compliance
- Merge only when tests pass

### Integration Points
- Week 1 → Week 2: Types must be stable
- Week 2 → Week 3: Tools must be tested
- Week 3: Integration tests verify everything

---

## What Makes This Different

Most teams try to fix these problems with **prompts**.

Atlas is fixing them with **architecture**.

### Prompt-based approach (fragile)
```
"Please calculate the monthly surplus accurately"
→ Claude might still make math errors
```

### Architecture-based approach (reliable)
```
Tool: calculateMonthlySurplus()
→ Deterministic, testable, always correct
```

---

## The Bigger Picture

Phase 1a proves the backbone works:
- Deterministic math ✅
- Structured state ✅
- Rule-based decisions ✅
- Immutable audit trail ✅
- Safe explanations ✅

This foundation enables:
- **Phase 1b:** More decision types
- **Phase 2:** Scenario simulation
- **Phase 3:** Missing data orchestration
- **Phase 4:** Governance integration

By end of Phase 1b, Atlas will handle 80% of real financial decisions users ask.

---

## Final Checklist Before Implementation

- [ ] All team members read all specification documents
- [ ] Feature flag infrastructure ready
- [ ] Monitoring dashboard set up
- [ ] Trace log storage configured
- [ ] Test environment ready
- [ ] Code review process established
- [ ] Rollout schedule agreed
- [ ] Success metrics dashboard created
- [ ] Risk mitigation plan reviewed
- [ ] Go/no-go decision made

---

**Status:** Ready for implementation  
**Start Date:** Week of 2026-03-10  
**Expected Completion:** Week of 2026-03-31  
**Success Metric:** Numeric truth % → 100%

---

## Questions Before Starting?

1. **Team capacity:** Do you have 1-2 engineers available for 3 weeks?
2. **Feature flag:** Is feature flag infrastructure ready?
3. **Monitoring:** Can you set up trace log monitoring?
4. **Timeline:** Can you commit to the 3-week schedule?
5. **Rollout:** Is the shadow mode → visible rollout acceptable?

If all answers are yes, **you're ready to begin Phase 1a implementation.**
