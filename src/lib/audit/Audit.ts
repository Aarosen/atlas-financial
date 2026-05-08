export interface AuditEntry {
  id?: string;
  ts: number;
  kind: 'engine_run' | 'llm_extract' | 'llm_chat' | 'plaid_pull' | 'consent_grant' | 'consent_revoke';
  payload: Record<string, any>;
}

export class Audit {
  static async write(db: any, kind: AuditEntry['kind'], payload: Record<string, any>): Promise<string> {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ts: Date.now(),
      kind,
      payload,
    };
    await db.set('audit', entry);
    return entry.id!;
  }

  static async getAll(db: any): Promise<AuditEntry[]> {
    return (await db.all('audit')) || [];
  }

  static async clear(db: any): Promise<void> {
    const all = await db.all('audit');
    if (all) {
      for (const entry of all) {
        await db.del('audit', entry.id);
      }
    }
  }
}
