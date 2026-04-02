import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface ExtractedAction {
  action_detected: boolean;
  action_text?: string;
  action_category?: 'savings' | 'debt_payoff' | 'budget_cut' | 'income' | 'invest' | 'other';
  target_amount?: number | null;
  target_frequency?: 'one-time' | 'weekly' | 'monthly' | null;
  check_in_days?: number;
  goal_defining?: boolean;
}

export interface CommitmentDetection {
  commitment_detected: boolean;
  commitment_type?: 'will_do' | 'done' | 'partial';
  user_reported_amount?: number | null;
  user_notes?: string;
}

/**
 * Extract action from Atlas response
 * Run after Claude generates a response to detect if a specific action was recommended
 */
export async function extractActionFromResponse(
  atlasResponse: string,
  apiKey: string
): Promise<ExtractedAction> {
  const extractionPrompt = `You are an action extractor. Given the following Atlas response, determine if a specific, concrete action was recommended to the user.

Atlas response:
"""
${atlasResponse}
"""

Return a JSON object:
{
  "action_detected": true | false,
  "action_text": "The full action as stated (only if detected)",
  "action_category": "savings" | "debt_payoff" | "budget_cut" | "income" | "invest" | "other",
  "target_amount": <number or null>,
  "target_frequency": "one-time" | "weekly" | "monthly" | null,
  "check_in_days": <integer — how many days from now to follow up>,
  "goal_defining": <boolean — is this action defining a new financial goal?>
}

check_in_days logic:
- "Set up a transfer today / this week" → 7
- "Put X toward debt this month" → 35
- "Cut X from your budget" → 21
- "Open an account" (one-time) → 5
- Default: 30

If no specific action was recommended, return { "action_detected": false }`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { action_detected: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      action_detected: parsed.action_detected || false,
      action_text: parsed.action_text,
      action_category: parsed.action_category,
      target_amount: parsed.target_amount,
      target_frequency: parsed.target_frequency,
      check_in_days: parsed.check_in_days || 30,
      goal_defining: parsed.goal_defining || false,
    };
  } catch (error) {
    console.error('Error extracting action:', error);
    return { action_detected: false };
  }
}

/**
 * Detect commitment from user message
 * Run on every user message to detect if they committed to an action
 */
export async function detectCommitmentFromMessage(
  userMessage: string,
  apiKey: string
): Promise<CommitmentDetection> {
  const detectionPrompt = `Did the user express willingness, commitment, or completion of a specific action in this message?

User message:
"""
${userMessage}
"""

Look for phrases like: "I'll do that", "I will", "OK I'm going to", "doing it now",
"already set it up", "I did it", "done", "set up", "transferred", "opened the account",
"cut it", "cancelled it", "I'm in", "let's do it", "sounds good I'll try", "I've started",
"I'm working on it", "I've been doing", "I completed", "I finished"

Return JSON:
{
  "commitment_detected": true | false,
  "commitment_type": "will_do" | "done" | "partial",
  "user_reported_amount": <number or null>,
  "user_notes": "any qualifiers or context the user mentioned"
}

If no commitment is detected, return { "commitment_detected": false }`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: detectionPrompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { commitment_detected: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      commitment_detected: parsed.commitment_detected || false,
      commitment_type: parsed.commitment_type,
      user_reported_amount: parsed.user_reported_amount,
      user_notes: parsed.user_notes,
    };
  } catch (error) {
    console.error('Error detecting commitment:', error);
    return { commitment_detected: false };
  }
}
