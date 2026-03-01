'use client';

import { useState, useRef } from 'react';
import { ConversationScreen } from '@/screens/Conversation';
import type { ChatMessage } from '@/lib/state/types';

export default function DebugConversationPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [inp, setInp] = useState('');
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { r: 'u', t: 'My income is $4000/month.' },
    { r: 'a', t: 'Got it. What are your essential monthly expenses?' },
    { r: 'u', t: 'About $2500.' },
    { r: 'a', t: 'And how much do you have in savings?' },
    { r: 'u', t: '$5000.' },
    { r: 'a', t: 'Great! That gives me a good picture of your financial situation.' },
  ]);
  const botRef = useRef<HTMLDivElement>(null);
  const caseParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('case') : null;

  // Generate different conversation states based on case parameter
  const getConversationState = () => {
    switch (caseParam) {
      case 'scroll':
        // Long conversation for scroll testing
        return {
          msgs: Array.from({ length: 20 }, (_, i) => ({
            r: i % 2 === 0 ? ('u' as const) : ('a' as const),
            t: i % 2 === 0 ? `Message ${i + 1}` : `Response to message ${i}. This is a longer response to test scrolling behavior.`,
          })),
        };
      case 'idle':
        return { msgs, busy: false };
      case 'typing':
        return { msgs, busy: true };
      case 'error':
        return { msgs, apiErr: 'Connection issue — retry when you\'re ready.' };
      case 'streaming':
        return { msgs, streaming: true };
      default:
        return { msgs };
    }
  };

  const state = getConversationState();

  return (
    <ConversationScreen
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      apiErr={state.apiErr || null}
      apiStatus="online"
      msgs={state.msgs}
      busy={state.busy || false}
      inp={inp}
      onChangeInp={setInp}
      onKeyDown={() => {}}
      onSend={() => {}}
      botRef={botRef}
      streaming={state.streaming || false}
    />
  );
}
