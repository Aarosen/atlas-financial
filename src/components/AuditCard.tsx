import React, { useState, useEffect } from 'react';
import { AtlasDb } from '@/lib/db/atlasDb';

interface AuditEntry {
  id?: string;
  ts: number;
  kind: string;
  payload: Record<string, any>;
}

interface AuditCardProps {
  db: AtlasDb;
}

export const AuditCard: React.FC<AuditCardProps> = ({ db }) => {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open && db) {
      db.all('audit').then((a) => {
        setItems((a || []).sort((x, y) => y.ts - x.ts));
      }).catch(() => setItems([]));
    }
  }, [open, db]);

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card fu" style={{ padding: '24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 className="serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
          Decision log
        </h3>
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn-g"
          style={{ fontSize: 12, padding: '6px 10px' }}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 0 }}>
        Every recommendation, AI call, and bank pull is logged on this device. Atlas keeps no copy.
      </p>
      {open && (
        <>
          <div
            style={{
              marginTop: 14,
              maxHeight: 300,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {items.length === 0 && (
              <div style={{ color: 'var(--ink3)', fontSize: 12, padding: '12px 0' }}>No events yet.</div>
            )}
            {items.map((e) => (
              <details
                key={e.id}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg2)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <summary style={{ cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
                  {new Date(e.ts).toLocaleString()} · <strong>{e.kind}</strong>
                </summary>
                <pre
                  style={{
                    fontSize: 11,
                    marginTop: 6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--ink3)',
                  }}
                >
                  {JSON.stringify(e.payload, null, 2)}
                </pre>
              </details>
            ))}
          </div>
          <button
            onClick={exportLog}
            className="btn btn-s"
            style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
          >
            Export audit log
          </button>
        </>
      )}
    </div>
  );
};
