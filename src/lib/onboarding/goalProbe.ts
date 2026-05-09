import type { GoalCategory } from './detectGoalMention';

export function goalProbeQuestion(category: GoalCategory, horizonYears?: number): string {
  const horizonNote = horizonYears ? ` in ${formatYears(horizonYears)}` : '';
  switch (category) {
    case 'house':
      return `Got it — a house${horizonNote}. Quick check before we keep going: do you have a target down payment in mind, or are we still figuring that out?`;
    case 'retirement':
      return `Retirement${horizonNote} — that's the long game. Are you thinking traditional retirement, or something more like FIRE / early retirement?`;
    case 'education':
      return `Education${horizonNote}. Is this for you, a kid, or someone else in your life?`;
    case 'family':
      return `Big life moment${horizonNote}. Roughly what's the all-in number you're planning for, even ballpark?`;
    case 'business':
      return `Starting something${horizonNote} — exciting. Is this a "leave my job and go full-time" plan, or a side build first?`;
    case 'travel':
      return `Travel${horizonNote}. Is this one big trip or a longer-term lifestyle shift?`;
    case 'debt_freedom':
      return `Debt-free${horizonNote}. Do you have a number in mind for total balance, or is "all of it" the goal?`;
    default:
      return '';
  }
}

function formatYears(years: number): string {
  if (years < 1) return `${Math.round(years * 12)} months`;
  if (Number.isInteger(years)) return `${years} year${years === 1 ? '' : 's'}`;
  return `~${years.toFixed(1)} years`;
}
