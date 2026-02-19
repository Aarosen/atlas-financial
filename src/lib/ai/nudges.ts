export function buildNudge(args: { lastActionAt: number | null; primaryGoal?: string | null }): string | null {
  if (!args.lastActionAt) return null;
  const dayMs = 86_400_000;
  const daysSince = Math.floor((Date.now() - args.lastActionAt) / dayMs);
  if (daysSince < 7) return null;

  const goal = args.primaryGoal || 'your goals';
  return `Quick nudge: it’s been ${daysSince} days since your last action. Want to take one small step toward ${goal} today?`;
}
