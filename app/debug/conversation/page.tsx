'use client';

import { useEffect, useRef, useState } from 'react';
import { ConversationScreen } from '@/screens/Conversation';
import type { ChatMessage } from '@/lib/state/types';

export default function DebugConversationPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = window.localStorage.getItem('atlas:theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    return 'light';
  });
  const [inp, setInp] = useState('');
  const defaultMsgs: ChatMessage[] = [
    { r: 'u', t: 'My income is $4000/month.' },
    { r: 'a', t: 'Got it. What are your essential monthly expenses?' },
    { r: 'u', t: 'About $2500.' },
    { r: 'a', t: 'And how much do you have in savings?' },
    { r: 'u', t: '$5000.' },
    { r: 'a', t: 'Great! That gives me a good picture of your financial situation.' },
  ];
  const [msgs] = useState<ChatMessage[]>(defaultMsgs);
  const botRef = useRef<HTMLDivElement>(null);
  const [caseParam, setCaseParam] = useState<string | null>(null);
  const [state, setState] = useState<{ msgs: ChatMessage[]; busy?: boolean; apiErr?: string | null; streaming?: boolean }>({ msgs: defaultMsgs });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem('atlas:theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    setCaseParam(new URLSearchParams(window.location.search).get('case'));
  }, []);

  useEffect(() => {
    // Update state whenever caseParam changes
    switch (caseParam) {
      case 'scroll':
        // Long conversation for scroll testing — needs enough content to overflow all viewport sizes
        setState({
          msgs: Array.from({ length: 50 }, (_, i) => ({
            r: i % 2 === 0 ? ('u' as const) : ('a' as const),
            t: i % 2 === 0
              ? `User message ${i + 1}: I have a question about managing my monthly budget and long-term savings strategy.`
              : `Response ${i}: Based on what you have shared, I recommend focusing on building an emergency fund first, then addressing high-interest debt, and finally increasing your monthly savings rate by at least 10% over the next six months.`,
          })),
        });
        break;
      case 'idle':
        setState({ msgs, busy: false });
        break;
      case 'typing':
        setState({ msgs, busy: true });
        break;
      case 'error':
        setState({ msgs, apiErr: 'Connection issue — retry when you\'re ready.' });
        break;
      case 'streaming':
        setState({ msgs, streaming: true });
        break;
      default:
        setState({ msgs });
    }
  }, [caseParam, msgs]);

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
