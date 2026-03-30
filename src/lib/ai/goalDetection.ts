/**
 * Goal detection from conversation
 * Identifies financial goals mentioned by user or assistant
 * Uses AI-based extraction for high accuracy on natural language
 */

import type { FinancialGoal } from '@/lib/goals/multiGoalTypes';

/**
 * Detect goals from user or assistant message using AI-based extraction
 * Falls back to regex pattern matching if AI extraction fails
 */
export async function detectGoalsFromMessage(message: string, apiKey?: string): Promise<FinancialGoal[]> {
  // If API key provided, use AI-based extraction for higher accuracy
  if (apiKey) {
    try {
      return await detectGoalsWithAI(message, apiKey);
    } catch (error) {
      console.error('[goal-detection] AI extraction failed, falling back to regex:', error);
      // Fall through to regex-based detection
    }
  }

  // Fallback: Regex-based detection for quick pattern matching
  return detectGoalsWithRegex(message);
}

/**
 * AI-based goal detection using Claude API
 * Extracts goals from natural language with high accuracy
 */
async function detectGoalsWithAI(message: string, apiKey: string): Promise<FinancialGoal[]> {
  const extractionPrompt = `Extract financial goals from this message. Return a JSON array of goals.

For each goal, identify:
- type: 'debt_payoff' | 'emergency_fund' | 'savings' | 'investment' | 'retirement' | 'other'
- title: Brief goal title (5-10 words)
- description: What the user wants to achieve
- targetAmount: Number if mentioned, else 0
- priority: 'critical' | 'high' | 'medium' | 'low'

Message: "${message}"

Return ONLY valid JSON array. Example: [{"type":"debt_payoff","title":"Pay off credit cards","description":"Eliminate $5000 credit card debt","targetAmount":5000,"priority":"high"}]`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: extractionPrompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: any = await response.json();
    const text = data.content?.[0]?.text || '[]';
    const extracted = JSON.parse(text);

    if (!Array.isArray(extracted)) {
      return [];
    }

    return extracted.map((goal: any) => ({
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: goal.type || 'other',
      title: goal.title || 'Financial goal',
      description: goal.description,
      targetAmount: goal.targetAmount || 0,
      currentAmount: 0,
      status: 'active' as const,
      priority: goal.priority || 'medium',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[goal-detection] AI extraction error:', error);
    throw error;
  }
}

/**
 * Regex-based goal detection (fallback)
 * Fast pattern matching for common goal keywords
 */
function detectGoalsWithRegex(message: string): FinancialGoal[] {
  const goals: FinancialGoal[] = [];
  const lowerMsg = message.toLowerCase();

  // Debt payoff goal detection
  if (lowerMsg.match(/\b(pay off|payoff|eliminate|reduce|credit card|debt|loan)\b/i)) {
    goals.push({
      id: `debt-${Date.now()}`,
      type: 'debt_payoff',
      title: 'Pay off debt',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'high',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Emergency fund detection
  if (lowerMsg.match(/\b(emergency fund|emergency savings|rainy day|safety net|buffer)\b/i)) {
    goals.push({
      id: `emergency-${Date.now()}`,
      type: 'emergency_fund',
      title: 'Build emergency fund',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'high',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Savings goal detection
  if (lowerMsg.match(/\b(save|savings|accumulate|build up)\b/i) && !lowerMsg.match(/emergency/i)) {
    goals.push({
      id: `savings-${Date.now()}`,
      type: 'savings',
      title: 'Build savings',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'medium',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Investment goal detection
  if (lowerMsg.match(/\b(invest|investment|stock|portfolio|brokerage|index fund)\b/i)) {
    goals.push({
      id: `investment-${Date.now()}`,
      type: 'investment',
      title: 'Start investing',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'medium',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Retirement goal detection
  if (lowerMsg.match(/\b(retire|retirement|401k|roth|ira|pension)\b/i)) {
    goals.push({
      id: `retirement-${Date.now()}`,
      type: 'retirement',
      title: 'Plan for retirement',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'medium',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return goals;
}

/**
 * Check if message contains goal-related keywords (synchronous)
 */
export function messageContainsGoal(message: string): boolean {
  return detectGoalsWithRegex(message).length > 0;
}
