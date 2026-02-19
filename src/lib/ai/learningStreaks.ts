export type LearningStreak = {
  days: number;
  lastLearnedAt: number | null;
};

export function computeLearningStreak(dates: number[], now: number = Date.now()): LearningStreak {
  if (!dates.length) return { days: 0, lastLearnedAt: null };
  const sorted = [...dates].sort((a, b) => b - a);
  const lastLearnedAt = sorted[0] ?? null;
  if (!lastLearnedAt) return { days: 0, lastLearnedAt: null };

  const dayMs = 86_400_000;
  let streak = 1;
  let cursor = lastLearnedAt;

  for (let i = 1; i < sorted.length; i += 1) {
    const t = sorted[i];
    const deltaDays = Math.floor((cursor - t) / dayMs);
    if (deltaDays >= 1 && deltaDays <= 2) {
      streak += 1;
      cursor = t;
      continue;
    }
    if (deltaDays > 2) break;
  }

  const daysSince = Math.floor((now - lastLearnedAt) / dayMs);
  if (daysSince > 2) return { days: 0, lastLearnedAt };
  return { days: streak, lastLearnedAt };
}
