export const EXTRACTION_PROMPT = `Analyze this conversation and extract any financial facts disclosed.
Return ONLY valid JSON. No preamble. No markdown. No explanation.
Schema:
{
  "monthly_income": number | null,
  "monthly_fixed_expenses": number | null,
  "total_savings": number | null,
  "total_debt": number | null,
  "primary_goal": string | null,
  "income_type": "salary"|"hourly"|"variable"|"multiple"|"none" | null,
  "key_decisions": string[],
  "follow_up_needed": boolean,
  "follow_up_notes": string | null
}
Return {} if no financial facts were disclosed.
Do not infer. Only extract explicitly stated facts.`;
