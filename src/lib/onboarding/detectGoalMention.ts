export type GoalCategory = 'house' | 'retirement' | 'education' | 'family' | 'business' | 'travel' | 'debt_freedom' | 'unknown';

export interface GoalMention {
  category: GoalCategory;
  horizonYears?: number;
  rawText: string;
}

const HORIZON_RE = /\bin\s+(\d+(?:\.\d+)?)\s*(year|yr|yrs|years|month|mo|mos|months)\b/i;

const CATEGORY_PATTERNS: { category: GoalCategory; re: RegExp }[] = [
  { category: 'house', re: /\b(house|home|condo|apartment|down\s*payment|mortgage)\b/i },
  { category: 'retirement', re: /\b(retire|retirement|fire|early\s*retirement|401k|ira|roth)\b/i },
  { category: 'education', re: /\b(college|tuition|student|grad\s*school|degree|education)\b/i },
  { category: 'family', re: /\b(baby|kid|kids|child|children|wedding|marriage|family)\b/i },
  { category: 'business', re: /\b(business|startup|launch|self[- ]employ|quit\s*my\s*job)\b/i },
  { category: 'travel', re: /\b(travel|trip|sabbatical|gap\s*year|move\s*abroad)\b/i },
  { category: 'debt_freedom', re: /\b(pay\s*off|debt[- ]free|out\s*of\s*debt)\b/i },
];

export function detectGoalMention(text: string): GoalMention | null {
  if (!text) return null;
  let category: GoalCategory = 'unknown';
  for (const { category: c, re } of CATEGORY_PATTERNS) {
    if (re.test(text)) {
      category = c;
      break;
    }
  }
  if (category === 'unknown') return null;

  const m = HORIZON_RE.exec(text);
  let horizonYears: number | undefined;
  if (m) {
    const n = Number(m[1]);
    horizonYears = /month/i.test(m[2]) ? n / 12 : n;
  }
  return { category, horizonYears, rawText: text };
}
