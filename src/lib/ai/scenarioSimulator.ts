export type ScenarioPoint = { month: number; value: number };

export function simulateSavingsGrowth(args: {
  monthlyContribution: number;
  months: number;
  annualRate?: number;
}): ScenarioPoint[] {
  const rate = (args.annualRate ?? 0) / 12;
  const points: ScenarioPoint[] = [];
  let total = 0;
  for (let m = 1; m <= args.months; m += 1) {
    total = total * (1 + rate) + args.monthlyContribution;
    points.push({ month: m, value: Number(total.toFixed(2)) });
  }
  return points;
}
