import { describe, expect, it } from 'vitest';
import { createReplayEntry, detectReplayEmotion, logReplayEntry, shouldLogReplay } from './replay';

describe('replay logging', () => {
  it('detects replay emotions', () => {
    expect(detectReplayEmotion("I'm terrible with money")).toBe('ashamed');
    expect(detectReplayEmotion('Not sure where to start')).toBe('uncertain');
  });

  it('respects opt-out', async () => {
    const calls: any[] = [];
    const entry = createReplayEntry({ role: 'user', text: 'hello' });
    const logged = await logReplayEntry({
      enabled: false,
      entry,
      set: async (_store, value) => {
        calls.push(value);
      },
    });
    expect(logged).toBe(false);
    expect(calls.length).toBe(0);
  });

  it('logs when enabled', async () => {
    const calls: any[] = [];
    const entry = createReplayEntry({ role: 'assistant', text: 'hi' });
    const logged = await logReplayEntry({
      enabled: true,
      entry,
      set: async (_store, value) => {
        calls.push(value);
      },
    });
    expect(logged).toBe(true);
    expect(calls.length).toBe(1);
  });

  it('shouldLogReplay defaults to true', () => {
    expect(shouldLogReplay(undefined)).toBe(true);
    expect(shouldLogReplay(true)).toBe(true);
    expect(shouldLogReplay(false)).toBe(false);
  });
});
