import type { Explainability, FinancialState, Lever, Strategy, Tier, TraceStep } from '../state/types';
import { pickLever, pickTier, pickUrgency, scoreConfidence, strategyConfig, type StrategyContext } from './strategyConfig';
import { calcBufferMonths, calcDti, calcFutureAllocation, calcNet, clamp0 } from './calculator';

export class StrategyEngine {
  async run(d: Partial<FinancialState>, ctx: StrategyContext = {}): Promise<Strategy> {
    return this._calc(d, ctx);
  }

  private _calc(d: Partial<FinancialState>, ctx: StrategyContext): Strategy {
    const inc = clamp0(d.monthlyIncome);
    const ess = clamp0(d.essentialExpenses);
    const dp = clamp0(d.monthlyDebtPayments);
    const hiD = clamp0(d.highInterestDebt);
    const loD = clamp0(d.lowInterestDebt);
    const sav = clamp0(d.totalSavings);

    const net = calcNet(inc, ess, dp);
    const bufMo = calcBufferMonths(sav, ess);
    const discIn = Number((d as any).discretionaryExpenses);
    const { disc, futAmt, futPct } = calcFutureAllocation(net, inc, discIn);
    const dti = calcDti(hiD, loD, inc);
    const dExp = hiD > inc * 3 ? 'Critical' : hiD > inc ? 'High' : hiD > inc * 0.5 ? 'Moderate' : 'Low';

    const tier = pickTier({ net, bufMo, hiDebt: hiD, income: inc, dti });
    const lever = pickLever({ net, bufMo, hiDebt: hiD, income: inc, futPct });
    const urgency = pickUrgency({ lever, dExp, bufMo });

    const conf = scoreConfidence({ monthlyIncome: inc, essentialExpenses: ess, totalSavings: sav, highInterestDebt: hiD, lowInterestDebt: loD, monthlyDebtPayments: dp }, ctx);

    const inputsUsed: Explainability['inputsUsed'] = {
      monthlyIncome: String(inc),
      essentialExpenses: String(ess),
      monthlyDebtPayments: String(dp),
      totalSavings: String(sav),
      highInterestDebt: String(hiD),
      lowInterestDebt: String(loD),
    };

    const assumptions: string[] = [];
    if (!Number.isFinite(discIn) || discIn <= 0) assumptions.push('Estimated discretionary expenses as ~28% of net income when not provided.');
    if ((d as any).monthlyIncome !== undefined && Number(d.monthlyIncome) < 0) assumptions.push('Clamped negative monthly income to 0.');
    if ((d as any).essentialExpenses !== undefined && Number(d.essentialExpenses) < 0) assumptions.push('Clamped negative essential expenses to 0.');
    if ((d as any).totalSavings !== undefined && Number(d.totalSavings) < 0) assumptions.push('Clamped negative savings to 0.');

    const reasonCodes: string[] = [];
    if (net < 0) reasonCodes.push('NET_NEGATIVE');
    if (bufMo < 1) reasonCodes.push('BUFFER_LT_1MO');
    if (bufMo >= 1 && bufMo < 3) reasonCodes.push('BUFFER_LT_3MO');
    if (hiD > inc * 2) reasonCodes.push('HI_DEBT_GT_2X_INCOME');
    if (hiD > inc) reasonCodes.push('HI_DEBT_GT_1X_INCOME');
    if (futPct < 0.15) reasonCodes.push('FUTURE_PCT_LT_15');
    if (dti > 0.3) reasonCodes.push('DTI_GT_30');
    if (conf.confidence === 'low') reasonCodes.push('CONFIDENCE_LOW');
    if (conf.confidence === 'med') reasonCodes.push('CONFIDENCE_MED');

    const nextActionByLever: Record<Lever, Explainability['nextAction']> = {
      stabilize_cashflow: {
        title: 'Stabilize cashflow',
        prompt: 'What is one expense you can reduce or delay this month to get closer to break-even?',
        suggestedAmount: Math.max(0, -net),
      },
      eliminate_high_interest_debt: {
        title: 'Eliminate high-interest debt',
        prompt: 'What is the minimum extra amount you can put toward high-interest debt each month?',
        suggestedAmount: Math.max(25, Math.round(Math.max(0, futAmt) * 0.5)),
      },
      build_emergency_buffer: {
        title: 'Build an emergency buffer',
        prompt: 'What amount can you auto-save monthly until you reach 3 months of essentials?',
        suggestedAmount: Math.max(25, Math.round(Math.max(0, futAmt) * 0.4)),
      },
      increase_future_allocation: {
        title: 'Increase future allocation',
        prompt: 'What is one recurring cost you can trim to lift your future allocation toward 15%?',
        suggestedAmount: Math.max(25, Math.round(Math.max(0, inc * 0.15 - futAmt))),
      },
      optimize_discretionary_spend: {
        title: 'Optimize discretionary spend',
        prompt: 'Which discretionary category (food, shopping, subscriptions) feels easiest to reduce by a small amount?',
        suggestedAmount: Math.max(25, Math.round(Math.max(0, disc) * 0.1)),
      },
    };

    const decisionTrace: TraceStep[] = [
      {
        key: 'compute_net',
        title: 'Compute net cashflow',
        detail: 'Net = income - essentials - debt payments',
        data: { monthlyIncome: inc, essentialExpenses: ess, monthlyDebtPayments: dp, net },
      },
      {
        key: 'compute_buffer',
        title: 'Compute emergency buffer',
        detail: 'Buffer months = total savings / essential expenses',
        data: { totalSavings: sav, essentialExpenses: ess, bufMo: Number(bufMo.toFixed(2)) },
      },
      {
        key: 'compute_future',
        title: 'Compute future allocation',
        detail: 'Future allocation uses remaining net after discretionary estimate',
        data: { disc: Number(disc.toFixed(2)), futAmt: Number(futAmt.toFixed(2)), futPct: Number(futPct.toFixed(4)) },
      },
      {
        key: 'choose_tier',
        title: 'Choose tier',
        detail: 'Tier is selected from buffer, net, and debt metrics',
        data: { tier },
      },
      {
        key: 'choose_lever',
        title: 'Choose lever',
        detail: 'Lever is the single highest-impact focus given the tier and metrics',
        data: { lever },
      },
      {
        key: 'score_confidence',
        title: 'Score confidence',
        detail: 'Confidence is based on explicitness, plausibility, and unknowns',
        data: { confidence: conf.confidence, reasons: conf.reasons.join(',') },
      },
    ];

    const explainability: Explainability = {
      tier: tier as Tier,
      lever: lever as Lever,
      reasonCodes,
      inputsUsed,
      assumptions,
      metrics: {
        bufMo: Number(bufMo.toFixed(2)),
        bufTarget: 6,
        futPct: Number(futPct.toFixed(4)),
        futTarget: strategyConfig.levers.futureTargetPct,
        net: Number(net.toFixed(2)),
        disc: Number(disc.toFixed(2)),
        dti: Number(dti.toFixed(4)),
        dExp,
      },
      decisionTrace,
      nextAction: nextActionByLever[lever as Lever],
    };

    return {
      tier,
      lever,
      urgency,
      confidence: conf.confidence,
      bufMo,
      futPct,
      dExp,
      metrics: {
        bufMo,
        bufTarget: 6,
        futPct,
        futTarget: strategyConfig.levers.futureTargetPct,
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
      explainability,
      sug: 0,
      ts: Date.now(),
    };
  }
}
