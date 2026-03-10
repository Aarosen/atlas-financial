# Atlas Execution Readiness Checklist

**Version:** 1.0  
**Status:** Ready to Build  
**Date:** 2026-03-10

---

## Where Atlas Stands

### ✅ Layer 1: AI Governance (Complete)
- Eval suite with failure clustering
- Promotion/retirement pipeline
- Health scoring and portfolio balancing
- Governance gates and release dashboard
- Policy tuning and operating cadence

**Status:** Exceptional operational maturity

### ✅ Layer 2: Deterministic Reasoning Architecture (Complete)
- Financial profile schema
- Data reliability layer
- Decision engine with structured logic
- Claude explanation layer (constrained)
- Immutable trace logs

**Status:** High-reliability AI system design

### ✅ Layer 3: Safe Rollout Strategy (Complete)
- Shadow mode (100% of users, no exposure)
- Progressive visibility (5% → 25% → 100%)
- Success metrics (numeric truth %)
- Risk mitigation and fallback strategies

**Status:** Production-ready rollout plan

---

## The Biggest Execution Risk

**Not architecture. Not AI.**

**The biggest risk: Overbuilding before real user feedback.**

### The Trap
- 50+ profile fields
- Reliability layer
- Orchestration
- Simulation engine
- Decision trees
- Trace infrastructure

Users see: Heavy, complex, overwhelming

### The Solution
**Start with 6 fields:**
- Income
- Housing cost
- Debt payments
- Savings
- Monthly spending
- Dependents

**Ship one decision type:** "Can I afford this?"

**Everything else grows later.**

---

## The 10 Engineering Moves (Execution Sequence)

### Move 1: FinancialProfile v0 Schema
**Minimal profile with 6 fields only**
- Time: 1 hour
- Outcome: Lightweight, not heavy

### Move 2: InputParser
**Parse natural language into numbers**
- Time: 4 hours
- Outcome: Users can speak naturally

### Move 3: MonthlySurplus Tool
**Calculate income minus expenses**
- Time: 2 hours
- Outcome: Most important primitive

### Move 4: AffordabilityDecision
**Answer "Can I afford this?"**
- Time: 2 hours
- Outcome: Most common financial question

### Move 5: Trace Logs
**Immutable audit trail from day one**
- Time: 1 hour
- Outcome: Debugging accelerated

### Move 6: Shadow Mode
**Compare reasoning vs legacy chat**
- Time: 2 hours
- Outcome: Safe baseline before exposure

### Move 7: Trace Viewer
**Internal debug tool (/debug/trace/:id)**
- Time: 1 hour
- Outcome: Iteration accelerated

### Move 8: Confidence Field
**Make system honesty explicit**
- Time: 1 hour
- Outcome: Users know data quality

### Move 9: Friction Tracking
**Track where users struggle**
- Time: 2 hours
- Outcome: Inform next iterations

### Move 10: Ship Vertical Slice
**Deploy "Can I afford this?" with deterministic reasoning**
- Time: 2 hours
- Outcome: Prove architecture works

**Total: ~18 hours (1 week)**

---

## What Ships in Vertical Slice

### ✅ Ships
- InputParser (parse natural language)
- MonthlySurplus tool (calculate surplus)
- AffordabilityDecision (make decision)
- Trace logs (audit trail)
- Confidence field (honesty)
- Claude explanation (constrained)
- Shadow mode (no user exposure yet)

### ❌ Doesn't Ship Yet
- Budgeting decision
- Debt prioritization
- Scenario simulation
- Missing data orchestration
- Safety guardrails (v1 only)
- Goals tracker

---

## Success Metrics

### Numeric Truth (Critical)
```
Invented numbers: 0%
All numbers from tools: 100%
```

### Decision Consistency
```
Explanation matches decision: >99%
```

### Shadow Mode
```
Agreement with legacy: >90%
Numeric truth: 100%
Latency: <500ms
```

### User Friction
```
Abandoned flows: <10%
Vague answers: <20%
Contradictions: <5%
```

---

## Execution Timeline

### Week 1: Build Vertical Slice
- Day 1-2: Moves 1-3 (Profile, Parser, Surplus)
- Day 3: Move 4 (Affordability Decision)
- Day 4: Moves 5-7 (Trace logs, Shadow mode, Viewer)
- Day 5: Moves 8-10 (Confidence, Friction, Ship)

### Week 2: Shadow Mode Analysis
- Run 100% of users in shadow mode
- Measure agreement rate with legacy chat
- Identify friction points
- Fix bugs and edge cases
- Prepare for visible rollout

### Week 3: Visible Rollout (5%)
- Enable for 5% of affordability questions
- Monitor numeric truth %
- Monitor trace logs
- Collect user feedback
- Gate: >95% numeric truth before proceeding

---

## Pre-Implementation Checklist

### Code Setup
- [ ] Create `src/lib/reasoning/` directory structure
- [ ] Set up TypeScript strict mode
- [ ] Create test files for each module
- [ ] Set up feature flag infrastructure

### Infrastructure
- [ ] Trace log storage configured
- [ ] Shadow mode logging ready
- [ ] Monitoring dashboard set up
- [ ] Error alerting configured

### Team
- [ ] Team members read all specs
- [ ] Code review process established
- [ ] Daily standup scheduled
- [ ] Rollout decision maker identified

### Documentation
- [ ] README for reasoning engine
- [ ] Trace log format documented
- [ ] Feature flag usage documented
- [ ] Rollout schedule shared

---

## Key Principles for Execution

### 1. Start Small
Don't build the full system before shipping.
Build the smallest thing that proves the concept.

### 2. Ship Fast
Get real user feedback as quickly as possible.
Two weeks to vertical slice, not two months.

### 3. Iterate Based on Reality
What users actually do matters more than what you designed.
Be ready to adjust based on friction data.

### 4. Measure Everything
Numeric truth %, decision consistency, user friction.
Data drives decisions, not opinions.

### 5. Fail Safely
Shadow mode before visibility.
Trace logs for every decision.
Fallback to legacy chat if anything breaks.

---

## What Makes This Different

### Prompt-Based Approach (Fragile)
```
"Please calculate the monthly surplus accurately"
→ Claude might still make math errors
```

### Architecture-Based Approach (Reliable)
```
Tool: calculateMonthlySurplus()
→ Deterministic, testable, always correct
```

**Atlas is choosing the reliable approach.**

---

## The Honest Assessment

You've done something very rare:

**You treated AI product design like systems engineering, not prompt hacking.**

That is the correct mindset for fintech.

Now the real work begins: shipping the smallest reliable version.

---

## What Happens After Vertical Slice

### If Shadow Mode Agreement >90%
→ Proceed to visible rollout (5%)

### If Numeric Truth 100%
→ Expand to 25% of users

### If User Friction <10%
→ Expand to 100% of affordability questions

### Then Build Phase 1b
- Add budgeting decision
- Add emergency fund decision
- Add debt vs investing decision
- Expand to 3 decision types

### Then Build Phase 2 Features
- Clarity Cards (visual financial data)
- Scenario Comparison (side-by-side options)
- Goals Tracker (persistent engagement)

---

## The Biggest Opportunity

Once "Can I afford this?" is working reliably:

**Atlas can answer: "What happens if I do this?"**

That's where the scenario engine becomes powerful.

Users can explore:
- "What if I take a $700 car payment?"
- "What if I pay $300 extra toward debt?"
- "What if I move to a cheaper apartment?"

**That's when the product becomes special.**

---

## Final Checklist Before Starting

- [ ] Team capacity: 1-2 engineers available for 2 weeks?
- [ ] Feature flag infrastructure ready?
- [ ] Monitoring dashboard set up?
- [ ] Trace log storage configured?
- [ ] Code review process established?
- [ ] Rollout schedule agreed?
- [ ] Success metrics dashboard created?
- [ ] Risk mitigation plan reviewed?
- [ ] Go/no-go decision made?

---

## If All Answers Are Yes

**You're ready to begin execution.**

Start with Move 1 (FinancialProfile v0).

Ship the vertical slice in 2 weeks.

Watch what users do.

Iterate.

That's how you build a real product.

---

## The Vision

**Atlas is transitioning from:**
- "An AI chatbot that gives financial advice"

**To:**
- "A financial reasoning platform that helps users make better decisions"

**The architecture is right.**

**Now execute the 10 moves.**

**Ship the vertical slice.**

**Prove it works.**

**Then scale.**

---

**Status:** Ready for execution  
**Start Date:** Immediately  
**Target:** Ship vertical slice in 2 weeks  
**Success Metric:** Numeric truth % → 100%

---

## Questions Before Starting?

1. **Team capacity:** Do you have 1-2 engineers available for 2 weeks?
2. **Feature flag:** Is infrastructure ready?
3. **Monitoring:** Can you set up trace log monitoring?
4. **Timeline:** Can you commit to the 2-week schedule?
5. **Rollout:** Is the shadow mode → visible rollout acceptable?

If all answers are yes, **begin execution immediately.**

If any answer is no, **resolve that blocker first.**

---

**The time to build is now.**

**The architecture is proven.**

**The path is clear.**

**Execute the 10 moves.**

**Ship the vertical slice.**

**Change the fintech market.**
