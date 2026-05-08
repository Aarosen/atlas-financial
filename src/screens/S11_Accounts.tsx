import React, { useState, useCallback, useEffect } from 'react';
import { AtlasDb } from '@/lib/db/atlasDb';
import { Accounts, Account, AccountType } from '@/lib/models/Accounts';

interface S11Props {
  onBack: () => void;
  db: AtlasDb;
}

const fc = (n: number) => {
  if (n === undefined || n === null) return '$0';
  return '$' + Math.round(n).toLocaleString();
};

export const S11_Accounts: React.FC<S11Props> = ({ onBack, db }) => {
  const [accts, setAccts] = useState<Account[]>([]);
  const [editing, setEditing] = useState<Account | null>(null);

  const refresh = useCallback(async () => {
    const all = await db.all<Account>('accounts');
    setAccts(all || []);
  }, [db]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const r = Accounts.rollup(accts);

  const blank = (): Account => ({
    id: 'acc_' + Date.now() + Math.random().toString(36).slice(2, 6),
    name: '',
    type: 'checking',
    balance: 0,
    apr: 0,
    liquid: true,
    taxTreatment: 'cash',
    allocation: null as any,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const save = async (a: Account) => {
    a.updatedAt = Date.now();
    await db.set('accounts', a);
    setEditing(null);
    refresh();
  };

  const remove = async (id: string) => {
    await db.del('accounts', id);
    refresh();
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--bdr)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'var(--card)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button onClick={onBack} className="btn-g">
          ← Dashboard
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span className="serif" style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
            Accounts &amp; Net Worth
          </span>
        </div>
        <button
          onClick={() => setEditing(blank())}
          className="btn btn-p"
          style={{ padding: '8px 14px', fontSize: 13 }}
        >
          + Add
        </button>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 20px' }}>
        <div className="card-md fu" style={{ padding: '22px', marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 11 }}>
              <div style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 700 }}>NET WORTH</div>
              <div
                className="serif"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: r.netWorth >= 0 ? 'var(--teal)' : 'var(--rose)',
                }}
              >
                {fc(r.netWorth)}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 11 }}>
              <div style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 700 }}>LIQUID NET WORTH</div>
              <div
                className="serif"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: r.liquidNetWorth >= 0 ? 'var(--sky)' : 'var(--rose)',
                }}
              >
                {fc(r.liquidNetWorth)}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 11 }}>
              <div style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 700 }}>ASSETS</div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                {fc(r.assets)}
              </div>
            </div>
            <div style={{ padding: '12px', background: 'var(--bg2)', borderRadius: 11 }}>
              <div style={{ fontSize: 10, color: 'var(--ink3)', fontWeight: 700 }}>LIABILITIES</div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 700, color: 'var(--rose)' }}>
                {fc(r.liabilities)}
              </div>
            </div>
          </div>
        </div>

        {accts.length === 0 && (
          <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🏦</div>
            <h3 className="serif" style={{ fontSize: 18, fontWeight: 700 }}>
              No accounts yet
            </h3>
            <p
              style={{
                color: 'var(--ink3)',
                fontSize: 13,
                lineHeight: 1.6,
                marginBottom: 14,
              }}
            >
              Add your accounts manually to unlock real net-worth tracking, retirement projections, and tax-aware
              reasoning. Atlas works without bank sync.
            </p>
            <button onClick={() => setEditing(blank())} className="btn btn-p">
              + Add your first account
            </button>
          </div>
        )}

        {accts.map((a) => {
          const meta = Accounts.TYPE_META[a.type];
          return (
            <div
              key={a.id}
              className="card"
              style={{
                padding: '14px 16px',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name || 'Untitled'}</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>
                  {meta?.label} · {meta?.kind} · {meta?.liquid ? 'liquid' : 'illiquid'} · tax: {meta?.tax}
                </div>
              </div>
              <div
                className="serif"
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: meta?.kind === 'liability' ? 'var(--rose)' : 'var(--ink)',
                }}
              >
                {meta?.kind === 'liability' ? '-' : ''}
                {fc(Math.abs(+a.balance || 0))}
              </div>
              <button
                onClick={() => setEditing(a)}
                className="btn-g"
                style={{ padding: '4px 8px', fontSize: 11 }}
              >
                edit
              </button>
              <button
                onClick={() => remove(a.id)}
                className="btn-g"
                style={{ padding: '4px 8px', fontSize: 11 }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {editing && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(28,24,20,.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            zIndex: 100,
          }}
        >
          <div
            className="card-lg"
            style={{
              width: '100%',
              maxWidth: 420,
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h3 className="serif" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
              {editing.createdAt === editing.updatedAt ? 'New' : 'Edit'} account
            </h3>
            <input
              className="input"
              placeholder="Name (e.g. Chase checking)"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              style={{ marginBottom: 8 }}
            />
            <select
              className="input"
              value={editing.type}
              onChange={(e) => setEditing({ ...editing, type: e.target.value as AccountType })}
              style={{ marginBottom: 8 }}
            >
              {Object.entries(Accounts.TYPE_META).map(([k, m]) => (
                <option key={k} value={k}>
                  {m.label} ({m.kind})
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              placeholder="Balance"
              value={editing.balance}
              onChange={(e) => setEditing({ ...editing, balance: +e.target.value || 0 })}
              style={{ marginBottom: 8 }}
            />
            {Accounts.TYPE_META[editing.type]?.kind === 'liability' && (
              <input
                className="input"
                type="number"
                step="0.001"
                placeholder="APR (e.g. 0.18)"
                value={editing.apr || 0}
                onChange={(e) => setEditing({ ...editing, apr: +e.target.value || 0 })}
                style={{ marginBottom: 8 }}
              />
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button
                onClick={() => setEditing(null)}
                className="btn btn-s"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                onClick={() => save(editing)}
                className="btn btn-p"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
