import React from 'react';
import { AtlasDb } from '@/lib/db/atlasDb';
import { Behaviour } from '@/lib/models/Behaviour';
import { ATLAS_VOICE } from '@/lib/voice/AtlasVoice';

interface FollowupModalProps {
  db: AtlasDb;
  plan: any;
  onClose: () => void;
}

export const FollowupModal: React.FC<FollowupModalProps> = ({ db, plan, onClose }) => {
  const handleResponse = async (result: 'did_it' | 'partial' | 'skipped') => {
    await Behaviour.recordFollowup(db, plan.k, result);
    onClose();
  };

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
          padding: '28px',
        }}
      >
        <h3 className="serif" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
          Check in
        </h3>
        <p style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.6, marginBottom: 20 }}>
          {ATLAS_VOICE.followup_prompt(plan.lever || 'this goal', plan.amt || 0)}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ATLAS_VOICE.followup_options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleResponse(opt.value as any)}
              className="btn btn-p"
              style={{ justifyContent: 'center', padding: '10px 14px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="btn-g"
          style={{ marginTop: 12, width: '100%', justifyContent: 'center', padding: '8px 14px', fontSize: 12 }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};
