import type { ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return <div style={{ background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 18, padding: 16, boxShadow: 'var(--sh1)' }}>{children}</div>;
}
