export function shouldShowCheckin(args: { lastCheckinAt?: number | null; now?: number; minDays?: number }) {
  const now = args.now ?? Date.now();
  const minDays = args.minDays ?? 7;
  const last = args.lastCheckinAt ?? 0;
  const gapMs = minDays * 24 * 60 * 60 * 1000;
  return now - last >= gapMs;
}

export function buildCheckinMessage() {
  return "Quick check-in — want to review your progress toward the buffer and next step we picked?";
}
