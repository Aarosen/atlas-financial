import { describe, expect, it } from 'vitest';

import { ConversationScreen } from './Conversation';

function collectAriaLabels(node: any, out: string[] = []): string[] {
  if (!node) return out;

  if (Array.isArray(node)) {
    node.forEach((n) => collectAriaLabels(n, out));
    return out;
  }

  const props = (node as any).props;
  if (props?.['aria-label']) out.push(String(props['aria-label']));

  const children = props?.children;
  if (children) collectAriaLabels(children, out);

  return out;
}

describe('ConversationScreen voice UI', () => {
  it('hides mic button when voiceSupported is false', () => {
    const el = ConversationScreen({
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
    } as any);

    const labels = collectAriaLabels(el);
    expect(labels.includes('Voice input')).toBe(false);
  });

  it('shows mic button when voiceSupported is true', () => {
    const el = ConversationScreen({
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
    } as any);

    const labels = collectAriaLabels(el);
    expect(labels.includes('Voice input')).toBe(true);
  });
});
