import React, { useState, useEffect } from 'react';
import { AtlasDb } from '@/lib/db/atlasDb';
import { Consent } from '@/lib/consent/Consent';

interface ConsentCardProps {
  db: AtlasDb;
}

export const ConsentCard: React.FC<ConsentCardProps> = ({ db }) => {
  const [consents, setConsents] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!db) return;
    (async () => {
      try {
        const all = await Consent.getAll(db);
        setConsents(all);
      } catch {
        setConsents({});
      }
    })();
  }, [db]);

  const grant = async (scope: string, scopeText: string) => {
    await Consent.grant(db, scope, scopeText);
    const updated = await Consent.getAll(db);
    setConsents(updated);
  };

  const revoke = async (scope: string) => {
    if (scope === 'plaid') {
      const prefs = await db.get('prefs', 'plaid');
      if (prefs?.access_token) {
        try {
          await fetch('/api/plaid/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token: prefs.access_token }),
          });
        } catch (e) {
          console.error('Failed to disconnect Plaid:', e);
        }
        await db.set('prefs', { k: 'plaid', access_token: null });
      }
    }
    await Consent.revoke(db, scope);
    const updated = await Consent.getAll(db);
    setConsents(updated);
  };

  return (
    <div className="card fu" style={{ padding: '24px', marginBottom: 16 }}>
      <h3 className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 14 }}>
        Your consents
      </h3>
      {Consent.SCOPES.map((s) => {
        const cur = consents[s.k];
        return (
          <div
            key={s.k}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid var(--bdr)',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.5, marginTop: 2 }}>
                {s.desc}
              </div>
              {cur?.ts && (
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
                  Status: {cur.granted ? 'Granted' : 'Revoked'} · {new Date(cur.ts).toLocaleDateString()}
                </div>
              )}
            </div>
            {cur?.granted ? (
              <button
                onClick={() => revoke(s.k)}
                className="btn btn-s"
                style={{ padding: '7px 12px', fontSize: 12, color: 'var(--rose)' }}
              >
                Revoke
              </button>
            ) : (
              <button
                onClick={() => grant(s.k, s.label)}
                className="btn btn-p"
                style={{ padding: '7px 12px', fontSize: 12 }}
              >
                Grant
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
