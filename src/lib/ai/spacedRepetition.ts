export type ReviewSchedule = {
  nextReviewAt: number;
  intervalDays: number;
};

const BASE_INTERVALS = [1, 3, 7, 30];

export function scheduleNextReview(args: { lastReviewedAt: number; masteryScore: number }): ReviewSchedule {
  const idx = args.masteryScore >= 0.85 ? 2 : args.masteryScore >= 0.7 ? 1 : 0;
  const intervalDays = BASE_INTERVALS[idx];
  return {
    intervalDays,
    nextReviewAt: args.lastReviewedAt + intervalDays * 86_400_000,
  };
}
