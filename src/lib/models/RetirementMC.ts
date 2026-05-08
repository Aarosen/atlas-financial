export interface RetirementParams {
  ageNow: number;
  ageRetire: number;
  ageDeath?: number;
  balances: {
    preTax: number;
    postTax: number;
    roth: number;
  };
  contribMonthly: {
    preTax: number;
    postTax: number;
    roth: number;
  };
  retirementSpend: number;
  socialSecurity?: number;
  allocation?: {
    stocks?: number;
    bonds?: number;
  };
}

export interface RetirementMCResult {
  successRate: number;
  depletionRate: number;
  p10: number[];
  p50: number[];
  p90: number[];
  yearsAccum: number;
  yearsRetire: number;
  totalYears: number;
}

export class RetirementMC {
  /**
   * Box-Muller normal sampler
   */
  private static normalRandom(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /**
   * Run Monte Carlo retirement simulation
   * Returns probability of success and percentile paths
   */
  static run(params: RetirementParams, simulations: number = 1000): RetirementMCResult {
    const yearsAccum = params.ageRetire - params.ageNow;
    const yearsRetire = (params.ageDeath || 95) - params.ageRetire;
    const totalYears = yearsAccum + yearsRetire;

    // Return distribution parameters
    const μS = 0.07; // stocks mean
    const σS = 0.15; // stocks std dev
    const μB = 0.03; // bonds mean
    const σB = 0.06; // bonds std dev
    const μI = 0.025; // inflation mean
    const σI = 0.01; // inflation std dev

    const allocS = params.allocation?.stocks ?? 0.7;
    const allocB = 1 - allocS;
    const taxOnPreTax = 0.22; // marginal tax rate on pre-tax withdrawals

    const paths: number[][] = [];
    let depleted = 0;

    for (let s = 0; s < simulations; s++) {
      let pre = params.balances.preTax;
      let post = params.balances.postTax;
      let roth = params.balances.roth;
      const path: number[] = [];

      for (let y = 0; y < totalYears; y++) {
        // Stochastic returns
        const rS = μS + σS * this.normalRandom();
        const rB = μB + σB * this.normalRandom();
        const inf = μI + σI * this.normalRandom();
        const r = allocS * rS + allocB * rB;

        // Grow each bucket
        pre *= 1 + r;
        post *= 1 + r;
        roth *= 1 + r;

        if (y < yearsAccum) {
          // Accumulation phase
          pre += params.contribMonthly.preTax * 12;
          post += params.contribMonthly.postTax * 12;
          roth += params.contribMonthly.roth * 12;
        } else {
          // Retirement phase
          const yrsIntoRetire = y - yearsAccum;
          const realSpend = params.retirementSpend * Math.pow(1 + inf, yrsIntoRetire);
          const ssIncome = (params.socialSecurity || 0) * Math.pow(1 + inf, yrsIntoRetire);
          let need = Math.max(0, realSpend - ssIncome);

          // Withdrawal order: post-tax (basis), Roth, pre-tax (taxed)
          if (post >= need) {
            post -= need;
            need = 0;
          } else {
            need -= post;
            post = 0;
          }

          if (need > 0 && roth >= need) {
            roth -= need;
            need = 0;
          } else if (need > 0) {
            need -= roth;
            roth = 0;
          }

          if (need > 0) {
            const grossNeeded = need / (1 - taxOnPreTax);
            pre -= Math.min(pre, grossNeeded);
            need = 0;
          }
        }

        path.push(Math.max(0, pre + post + roth));
      }

      if (path[path.length - 1] <= 0) {
        depleted++;
      }
      paths.push(path);
    }

    // Compute percentiles year by year
    const percentile = (xs: number[], p: number): number => {
      const sorted = [...xs].sort((a, b) => a - b);
      return sorted[Math.floor(p * (sorted.length - 1))];
    };

    const p10: number[] = [];
    const p50: number[] = [];
    const p90: number[] = [];

    for (let y = 0; y < totalYears; y++) {
      const yearVals = paths.map((p) => p[y]);
      p10.push(percentile(yearVals, 0.1));
      p50.push(percentile(yearVals, 0.5));
      p90.push(percentile(yearVals, 0.9));
    }

    return {
      successRate: 1 - depleted / simulations,
      depletionRate: depleted / simulations,
      p10,
      p50,
      p90,
      yearsAccum,
      yearsRetire,
      totalYears,
    };
  }
}
