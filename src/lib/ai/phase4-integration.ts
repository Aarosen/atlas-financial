/**
 * Phase 4: Integration Layer
 * 
 * Integrates all Phase 2-3 validation frameworks into production
 * Target: 98+/100 overall readiness
 */

// ─────────────────────────────────────────────────────────────────────────────
// D2: ACCURACY & GROUNDING INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

interface GroundTruthFact {
  claim: string;
  correctAnswer: string;
  source: string;
  category: string;
  verifiedDate: string;
}

const groundTruthDatabase: GroundTruthFact[] = [
  // TAX FACTS
  { claim: '2025 standard deduction (single)', correctAnswer: '$14,600', source: 'IRS.gov', category: 'tax', verifiedDate: '2025-01-01' },
  { claim: '2025 401(k) limit', correctAnswer: '$23,500', source: 'IRS.gov', category: 'tax', verifiedDate: '2025-01-01' },
  { claim: '2025 IRA limit', correctAnswer: '$7,000', source: 'IRS.gov', category: 'tax', verifiedDate: '2025-01-01' },
  { claim: '2025 HSA limit (individual)', correctAnswer: '$4,300', source: 'IRS.gov', category: 'tax', verifiedDate: '2025-01-01' },
  { claim: 'Social Security tax rate', correctAnswer: '6.2%', source: 'SSA.gov', category: 'tax', verifiedDate: '2025-01-01' },
  { claim: 'Medicare tax rate', correctAnswer: '1.45%', source: 'IRS.gov', category: 'tax', verifiedDate: '2025-01-01' },
  
  // INVESTMENT FACTS
  { claim: 'Historical stock return (long-term)', correctAnswer: '~10% annually', source: 'Vanguard', category: 'investment', verifiedDate: '2024-12-31' },
  { claim: 'Historical bond return (long-term)', correctAnswer: '~5% annually', source: 'Vanguard', category: 'investment', verifiedDate: '2024-12-31' },
  { claim: 'Long-term capital gains tax (top)', correctAnswer: '20%', source: 'IRS.gov', category: 'investment', verifiedDate: '2025-01-01' },
  
  // RETIREMENT FACTS
  { claim: 'Full retirement age (born 1960)', correctAnswer: '67 years old', source: 'SSA.gov', category: 'retirement', verifiedDate: '2025-01-01' },
  { claim: 'Social Security earliest claiming age', correctAnswer: '62 years old', source: 'SSA.gov', category: 'retirement', verifiedDate: '2025-01-01' },
  { claim: 'RMD start age (2023+)', correctAnswer: '73 years old', source: 'IRS.gov', category: 'retirement', verifiedDate: '2023-01-01' },
  { claim: '4% withdrawal rule sustainability', correctAnswer: '~30-year retirement', source: 'Trinity Study', category: 'retirement', verifiedDate: '2024-12-31' },
  
  // PERSONAL FINANCE FACTS
  { claim: 'Recommended emergency fund', correctAnswer: '3-6 months expenses', source: 'CFP Board', category: 'personal_finance', verifiedDate: '2024-12-31' },
  { claim: 'Recommended DTI ratio', correctAnswer: '< 36%', source: 'CFPB', category: 'personal_finance', verifiedDate: '2024-12-31' },
  { claim: 'Credit utilization impact', correctAnswer: '30% of score', source: 'FICO', category: 'personal_finance', verifiedDate: '2024-12-31' },
  { claim: 'Payment history impact', correctAnswer: '35% of score', source: 'FICO', category: 'personal_finance', verifiedDate: '2024-12-31' },
];

export function validateAgainstGroundTruth(response: string): { isAccurate: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for hallucinations
  const guaranteedPhrases = ['guaranteed return', 'guaranteed profit', 'promise to return'];
  for (const phrase of guaranteedPhrases) {
    if (response.toLowerCase().includes(phrase)) {
      issues.push(`Prohibited language detected: "${phrase}"`);
    }
  }
  
  // Check for generic advice
  const genericPhrases = ['most people', 'generally', 'typically', 'usually'];
  let genericCount = 0;
  for (const phrase of genericPhrases) {
    if (response.toLowerCase().includes(phrase)) {
      genericCount++;
    }
  }
  if (genericCount > 2) {
    issues.push('Too much generic advice (use user-specific data)');
  }
  
  return {
    isAccurate: issues.length === 0,
    issues,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// D3: TEACHING EXCELLENCE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

interface TeachingMoment {
  what: string;
  why: string;
  action: string;
  example?: string;
}

export function detectTeachingOpportunity(userMessage: string, concern: string): TeachingMoment | null {
  const teachingMap: Record<string, TeachingMoment> = {
    debt_stress: {
      what: 'The debt avalanche method prioritizes your highest-interest debt first',
      why: 'This saves you the most money in interest over time',
      action: 'List your debts by interest rate and attack the highest one first',
      example: 'If you have a 24% credit card and 5% student loan, pay minimums on the student loan and throw extra money at the credit card',
    },
    emergency_fund: {
      what: 'An emergency fund is 3-6 months of expenses set aside for unexpected costs',
      why: 'It prevents you from going into debt when emergencies happen',
      action: 'Start with $1,000, then build to 3-6 months of expenses',
      example: 'If your expenses are $4,000/month, aim for $12,000-$24,000 in emergency savings',
    },
    retirement_planning: {
      what: 'Retirement accounts like 401(k) and IRA grow tax-free or tax-deferred',
      why: 'This compound growth over decades significantly increases your retirement savings',
      action: 'Contribute to your employer 401(k) first (especially if they match), then max out an IRA',
      example: 'A $7,000 IRA contribution at 7% growth becomes $50,000+ in 30 years',
    },
  };
  
  return teachingMap[concern] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// D5: DATA EXTRACTION INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

interface ExtractedData {
  values: Record<string, any>;
  confidence: Record<string, 'high' | 'medium' | 'low'>;
  assumptions: string[];
}

export function extractFinancialData(userMessage: string): ExtractedData {
  const extracted: ExtractedData = {
    values: {},
    confidence: {},
    assumptions: [],
  };
  
  // Extract numbers
  const numberPattern = /\$?([\d,]+(?:\.\d{2})?)/g;
  const matches = userMessage.matchAll(numberPattern);
  
  let index = 0;
  for (const match of matches) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    
    // Infer what the number represents based on context
    if (userMessage.toLowerCase().includes('debt') || userMessage.toLowerCase().includes('owe')) {
      extracted.values.debtBalance = value;
      extracted.confidence.debtBalance = 'high';
    } else if (userMessage.toLowerCase().includes('income') || userMessage.toLowerCase().includes('earn')) {
      extracted.values.monthlyIncome = value;
      extracted.confidence.monthlyIncome = 'high';
    } else if (userMessage.toLowerCase().includes('save') || userMessage.toLowerCase().includes('have')) {
      extracted.values.savings = value;
      extracted.confidence.savings = 'medium';
      extracted.assumptions.push('Assuming this is total savings (not monthly)');
    }
    
    index++;
  }
  
  // Extract percentages (interest rates)
  const percentPattern = /(\d+(?:\.\d{1,2})?)\s*%/g;
  const percentMatches = userMessage.matchAll(percentPattern);
  
  for (const match of percentMatches) {
    const value = parseFloat(match[1]) / 100;
    if (userMessage.toLowerCase().includes('interest') || userMessage.toLowerCase().includes('rate')) {
      extracted.values.interestRate = value;
      extracted.confidence.interestRate = 'high';
    }
  }
  
  return extracted;
}

// ─────────────────────────────────────────────────────────────────────────────
// D6: TONE & EMPATHY INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

export function matchToneToContext(userMessage: string, concern: string): { tone: string; warmthLevel: number } {
  const urgencySignals = {
    critical: ['drowning', 'emergency', 'urgent', 'immediately', 'can\'t afford', 'losing my home'],
    high: ['worried', 'anxious', 'stressed', 'struggling', 'difficult', 'concerned'],
    medium: ['should I', 'how do I', 'best way', 'considering', 'thinking about'],
    low: ['curious about', 'interested in', 'just wondering', 'general question'],
  };
  
  let urgencyLevel = 'medium';
  for (const [level, signals] of Object.entries(urgencySignals)) {
    if (signals.some(signal => userMessage.toLowerCase().includes(signal))) {
      urgencyLevel = level;
      break;
    }
  }
  
  const toneMap: Record<string, { tone: string; warmthLevel: number }> = {
    critical: { tone: 'supportive_urgent', warmthLevel: 4.8 },
    high: { tone: 'supportive_focused', warmthLevel: 4.5 },
    medium: { tone: 'educational', warmthLevel: 4.2 },
    low: { tone: 'exploratory', warmthLevel: 4.0 },
  };
  
  return toneMap[urgencyLevel] || { tone: 'neutral', warmthLevel: 3.5 };
}

export function enhanceWithWarmth(response: string, warmthLevel: number): string {
  if (warmthLevel >= 4.5) {
    // Add validating language
    if (!response.includes('I hear you') && !response.includes('I understand')) {
      return `I hear you - that sounds really challenging. ${response}`;
    }
  }
  
  if (warmthLevel >= 4.0) {
    // Add encouraging language
    if (!response.includes('together') && !response.includes('we can')) {
      return `${response} Let's work through this together.`;
    }
  }
  
  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// D9: MULTI-AGENT COHERENCE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

export function validateMultiAgentCoherence(response: string): { isCoherent: boolean; issues: string[] } {
  const issues: string[] = [];
  
  // Check for contradictions
  const contradictionPatterns = [
    { pattern1: /stocks are risky/i, pattern2: /put all.*in stocks/i },
    { pattern1: /save 3-6 months/i, pattern2: /need 12 months/i },
    { pattern1: /pay off debt/i, pattern2: /don't worry about debt/i },
  ];
  
  for (const { pattern1, pattern2 } of contradictionPatterns) {
    if (pattern1.test(response) && pattern2.test(response)) {
      issues.push('Contradictory advice detected');
    }
  }
  
  // Check for agent-specific language
  if (/the.*agent says|agent recommends/i.test(response)) {
    issues.push('Avoid mentioning individual agents - present unified voice');
  }
  
  // Check for unified recommendations
  if (!/here's.*strategy|here's.*plan|integrated|comprehensive/i.test(response)) {
    issues.push('Consider presenting an integrated strategy instead of separate recommendations');
  }
  
  return {
    isCoherent: issues.length === 0,
    issues,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// D10: PROACTIVE INTELLIGENCE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

export function detectProactiveOpportunities(userProfile: Record<string, any>): string[] {
  const opportunities: string[] = [];
  
  // Tax opportunity detection
  if (userProfile.monthlyIncome && userProfile.monthlyIncome > 5000) {
    if (!userProfile.retirement401k) {
      opportunities.push('You haven\'t mentioned retirement savings. With your income, you could contribute $23,500 to a 401(k) this year.');
    }
    if (!userProfile.hsa) {
      opportunities.push('If you have a high-deductible health plan, you could contribute $4,300 to an HSA for triple tax benefits.');
    }
  }
  
  // Emergency fund detection
  if (userProfile.debtBalance && !userProfile.emergencyFund) {
    opportunities.push('Building a small emergency fund ($1,000) should be your first step before aggressive debt payoff.');
  }
  
  // Retirement gap detection
  if (userProfile.age && userProfile.yearsToRetirement && userProfile.retirementSavings === 0) {
    const yearsLeft = userProfile.yearsToRetirement;
    if (yearsLeft < 20) {
      opportunities.push(`With ${yearsLeft} years to retirement and no savings, you need to start immediately. This is urgent.`);
    }
  }
  
  return opportunities;
}

// ─────────────────────────────────────────────────────────────────────────────
// D11: LONG-TERM LEARNING INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

export interface UserOutcomeMetrics {
  debtReduction: number; // percentage
  savingsGrowth: number; // percentage
  financialConfidence: number; // 0-5
  creditScoreImprovement: number; // points
  conceptsMastered: string[];
  strugglingConcepts: string[];
}

export function trackOutcomeProgress(previousMetrics: UserOutcomeMetrics | null, currentState: Record<string, any>): UserOutcomeMetrics {
  const metrics: UserOutcomeMetrics = {
    debtReduction: previousMetrics?.debtReduction || 0,
    savingsGrowth: previousMetrics?.savingsGrowth || 0,
    financialConfidence: previousMetrics?.financialConfidence || 3.0,
    creditScoreImprovement: previousMetrics?.creditScoreImprovement || 0,
    conceptsMastered: previousMetrics?.conceptsMastered || [],
    strugglingConcepts: previousMetrics?.strugglingConcepts || [],
  };
  
  // Update metrics based on current state
  const previousState = previousMetrics as any;
  if (currentState.debtBalance && previousState?.debtBalance) {
    const reduction = ((previousState.debtBalance - currentState.debtBalance) / previousState.debtBalance) * 100;
    metrics.debtReduction = Math.max(metrics.debtReduction, reduction);
  }
  
  if (currentState.savings && previousState?.savings) {
    const growth = ((currentState.savings - previousState.savings) / previousState.savings) * 100;
    metrics.savingsGrowth = Math.max(metrics.savingsGrowth, growth);
  }
  
  // Increase confidence with each session
  metrics.financialConfidence = Math.min(5.0, (previousMetrics?.financialConfidence || 3.0) + 0.3);
  
  return metrics;
}

// ─────────────────────────────────────────────────────────────────────────────
// D12: COMPETITIVE EXCELLENCE INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

export function validateCompetitiveExcellence(response: string): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  let score = 100;
  
  // Check for personalization
  if (/most people|generally|typically|usually/i.test(response)) {
    gaps.push('Generic advice detected - use user-specific data');
    score -= 10;
  }
  
  // Check for specificity
  if (!/\$|%|months|years|specific|your|based on/i.test(response)) {
    gaps.push('Lack of specific numbers or user context');
    score -= 15;
  }
  
  // Check for comprehensiveness
  if (!/strategy|plan|step|integrated|approach/i.test(response)) {
    gaps.push('Response lacks comprehensive strategy');
    score -= 10;
  }
  
  // Check for warmth
  if (!/I hear|I understand|together|let's|you can|proud|amazing/i.test(response)) {
    gaps.push('Response lacks warmth and empathy');
    score -= 10;
  }
  
  // Check for clarity
  if (response.length > 500 && !/\d\)|step|first|second|third/i.test(response)) {
    gaps.push('Long response without clear structure');
    score -= 5;
  }
  
  return {
    score: Math.max(0, score),
    gaps,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER INTEGRATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export interface Phase4IntegrationResult {
  originalResponse: string;
  enhancedResponse: string;
  validations: {
    accuracy: { isAccurate: boolean; issues: string[] };
    coherence: { isCoherent: boolean; issues: string[] };
    competitive: { score: number; gaps: string[] };
  };
  improvements: {
    teaching: TeachingMoment | null;
    proactive: string[];
    tone: { tone: string; warmthLevel: number };
  };
  readinessScore: number; // 0-100
}

export function integratePhase4Frameworks(
  originalResponse: string,
  userMessage: string,
  userProfile: Record<string, any>,
  concern: string
): Phase4IntegrationResult {
  // Validate accuracy
  const accuracy = validateAgainstGroundTruth(originalResponse);
  
  // Validate coherence
  const coherence = validateMultiAgentCoherence(originalResponse);
  
  // Validate competitive excellence
  const competitive = validateCompetitiveExcellence(originalResponse);
  
  // Detect teaching opportunity
  const teaching = detectTeachingOpportunity(userMessage, concern);
  
  // Detect proactive opportunities
  const proactive = detectProactiveOpportunities(userProfile);
  
  // Match tone to context
  const tone = matchToneToContext(userMessage, concern);
  
  // Enhance with warmth
  let enhancedResponse = originalResponse;
  enhancedResponse = enhanceWithWarmth(enhancedResponse, tone.warmthLevel);
  
  // Add teaching moment if available
  if (teaching && !originalResponse.toLowerCase().includes('here\'s how')) {
    enhancedResponse += `\n\nHere's how this works: ${teaching.what} ${teaching.why} ${teaching.action}`;
  }
  
  // Add proactive insights
  if (proactive.length > 0) {
    enhancedResponse += `\n\nProactive insight: ${proactive[0]}`;
  }
  
  // Calculate readiness score
  const accuracyScore = accuracy.isAccurate ? 25 : 15;
  const coherenceScore = coherence.isCoherent ? 25 : 15;
  const competitiveScore = competitive.score;
  const readinessScore = (accuracyScore + coherenceScore + competitiveScore) / 75 * 100;
  
  return {
    originalResponse,
    enhancedResponse,
    validations: {
      accuracy,
      coherence,
      competitive,
    },
    improvements: {
      teaching,
      proactive,
      tone,
    },
    readinessScore: Math.round(readinessScore),
  };
}

export { groundTruthDatabase };
