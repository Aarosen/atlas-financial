import type { ActionEvent } from './actions';

export type ActionStreak = {
  days: number;
  lastActionAt: number | null;
};

export function computeActionStreak(actions: ActionEvent[], now: number = Date.now()): ActionStreak {
  if (!actions.length) return { days: 0, lastActionAt: null };
  const sorted = [...actions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const lastActionAt = sorted[0]?.createdAt ?? null;
  if (!lastActionAt) return { days: 0, lastActionAt: null };

  const dayMs = 86_400_000;
  let streak = 1;
  let cursor = lastActionAt;

  for (let i = 1; i < sorted.length; i += 1) {
    const t = sorted[i]?.createdAt ?? 0;
    if (!t) continue;
    const deltaDays = Math.floor((cursor - t) / dayMs);
    if (deltaDays >= 1 && deltaDays <= 2) {
      streak += 1;
      cursor = t;
      continue;
    }
    if (deltaDays > 2) break;
  }

  const daysSince = Math.floor((now - lastActionAt) / dayMs);
  if (daysSince > 2) return { days: 0, lastActionAt };
  return { days: streak, lastActionAt };
}

export function buildStreakMessage(streak: ActionStreak): string | null {
  if (!streak.lastActionAt || streak.days <= 0) return null;
  if (streak.days === 1) return 'Nice start. One action at a time builds momentum.';
  return `Streak: ${streak.days} days. Consistency is the real compounding.`;
}
