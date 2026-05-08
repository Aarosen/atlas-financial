export interface BehaviourEvent {
  id?: string;
  kind: 'commitment_made' | 'followup';
  lever?: string;
  amt?: number;
  planId?: string;
  result?: 'did_it' | 'partial' | 'skipped';
  ts: number;
}

export class Behaviour {
  static async recordCommitment(db: any, lever: string, amt: number): Promise<void> {
    await db.set('behaviour', {
      kind: 'commitment_made',
      lever,
      amt,
      ts: Date.now(),
    });
  }

  static async recordFollowup(db: any, planId: string, result: 'did_it' | 'partial' | 'skipped'): Promise<void> {
    await db.set('behaviour', {
      kind: 'followup',
      planId,
      result,
      ts: Date.now(),
    });
  }

  static async getAll(db: any): Promise<BehaviourEvent[]> {
    return (await db.all('behaviour')) || [];
  }

  static async getFollowups(db: any): Promise<BehaviourEvent[]> {
    const all = await this.getAll(db);
    return all.filter((e) => e.kind === 'followup');
  }

  static async getCommitments(db: any): Promise<BehaviourEvent[]> {
    const all = await this.getAll(db);
    return all.filter((e) => e.kind === 'commitment_made');
  }

  static async getFollowThroughRate(db: any): Promise<number | null> {
    const followups = await this.getFollowups(db);
    if (followups.length === 0) return null;
    const did = followups.filter((f) => f.result === 'did_it').length;
    return did / followups.length;
  }

  static async getPendingFollowup(db: any, plans: any[]): Promise<any | null> {
    const beh = await this.getAll(db);
    const followups = new Set(beh.filter((b) => b.kind === 'followup').map((b) => b.planId));

    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const stale = plans.filter(
      (p) => p.ts && p.ts < sevenDaysAgo && !followups.has(p.k)
    );

    return stale.length > 0 ? stale[0] : null;
  }
}
