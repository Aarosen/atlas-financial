# ATLAS AI PLATFORM DEVELOPMENT SPECIFICATION
## Executive Summary: From Wrapper to Platform

**Status:** FINAL SPECIFICATION  
**Target:** Production-grade financial companion (100/100 CFP standard)  
**Timeline:** 8 weeks  
**Quality Gate:** Zero financial harm, 0.1% calculation tolerance

---

## THE PROBLEM (Current State)

Atlas is a **Claude-dependent wrapper** with world-class financial calculations but decision-making locked to a single LLM provider.

**Wrapper Characteristics:**
- Line 49-51: Hardcoded to Anthropic API only
- Line 886: Claude decides if crisis exists
- Line 949: Claude decides conversation phase
- Line 1064: Claude told to use calculations but can override
- 100+ overlapping AI engines (conflicting instructions)
- 32,000 character system prompt (prompt bloat)
- Result: Non-deterministic, provider-dependent, unmaintainable

---

## THE SOLUTION (Target State)

**Platform Architecture:**
1. **Deterministic Logic** makes all financial decisions (which calculation, what to ask, how to prioritize)
2. **LLMs become communication layer** (explain results, adapt tone, answer follow-ups)
3. **Provider-agnostic** (Claude, GPT-4, Gemini, open-source all produce identical advice)
4. **Cost optimized** (40-60% reduction via intelligent routing)
5. **99.9% reliable** (multi-provider fallback)

---

## PHASE 0: ARCHITECTURE CLEANUP (2 weeks)

### Objective
Consolidate 100+ overlapping engines into 12 core decision modules.

### Deliverables
1. **Engine Audit** (`/ATLAS_ENGINE_AUDIT.csv`)
   - Map all 100+ files to 12 core functions
   - Identify consolidation targets
   - Mark files for deletion

2. **12 Core Engines** (consolidated)
   - `financialDecisionEngine` — Which calculation to run
   - `dataExtractionEngine` — Parse user input
   - `validationEngine` — Catch errors
   - `calculationEngine` — Run deterministic math (keep as-is)
   - `questionSequencingEngine` — What to ask next
   - `contextInjectionEngine` — Build system prompt
   - `complianceEngine` — Detect regulated advice
   - `crisisDetectionEngine` — Identify emergencies
   - `responseTemplateEngine` — Standardize output
   - `communicationStyleEngine` — Adapt tone
   - `multiProviderRoutingEngine` — Select best LLM
   - `monitoringEngine` — Track quality/cost

3. **Decision Hierarchy** (`/ATLAS_DECISION_HIERARCHY.md`)
   - Safety → Data Validation → Financial Decision → Question Sequencing → Context → Response → Communication

4. **Engine Interfaces** (`/src/lib/ai/engines/types.ts`)
   - TypeScript interfaces for all 12 engines

### Success Criteria
- [ ] All 100+ files audited
- [ ] Consolidated engines created
- [ ] Claude-specific code removed from core
- [ ] Decision hierarchy documented
- [ ] Build passes (zero TypeScript errors)
- [ ] All 870 existing tests pass

---

## PHASE 1: PROVIDER ABSTRACTION LAYER (2 weeks)

### Objective
Build provider-agnostic abstraction so any LLM works identically.

### Deliverables

1. **LLMProvider Interface** (`/src/lib/ai/providers/types.ts`)
   ```typescript
   interface LLMProvider {
     name: 'claude' | 'openai' | 'gemini' | 'together';
     call(request: LLMRequest): Promise<LLMResponse>;
     stream(request: LLMRequest): AsyncIterable<LLMStreamEvent>;
     isAvailable(): Promise<boolean>;
   }
   ```

2. **Provider Implementations**
   - `ClaudeProvider.ts` (refactored from current code)
   - `OpenAIProvider.ts` (GPT-4, GPT-4o)
   - `GeminiProvider.ts` (Gemini 2.0)
   - `TogetherProvider.ts` (open-source models)

3. **Response Normalization**
   - All providers return identical `LLMResponse` format
   - Cost tracking per provider
   - Latency tracking per provider
   - Token counting accuracy

4. **Provider Factory** (`/src/lib/ai/providers/ProviderFactory.ts`)
   - Create providers
   - Cache instances
   - Health checks

5. **Test Suite** (140+ tests)
   - ClaudeProvider: 40 tests
   - OpenAIProvider: 40 tests
   - GeminiProvider: 40 tests
   - ProviderFactory: 20 tests

### Success Criteria
- [ ] All 3 providers implemented
- [ ] Response format identical across providers
- [ ] 140+ unit tests passing
- [ ] Cost calculation accurate
- [ ] Health checks working
- [ ] Build passes (zero TypeScript errors)

---

## PHASE 2: DECISION ROUTING ENGINE (2 weeks)

### Objective
Move decision-making from Claude to deterministic logic.

### Deliverables

1. **Financial Decision Engine** (`/src/lib/ai/engines/financialDecisionEngine.ts`)
   - Deterministically decides: emergency_fund? debt_payoff? budget? investment? retirement?
   - Based on: extracted data, conversation history, prior goals
   - Returns: decision domain, urgency, required fields, missing fields, next action
   - 30+ unit tests

2. **Question Sequencing Engine** (`/src/lib/ai/engines/questionSequencingEngine.ts`)
   - Deterministically decides: what to ask next?
   - Priority order: income → expenses → savings → debt → goals → risk tolerance
   - Returns: field, question, context, priority
   - 20+ unit tests

3. **Crisis Detection Engine** (`/src/lib/ai/engines/crisisDetectionEngine.ts`)
   - Deterministically detects: suicide, homelessness, hunger, bankruptcy, abuse
   - Keyword matching + financial thresholds
   - Returns: detected, type, severity, response
   - 40+ unit tests
   - **Requires compliance officer approval**

4. **Compliance Engine** (`/src/lib/ai/engines/complianceEngine.ts`)
   - Deterministically detects: investment advice, tax advice, legal advice, medical advice
   - Keyword matching
   - Returns: detected, riskType, severity, response
   - 30+ unit tests
   - **Requires compliance officer approval**

5. **Chat Route Integration**
   - Replace line 886 (crisis detection) with `detectCrisis()`
   - Replace line 903 (compliance detection) with `detectComplianceRisk()`
   - Replace line 949 (orchestrator) with `decideFinancialDomain()`
   - Add `getNextQuestion()` call
   - Chat route becomes 50% shorter

6. **Test Suite** (120+ tests)
   - All 4 engines fully tested
   - Integration tests (20+ tests)

### Success Criteria
- [ ] All 4 decision engines implemented
- [ ] 120+ unit tests passing
- [ ] Chat route refactored
- [ ] Claude no longer makes financial decisions
- [ ] Build passes (zero TypeScript errors)
- [ ] Compliance officer approval obtained

---

## PHASE 3: RESPONSE TEMPLATING SYSTEM (1.5 weeks)

### Objective
Standardize response format so any LLM fills templates without changing financial content.

### Deliverables

1. **Response Template Engine** (`/src/lib/ai/engines/responseTemplateEngine.ts`)
   - Builds response template based on financial decision
   - Template types: direct_answer, calculation_result, question, action_plan, explanation
   - Slots: domain, calculation_type, primary_number, secondary_number, recommendation, next_action
   - Constraints: maxSentences, maxQuestions, requiresCalculation, requiresAction, tone

2. **Template Builders**
   - `buildCalculationTemplate()` — For calculation results
   - `buildQuestionTemplate()` — For asking next question
   - `buildExplanationTemplate()` — For general explanation
   - `buildActionPlanTemplate()` — For multi-step actions

3. **Template Prompt Generator** (`/src/lib/ai/engines/templatePromptGenerator.ts`)
   - Generates LLM-specific instructions to fill template
   - Claude instructions vs GPT-4 instructions vs Gemini instructions
   - All instructions produce identical output format

4. **Response Validator** (`/src/lib/ai/engines/responseValidator.ts`)
   - Validates LLM response matches template structure
   - Checks: sentence count, question count, action present, calculation present
   - Repairs invalid responses (retry with stricter constraints)

5. **Test Suite** (80+ tests)
   - Template building: 30 tests
   - Prompt generation: 20 tests
   - Response validation: 30 tests

### Success Criteria
- [ ] Response template engine implemented
- [ ] All template types working
- [ ] 80+ unit tests passing
- [ ] Response format identical across providers
- [ ] Build passes (zero TypeScript errors)

---

## PHASE 4: MULTI-PROVIDER OPTIMIZATION (2 weeks)

### Objective
Intelligently route requests to best provider based on cost, latency, complexity.

### Deliverables

1. **Provider Selection Logic** (`/src/lib/ai/engines/multiProviderRoutingEngine.ts`)
   - Decision factors: complexity, cost, latency, user tier, provider availability
   - Routing rules:
     - Simple questions (clarification, yes/no) → Haiku ($0.80/M) or Gemini Flash ($0.075/M)
     - Moderate questions (calculation, explanation) → Sonnet ($3/M) or GPT-4 Turbo ($10/M)
     - Complex questions (multi-step reasoning) → Opus ($15/M) or GPT-4 ($30/M)
   - Fallback chain: if primary unavailable, try secondary, then tertiary

2. **Cost Optimizer** (`/src/lib/ai/engines/costOptimizer.ts`)
   - Tracks cost per conversation
   - Tracks cost per provider
   - Calculates estimated savings vs Claude-only
   - Target: 40-60% cost reduction

3. **Latency Optimizer** (`/src/lib/ai/engines/latencyOptimizer.ts`)
   - Tracks latency per provider
   - Tracks latency per request type
   - Selects fastest provider for time-sensitive requests
   - Target: <2s response time for simple questions

4. **Quality Monitor** (`/src/lib/ai/engines/qualityMonitor.ts`)
   - Tracks: calculation accuracy, compliance violations, user satisfaction
   - Flags: providers with quality issues
   - Adjusts routing if quality drops below threshold

5. **Provider Health Dashboard** (`/src/lib/ai/providers/healthDashboard.ts`)
   - Real-time status of all providers
   - Latency metrics
   - Cost metrics
   - Quality metrics
   - Fallback chain status

6. **Test Suite** (100+ tests)
   - Provider selection: 30 tests
   - Cost optimization: 30 tests
   - Latency optimization: 20 tests
   - Quality monitoring: 20 tests

### Success Criteria
- [ ] Provider selection logic implemented
- [ ] Cost tracking working (40-60% reduction achieved)
- [ ] Latency tracking working (<2s for simple questions)
- [ ] Quality monitoring working
- [ ] 100+ unit tests passing
- [ ] Build passes (zero TypeScript errors)

---

## PHASE 5: PRODUCTION QUALITY GATE (1.5 weeks)

### Objective
Achieve 100/100 CFP-grade financial companion standard.

### Deliverables

1. **Evaluation Framework** (`/src/lib/evals/productionEvalFramework.ts`)
   - 12 evaluation dimensions (D1-D12)
   - 80+ individual test cases
   - Severity levels: CRITICAL (zero tolerance), HIGH (same-day fix), STANDARD (weekly)

2. **Evaluation Dimensions**
   - D1: Safety & Compliance (11 evals) — Zero tolerance for regulated advice
   - D2: Accuracy & Grounding (8 evals) — CFP-grade accuracy, ≤0.5% hallucination
   - D3: Teaching Excellence (10 evals) — Professional financial education
   - D4: Personalization & Adaptive Flow (10 evals) — Unique, intelligent paths
   - D5: Data Extraction Precision (7 evals) — Near-perfect extraction
   - D6: Tone, Empathy & Trust (9 evals) — Best-friend warmth
   - D7: Financial Calculation Integrity (8 evals) — 0.1% tolerance
   - D8: Professional Domain Accuracy (20 evals) — CFA/CFP-grade depth
   - D9: Multi-Provider Coherence (6 evals) — Identical advice across providers
   - D10: Proactive Intelligence (5 evals) — Surface needs before users ask
   - D11: Long-Term Learning & Outcome (6 evals) — User outcomes improve
   - D12: Competitive Excellence (6 evals) — Win/tie vs competitors

3. **Test Dataset** (200+ test cases)
   - 150 CFP-curated scenarios
   - 50 adversarial edge cases
   - Coverage: all financial domains, all user types, all edge cases

4. **Automated Test Runner** (`/src/lib/evals/testRunner.ts`)
   - Runs all 200+ test cases
   - Generates report: pass/fail, dimension scores, severity breakdown
   - Blocks deployment if CRITICAL failures present

5. **Quality Dashboard** (`/src/lib/evals/qualityDashboard.ts`)
   - Real-time dimension scores
   - Trend analysis (improving/degrading)
   - Provider comparison (Claude vs GPT-4 vs Gemini)
   - Cost vs quality tradeoff

6. **Continuous Integration** (`.github/workflows/production-quality-gate.yml`)
   - Runs on every commit
   - Blocks merge if quality drops
   - Weekly comprehensive eval run

### Success Criteria
- [ ] All 80+ evals implemented
- [ ] 200+ test cases created
- [ ] Test runner working
- [ ] Quality dashboard working
- [ ] All CRITICAL evals passing
- [ ] All HIGH evals passing
- [ ] Dimension scores: D1-D7 ≥95%, D8-D12 ≥90%
- [ ] Multi-provider coherence verified (identical advice)
- [ ] Build passes (zero TypeScript errors)
- [ ] Compliance officer approval obtained

---

## IMPLEMENTATION ROADMAP

### Week 1-2: PHASE 0 (Architecture Cleanup)
- Audit all 100+ engines
- Consolidate into 12 core engines
- Remove Claude-specific code
- Establish decision hierarchy

### Week 3-4: PHASE 1 (Provider Abstraction)
- Implement LLMProvider interface
- Implement ClaudeProvider (refactor existing code)
- Implement OpenAIProvider
- Implement GeminiProvider
- 140+ unit tests

### Week 5-6: PHASE 2 (Decision Routing)
- Implement 4 decision engines
- Integrate into chat route
- 120+ unit tests
- Compliance officer approval

### Week 7: PHASE 3 (Response Templating)
- Implement response template engine
- Implement template builders
- Implement response validator
- 80+ unit tests

### Week 8: PHASE 4 & 5 (Optimization & Quality Gate)
- Implement provider selection logic
- Implement cost/latency optimization
- Implement quality monitoring
- Implement production eval framework
- 200+ test cases
- Final quality gate

---

## ENGINEER ASSIGNMENTS

### Lead Engineer (CTO)
- Architecture design
- Phase 0 oversight
- Phase 1 oversight
- Code review (all phases)
- Final quality sign-off

### Senior Engineer #1
- Phase 1: ClaudeProvider + ProviderFactory
- Phase 2: Financial Decision Engine + Question Sequencing Engine
- Phase 3: Response Template Engine
- Phase 4: Provider Selection Logic

### Senior Engineer #2
- Phase 1: OpenAIProvider + GeminiProvider
- Phase 2: Crisis Detection Engine + Compliance Engine
- Phase 3: Response Validator
- Phase 4: Cost/Latency Optimization

### QA Engineer
- Phase 1: 140+ provider tests
- Phase 2: 120+ decision engine tests
- Phase 3: 80+ template tests
- Phase 4: 100+ optimization tests
- Phase 5: 200+ production eval tests

### Compliance Officer
- Phase 2: Crisis detection review + approval
- Phase 2: Compliance engine review + approval
- Phase 5: Final quality gate approval

---

## TESTING STRATEGY

### Unit Tests
- Phase 0: 0 new tests (cleanup only)
- Phase 1: 140 tests (provider implementations)
- Phase 2: 120 tests (decision engines)
- Phase 3: 80 tests (response templating)
- Phase 4: 100 tests (optimization)
- Phase 5: 200 tests (production evals)
- **Total: 640 new tests**

### Integration Tests
- Chat route with all decision engines
- Chat route with all providers
- End-to-end conversation flows
- Multi-provider consistency

### Regression Tests
- All 870 existing tests must pass
- No breaking changes to existing APIs
- Backward compatibility maintained

### Quality Gate Tests
- 80+ evaluation dimensions
- 200+ test scenarios
- CRITICAL failures block deployment
- Dimension scores tracked

---

## SUCCESS METRICS

### Architecture
- [ ] 100+ engines consolidated to 12
- [ ] Zero Claude-specific code in core logic
- [ ] Decision hierarchy established and documented
- [ ] All 12 engines have clear interfaces

### Provider Abstraction
- [ ] 4 providers implemented (Claude, OpenAI, Gemini, Together)
- [ ] Response format identical across providers
- [ ] Cost calculation accurate for all providers
- [ ] Health checks working for all providers

### Decision Routing
- [ ] All financial decisions made deterministically
- [ ] Claude no longer makes financial decisions
- [ ] Same decisions regardless of LLM provider
- [ ] Crisis/compliance detection deterministic

### Response Templating
- [ ] Response format standardized
- [ ] Any LLM can fill templates
- [ ] Financial content identical across providers
- [ ] Communication style adapted per provider

### Multi-Provider Optimization
- [ ] Cost reduced 40-60% vs Claude-only
- [ ] Latency <2s for simple questions
- [ ] Provider fallback working
- [ ] Quality maintained across providers

### Production Quality
- [ ] 100/100 CFP-grade standard achieved
- [ ] Zero CRITICAL eval failures
- [ ] All HIGH evals passing
- [ ] Dimension scores: D1-D7 ≥95%, D8-D12 ≥90%
- [ ] Multi-provider coherence verified

### Code Quality
- [ ] 640+ new unit tests passing
- [ ] All 870 existing tests still passing
- [ ] Zero TypeScript errors
- [ ] Code review approved by 2+ senior engineers
- [ ] Compliance officer approval obtained

---

## RISK MITIGATION

### Risk 1: Provider API Changes
- **Mitigation:** Provider abstraction layer allows easy adapter updates
- **Contingency:** Maintain 2+ providers in fallback chain

### Risk 2: Quality Degradation
- **Mitigation:** Automated quality gate blocks deployments
- **Contingency:** Rollback to previous provider if quality drops

### Risk 3: Cost Overruns
- **Mitigation:** Cost tracking per provider, automatic fallback to cheaper provider
- **Contingency:** Disable expensive providers if budget exceeded

### Risk 4: Compliance Violations
- **Mitigation:** Compliance officer reviews all decision engines
- **Contingency:** Deterministic compliance detection prevents violations

### Risk 5: Multi-Provider Inconsistency
- **Mitigation:** Response templates ensure identical output format
- **Contingency:** Automated coherence tests catch inconsistencies

---

## DELIVERABLES CHECKLIST

### Phase 0
- [ ] `/ATLAS_ENGINE_AUDIT.csv`
- [ ] `/ATLAS_DECISION_HIERARCHY.md`
- [ ] `/src/lib/ai/engines/types.ts`
- [ ] Consolidated engine files (12 total)

### Phase 1
- [ ] `/src/lib/ai/providers/types.ts`
- [ ] `/src/lib/ai/providers/ClaudeProvider.ts`
- [ ] `/src/lib/ai/providers/OpenAIProvider.ts`
- [ ] `/src/lib/ai/providers/GeminiProvider.ts`
- [ ] `/src/lib/ai/providers/ProviderFactory.ts`
- [ ] `/src/lib/ai/providers/__tests__/` (140 tests)

### Phase 2
- [ ] `/src/lib/ai/engines/financialDecisionEngine.ts`
- [ ] `/src/lib/ai/engines/questionSequencingEngine.ts`
- [ ] `/src/lib/ai/engines/crisisDetectionEngine.ts`
- [ ] `/src/lib/ai/engines/complianceEngine.ts`
- [ ] Updated `/app/api/chat/route.ts`
- [ ] `/src/lib/ai/engines/__tests__/` (120 tests)

### Phase 3
- [ ] `/src/lib/ai/engines/responseTemplateEngine.ts`
- [ ] `/src/lib/ai/engines/templatePromptGenerator.ts`
- [ ] `/src/lib/ai/engines/responseValidator.ts`
- [ ] `/src/lib/ai/engines/__tests__/` (80 tests)

### Phase 4
- [ ] `/src/lib/ai/engines/multiProviderRoutingEngine.ts`
- [ ] `/src/lib/ai/engines/costOptimizer.ts`
- [ ] `/src/lib/ai/engines/latencyOptimizer.ts`
- [ ] `/src/lib/ai/engines/qualityMonitor.ts`
- [ ] `/src/lib/ai/providers/healthDashboard.ts`
- [ ] `/src/lib/ai/engines/__tests__/` (100 tests)

### Phase 5
- [ ] `/src/lib/evals/productionEvalFramework.ts`
- [ ] `/src/lib/evals/testDataset.ts` (200 test cases)
- [ ] `/src/lib/evals/testRunner.ts`
- [ ] `/src/lib/evals/qualityDashboard.ts`
- [ ] `.github/workflows/production-quality-gate.yml`
- [ ] `/src/lib/evals/__tests__/` (200 tests)

---

## FINAL NOTES

This specification transforms Atlas from a Claude wrapper into a defensible financial reasoning platform. The deterministic decision-making layer ensures identical financial advice regardless of LLM provider, while the response templating system allows any LLM to handle communication.

**Key Insight:** The moat isn't the LLM—it's the financial reasoning engine. By decoupling decisions from communication, Atlas becomes provider-agnostic infrastructure that any LLM can power.

**Result:** 40-60% cost reduction, 99.9% reliability, competitive defensibility, and production-grade financial companion quality (100/100 CFP standard).
