import { describe, expect, it } from 'vitest';
import TestRenderer from 'react-test-renderer';
import React from 'react';

import { ConversationScreen } from './Conversation';

function collectAriaLabelsFromTree(tr: TestRenderer.ReactTestRenderer) {
  return tr.root
    .findAll((n) => typeof (n as any)?.props?.['aria-label'] === 'string')
    .map((n) => String((n as any).props['aria-label']));
}

describe('ConversationScreen voice UI', () => {
  it('hides mic button when voiceSupported is false', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(ConversationScreen as any, {
          theme: 'light',
          onToggleTheme: () => {},
          apiErr: null,
          apiStatus: 'online',
          msgs: [],
          busy: false,
          inp: '',
          onChangeInp: () => {},
          onKeyDown: () => {},
          onSend: () => {},
          botRef: { current: null },
          voiceSupported: false,
          onVoiceStart: () => {},
        })
      );
    });

    const labels = collectAriaLabelsFromTree(tr);
    expect(labels.includes('Voice input')).toBe(false);
  });

  it('shows mic button when voiceSupported is true', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(ConversationScreen as any, {
          theme: 'light',
          onToggleTheme: () => {},
          apiErr: null,
          apiStatus: 'online',
          msgs: [],
          busy: false,
          inp: '',
          onChangeInp: () => {},
          onKeyDown: () => {},
          onSend: () => {},
          botRef: { current: null },
          voiceSupported: true,
          onVoiceStart: () => {},
        })
      );
    });

    const labels = collectAriaLabelsFromTree(tr);
    expect(labels.includes('Voice input')).toBe(true);
  });

  it('renders next step direction/action/time sections', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(ConversationScreen as any, {
          theme: 'light',
          onToggleTheme: () => {},
          apiErr: null,
          apiStatus: 'online',
          msgs: [],
          busy: false,
          pendingBlock: 'next',
          nextStepContent: { direction: 'Direction text', action: 'Action text', time: 'Time text' },
          inp: '',
          onChangeInp: () => {},
          onKeyDown: () => {},
          onSend: () => {},
          botRef: { current: null },
          onConfirmNextStep: () => {},
          onEditFin: () => {},
        })
      );
    });
    const text = JSON.stringify(tr.toJSON());
    expect(text).toContain('DIRECTION');
    expect(text).toContain('ACTION');
    expect(text).toContain('TIME');
  });
});
