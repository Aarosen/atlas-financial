import { describe, it, expect } from 'vitest';
import { CustomScenario, CustomScenarioSpec, BaseParams } from '../CustomScenario';

describe('CustomScenario builder', () => {
  it('should apply absolute perturbations', () => {
    const baseParams: BaseParams = {
      cash0: 5000,
      debt0: 10000,
      monthlyIncome: 4000,
      monthlyEssentials: 2000,
      monthlyDiscretionary: 500,
      monthlyDebtPayment: 200,
      monthlyInvest: 300,
    };

    const spec: CustomScenarioSpec = {
      name: 'Salary increase',
      perturbations: [
        {
          param: 'monthlyIncome',
          kind: 'absolute',
          value: 5000,
          fromMonth: 6,
          toMonth: 12,
        },
      ],
    };

    const result = CustomScenario.apply(baseParams, spec);

    // Months 1-5 should use base income (4000)
    expect(result[0].m).toBe(1);
    // Month 6 onwards should use new income (5000)
    expect(result[5].m).toBe(6);
  });

  it('should apply delta perturbations', () => {
    const baseParams: BaseParams = {
      cash0: 5000,
      debt0: 10000,
      monthlyIncome: 4000,
      monthlyEssentials: 2000,
      monthlyDiscretionary: 500,
      monthlyDebtPayment: 200,
      monthlyInvest: 300,
    };

    const spec: CustomScenarioSpec = {
      name: 'Bonus in month 3',
      perturbations: [
        {
          param: 'monthlyIncome',
          kind: 'delta',
          value: 1000,
          fromMonth: 3,
          toMonth: 3,
        },
      ],
    };

    const result = CustomScenario.apply(baseParams, spec);

    // Month 3 should have 5000 income
    expect(result[2].m).toBe(3);
  });

  it('should apply one-off cash injection', () => {
    const baseParams: BaseParams = {
      cash0: 5000,
      debt0: 10000,
      monthlyIncome: 4000,
      monthlyEssentials: 2000,
      monthlyDiscretionary: 500,
      monthlyDebtPayment: 200,
      monthlyInvest: 300,
    };

    const spec: CustomScenarioSpec = {
      name: '$10k bonus in month 6',
      perturbations: [],
      oneOff: [
        {
          param: 'cash0',
          value: 10000,
          atMonth: 6,
        },
      ],
    };

    const result = CustomScenario.apply(baseParams, spec);

    // Month 6 should show cash boost
    const month5Cash = result[4].cash;
    const month6Cash = result[5].cash;
    expect(month6Cash).toBeGreaterThan(month5Cash);
  });

  it('should track debt paydown correctly', () => {
    const baseParams: BaseParams = {
      cash0: 5000,
      debt0: 5000,
      monthlyIncome: 4000,
      monthlyEssentials: 2000,
      monthlyDiscretionary: 500,
      monthlyDebtPayment: 500,
      monthlyInvest: 0,
      debtAPR: 0.05,
    };

    const spec: CustomScenarioSpec = {
      name: 'Pay off debt',
      perturbations: [],
    };

    const result = CustomScenario.apply(baseParams, spec);

    // Debt should decrease each month
    expect(result[0].debt).toBeGreaterThan(0);
    // Eventually debt should approach zero
    expect(result[11].debt).toBeLessThan(result[0].debt);
  });

  it('should handle factor perturbations', () => {
    const baseParams: BaseParams = {
      cash0: 5000,
      debt0: 10000,
      monthlyIncome: 4000,
      monthlyEssentials: 2000,
      monthlyDiscretionary: 500,
      monthlyDebtPayment: 200,
      monthlyInvest: 300,
    };

    const spec: CustomScenarioSpec = {
      name: 'Cut discretionary by 50%',
      perturbations: [
        {
          param: 'monthlyDiscretionary',
          kind: 'factor',
          value: 0.5,
          fromMonth: 1,
          toMonth: 12,
        },
      ],
    };

    const result = CustomScenario.apply(baseParams, spec);

    // With 50% discretionary cut, cash should be higher
    expect(result[11].cash).toBeGreaterThan(0);
  });

  it('should complete 12-month scenario', () => {
    const baseParams: BaseParams = {
      cash0: 5000,
      debt0: 10000,
      monthlyIncome: 4000,
      monthlyEssentials: 2000,
      monthlyDiscretionary: 500,
      monthlyDebtPayment: 200,
      monthlyInvest: 300,
    };

    const spec: CustomScenarioSpec = {
      name: 'Base case',
      perturbations: [],
    };

    const result = CustomScenario.apply(baseParams, spec);

    expect(result.length).toBe(12);
    expect(result[0].m).toBe(1);
    expect(result[11].m).toBe(12);
  });
});
