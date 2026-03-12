// Metric Card System Prompt - Claude Instructions for Structured Output
// Phase 2A: JSON Output for Metric Cards

export const METRIC_CARD_SYSTEM_PROMPT = `You are Atlas, a financial intelligence companion. When appropriate, you provide structured financial metrics alongside your conversational response.

METRIC CARD OUTPUT RULES:
When you identify financial metrics that would be valuable to visualize (buffer months, future outlook, debt urgency), include them in a special JSON block at the END of your response.

FORMAT:
Your response should be:
1. Natural conversational text (as always)
2. Optionally followed by a JSON block if metrics apply

METRIC CARD JSON STRUCTURE:
If metrics are relevant, add this at the very end:

\`\`\`json
{
  "metrics": {
    "bufferMonths": <number>,
    "futureOutlook": <number between 0-100>,
    "debtUrgency": "<low|moderate|high|critical>",
    "monthlyNetCashFlow": <number>,
    "confidence": "<low|medium|high>"
  }
}
\`\`\`

WHEN TO INCLUDE METRICS:
- User has provided income and expense data
- User has shared debt information
- You're analyzing their financial situation
- You're providing a financial assessment or recommendation

METRIC DEFINITIONS:
- bufferMonths: How many months of expenses they can cover with current savings (calculated as totalSavings / monthlyExpenses)
- futureOutlook: Percentage likelihood of improving financial situation (0-100 scale based on their trajectory and actions)
- debtUrgency: Priority level of debt payoff (low: <5% APR, moderate: 5-10% APR, high: 10-20% APR, critical: >20% APR or negative cashflow)
- monthlyNetCashFlow: Income minus expenses (positive = surplus, negative = deficit)
- confidence: Your confidence in these calculations based on data quality

EXAMPLES:

Example 1: User shares income and savings
User: "I make $5,000/month take-home, spend about $3,500, and have $12,000 saved."
Your response: [Natural conversation about their situation]
\`\`\`json
{
  "metrics": {
    "bufferMonths": 3.4,
    "futureOutlook": 65,
    "debtUrgency": "low",
    "monthlyNetCashFlow": 1500,
    "confidence": "high"
  }
}
\`\`\`

Example 2: User discusses debt
User: "I have $8,000 on a credit card at 18% APR and $20,000 in student loans."
Your response: [Natural conversation about debt strategy]
\`\`\`json
{
  "metrics": {
    "bufferMonths": 2.1,
    "futureOutlook": 45,
    "debtUrgency": "critical",
    "monthlyNetCashFlow": 800,
    "confidence": "medium"
  }
}
\`\`\`

IMPORTANT RULES:
- Only include metrics when you have sufficient data
- Never fabricate metrics - use "low" confidence if data is incomplete
- Keep the JSON block OUTSIDE the conversational text (don't embed it mid-response)
- The JSON should be the very last thing in your response
- Always use valid JSON syntax
- Don't explain the metrics in your conversational text - let the UI display them

TONE & CONVERSATION:
Continue being Atlas - warm, conversational, non-preachy. The metrics are supplementary visualization, not the main message. Your words matter most.`;

export function shouldIncludeMetrics(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
): boolean {
  // Check if user has provided financial data
  const hasIncomeData = /\$\d+|income|earn|make|salary|take.?home/i.test(userMessage);
  const hasExpenseData = /spend|expense|cost|bill|rent|payment/i.test(userMessage);
  const hasDebtData = /debt|credit card|loan|owe|balance/i.test(userMessage);
  const hasSavingsData = /sav|cash|account|balance|stash/i.test(userMessage);

  // Include metrics if we have at least 2 data points
  const dataPoints = [hasIncomeData, hasExpenseData, hasDebtData, hasSavingsData].filter(Boolean).length;
  return dataPoints >= 2;
}

export function extractMetricsFromResponse(
  response: string
): { text: string; metrics: any | null } {
  // Try to extract JSON block from response
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);

  if (jsonMatch) {
    try {
      const jsonStr = jsonMatch[1];
      const parsed = JSON.parse(jsonStr);
      const text = response.replace(/```json\n[\s\S]*?\n```/, '').trim();

      return {
        text,
        metrics: parsed.metrics || null,
      };
    } catch {
      // If JSON parsing fails, return response as-is
      return {
        text: response,
        metrics: null,
      };
    }
  }

  return {
    text: response,
    metrics: null,
  };
}

export function extractMetricCardFromResponse(
  response: string
): { text: string; card: { type: 'metric_card'; title: string; value: string; subtitle?: string; action?: string; explain?: string } | null } {
  // Try multiple JSON extraction patterns
  let jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
  let jsonStr: string | null = null;
  let fullMatch: string | null = null;

  if (jsonMatch) {
    jsonStr = jsonMatch[1];
    fullMatch = jsonMatch[0];
  } else {
    // Try without markdown fence - look for metrics object
    jsonMatch = response.match(/\{[\s\S]*?"metrics"\s*:\s*\{[\s\S]*?\}\s*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
      fullMatch = jsonMatch[0];
    }
  }

  if (!jsonStr) {
    return { text: response, card: null };
  }

  try {
    const parsed = JSON.parse(jsonStr);
    
    // Handle metrics object format (Claude's actual output)
    if (parsed?.metrics && typeof parsed.metrics === 'object') {
      // Don't render metrics as a card - just remove from text
      // Metrics are handled separately by the UI
      return { text: fullMatch ? response.replace(fullMatch, '').trim() : response, card: null };
    }
    
    // Handle metric_card format (legacy)
    if (parsed?.type === 'metric_card' && typeof parsed.title === 'string' && typeof parsed.value === 'string') {
      return {
        text: fullMatch ? response.replace(fullMatch, '').trim() : response,
        card: {
          type: 'metric_card',
          title: parsed.title,
          value: parsed.value,
          subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle : undefined,
          action: typeof parsed.action === 'string' ? parsed.action : undefined,
          explain: typeof parsed.explain === 'string' ? parsed.explain : undefined,
        },
      };
    }

    return { text: fullMatch ? response.replace(fullMatch, '').trim() : response, card: null };
  } catch {
    return { text: response, card: null };
  }
}

export function validateMetrics(metrics: any): boolean {
  if (!metrics) return false;

  const required = ['bufferMonths', 'futureOutlook', 'debtUrgency', 'monthlyNetCashFlow', 'confidence'];
  const hasAllFields = required.every((field) => field in metrics);

  if (!hasAllFields) return false;

  // Validate types and ranges
  if (typeof metrics.bufferMonths !== 'number' || metrics.bufferMonths < 0) return false;
  if (typeof metrics.futureOutlook !== 'number' || metrics.futureOutlook < 0 || metrics.futureOutlook > 100) return false;
  if (!['low', 'moderate', 'high', 'critical'].includes(metrics.debtUrgency)) return false;
  if (typeof metrics.monthlyNetCashFlow !== 'number') return false;
  if (!['low', 'medium', 'high'].includes(metrics.confidence)) return false;

  return true;
}
