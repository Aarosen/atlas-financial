export interface ConsentRecord {
  k: string; // scope key: 'ai_chat', 'plaid', 'behaviour'
  v: {
    granted: boolean;
    scope: string;
    ts: number;
  };
}

export class Consent {
  static readonly SCOPES = [
    {
      k: 'ai_chat',
      label: 'AI conversation (Claude Sonnet 4.5)',
      desc: 'Send chat messages to Anthropic via our proxy. Financial numbers are never transmitted.',
    },
    {
      k: 'plaid',
      label: 'Bank read-only (Plaid)',
      desc: 'Pull transactions only. No balances, no transfers.',
    },
    {
      k: 'behaviour',
      label: 'Behavioural insights',
      desc: 'Track which recommendations you act on, to tune future tone (off by default).',
    },
  ];

  static async grant(db: any, scope: string, scopeText: string): Promise<void> {
    await db.set('consent', {
      k: scope,
      v: {
        granted: true,
        scope: scopeText,
        ts: Date.now(),
      },
    });
  }

  static async revoke(db: any, scope: string): Promise<void> {
    const existing = await db.get('consent', scope);
    await db.set('consent', {
      k: scope,
      v: {
        granted: false,
        scope: existing?.v?.scope || '',
        ts: Date.now(),
      },
    });
  }

  static async isGranted(db: any, scope: string): Promise<boolean> {
    const record = await db.get('consent', scope);
    return record?.v?.granted === true;
  }

  static async getAll(db: any): Promise<Record<string, ConsentRecord['v']>> {
    const all = (await db.all('consent')) || [];
    const map: Record<string, ConsentRecord['v']> = {};
    for (const record of all) {
      map[record.k] = record.v;
    }
    return map;
  }
}
