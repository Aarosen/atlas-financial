# ATLAS AI PLATFORM: DETAILED ENGINEER INSTRUCTIONS
## Implementation Guide for 8-Week Development Sprint

**Document Purpose:** Precise, actionable instructions for each engineer role  
**Audience:** Lead Engineer, Senior Engineers, QA Engineer, Compliance Officer  
**Reference:** See `ATLAS_PLATFORM_DEVELOPMENT_SPEC.md` for architecture overview

---

## PHASE 0: ARCHITECTURE CLEANUP (Weeks 1-2)

### Lead Engineer: Architecture Audit & Consolidation

#### Task 0.1: Complete Engine Audit (8 hours)

**Objective:** Map all 100+ files in `/src/lib/ai/` to 12 core functions

**Steps:**

1. **Create audit spreadsheet** (`/ATLAS_ENGINE_AUDIT.csv`)
   ```
   File Path,Current Responsibility,Core Function,LOC,Dependencies,Delete?,Consolidation Target
   src/lib/ai/crisisDetectionEngine.ts,Detect financial crises,Crisis Detection,500,conversationHistory,N,crisisDetectionEngine
   src/lib/ai/escalationEngine.ts,Escalate urgent issues,Crisis Detection,200,crisisDetectionEngine,Y,crisisDetectionEngine
   src/lib/ai/objectionHandlingEngine.ts,Handle user objections,Objection Handling,400,conversationHistory,N,objectionHandlingEngine
   src/lib/ai/assumptionConfirmationEngine.ts,Confirm assumptions,Objection Handling,250,objectionHandlingEngine,Y,objectionHandlingEngine
   [... continue for all 100+ files]
   ```

2. **Run analysis script** (create `/scripts/audit-engines.ts`)
   ```bash
   npx ts-node scripts/audit-engines.ts
   ```
   This script should:
   - List all files in `/src/lib/ai/`
   - Count lines of code per file
   - Identify imports/dependencies
   - Flag files with overlapping responsibilities

3. **Categorize each file** into one of 12 core functions:
   - **Financial Decision:** crisisDetectionEngine, escalationEngine, needsDetectionEngine
   - **Data Extraction:** financialExtractor, improvedDataExtraction, actionExtractor
   - **Validation:** financialValidation, assumptionConfirmationEngine
   - **Calculation:** (keep as-is, already consolidated)
   - **Question Sequencing:** questionSequencingEngine, conversationalQuestionEngine, adaptiveQuestionEngine
   - **Context Injection:** contextInjectionEngine, buildSystemPrompt, strategyContextBuilder
   - **Compliance:** complianceEngine, guardrails
   - **Crisis Detection:** crisisDetectionEngine, escalationEngine
   - **Response Template:** responsePostprocessor, metricCardPrompt, visualExplainer
   - **Communication Style:** tonePersonalityEngine, culturalFinanceEngine, slangMapper, multiLanguage
   - **Multi-Provider Routing:** (new, doesn't exist yet)
   - **Monitoring:** atlasEvalMonitor, failureSampler

4. **Identify consolidation targets**
   - Files with <200 LOC → consolidate into larger module
   - Files with overlapping responsibility → merge
   - Files that are purely informational → move to context builder

5. **Mark files for deletion**
   - playbooks.ts (disabled, can delete)
   - Any files marked "Y" in Delete? column
   - Any files with <100 LOC and no unique logic

6. **Document findings** in `/ATLAS_ENGINE_AUDIT.csv`

**Acceptance Criteria:**
- [ ] All 100+ files audited
- [ ] Each file categorized into one of 12 core functions
- [ ] Consolidation targets identified
- [ ] Files marked for deletion listed
- [ ] CSV complete and reviewed by 2 senior engineers

---

#### Task 0.2: Consolidate Overlapping Engines (40 hours)

**Objective:** Merge overlapping engines into 12 core modules

**Consolidation Rules:**
- If two engines make the same type of decision → merge into one
- If one engine's output feeds another → create explicit interface
- If engine is purely informational → move to context builder
- If engine contradicts another → establish priority order

**Consolidation Examples:**

**Example 1: Communication Style Engine**
```
Current Files:
- tonePersonalityEngine.ts (500 LOC)
- culturalFinanceEngine.ts (400 LOC)
- slangMapper.ts (200 LOC)
- multiLanguage.ts (300 LOC)

Consolidation:
- Create: /src/lib/ai/engines/communicationStyleEngine.ts (1000 LOC)
- Move all tone/language/cultural logic into single module
- Export: adaptTone(), detectLanguage(), normalizeSlang(), buildCulturalContext()
- Delete: tonePersonalityEngine.ts, culturalFinanceEngine.ts, slangMapper.ts, multiLanguage.ts
```

**Example 2: Crisis Detection Engine**
```
Current Files:
- crisisDetectionEngine.ts (500 LOC)
- escalationEngine.ts (200 LOC)
- proactiveAlertsEngine.ts (300 LOC)

Consolidation:
- Expand: /src/lib/ai/engines/crisisDetectionEngine.ts (1000 LOC)
- Move escalation logic into crisis detection
- Move alert logic into crisis detection
- Export: detectCrisis(), escalateIfNeeded(), generateAlert()
- Delete: escalationEngine.ts, proactiveAlertsEngine.ts
```

**Steps:**

1. **For each consolidation target:**
   - Create new consolidated file in `/src/lib/ai/engines/`
   - Copy all logic from source files
   - Merge functions with clear naming
   - Create unified interface
   - Add comprehensive JSDoc comments

2. **Update all imports** across codebase
   - Find all imports of deleted files
   - Replace with imports from consolidated file
   - Run `npm run build` to verify no broken imports

3. **Create consolidated test files**
   - For each consolidated engine, create corresponding test file
   - Move all tests from source files into consolidated test
   - Ensure all tests still pass

4. **Delete old files**
   - Only delete after all imports updated and tests passing
   - Keep in git history (can be recovered if needed)

**New Directory Structure:**
```
/src/lib/ai/engines/
├── financialDecisionEngine.ts
├── dataExtractionEngine.ts
├── validationEngine.ts
├── questionSequencingEngine.ts
├── contextInjectionEngine.ts
├── complianceEngine.ts
├── crisisDetectionEngine.ts
├── responseTemplateEngine.ts
├── communicationStyleEngine.ts
├── multiProviderRoutingEngine.ts
├── monitoringEngine.ts
├── types.ts
└── __tests__/
    ├── financialDecisionEngine.test.ts
    ├── dataExtractionEngine.test.ts
    ├── [... 10 more test files]
```

**Acceptance Criteria:**
- [ ] All 12 consolidated engines created
- [ ] All old files deleted
- [ ] All imports updated
- [ ] `npm run build` passes with zero errors
- [ ] All existing tests still pass (870/870)
- [ ] Code review approved

---

#### Task 0.3: Remove Claude-Specific Code (16 hours)

**Objective:** Extract all Claude-specific code from core logic

**Claude-Specific Code to Remove:**

1. **Line 49-51 in `/app/api/chat/route.ts`**
   ```typescript
   // REMOVE:
   const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
   const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
   const FALLBACK_MODELS = ['claude-sonnet-4-6', 'claude-opus-4-6'] as const;
   
   // MOVE TO: /src/lib/ai/providers/ClaudeProvider.ts
   ```

2. **Lines 200-261 in `/app/api/chat/route.ts`**
   ```typescript
   // REMOVE:
   async function callAnthropic(args: {...}) { ... }
   async function callAnthropicStream(args: {...}) { ... }
   
   // MOVE TO: /src/lib/ai/providers/ClaudeProvider.ts
   ```

3. **Lines 587-604 in `/app/api/chat/route.ts`**
   ```typescript
   // REMOVE:
   const systemPrompt = type === 'extract'
     ? extractPrompt
     : trimPromptSections([...], 4200);
   
   // MOVE TO: /src/lib/ai/engines/contextInjectionEngine.ts
   // Function: buildSystemPrompt(type, context)
   ```

4. **Lines 616-635 in `/app/api/chat/route.ts`**
   ```typescript
   // REMOVE:
   const answerPrompt = `You are Atlas...`;
   const explainerPrompt = `You are Atlas...`;
   
   // MOVE TO: /src/lib/ai/engines/responseTemplateEngine.ts
   // Function: getPromptForType(type)
   ```

5. **Lines 804-820 in `/app/api/chat/route.ts`**
   ```typescript
   // REMOVE:
   const repairSystem = `Rewrite the following text...`;
   const repairResp = await callAnthropic({...});
   
   // MOVE TO: /src/lib/ai/engines/responseValidator.ts
   // Function: repairResponse(text, constraints)
   ```

**Steps:**

1. **Create abstraction boundaries**
   - Chat route should NOT import from Anthropic
   - Chat route should NOT build Claude-specific prompts
   - Chat route should call generic `LLMProvider.call()` interface

2. **Update chat route** (`/app/api/chat/route.ts`)
   ```typescript
   // OLD:
   const response = await callAnthropic({ apiKey, model, maxTokens, system, messages });
   
   // NEW:
   const provider = ProviderFactory.createProvider('claude', { apiKey, model });
   const response = await provider.call({ messages, system, maxTokens });
   ```

3. **Move all provider-specific logic to `/src/lib/ai/providers/`**
   - API endpoints
   - Request/response formatting
   - Error handling
   - Retry logic

4. **Move all prompt building to `/src/lib/ai/engines/`**
   - System prompt building
   - Extraction prompt building
   - Answer prompt building
   - Explainer prompt building

5. **Verify no Claude references in core logic**
   ```bash
   grep -r "anthropic\|claude\|ANTHROPIC\|CLAUDE" src/lib/ai/engines/
   # Should return: 0 results
   ```

**Acceptance Criteria:**
- [ ] All Claude-specific code removed from core logic
- [ ] All code moved to appropriate provider/engine modules
- [ ] Chat route imports from generic interfaces only
- [ ] `npm run build` passes with zero errors
- [ ] All tests still pass (870/870)
- [ ] Code review approved

---

#### Task 0.4: Establish Decision Authority Hierarchy (8 hours)

**Objective:** Document clear decision priority order

**Create `/ATLAS_DECISION_HIERARCHY.md`:**

```markdown
# ATLAS DECISION HIERARCHY

## Priority Order (Highest to Lowest)

### 1. SAFETY (Crisis Detection, Compliance Screening)
**Authority:** Deterministic crisis/compliance engines
**Decision:** Is this a crisis? Is this regulated advice?
**Override:** No other engine can override
**Implementation:** 
- detectCrisis() → if true, return crisis response immediately
- detectComplianceRisk() → if true, return compliance response immediately
- No further processing

### 2. DATA VALIDATION (Validation Engine)
**Authority:** Deterministic validation logic
**Decision:** Is extracted data plausible?
**Override:** Blocks calculation until resolved
**Implementation:**
- validateFinancialSnapshot() → if invalid, flag for user confirmation
- User must confirm/correct before proceeding

### 3. FINANCIAL DECISION (Financial Decision Engine)
**Authority:** Deterministic decision logic
**Decision:** Which financial domain? (emergency_fund, debt_payoff, budget, investment, retirement)
**Override:** Claude CANNOT override
**Implementation:**
- decideFinancialDomain() → returns FinancialDecision
- This decision is FINAL

### 4. QUESTION SEQUENCING (Question Sequencing Engine)
**Authority:** Deterministic sequencing logic
**Decision:** What to ask next?
**Override:** Claude CANNOT override
**Implementation:**
- getNextQuestion() → returns NextQuestion
- This decision is FINAL

### 5. CONTEXT INJECTION (Context Injection Engine)
**Authority:** Deterministic context building
**Decision:** What context to inject into system prompt?
**Override:** Claude receives pre-built context, cannot modify
**Implementation:**
- buildContextBlocks() → returns ContextBlock[]
- All blocks built deterministically

### 6. RESPONSE GENERATION (LLM Provider)
**Authority:** Claude/GPT-4/Gemini
**Decision:** How to communicate the response?
**Override:** Can only vary tone/language, not content
**Implementation:**
- Provider fills response template
- Must follow template structure exactly

### 7. COMMUNICATION STYLE (Communication Style Engine)
**Authority:** Deterministic style adaptation
**Decision:** What tone/language to use?
**Override:** Applied AFTER response generation (post-processing)
**Implementation:**
- adaptCommunicationStyle() → modifies response tone/language
- Does NOT change financial content

## Conflict Resolution

If two engines disagree:
1. Higher priority engine wins
2. Lower priority engine's output is discarded
3. Log conflict for monitoring

Example:
- Financial Decision Engine says: "emergency_fund"
- Question Sequencing Engine says: "ask about retirement"
- Resolution: Financial Decision wins, ask about emergency fund

## Testing

Each decision must be tested for:
- Correctness (returns expected decision)
- Consistency (same input → same output)
- Non-interference (doesn't conflict with higher priority)
- Provider-agnosticism (same decision regardless of LLM)
```

**Acceptance Criteria:**
- [ ] Decision hierarchy documented
- [ ] Priority order clear and unambiguous
- [ ] Conflict resolution rules defined
- [ ] Testing strategy defined
- [ ] Document reviewed and approved by 2 senior engineers

---

#### Task 0.5: Create Engine Interface Specifications (8 hours)

**Objective:** Define TypeScript interfaces for all 12 engines

**Create `/src/lib/ai/engines/types.ts`:**

```typescript
// ============================================================================
// FINANCIAL DECISION ENGINE
// ============================================================================

export interface FinancialDecision {
  domain: 'emergency_fund' | 'debt_payoff' | 'budget' | 'investment' | 'retirement' | 'general';
  reasoning: string;
  requiredFields: string[];
  missingFields: string[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
  nextAction: string;
}

// ============================================================================
// DATA EXTRACTION ENGINE
// ============================================================================

export interface ExtractedFinancialData {
  monthlyIncome?: number;
  essentialExpenses?: number;
  discretionaryExpenses?: number;
  totalSavings?: number;
  highInterestDebt?: number;
  lowInterestDebt?: number;
  monthlyDebtPayments?: number;
  proposedPayment?: number;
  primaryGoal?: 'stability' | 'growth' | 'flexibility' | 'wealth_building';
  timeHorizonYears?: number;
  riskTolerance?: 'cautious' | 'balanced' | 'growth';
  biggestConcern?: string;
}

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

export interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'error' | 'warning';
  suggestedValue?: number | string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  requiresUserConfirmation: boolean;
  suggestedCorrection?: Partial<ExtractedFinancialData>;
}

// ============================================================================
// QUESTION SEQUENCING ENGINE
// ============================================================================

export interface NextQuestion {
  field: string;
  question: string;
  context: string;
  priority: number;
  followUpTo?: string;
}

// ============================================================================
// CONTEXT INJECTION ENGINE
// ============================================================================

export interface ContextBlock {
  name: string;
  content: string;
  priority: number;
  characterCount: number;
}

// ============================================================================
// COMPLIANCE ENGINE
// ============================================================================

export interface ComplianceRisk {
  detected: boolean;
  riskType?: 'investment_advice' | 'tax_advice' | 'legal_advice' | 'medical_advice';
  severity: 'critical' | 'high' | 'medium';
  response?: string;
}

// ============================================================================
// CRISIS DETECTION ENGINE
// ============================================================================

export interface CrisisSignal {
  detected: boolean;
  type?: 'homelessness' | 'hunger' | 'bankruptcy' | 'abuse' | 'suicide' | 'other';
  severity: 'critical' | 'high' | 'medium';
  response: string;
}

// ============================================================================
// RESPONSE TEMPLATE ENGINE
// ============================================================================

export type ResponseStructure = 
  | 'direct_answer'
  | 'calculation_result'
  | 'question'
  | 'action_plan'
  | 'explanation';

export interface ResponseTemplate {
  structure: ResponseStructure;
  slots: {
    [key: string]: string | number | boolean;
  };
  constraints: {
    maxSentences?: number;
    maxQuestions?: number;
    requiresCalculation?: boolean;
    requiresAction?: boolean;
    tone?: 'warm' | 'professional' | 'urgent';
  };
  instructions: string;
}

// ============================================================================
// COMMUNICATION STYLE ENGINE
// ============================================================================

export interface CommunicationStyle {
  tone: 'warm' | 'professional' | 'urgent' | 'supportive';
  complexity: 'simple' | 'moderate' | 'advanced';
  language: 'en' | 'es' | 'fr' | 'zh';
  personalization: {
    userName?: string;
    referencePriorGoals?: boolean;
    usedMetaphors?: boolean;
  };
}

// ============================================================================
// MULTI-PROVIDER ROUTING ENGINE
// ============================================================================

export interface ProviderRoutingDecision {
  selectedProvider: 'claude' | 'openai' | 'gemini' | 'together';
  reason: string;
  fallbackChain: ('claude' | 'openai' | 'gemini' | 'together')[];
  estimatedCost: number;
  estimatedLatency: number;
}

// ============================================================================
// MONITORING ENGINE
// ============================================================================

export interface ConversationMetrics {
  providersUsed: string[];
  totalCost: number;
  totalLatency: number;
  calculationsRun: number;
  decisionsCorrect: boolean;
  userSatisfaction?: number;
  complianceViolations: number;
}

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Goal {
  id: string;
  type: string;
  status: 'active' | 'completed' | 'abandoned';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface CalculationResult {
  type: string;
  primaryMetric: number;
  primaryMetricLabel: string;
  secondaryMetric?: number;
  secondaryMetricLabel?: string;
  timeline?: string;
  recommendation: string;
}
```

**Acceptance Criteria:**
- [ ] All 12 engine interfaces defined
- [ ] All types are clear and unambiguous
- [ ] Interfaces reviewed by 2 senior engineers
- [ ] TypeScript compiles with zero errors
- [ ] Interfaces documented with JSDoc comments

---

### Phase 0 Completion Checklist

**Lead Engineer Sign-Off:**
- [ ] Engine audit complete (100+ files mapped)
- [ ] Consolidation complete (12 core engines created)
- [ ] Claude-specific code removed
- [ ] Decision hierarchy documented
- [ ] Engine interfaces defined
- [ ] All 870 existing tests still pass
- [ ] Build passes with zero TypeScript errors
- [ ] Code review approved by 2 senior engineers
- [ ] Ready to proceed to Phase 1

---

## PHASE 1: PROVIDER ABSTRACTION LAYER (Weeks 3-4)

### Senior Engineer #1: ClaudeProvider Implementation

#### Task 1.1: Implement LLMProvider Interface (8 hours)

**Responsibility:** Lead Engineer  
**Deliverable:** `/src/lib/ai/providers/types.ts`

**Create complete interface definitions:**

```typescript
// /src/lib/ai/providers/types.ts

export interface LLMRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface LLMResponse {
  text: string;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'error';
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
  costUsd: number;
}

export interface LLMStreamEvent {
  type: 'delta' | 'done' | 'error';
  delta?: string;
  response?: LLMResponse;
  error?: { message: string; code: string };
}

export interface LLMProvider {
  // Metadata
  name: 'claude' | 'openai' | 'gemini' | 'together';
  models: string[];
  supportsStreaming: boolean;
  contextWindow: number;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;

  // Core methods
  call(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMStreamEvent>;

  // Health check
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<{ available: boolean; latencyMs: number }>;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  maxRetries?: number;
  timeoutMs?: number;
  temperature?: number;
}
```

**Acceptance Criteria:**
- [ ] All interfaces defined
- [ ] TypeScript compiles with zero errors
- [ ] Interfaces reviewed by 2 senior engineers

---

#### Task 1.2: Implement ClaudeProvider (24 hours)

**Responsibility:** Senior Engineer #1  
**Deliverable:** `/src/lib/ai/providers/ClaudeProvider.ts`

**Implementation:**

```typescript
// /src/lib/ai/providers/ClaudeProvider.ts

import { LLMProvider, LLMRequest, LLMResponse, LLMStreamEvent, ProviderConfig } from './types';

export class ClaudeProvider implements LLMProvider {
  name = 'claude' as const;
  models = ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'];
  supportsStreaming = true;
  contextWindow = 200000;
  costPer1MInputTokens = 3; // Sonnet pricing
  costPer1MOutputTokens = 15;

  private apiKey: string;
  private model: string;
  private maxRetries: number;
  private timeoutMs: number;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-6';
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 25000;
  }

  async call(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(request);
        
        if (!response.ok) {
          const bodyText = await response.text();
          if (response.status === 404 && bodyText.includes('not_found_error')) {
            throw new Error(`Model not found: ${this.model}`);
          }
          if (response.status === 429) {
            throw new Error('Rate limited');
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';
        const inputTokens = data.usage?.input_tokens || 0;
        const outputTokens = data.usage?.output_tokens || 0;
        const latencyMs = Date.now() - startTime;
        const costUsd = this.calculateCost(inputTokens, outputTokens);

        return {
          text,
          stopReason: data.stop_reason === 'end_turn' ? 'end_turn' : 'max_tokens',
          inputTokens,
          outputTokens,
          model: this.model,
          latencyMs,
          costUsd,
        };
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Failed to call Claude API');
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamEvent> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest({ ...request, stream: true });

        if (!response.ok) {
          yield {
            type: 'error',
            error: { message: `Claude API error: ${response.status}`, code: 'CLAUDE_API_ERROR' },
          };
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = '';
        let inputTokens = 0;
        let outputTokens = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;

            const data = JSON.parse(dataStr);

            if (data.type === 'content_block_delta') {
              yield { type: 'delta', delta: data.delta?.text };
            } else if (data.type === 'message_delta') {
              inputTokens = data.usage?.input_tokens || inputTokens;
              outputTokens = data.usage?.output_tokens || outputTokens;
            } else if (data.type === 'message_stop') {
              const latencyMs = Date.now() - startTime;
              const costUsd = this.calculateCost(inputTokens, outputTokens);
              yield {
                type: 'done',
                response: {
                  text: '', // Text accumulated from deltas
                  stopReason: 'end_turn',
                  inputTokens,
                  outputTokens,
                  model: this.model,
                  latencyMs,
                  costUsd,
                },
              };
            }
          }
        }
        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    yield {
      type: 'error',
      error: { message: lastError?.message || 'Stream failed', code: 'STREAM_ERROR' },
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.getStatus();
      return result.available;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<{ available: boolean; latencyMs: number }> {
    const startTime = Date.now();
    try {
      const response = await this.makeRequest({
        messages: [{ role: 'user', content: 'ping' }],
        system: 'Respond with "pong"',
        maxTokens: 10,
      });

      return {
        available: response.ok,
        latencyMs: Date.now() - startTime,
      };
    } catch {
      return { available: false, latencyMs: Date.now() - startTime };
    }
  }

  private async makeRequest(request: Partial<LLMRequest> & { stream?: boolean }): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: request.messages,
          temperature: request.temperature ?? 1,
          top_p: request.topP ?? 1,
          stop_sequences: request.stopSequences,
          stream: request.stream ?? false,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens / 1000000) * this.costPer1MInputTokens +
           (outputTokens / 1000000) * this.costPer1MOutputTokens;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Acceptance Criteria:**
- [ ] `call()` method works identically to current `callAnthropic()`
- [ ] `stream()` method works identically to current `callAnthropicStream()`
- [ ] Retry logic with exponential backoff implemented
- [ ] Cost calculation accurate
- [ ] Health check working
- [ ] 40+ unit tests passing
- [ ] Code review approved

---

#### Task 1.3: Create ClaudeProvider Tests (16 hours)

**Responsibility:** QA Engineer  
**Deliverable:** `/src/lib/ai/providers/__tests__/ClaudeProvider.test.ts`

**Test Coverage (40 tests):**

```typescript
describe('ClaudeProvider', () => {
  // Basic functionality (8 tests)
  test('call() returns LLMResponse with correct format', async () => { ... });
  test('call() calculates cost correctly', async () => { ... });
  test('call() tracks latency', async () => { ... });
  test('stream() yields delta events', async () => { ... });
  test('stream() yields done event', async () => { ... });
  test('stream() accumulates full response', async () => { ... });
  test('isAvailable() returns true when API is up', async () => { ... });
  test('getStatus() returns latency', async () => { ... });

  // Error handling (12 tests)
  test('call() throws on timeout', async () => { ... });
  test('call() throws on 401 (auth error)', async () => { ... });
  test('call() throws on 429 (rate limit)', async () => { ... });
  test('call() throws on 404 (model not found)', async () => { ... });
  test('call() retries on transient errors', async () => { ... });
  test('call() gives up after maxRetries', async () => { ... });
  test('stream() handles network errors gracefully', async () => { ... });
  test('stream() handles malformed JSON gracefully', async () => { ... });
  test('isAvailable() returns false on timeout', async () => { ... });
  test('isAvailable() returns false on API error', async () => { ... });
  test('getStatus() returns available: false on error', async () => { ... });
  test('getStatus() returns latency even on error', async () => { ... });

  // Token counting (8 tests)
  test('call() counts input tokens correctly', async () => { ... });
  test('call() counts output tokens correctly', async () => { ... });
  test('stream() counts tokens correctly', async () => { ... });
  test('calculateCost() uses correct Sonnet pricing', async () => { ... });
  test('calculateCost() handles zero tokens', async () => { ... });
  test('calculateCost() is accurate to 0.01 cents', async () => { ... });
  test('cost calculation matches Anthropic pricing', async () => { ... });
  test('latency is measured in milliseconds', async () => { ... });

  // Configuration (8 tests)
  test('constructor accepts custom model', async () => { ... });
  test('constructor accepts custom timeout', async () => { ... });
  test('constructor accepts custom maxRetries', async () => { ... });
  test('default model is claude-sonnet-4-6', async () => { ... });
  test('default timeout is 25 seconds', async () => { ... });
  test('default maxRetries is 3', async () => { ... });
  test('metadata properties are correct', async () => { ... });
  test('supportsStreaming is true', async () => { ... });

  // Integration (4 tests)
  test('call() and stream() return same response text', async () => { ... });
  test('multiple calls work sequentially', async () => { ... });
  test('concurrent calls work correctly', async () => { ... });
  test('provider can be reused for multiple requests', async () => { ... });
});
```

**Acceptance Criteria:**
- [ ] All 40 tests passing
- [ ] 100% code coverage for ClaudeProvider
- [ ] Tests use mocked API responses (no real API calls)
- [ ] Tests cover all error scenarios
- [ ] Code review approved

---

### Senior Engineer #2: OpenAI & Gemini Providers

#### Task 1.4: Implement OpenAIProvider (20 hours)

**Responsibility:** Senior Engineer #2  
**Deliverable:** `/src/lib/ai/providers/OpenAIProvider.ts`

**Key Differences from Claude:**
- API endpoint: `https://api.openai.com/v1/chat/completions`
- Request format: `messages` instead of `messages` (same), but `model` in request
- Response format: `choices[0].message.content` instead of `content[0].text`
- Token counting: `prompt_tokens` and `completion_tokens`
- Pricing: GPT-4 Turbo ($10/M input, $30/M output)

**Implementation must:**
- [ ] Return identical `LLMResponse` format to Claude
- [ ] Handle OpenAI-specific error codes
- [ ] Calculate cost using OpenAI pricing
- [ ] Support streaming with identical `LLMStreamEvent` format
- [ ] Implement retry logic with exponential backoff
- [ ] 40+ unit tests passing

---

#### Task 1.5: Implement GeminiProvider (20 hours)

**Responsibility:** Senior Engineer #2  
**Deliverable:** `/src/lib/ai/providers/GeminiProvider.ts`

**Key Differences from Claude:**
- API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Request format: `system_instruction` and `contents` with `role: 'user'|'model'`
- Response format: `candidates[0].content.parts[0].text`
- Token counting: `usageMetadata.promptTokenCount` and `candidatesTokenCount`
- Pricing: Gemini 2.0 ($1.25/M input, $5/M output)

**Implementation must:**
- [ ] Return identical `LLMResponse` format to Claude
- [ ] Handle Gemini-specific error codes
- [ ] Calculate cost using Gemini pricing
- [ ] Support streaming with identical `LLMStreamEvent` format
- [ ] Implement retry logic with exponential backoff
- [ ] 40+ unit tests passing

---

#### Task 1.6: Implement ProviderFactory (8 hours)

**Responsibility:** Lead Engineer  
**Deliverable:** `/src/lib/ai/providers/ProviderFactory.ts`

```typescript
// /src/lib/ai/providers/ProviderFactory.ts

import { LLMProvider, ProviderConfig } from './types';
import { ClaudeProvider } from './ClaudeProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';

export class ProviderFactory {
  private static providers: Map<string, LLMProvider> = new Map();

  static createProvider(
    name: 'claude' | 'openai' | 'gemini',
    config: ProviderConfig
  ): LLMProvider {
    const key = `${name}:${config.model}`;

    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let provider: LLMProvider;

    switch (name) {
      case 'claude':
        provider = new ClaudeProvider(config);
        break;
      case 'openai':
        provider = new OpenAIProvider(config);
        break;
      case 'gemini':
        provider = new GeminiProvider(config);
        break;
      default:
        throw new Error(`Unknown provider: ${name}`);
    }

    this.providers.set(key, provider);
    return provider;
  }

  static getProvider(key: string): LLMProvider | undefined {
    return this.providers.get(key);
  }

  static getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  static clearCache(): void {
    this.providers.clear();
  }
}
```

**Acceptance Criteria:**
- [ ] Factory creates providers correctly
- [ ] Provider caching working
- [ ] 20+ unit tests passing
- [ ] No memory leaks
- [ ] Code review approved

---

### Phase 1 Completion Checklist

**Lead Engineer Sign-Off:**
- [ ] LLMProvider interface defined
- [ ] ClaudeProvider implemented and tested (40 tests)
- [ ] OpenAIProvider implemented and tested (40 tests)
- [ ] GeminiProvider implemented and tested (40 tests)
- [ ] ProviderFactory implemented and tested (20 tests)
- [ ] Response format identical across all providers
- [ ] Cost calculation accurate for all providers
- [ ] Health checks working for all providers
- [ ] 140+ unit tests passing
- [ ] Build passes with zero TypeScript errors
- [ ] Code review approved by 2 senior engineers
- [ ] Ready to proceed to Phase 2

---

## PHASE 2: DECISION ROUTING ENGINE (Weeks 5-6)

### Senior Engineer #1: Financial & Question Sequencing Engines

#### Task 2.1: Implement Financial Decision Engine (24 hours)

**Responsibility:** Senior Engineer #1  
**Deliverable:** `/src/lib/ai/engines/financialDecisionEngine.ts`

**Core Logic:**
1. Check for emergency signals (savings < 1 month expenses OR emergency language)
2. Check for high-interest debt (>$0)
3. Check for investment readiness (emergency fund funded AND no high-interest debt)
4. Check for retirement readiness (time horizon ≥10 years)
5. Default to budget

**Implementation must:**
- [ ] Be 100% deterministic (no LLM calls)
- [ ] Handle all edge cases (zero income, no savings, etc.)
- [ ] Return FinancialDecision with all required fields
- [ ] Include reasoning for every decision
- [ ] 30+ unit tests passing

---

#### Task 2.2: Implement Question Sequencing Engine (16 hours)

**Responsibility:** Senior Engineer #1  
**Deliverable:** `/src/lib/ai/engines/questionSequencingEngine.ts`

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

**Implementation must:**
- [ ] Be 100% deterministic (no LLM calls)
- [ ] Return NextQuestion with all required fields
- [ ] Return null when all required fields collected
- [ ] 20+ unit tests passing

---

### Senior Engineer #2: Crisis & Compliance Engines

#### Task 2.3: Implement Crisis Detection Engine (20 hours)

**Responsibility:** Senior Engineer #2 + Compliance Officer  
**Deliverable:** `/src/lib/ai/engines/crisisDetectionEngine.ts`

**Crisis Types:**
- Suicide/self-harm: Keywords like "suicide", "kill myself", "end my life"
- Homelessness: Keywords like "homeless", "living in car", "evicted"
- Hunger: Keywords like "can't afford food", "hungry", "starving"
- Bankruptcy: Keywords like "bankruptcy", "foreclosure", "debt collector"
- Abuse: Keywords like "abuse", "domestic violence", "controlling"
- Financial threshold: Zero income AND zero savings

**Implementation must:**
- [ ] Be 100% deterministic (keyword + threshold based)
- [ ] Return CrisisSignal with appropriate response
- [ ] Include hotline numbers in responses
- [ ] 40+ unit tests passing
- [ ] **Compliance officer approval required**

---

#### Task 2.4: Implement Compliance Engine (16 hours)

**Responsibility:** Senior Engineer #2 + Compliance Officer  
**Deliverable:** `/src/lib/ai/engines/complianceEngine.ts`

**Risk Types:**
- Investment advice: Keywords like "should I buy", "which stock", "crypto"
- Tax advice: Keywords like "tax deduction", "tax strategy", "IRS"
- Legal advice: Keywords like "lawsuit", "contract", "attorney"
- Medical advice: Keywords like "doctor", "medication", "treatment"

**Implementation must:**
- [ ] Be 100% deterministic (keyword based)
- [ ] Return ComplianceRisk with appropriate response
- [ ] Redirect to appropriate professionals
- [ ] 30+ unit tests passing
- [ ] **Compliance officer approval required**

---

#### Task 2.5: Integrate Decision Engines into Chat Route (24 hours)

**Responsibility:** Lead Engineer  
**Deliverable:** Updated `/app/api/chat/route.ts`

**Changes Required:**

1. **Remove old crisis detection (line 886)**
   ```typescript
   // OLD:
   const crisisSignal = detectCrisisSignals(lastUserMsg, conversationHistory, financialProfile as any);
   
   // NEW:
   const crisisSignal = crisisDetectionEngine.detectCrisis(lastUserMsg, extractedData, conversationHistory);
   ```

2. **Remove old compliance detection (line 903)**
   ```typescript
   // OLD:
   const complianceCheck = detectComplianceRisk(lastUserMsg);
   
   // NEW:
   const complianceCheck = complianceEngine.detectComplianceRisk(lastUserMsg);
   ```

3. **Remove old orchestrator (line 949)**
   ```typescript
   // OLD:
   const { sessionStateBlock, ... } = await orchestrate({...});
   
   // NEW:
   const financialDecision = financialDecisionEngine.decideFinancialDomain(extractedData, conversationHistory, priorGoals);
   const nextQuestion = questionSequencingEngine.getNextQuestion(extractedData, financialDecision, conversationHistory);
   ```

4. **Simplify system prompt building**
   - Remove 100+ lines of context building
   - Use decision engines to build context deterministically

**Acceptance Criteria:**
- [ ] All decision engines called deterministically
- [ ] Claude no longer makes financial decisions
- [ ] Chat route 50% shorter (removed decision logic)
- [ ] All existing tests still pass (870/870)
- [ ] New integration tests pass (20+ tests)
- [ ] Build passes with zero TypeScript errors

---

### Phase 2 Completion Checklist

**Lead Engineer Sign-Off:**
- [ ] All 4 decision engines implemented
- [ ] 120+ unit tests passing
- [ ] Chat route refactored to use decision engines
- [ ] Claude becomes communication layer only
- [ ] All 870 existing tests still pass
- [ ] Build passes with zero TypeScript errors
- [ ] Compliance officer approval obtained
- [ ] Code review approved by 2 senior engineers
- [ ] Ready to proceed to Phase 3

---

## PHASE 3: RESPONSE TEMPLATING SYSTEM (Week 7)

### Lead Engineer: Response Template Engine

#### Task 3.1: Implement Response Template Engine (16 hours)

**Responsibility:** Lead Engineer  
**Deliverable:** `/src/lib/ai/engines/responseTemplateEngine.ts`

**Template Types:**
1. `direct_answer` — Simple yes/no or clarification
2. `calculation_result` — Financial calculation with numbers
3. `question` — Ask for missing information
4. `action_plan` — Multi-step action plan
5. `explanation` — Detailed explanation

**Each template must:**
- [ ] Define slots for dynamic content
- [ ] Define constraints (max sentences, max questions, etc.)
- [ ] Define instructions for LLM to fill template
- [ ] Ensure identical output format across providers

---

#### Task 3.2: Implement Response Validator (16 hours)

**Responsibility:** Senior Engineer #2  
**Deliverable:** `/src/lib/ai/engines/responseValidator.ts`

**Validation Rules:**
- [ ] Check sentence count ≤ max
- [ ] Check question count ≤ max
- [ ] Check action present if required
- [ ] Check calculation present if required
- [ ] Check no markdown formatting
- [ ] Check no bullet points or lists

**If validation fails:**
- [ ] Retry with stricter constraints
- [ ] If still fails, return fallback response

---

### Phase 3 Completion Checklist

**Lead Engineer Sign-Off:**
- [ ] Response template engine implemented
- [ ] All template types working
- [ ] Response validator implemented
- [ ] 80+ unit tests passing
- [ ] Response format identical across providers
- [ ] Build passes with zero TypeScript errors
- [ ] Code review approved by 2 senior engineers
- [ ] Ready to proceed to Phase 4

---

## PHASE 4 & 5: OPTIMIZATION & QUALITY GATE (Week 8)

### Lead Engineer: Multi-Provider Routing & Quality Gate

#### Task 4.1: Implement Provider Selection Logic (16 hours)

**Responsibility:** Lead Engineer  
**Deliverable:** `/src/lib/ai/engines/multiProviderRoutingEngine.ts`

**Routing Decision Factors:**
- Complexity (simple/moderate/complex)
- Cost budget
- Latency requirements
- Provider availability
- User tier (free/pro/enterprise)

**Routing Rules:**
- Simple questions → Haiku or Gemini Flash (cheapest)
- Moderate questions → Sonnet or GPT-4 Turbo (balanced)
- Complex questions → Opus or GPT-4 (best quality)

---

#### Task 4.2: Implement Production Quality Gate (24 hours)

**Responsibility:** QA Engineer  
**Deliverable:** `/src/lib/evals/productionEvalFramework.ts`

**80+ Evaluation Cases:**
- D1: Safety & Compliance (11 evals)
- D2: Accuracy & Grounding (8 evals)
- D3: Teaching Excellence (10 evals)
- D4: Personalization & Adaptive Flow (10 evals)
- D5: Data Extraction Precision (7 evals)
- D6: Tone, Empathy & Trust (9 evals)
- D7: Financial Calculation Integrity (8 evals)
- D8: Professional Domain Accuracy (20 evals)
- D9: Multi-Provider Coherence (6 evals)
- D10: Proactive Intelligence (5 evals)
- D11: Long-Term Learning & Outcome (6 evals)
- D12: Competitive Excellence (6 evals)

**Quality Gate:**
- [ ] All CRITICAL evals passing (zero tolerance)
- [ ] All HIGH evals passing
- [ ] Dimension scores: D1-D7 ≥95%, D8-D12 ≥90%
- [ ] Multi-provider coherence verified
- [ ] Blocks deployment if failures detected

---

### Phase 4 & 5 Completion Checklist

**Lead Engineer Sign-Off:**
- [ ] Provider selection logic implemented
- [ ] Cost optimization working (40-60% reduction)
- [ ] Latency optimization working (<2s for simple)
- [ ] Quality monitoring working
- [ ] 200+ production eval tests passing
- [ ] All CRITICAL evals passing
- [ ] All HIGH evals passing
- [ ] Dimension scores achieved
- [ ] Multi-provider coherence verified
- [ ] Build passes with zero TypeScript errors
- [ ] Compliance officer approval obtained
- [ ] Code review approved by 2 senior engineers
- [ ] **READY FOR PRODUCTION DEPLOYMENT**

---

## FINAL SIGN-OFF CHECKLIST

### Lead Engineer (CTO)
- [ ] All 5 phases completed
- [ ] 640+ new unit tests passing
- [ ] All 870 existing tests still passing
- [ ] Build passes with zero TypeScript errors
- [ ] Code review approved by 2+ senior engineers
- [ ] Performance benchmarks met
- [ ] Cost reduction achieved (40-60%)
- [ ] Reliability improved (99.9% uptime)
- [ ] Production quality gate passed
- [ ] Ready for deployment

### Compliance Officer
- [ ] Crisis detection engine approved
- [ ] Compliance engine approved
- [ ] All safety measures in place
- [ ] Zero financial harm risk
- [ ] Regulatory compliance verified
- [ ] Ready for deployment

### Product Manager
- [ ] Feature parity with Claude-only version
- [ ] User experience improved
- [ ] Cost savings passed to customers
- [ ] Multi-provider reliability benefits communicated
- [ ] Ready for customer deployment

---

## DEPLOYMENT CHECKLIST

1. **Pre-Deployment (24 hours before)**
   - [ ] All tests passing
   - [ ] All code reviewed
   - [ ] All approvals obtained
   - [ ] Rollback plan documented
   - [ ] Monitoring dashboards ready

2. **Deployment (production)**
   - [ ] Deploy to staging first
   - [ ] Run full test suite on staging
   - [ ] Run production eval framework on staging
   - [ ] Deploy to production (blue-green)
   - [ ] Monitor for 24 hours
   - [ ] Verify cost savings
   - [ ] Verify latency improvements
   - [ ] Verify quality metrics

3. **Post-Deployment (ongoing)**
   - [ ] Weekly quality gate runs
   - [ ] Cost tracking per provider
   - [ ] Latency tracking per provider
   - [ ] User satisfaction monitoring
   - [ ] Compliance violation monitoring
   - [ ] Dimension score tracking

---

## SUCCESS DEFINITION

**Atlas has successfully transformed from wrapper to platform when:**

1. **Architecture**
   - ✅ 100+ engines consolidated to 12 core modules
   - ✅ Zero Claude-specific code in core logic
   - ✅ Decision hierarchy established and enforced
   - ✅ All 12 engines have clear interfaces

2. **Provider Abstraction**
   - ✅ 4 providers implemented (Claude, OpenAI, Gemini, Together)
   - ✅ Response format identical across providers
   - ✅ Cost calculation accurate for all providers
   - ✅ Health checks working for all providers

3. **Decision Routing**
   - ✅ All financial decisions made deterministically
   - ✅ Claude no longer makes financial decisions
   - ✅ Same decisions regardless of LLM provider
   - ✅ Crisis/compliance detection deterministic

4. **Response Templating**
   - ✅ Response format standardized
   - ✅ Any LLM can fill templates
   - ✅ Financial content identical across providers
   - ✅ Communication style adapted per provider

5. **Multi-Provider Optimization**
   - ✅ Cost reduced 40-60% vs Claude-only
   - ✅ Latency <2s for simple questions
   - ✅ Provider fallback working
   - ✅ Quality maintained across providers

6. **Production Quality**
   - ✅ 100/100 CFP-grade standard achieved
   - ✅ Zero CRITICAL eval failures
   - ✅ All HIGH evals passing
   - ✅ Dimension scores: D1-D7 ≥95%, D8-D12 ≥90%
   - ✅ Multi-provider coherence verified

7. **Code Quality**
   - ✅ 640+ new unit tests passing
   - ✅ All 870 existing tests still passing
   - ✅ Zero TypeScript errors
   - ✅ Code review approved by 2+ senior engineers
   - ✅ Compliance officer approval obtained

**When all 7 categories are complete, Atlas is no longer a wrapper—it's a defensible financial reasoning platform.**
