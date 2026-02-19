export type MasteryLevel = 'learning' | 'partial' | 'mastered';

export function computeMastery(args: { correctRate: number; followups: number }): MasteryLevel {
  if (args.correctRate >= 0.85 && args.followups <= 1) return 'mastered';
  if (args.correctRate >= 0.65) return 'partial';
  return 'learning';
}
