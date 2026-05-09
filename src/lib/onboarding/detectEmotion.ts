export type EmotionTag = 'overwhelmed' | 'shame' | 'analytical' | 'uncertain' | 'motivated' | null;

const PATTERNS: { tag: EmotionTag; re: RegExp }[] = [
  {
    tag: 'overwhelmed',
    re: /\b(complex|complicated|messy|chaos|drowning|overwhelm(ed|ing)?|too much|all over the place|stressed|anxious|worried|scared|panic)\b/i,
  },
  {
    tag: 'shame',
    re: /\b(embarrassed|ashamed|stupid|dumb|terrible|bad with money|no idea what i'?m doing|cluele(ss|ess))\b/i,
  },
  {
    tag: 'analytical',
    re: /\b(spreadsheet|model|calculate|optimize|allocate|portfolio|asset|allocation|return|yield)\b/i,
  },
  {
    tag: 'uncertain',
    re: /\b(maybe|i think|kind of|sort of|i guess|not sure|unsure|hard to say)\b/i,
  },
  {
    tag: 'motivated',
    re: /\b(ready|let'?s do this|excited|focused|locked in|committed|determined)\b/i,
  },
];

export function detectEmotion(text: string): EmotionTag {
  if (!text) return null;
  for (const { tag, re } of PATTERNS) {
    if (re.test(text)) return tag;
  }
  return null;
}
