export type AccountType =
  | 'checking'
  | 'savings'
  | 'hysa'
  | 'taxable_brokerage'
  | 'traditional_ira'
  | 'roth_ira'
  | 'traditional_401k'
  | 'roth_401k'
  | 'hsa'
  | 'real_estate'
  | 'vehicle'
  | 'other_asset'
  | 'credit_card'
  | 'student_loan'
  | 'mortgage'
  | 'auto_loan'
  | 'other_liability';

export type TaxTreatment = 'cash' | 'pre_tax' | 'post_tax' | 'tax_free' | 'after_tax_basis_with_growth' | 'na';

export interface AccountAllocation {
  stocks?: number;
  bonds?: number;
  cash?: number;
  alts?: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  apr?: number;
  allocation?: AccountAllocation;
  liquid: boolean;
  taxTreatment: TaxTreatment;
  updatedAt: number;
  createdAt: number;
}

export interface AccountRollup {
  assets: number;
  liabilities: number;
  netWorth: number;
  liquid: number;
  illiquid: number;
  liquidNetWorth: number;
  allocation: {
    stocks: number;
    bonds: number;
    cash: number;
    alts: number;
  };
  tax: {
    preTax: number;
    postTax: number;
    taxFree: number;
    basisGrowth: number;
    naTax: number;
  };
  derivedHighInterestDebt: number;
  derivedLowInterestDebt: number;
}

export class Accounts {
  static TYPE_META: Record<
    AccountType,
    {
      kind: 'asset' | 'liability';
      liquid: boolean;
      tax: TaxTreatment;
      label: string;
    }
  > = {
    checking: { kind: 'asset', liquid: true, tax: 'cash', label: 'Checking' },
    savings: { kind: 'asset', liquid: true, tax: 'cash', label: 'Savings' },
    hysa: { kind: 'asset', liquid: true, tax: 'cash', label: 'HYSA' },
    taxable_brokerage: {
      kind: 'asset',
      liquid: true,
      tax: 'after_tax_basis_with_growth',
      label: 'Taxable brokerage',
    },
    traditional_ira: { kind: 'asset', liquid: false, tax: 'pre_tax', label: 'Traditional IRA' },
    roth_ira: { kind: 'asset', liquid: false, tax: 'tax_free', label: 'Roth IRA' },
    traditional_401k: { kind: 'asset', liquid: false, tax: 'pre_tax', label: 'Traditional 401(k)' },
    roth_401k: { kind: 'asset', liquid: false, tax: 'tax_free', label: 'Roth 401(k)' },
    hsa: { kind: 'asset', liquid: false, tax: 'tax_free', label: 'HSA' },
    real_estate: { kind: 'asset', liquid: false, tax: 'na', label: 'Real estate' },
    vehicle: { kind: 'asset', liquid: false, tax: 'na', label: 'Vehicle' },
    other_asset: { kind: 'asset', liquid: false, tax: 'na', label: 'Other asset' },
    credit_card: { kind: 'liability', liquid: true, tax: 'na', label: 'Credit card' },
    student_loan: { kind: 'liability', liquid: false, tax: 'na', label: 'Student loan' },
    mortgage: { kind: 'liability', liquid: false, tax: 'na', label: 'Mortgage' },
    auto_loan: { kind: 'liability', liquid: false, tax: 'na', label: 'Auto loan' },
    other_liability: { kind: 'liability', liquid: false, tax: 'na', label: 'Other liability' },
  };

  static rollup(accounts: Account[]): AccountRollup {
    let assets = 0;
    let liabilities = 0;
    let liquid = 0;
    let illiquid = 0;
    let stocks = 0;
    let bonds = 0;
    let cash = 0;
    let alts = 0;
    let preTax = 0;
    let postTax = 0;
    let taxFree = 0;
    let basisGrowth = 0;
    let naTax = 0;
    let highInterestDebt = 0;
    let lowInterestDebt = 0;

    for (const a of accounts) {
      const meta = this.TYPE_META[a.type] || { kind: 'asset' as const, liquid: false, tax: 'na' as const };
      const value = +a.balance || 0;

      if (meta.kind === 'asset') {
        assets += value;
        if (meta.liquid) {
          liquid += value;
        } else {
          illiquid += value;
        }

        // Asset class allocation
        if (a.allocation) {
          stocks += value * (a.allocation.stocks || 0);
          bonds += value * (a.allocation.bonds || 0);
          cash += value * (a.allocation.cash || 0);
          alts += value * (a.allocation.alts || 0);
        } else if (meta.tax === 'cash') {
          cash += value;
        } else {
          // Assume default 60/40 if unknown investment
          stocks += value * 0.6;
          bonds += value * 0.4;
        }

        // Tax bucket
        if (meta.tax === 'pre_tax') {
          preTax += value;
        } else if (meta.tax === 'tax_free') {
          taxFree += value;
        } else if (meta.tax === 'after_tax_basis_with_growth') {
          basisGrowth += value;
        } else if (meta.tax === 'cash') {
          postTax += value;
        } else {
          naTax += value;
        }
      } else {
        liabilities += value;
        if ((a.apr || 0) >= 0.08) {
          highInterestDebt += value;
        } else {
          lowInterestDebt += value;
        }
      }
    }

    return {
      assets,
      liabilities,
      netWorth: assets - liabilities,
      liquid,
      illiquid,
      liquidNetWorth: liquid - liabilities,
      allocation: { stocks, bonds, cash, alts },
      tax: { preTax, postTax, taxFree, basisGrowth, naTax },
      derivedHighInterestDebt: highInterestDebt,
      derivedLowInterestDebt: lowInterestDebt,
    };
  }
}
