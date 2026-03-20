import type { FinancialProfile, Conversation } from '@/lib/types/profile';
import { ATLAS_SYSTEM_PROMPT } from './atlasSystemPrompt';
import { formatCalculationBlock } from '@/lib/calculations/sprint1';

export function buildFullSystemPrompt(
  profile: FinancialProfile | null,
  recentContext: Conversation[],
  calcResult: any
): string {
  const profileBlock = profile
    ? formatProfileBlock(profile, recentContext)
    : '[NEW USER — no profile yet. Gather their financial situation naturally.]';
  
  const calcBlock = calcResult ? formatCalculationBlock(calcResult) : '';

  return [ATLAS_SYSTEM_PROMPT, profileBlock, calcBlock].filter(Boolean).join('\n\n');
}

function formatProfileBlock(p: FinancialProfile, recent: Conversation[]): string {
  const lastSession = recent[0];
  const daysSince = lastSession
    ? Math.round((Date.now() - new Date(lastSession.started_at).getTime()) / 86400000)
    : null;

  const lines = [
    '[ATLAS_USER_PROFILE — this is your memory of this person]',
    `Profile completeness: ${p.profile_completeness ?? 0}%`,
    '',
    'FINANCES:',
    p.monthly_income != null
      ? `  Monthly income: $${p.monthly_income} (${p.income_type ?? 'unspecified'})`
      : '  Monthly income: unknown',
    p.monthly_fixed_expenses != null
      ? `  Fixed expenses: $${p.monthly_fixed_expenses}`
      : '  Fixed expenses: unknown',
    p.monthly_variable_expenses != null
      ? `  Variable expenses: ~$${p.monthly_variable_expenses}`
      : null,
    p.monthly_income != null && p.monthly_fixed_expenses != null
      ? `  Monthly surplus: $${p.monthly_income - (p.monthly_fixed_expenses + (p.monthly_variable_expenses ?? 0))}`
      : null,
    p.total_savings != null ? `  Total savings: $${p.total_savings}` : '  Savings: unknown',
    p.total_debt ? `  Total debt: $${p.total_debt}` : null,
    '',
    p.primary_goal ? `PRIMARY GOAL: ${p.primary_goal}` : 'PRIMARY GOAL: not set yet',
  ];

  if (lastSession) {
    lines.push('', 'RECENT CONTEXT:');
    lines.push(`  Last session: ${daysSince} day(s) ago — topic: ${lastSession.primary_topic ?? 'general'}`);
    if (lastSession.key_decisions?.length) {
      lines.push(`  Commitments made: ${lastSession.key_decisions.join(', ')}`);
    }
    if (lastSession.follow_up_needed) {
      lines.push(`  FOLLOW-UP NEEDED: ${lastSession.follow_up_notes}`);
    }
  }

  lines.push('[END_PROFILE]');
  return lines.filter(l => l !== null).join('\n');
}
