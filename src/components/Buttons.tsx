import type { ReactNode } from 'react';

export function PrimaryBtn({ onClick, children, disabled }: { onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'linear-gradient(135deg,var(--teal),var(--sky))',
        color: '#fff',
        border: 'none',
        borderRadius: 16,
        padding: '14px 18px',
        fontWeight: 900,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: '1px solid var(--bdr2)',
        borderRadius: 16,
        padding: '14px 18px',
        fontWeight: 800,
        cursor: 'pointer',
        color: 'var(--ink2)',
      }}
    >
      {children}
    </button>
  );
}
