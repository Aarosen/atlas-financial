import type { FinancialState } from './types';

export class Engine {
  async run(d: Partial<FinancialState>) {
    return this._calc(d);
  }

  private _calc(d: Partial<FinancialState>) {
    const inc = d.monthlyIncome ?? 0;
    const ess = d.essentialExpenses ?? 0;
    const dp = d.monthlyDebtPayments ?? 0;
    const hiD = d.highInterestDebt ?? 0;
    const loD = d.lowInterestDebt ?? 0;
    const sav = d.totalSavings ?? 0;

    const bufMo = ess > 0 ? sav / ess : 0;
    const net = inc - ess - dp;
    const disc = (d as any).discretionaryExpenses ?? Math.max(0, net * 0.28);
    const futAmt = Math.max(0, net - disc);
    const futPct = inc > 0 ? futAmt / inc : 0;

    const dti = inc > 0 ? (hiD + loD) / (inc * 12) : 0;
    const dExp = hiD > inc * 3 ? 'Critical' : hiD > inc ? 'High' : hiD > inc * 0.5 ? 'Moderate' : 'Low';

    const tier = net < 0 || bufMo < 1 ? 'Foundation' : bufMo < 3 || hiD > inc * 2 ? 'Stabilizing' : bufMo < 6 || dti > 0.3 ? 'Strategic' : 'GrowthReady';

    const lever =
      net < 0
        ? 'stabilize_cashflow'
        : hiD > inc
          ? 'eliminate_high_interest_debt'
          : bufMo < 3
            ? 'build_emergency_buffer'
            : futPct < 0.15
              ? 'increase_future_allocation'
              : 'optimize_discretionary_spend';

    const urgency = lever === 'stabilize_cashflow' || dExp === 'Critical' ? 'Protective' : lever === 'eliminate_high_interest_debt' || dExp === 'High' || bufMo < 1 ? 'Advisory' : 'Calm';

    return {
      tier,
      lever,
      urgency,
      bufMo,
      futPct,
      dExp,
      metrics: {
        bufMo,
        bufTarget: 6,
        futPct,
        futTarget: 0.15,
        net,
        disc,
        dExp,
        isNeg: net < 0,
        dti,
      },
      expl: {
        tier,
        lever,
        urgency,
      },
      sug: 0,
      ts: Date.now(),
    };
  }
}
