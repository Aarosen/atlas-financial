export type FeedbackEntry = {
  id?: number;
  ts: number;
  responseId: string;
  rating: 'helpful' | 'not_helpful';
  reason?: string;
};

export function createFeedbackEntry(args: Omit<FeedbackEntry, 'ts'> & { ts?: number }) {
  return {
    ts: args.ts ?? Date.now(),
    responseId: args.responseId,
    rating: args.rating,
    reason: args.reason,
  } satisfies FeedbackEntry;
}

export function shouldPromptFeedback(args: { lastPromptAt?: number | null; now?: number; minSessions?: number }) {
  const now = args.now ?? Date.now();
  const last = args.lastPromptAt ?? 0;
  const minSessions = args.minSessions ?? 5;
  return now - last >= minSessions * 24 * 60 * 60 * 1000;
}
