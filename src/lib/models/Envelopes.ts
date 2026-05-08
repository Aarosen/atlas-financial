export type RolloverPolicy = 'rollover' | 'reset' | 'sweep_to_goal';

export interface Envelope {
  name: string;
  budgeted: number;
  rolloverPolicy: RolloverPolicy;
  sweepToGoalId?: string;
}

export interface EnvelopeRecord {
  k: string; // YYYY-MM
  expectedIncome: number;
  envelopes: Envelope[];
  finalized: boolean;
  createdAt: number;
}

export interface Transaction {
  id?: string;
  ts: number;
  amount: number;
  cat?: string;
  kind?: string;
  merchant?: string;
  [key: string]: any;
}

export interface EnvelopeActuals {
  [envelopeName: string]: number;
}

export class Envelopes {
  static currentMonthKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  static async loadCurrent(db: any): Promise<EnvelopeRecord | undefined> {
    return await db.get('envelopes', this.currentMonthKey());
  }

  static async loadPrior(db: any): Promise<EnvelopeRecord | undefined> {
    const k = this.currentMonthKey();
    const all = (await db.all('envelopes')) || [];
    const sorted = all.sort((a: EnvelopeRecord, b: EnvelopeRecord) => a.k.localeCompare(b.k));
    const idx = sorted.findIndex((s: EnvelopeRecord) => s.k === k);
    return idx > 0 ? sorted[idx - 1] : undefined;
  }

  static async ensureForMonth(db: any, expectedIncome: number): Promise<EnvelopeRecord> {
    const k = this.currentMonthKey();
    let cur = await db.get('envelopes', k);
    if (cur) return cur;

    // Roll forward from prior month if available
    const prior = await this.loadPrior(db);
    let envs: Envelope[];

    if (prior) {
      // Apply rollover policy to each prior envelope
      envs = prior.envelopes.map((e) => ({
        name: e.name,
        budgeted: 0,
        rolloverPolicy: e.rolloverPolicy || 'reset',
      }));
    } else {
      envs = [
        { name: 'Rent/Mortgage', budgeted: 0, rolloverPolicy: 'reset' },
        { name: 'Groceries', budgeted: 0, rolloverPolicy: 'reset' },
        { name: 'Utilities', budgeted: 0, rolloverPolicy: 'reset' },
        { name: 'Transport', budgeted: 0, rolloverPolicy: 'reset' },
        { name: 'Insurance', budgeted: 0, rolloverPolicy: 'reset' },
        { name: 'Health', budgeted: 0, rolloverPolicy: 'reset' },
        { name: 'Subscriptions', budgeted: 0, rolloverPolicy: 'rollover' },
        { name: 'Dining', budgeted: 0, rolloverPolicy: 'rollover' },
        { name: 'Entertainment', budgeted: 0, rolloverPolicy: 'rollover' },
        { name: 'Shopping', budgeted: 0, rolloverPolicy: 'rollover' },
        { name: 'Future You', budgeted: 0, rolloverPolicy: 'sweep_to_goal' },
        { name: 'Buffer', budgeted: 0, rolloverPolicy: 'rollover' },
      ];
    }

    cur = {
      k,
      expectedIncome: expectedIncome || 0,
      envelopes: envs,
      finalized: false,
      createdAt: Date.now(),
    };
    await db.set('envelopes', cur);
    return cur;
  }

  static actuals(envelopeRecord: EnvelopeRecord, txns: Transaction[]): EnvelopeActuals {
    const k = envelopeRecord.k;
    const [year, month] = k.split('-').map(Number);
    const ts0 = new Date(year, month - 1, 1).getTime();
    const ts1 = new Date(year, month, 1).getTime();

    const recent = txns.filter((t) => t.ts >= ts0 && t.ts < ts1 && t.amount < 0);

    // Map transaction.cat → envelope.name
    const catMap: Record<string, string> = {
      housing: 'Rent/Mortgage',
      rent: 'Rent/Mortgage',
      mortgage: 'Rent/Mortgage',
      groceries: 'Groceries',
      utilities: 'Utilities',
      transport: 'Transport',
      transportation: 'Transport',
      insurance: 'Insurance',
      health: 'Health',
      healthcare: 'Health',
      subscriptions: 'Subscriptions',
      dining: 'Dining',
      restaurant: 'Dining',
      entertainment: 'Entertainment',
      shopping: 'Shopping',
      travel: 'Entertainment',
      childcare: 'Health',
      savings: 'Future You',
      investing: 'Future You',
      investment: 'Future You',
    };

    const actuals: EnvelopeActuals = {};
    for (const e of envelopeRecord.envelopes) {
      actuals[e.name] = 0;
    }

    for (const t of recent) {
      const targetEnv = catMap[t.cat || ''] || 'Buffer';
      if (actuals[targetEnv] !== undefined) {
        actuals[targetEnv] += Math.abs(t.amount);
      }
    }

    return actuals;
  }

  static unallocated(envelopeRecord: EnvelopeRecord): number {
    return envelopeRecord.expectedIncome - envelopeRecord.envelopes.reduce((s, e) => s + (+e.budgeted || 0), 0);
  }
}
