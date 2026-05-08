import React, { useState, useEffect } from 'react';
import { AtlasDb } from '@/lib/db/atlasDb';
import { Snapshots, Snapshot } from '@/lib/models/Snapshots';

interface TrajectoryCardProps {
  db: AtlasDb;
}

export const TrajectoryCard: React.FC<TrajectoryCardProps> = ({ db }) => {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);

  useEffect(() => {
    Snapshots.getSorted(db).then(setSnaps);
  }, [db]);

  if (snaps.length < 2) {
    return (
      <div className="card fu" style={{ padding: '26px', gridColumn: '1/-1' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8 }}>
          YOUR TRAJECTORY
        </div>
        <p style={{ color: 'var(--ink3)', fontSize: 13, margin: 0 }}>
          Atlas takes one snapshot per month. Come back next month to see your trajectory line.
        </p>
      </div>
    );
  }

  const max = Math.max(...snaps.map((s) => s.netWorth));
  const min = Math.min(...snaps.map((s) => s.netWorth));
  const range = max - min || 1;

  const path = snaps
    .map((s, i) => {
      const x = (i / (snaps.length - 1)) * 100;
      const y = 100 - ((s.netWorth - min) / range) * 100;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="card fu" style={{ padding: '26px', gridColumn: '1/-1' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink3)', marginBottom: 14 }}>
        YOUR TRAJECTORY · {snaps.length} MONTHS
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ width: '100%', height: 140, background: 'var(--bg2)', borderRadius: 10 }}
      >
        <path d={path} fill="none" stroke="var(--teal)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--ink3)' }}>
        <span>{snaps[0].k}</span>
        <span>{snaps[snaps.length - 1].k}</span>
      </div>
    </div>
  );
};
