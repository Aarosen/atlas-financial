export type PerturbationKind = 'absolute' | 'delta' | 'factor';

export interface Perturbation {
  param: string;
  kind: PerturbationKind;
  value: number;
  fromMonth: number;
  toMonth: number;
}

export interface OneOff {
  param: string;
  value: number;
  atMonth: number;
}

export interface CustomScenarioSpec {
  name: string;
  perturbations: Perturbation[];
  oneOff?: OneOff[];
}

export interface BaseParams {
  cash0: number;
  debt0: number;
  monthlyIncome: number;
  monthlyEssentials: number;
  monthlyDiscretionary: number;
  monthlyDebtPayment: number;
  monthlyInvest: number;
  debtAPR?: number;
  savingsAPR?: number;
}

export interface MonthlyResult {
  m: number;
  cash: number;
  debt: number;
  fut: number;
}

export class CustomScenario {
  static apply(baseParams: BaseParams, spec: CustomScenarioSpec): MonthlyResult[] {
    const out: MonthlyResult[] = [];
    let cash = baseParams.cash0;
    let debt = baseParams.debt0;
    let fut = 0;

    const dbtM = Math.pow(1 + (baseParams.debtAPR || 0), 1 / 12) - 1;
    const savM = Math.pow(1 + (baseParams.savingsAPR || 0), 1 / 12) - 1;

    for (let m = 1; m <= 12; m++) {
      // Build per-month parameter set by applying perturbations
      let p2 = { ...baseParams };

      for (const x of spec.perturbations) {
        if (m < x.fromMonth || m > x.toMonth) continue;

        if (x.kind === 'absolute') {
          p2[x.param as keyof BaseParams] = x.value as any;
        } else if (x.kind === 'delta') {
          p2[x.param as keyof BaseParams] = ((p2[x.param as keyof BaseParams] as any) || 0) + x.value;
        } else if (x.kind === 'factor') {
          p2[x.param as keyof BaseParams] = ((p2[x.param as keyof BaseParams] as any) || 0) * x.value;
        }
      }

      // Apply one-offs
      for (const o of spec.oneOff || []) {
        if (o.atMonth === m) {
          if (o.param === 'cash0') {
            cash += o.value;
          } else if (o.param === 'debt0') {
            debt += o.value;
          }
        }
      }

      // Monthly cash flow
      cash += p2.monthlyIncome;
      cash -= p2.monthlyEssentials + p2.monthlyDiscretionary;

      // Debt interest
      debt = debt * (1 + dbtM);

      // Debt payment
      const debtPay = Math.min(debt, p2.monthlyDebtPayment);
      debt -= debtPay;
      cash -= debtPay;

      // Investment
      const invest = Math.min(Math.max(0, cash), p2.monthlyInvest);
      cash -= invest;

      // Future You growth
      fut = fut * (1 + savM) + invest;

      out.push({
        m,
        cash: Math.round(cash),
        debt: Math.round(debt),
        fut: Math.round(fut),
      });
    }

    return out;
  }
}
