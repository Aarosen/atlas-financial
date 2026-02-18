import { describe, expect, it, vi } from 'vitest';

import { createVoice } from './voice';

describe('voice', () => {
  it('speak calls speechSynthesis.speak when available', () => {
    const speak = vi.fn();
    const cancel = vi.fn();

    (globalThis as any).window = {
      speechSynthesis: {
        speak,
        cancel,
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = function SpeechSynthesisUtterance(this: any, text: string) {
      this.text = text;
    };

    const v = createVoice();
    expect(v.ttsSupported).toBe(true);

    v.speak('hello');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('stopSpeak cancels speechSynthesis', () => {
    const speak = vi.fn();
    const cancel = vi.fn();

    (globalThis as any).window = {
      speechSynthesis: {
        speak,
        cancel,
      },
    };
    (globalThis as any).SpeechSynthesisUtterance = function SpeechSynthesisUtterance(this: any, text: string) {
      this.text = text;
    };

    const v = createVoice();
    v.stopSpeak();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
