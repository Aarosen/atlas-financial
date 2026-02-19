import { describe, expect, it } from 'vitest';

import { buildAudioLesson } from './audioLessons';

describe('audioLessons', () => {
  it('estimates duration', () => {
    const lesson = buildAudioLesson('This is a short lesson.');
    expect(lesson.estimatedDurationSec).toBeGreaterThan(0);
  });
});
