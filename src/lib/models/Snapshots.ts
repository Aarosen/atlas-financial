export interface Snapshot {
  k: string; // YYYY-MM
  ts: number;
  tier: string;
  lever: string;
  bufMo: number;
  futPct: number;
  netWorth: number;
  income: number;
  essentials: number;
}

export class Snapshots {
  static currentKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  static async maybeTake(db: any, fin: any, baseline: any): Promise<Snapshot | null> {
    const k = this.currentKey();
    const existing = await db.get('snapshots', k);
    if (existing) return existing;

    const snap: Snapshot = {
      k,
      ts: Date.now(),
      tier: baseline?.tier || 'unknown',
      lever: baseline?.lever || 'unknown',
      bufMo: baseline?.bufMo || 0,
      futPct: baseline?.futPct || 0,
      netWorth: (fin?.totalSavings || 0) - (fin?.highInterestDebt || 0) - (fin?.lowInterestDebt || 0),
      income: fin?.monthlyIncome || 0,
      essentials: fin?.essentialExpenses || 0,
    };

    await db.set('snapshots', snap);
    return snap;
  }

  static async getAll(db: any): Promise<Snapshot[]> {
    return (await db.all('snapshots')) || [];
  }

  static async getSorted(db: any): Promise<Snapshot[]> {
    const all = await this.getAll(db);
    return all.sort((a, b) => a.k.localeCompare(b.k));
  }
}
