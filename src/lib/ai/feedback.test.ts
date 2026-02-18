import { describe, expect, it } from 'vitest';
import { createFeedbackEntry, shouldPromptFeedback } from './feedback';

describe('feedback', () => {
  it('creates feedback entry', () => {
    const entry = createFeedbackEntry({ responseId: 'r1', rating: 'helpful' });
    expect(entry.responseId).toBe('r1');
    expect(entry.rating).toBe('helpful');
  });

  it('prompts feedback after cooldown', () => {
    const now = Date.now();
    const last = now - 6 * 24 * 60 * 60 * 1000;
    expect(shouldPromptFeedback({ lastPromptAt: last, now, minSessions: 5 })).toBe(true);
  });
});
