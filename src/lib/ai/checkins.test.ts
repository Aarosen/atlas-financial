import { describe, expect, it } from 'vitest';
import { buildCheckinMessage, shouldShowCheckin } from './checkins';

describe('checkins', () => {
  it('shows checkin when last checkin is older than threshold', () => {
    const now = Date.now();
    const last = now - 8 * 24 * 60 * 60 * 1000;
    expect(shouldShowCheckin({ lastCheckinAt: last, now, minDays: 7 })).toBe(true);
  });

  it('suppresses checkin when last checkin is recent', () => {
    const now = Date.now();
    const last = now - 2 * 24 * 60 * 60 * 1000;
    expect(shouldShowCheckin({ lastCheckinAt: last, now, minDays: 7 })).toBe(false);
  });

  it('builds checkin message', () => {
    expect(buildCheckinMessage().toLowerCase()).toContain('check-in');
  });
});
