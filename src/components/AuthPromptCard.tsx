import { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { Button } from '@/components/Buttons';
import { MagicLinkAuth } from '@/components/MagicLinkAuth';

export function AuthPromptCard({ onDismiss }: { onDismiss: () => void }) {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return (
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--bdr)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Save Your Progress</h3>
          <button
            onClick={() => {
              setShowAuth(false);
              onDismiss();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--ink2)',
            }}
          >
            <X size={20} />
          </button>
        </div>
        <p style={{ margin: '0 0 16px 0', color: 'var(--ink2)', fontSize: 14, lineHeight: 1.6 }}>
          Your financial profile is built. Sign in to save it across all your devices and not lose this progress.
        </p>
        <MagicLinkAuth
          onAuthSuccess={() => {
            setShowAuth(false);
            onDismiss();
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--teal-lt) 0%, rgba(0, 150, 136, 0.05) 100%)',
        border: '1px solid var(--teal)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <LogIn size={20} style={{ color: 'var(--teal)', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Save your progress</div>
          <div style={{ fontSize: 13, color: 'var(--ink2)' }}>
            Sign in to remember your commitments and get follow-ups
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button onClick={() => setShowAuth(true)} variant="primary" size="sm">
          Sign in
        </Button>
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent',
            border: '1px solid var(--bdr)',
            borderRadius: 6,
            padding: '8px 12px',
            cursor: 'pointer',
            color: 'var(--ink2)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
