import { ATLAS_VOICE } from '@/lib/voice/AtlasVoice';
import type { ToneType } from '@/lib/models/Tone';

export interface EngineResult {
  tier: string;
  lever: string;
  surplus: number;
  bufMo: number;
  nextStep?: string;
}

export interface FinancialInputV1 {
  monthlyIncome?: number;
  essentialExpenses?: number;
  totalSavings?: number;
  highInterestDebt?: number;
  lowInterestDebt?: number;
  primaryGoal?: string;
  timeHorizonYears?: number;
}

export function renderTierParagraph(r: EngineResult, fin: FinancialInputV1, tone: ToneType): string {
  const greeting = (ATLAS_VOICE.congrats_tier as Record<string, string>)?.[r.tier] ?? '';
  const buffer = `${r.bufMo.toFixed(1)} months of essential-expense coverage`;
  const surplusLine = `Your monthly surplus is roughly $${Math.round(r.surplus).toLocaleString()}.`;
  const lever = `Right now the highest-leverage move is ${r.lever}.`;
  const next = r.nextStep ? ` Next concrete step: ${r.nextStep}` : '';
  const toneNote =
    tone === 'gentle'
      ? " No pressure on the timing — we'll go at your pace."
      : tone === 'ambitious'
        ? ' The math says you can move faster than most people in this position.'
        : '';
  return `${greeting ? greeting + '\n\n' : ''}Here's the picture: you're at the ${r.tier} tier. ${surplusLine} You have ${buffer}. ${lever}${next}${toneNote}`;
}
