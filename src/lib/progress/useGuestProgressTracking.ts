import { useCallback, useEffect, useState } from 'react';
import type { FinancialState } from '@/lib/state/types';

const KEY = 'atlas_guest_progress_v1';
const MAX_HISTORY = 10;

export interface GuestSnapshot {
  ts: number;
  fin: FinancialState;
}

export interface GuestProgress {
  history: GuestSnapshot[];
  latest: GuestSnapshot | null;
  prev: GuestSnapshot | null;
  delta: Partial<Record<keyof FinancialState, number>>;
}

function read(): GuestSnapshot[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && typeof s.ts === 'number' && s.fin) as GuestSnapshot[];
  } catch { return []; }
}

function write(history: GuestSnapshot[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(history.slice(-MAX_HISTORY))); }
  catch { /* quota errors ignored */ }
}

export function useGuestProgressTracking(fin: FinancialState | null, enabled: boolean): GuestProgress {
  const [history, setHistory] = useState<GuestSnapshot[]>(() => read());

  useEffect(() => {
    if (!enabled || !fin) return;
    if (!Number.isFinite(fin.monthlyIncome) || fin.monthlyIncome <= 0) return; // ignore default state
    setHistory((prev) => {
      const newSnap: GuestSnapshot = { ts: Date.now(), fin };
      const next = [...prev, newSnap].slice(-MAX_HISTORY);
      write(next);
      return next;
    });
  }, [enabled, fin]);

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const delta: Partial<Record<keyof FinancialState, number>> = {};
  if (latest && prev) {
    (['monthlyIncome', 'essentialExpenses', 'totalSavings'] as const).forEach((k) => {
      const a = Number(latest.fin[k] ?? 0);
      const b = Number(prev.fin[k] ?? 0);
      if (Number.isFinite(a) && Number.isFinite(b)) delta[k] = a - b;
    });
  }

  return { history, latest, prev, delta };
}

export const __TEST_ONLY__ = { read, write };
