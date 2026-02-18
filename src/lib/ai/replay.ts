export type ReplayRole = 'user' | 'assistant';

export type ReplayEntry = {
  id?: number;
  ts: number;
  role: ReplayRole;
  text: string;
  kind?: string;
  questionKey?: string;
  model?: string;
  tier?: string;
  emotionTag?: string;
  guardrail?: string;
};

export function createReplayEntry(args: Omit<ReplayEntry, 'ts'> & { ts?: number }) {
  return {
    ts: args.ts ?? Date.now(),
    role: args.role,
    text: args.text,
    kind: args.kind ?? undefined,
    questionKey: args.questionKey ?? undefined,
    model: args.model ?? undefined,
    tier: args.tier ?? undefined,
    emotionTag: args.emotionTag ?? undefined,
    guardrail: args.guardrail ?? undefined,
  } satisfies ReplayEntry;
}

export function shouldLogReplay(enabled: boolean | null | undefined) {
  return enabled !== false;
}

export type ReplayEmotionTag = 'anxious' | 'ashamed' | 'analytical' | 'motivated' | 'uncertain' | 'neutral';

export function detectReplayEmotion(text: string): ReplayEmotionTag {
  const t = String(text || '').toLowerCase();
  if (!t) return 'neutral';
  if (/\b(overwhelmed|stressed|panic|anxious|worried|freaking out|nervous|scared)\b/.test(t)) return 'anxious';
  if (/\b(embarrassed|ashamed|guilty|stupid|dumb|terrible with money|failure|behind)\b/.test(t)) return 'ashamed';
  if (/\b(roi|apr|yield|basis points|allocation|portfolio|cashflow|net)\b/.test(t)) return 'analytical';
  if (/\b(ready|motivated|let's do this|let us do this|excited|driven|committed)\b/.test(t)) return 'motivated';
  if (/\b(not sure|confused|lost|no idea|unsure|don't know)\b/.test(t)) return 'uncertain';
  return 'neutral';
}

export async function logReplayEntry(args: {
  enabled: boolean | null | undefined;
  entry: ReplayEntry;
  set: (store: 'replay', value: ReplayEntry) => Promise<void>;
}) {
  if (!shouldLogReplay(args.enabled)) return false;
  await args.set('replay', args.entry);
  return true;
}
