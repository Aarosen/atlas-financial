/**
 * Response Enhancement Engine
 * Systematically improves Atlas responses across all championship dimensions
 * Implements continuous improvement from eval feedback
 */

import type { FinancialState } from '@/lib/state/types';
import { detectOpportunities, formatOpportunitiesForResponse } from './proactiveOpportunityDetector';
import { evaluateExcellence } from './competitiveExcellenceEngine';

export interface ResponseContext {
  userMessage: string;
  baseResponse: string;
  financialState: FinancialState;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface EnhancedResponse {
  original: string;
  enhanced: string;
  improvements: string[];
  excellenceScore: number;
}

/**
 * Enhance response with proactive opportunities (D10)
 */
function enhanceWithOpportunities(response: string, fin: FinancialState): string {
  const opportunities = detectOpportunities(fin);
  if (opportunities.length === 0) return response;

  const opportunitiesText = formatOpportunitiesForResponse(opportunities);
  return response + opportunitiesText;
}

/**
 * Enhance response with deeper financial context (D2, D8)
 */
function enhanceWithContext(response: string, fin: FinancialState): string {
  let enhanced = response;

  // Add specific numbers and context
  if (fin.monthlyIncome && !response.includes('income')) {
    enhanced += `\n\nWith your $${fin.monthlyIncome.toFixed(0)}/month income, here's what's possible...`;
  }

  if (fin.highInterestDebt && fin.highInterestDebt > 0 && !response.includes('debt')) {
    const monthlyPayment = fin.highInterestDebt / 24; // Rough estimate
    enhanced += `\n\nYour $${fin.highInterestDebt.toFixed(0)} high-interest debt is costing you ~$${(fin.highInterestDebt * 0.24 / 12).toFixed(0)}/month in interest.`;
  }

  return enhanced;
}

/**
 * Enhance response with teaching moments (D3)
 */
function enhanceWithTeaching(response: string, userMessage: string): string {
  const teachingOpportunities: Record<string, string> = {
    'compound': 'Compound growth is powerful because your returns earn returns. Over 30 years, this turns $180k in contributions into $600k+.',
    'emergency fund': 'An emergency fund prevents you from going into debt when life happens. It\'s your financial shock absorber.',
    'debt avalanche': 'The debt avalanche method saves you the most money: pay minimums on all debts, then attack the highest-rate debt first.',
    'diversification': 'Diversification means spreading your money across different investments so one bad year doesn\'t derail you.',
    'tax-advantaged': 'Tax-advantaged accounts like 401ks and IRAs let your money grow without being taxed every year. That\'s free growth.',
  };

  for (const [concept, explanation] of Object.entries(teachingOpportunities)) {
    if (userMessage.toLowerCase().includes(concept) && !response.includes(explanation)) {
      return response + `\n\n**Why this matters:** ${explanation}`;
    }
  }

  return response;
}

/**
 * Enhance response with specific next steps (D4, D10)
 */
function enhanceWithActionSteps(response: string, userMessage: string): string {
  if (response.includes('next step') || response.includes('action')) {
    return response; // Already has action steps
  }

  const actionPatterns: Record<string, string> = {
    'debt': '\n\n**Your next step:** List all your debts by interest rate (highest first). Commit to paying minimums on all, then attack the highest-rate debt with any extra money.',
    'savings': '\n\n**Your next step:** Automate your savings. Set up a transfer on payday so money goes to savings before you can spend it.',
    'investing': '\n\n**Your next step:** Open a low-cost brokerage account and invest in a diversified index fund. Start with whatever you can afford.',
    'retirement': '\n\n**Your next step:** Check if your employer offers a 401k match. If so, contribute enough to get the full match — that\'s free money.',
    'budget': '\n\n**Your next step:** Track your spending for 2 weeks. You\'ll see exactly where your money goes, then you can make real changes.',
  };

  for (const [keyword, action] of Object.entries(actionPatterns)) {
    if (userMessage.toLowerCase().includes(keyword) && !response.includes('next step')) {
      return response + action;
    }
  }

  return response;
}

/**
 * Enhance response with empathy and warmth (D6)
 */
function enhanceWithEmpathy(response: string, userMessage: string): string {
  const emotionalKeywords: Record<string, string> = {
    'overwhelm': 'You\'re not alone in feeling this way. Many people feel overwhelmed by money — the fact that you\'re facing it head-on is huge.',
    'worry': 'That worry is valid. But you\'re already taking the right step by thinking this through.',
    'stuck': 'Feeling stuck is normal. The good news is that small changes compound over time.',
    'fail': 'Everyone makes financial mistakes. What matters is learning and moving forward.',
    'scared': 'It\'s okay to feel scared about money. That means it matters to you.',
  };

  for (const [keyword, empathy] of Object.entries(emotionalKeywords)) {
    if (userMessage.toLowerCase().includes(keyword) && !response.includes(empathy)) {
      return response + `\n\n${empathy}`;
    }
  }

  return response;
}

/**
 * Systematically enhance response across all dimensions
 */
export function enhanceResponse(context: ResponseContext): EnhancedResponse {
  let enhanced = context.baseResponse;
  const improvements: string[] = [];

  // D10: Add proactive opportunities
  const withOpportunities = enhanceWithOpportunities(enhanced, context.financialState);
  if (withOpportunities !== enhanced) {
    improvements.push('Added proactive financial opportunities');
    enhanced = withOpportunities;
  }

  // D2, D8: Add financial context
  const withContext = enhanceWithContext(enhanced, context.financialState);
  if (withContext !== enhanced) {
    improvements.push('Added specific financial context');
    enhanced = withContext;
  }

  // D3: Add teaching moments
  const withTeaching = enhanceWithTeaching(enhanced, context.userMessage);
  if (withTeaching !== enhanced) {
    improvements.push('Added teaching moment');
    enhanced = withTeaching;
  }

  // D4, D10: Add action steps
  const withActions = enhanceWithActionSteps(enhanced, context.userMessage);
  if (withActions !== enhanced) {
    improvements.push('Added specific next steps');
    enhanced = withActions;
  }

  // D6: Add empathy
  const withEmpathy = enhanceWithEmpathy(enhanced, context.userMessage);
  if (withEmpathy !== enhanced) {
    improvements.push('Added empathetic acknowledgment');
    enhanced = withEmpathy;
  }

  const evaluation = evaluateExcellence(enhanced);

  return {
    original: context.baseResponse,
    enhanced,
    improvements,
    excellenceScore: evaluation.score,
  };
}

/**
 * Batch enhance multiple responses
 */
export function enhanceResponses(contexts: ResponseContext[]): EnhancedResponse[] {
  return contexts.map(ctx => enhanceResponse(ctx));
}
