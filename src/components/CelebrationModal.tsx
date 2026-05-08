import React from 'react';
import { ATLAS_VOICE } from '@/lib/voice/AtlasVoice';

interface CelebrationModalProps {
  tier: string;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ tier, onClose }) => {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
          padding: '48px 28px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h3 className="serif" style={{ fontSize: 22, fontWeight: 700, marginBottom: 14, color: 'var(--teal)' }}>
          {tier}
        </h3>
        <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.7, marginBottom: 24 }}>
          {ATLAS_VOICE.celebration(tier)}
        </p>
        <button onClick={onClose} className="btn btn-p" style={{ justifyContent: 'center', width: '100%' }}>
          Got it
        </button>
      </div>
    </div>
  );
};
