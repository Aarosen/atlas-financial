export function clamp0(n: unknown) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, v);
}

export function calcNet(inc: number, ess: number, debtPayments: number) {
  return inc - ess - debtPayments;
}

export function calcBufferMonths(savings: number, essentials: number) {
  return essentials > 0 ? savings / essentials : 0;
}

export function calcFutureAllocation(net: number, inc: number, discOverride?: number | null) {
  const disc = Number.isFinite(discOverride) && (discOverride as number) > 0 ? (discOverride as number) : Math.max(0, net * 0.28);
  const futAmt = Math.max(0, net - disc);
  const futPct = inc > 0 ? futAmt / inc : 0;
  return { disc, futAmt, futPct };
}

export function calcDti(highDebt: number, lowDebt: number, inc: number) {
  return inc > 0 ? (highDebt + lowDebt) / (inc * 12) : 0;
}
