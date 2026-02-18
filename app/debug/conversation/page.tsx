'use client';

import { useMemo, useRef } from 'react';
import type { ChatMessage } from '@/lib/state/types';
import { ConversationScreen } from '@/screens/Conversation';

function buildMsgs(kind: 'idle' | 'typing' | 'error' | 'streaming' | 'scroll'): ChatMessage[] {
  const base: ChatMessage[] = [
    { r: 'a', t: "Hey — let’s make this simple. Tell me what’s going on." },
    { r: 'u', t: 'I feel behind and I’m not sure where to start.' },
    { r: 'a', t: 'We’ll pick one lever. First: what’s your monthly take-home income?' },
    { r: 'u', t: 'About $4,000/month.' },
    { r: 'a', t: 'Good. About what do essentials run — rent, groceries, utilities?' },
  ];

  if (kind === 'scroll') {
    const many: ChatMessage[] = [];
    for (let i = 0; i < 18; i++) {
      many.push({ r: 'a', t: `Assistant message ${i + 1}.` });
      many.push({ r: 'u', t: `User message ${i + 1}.` });
    }
    return [...base, ...many, { r: 'u', t: 'Last user message (for jump label).' }];
  }

  if (kind === 'idle') return [...base, { r: 'a', t: 'Whenever you’re ready, tell me rent and groceries — rough is fine.' }];
  if (kind === 'typing') return base;
  if (kind === 'error') return [...base, { r: 'u', t: 'retrytest Income $4000/month.' }];
  if (kind === 'streaming') return [...base, { r: 'u', t: 'What should I do next?' }];
  return base;
}

export default function DebugConversationPage({ searchParams }: any) {
  const kind = String(searchParams?.case || 'idle') as 'idle' | 'typing' | 'error' | 'streaming' | 'scroll';

  const msgs = useMemo(() => buildMsgs(kind), [kind]);
  const botRef = useRef<HTMLDivElement | null>(null);

  const busy = kind === 'typing' || kind === 'streaming';
  const streaming = kind === 'streaming';
  const apiErr = kind === 'error' ? 'Connection issue — retry when you’re ready.' : null;
  const canRetry = kind === 'error';

  return (
    <ConversationScreen
      theme="light"
      onToggleTheme={() => {}}
      apiErr={apiErr}
      apiStatus="online"
      msgs={msgs}
      busy={busy}
      inp=""
      onChangeInp={() => {}}
      onKeyDown={() => {}}
      onSend={() => {}}
      onEditLastUserMessage={() => {}}
      botRef={botRef}
      voiceSupported={true}
      onVoiceStart={() => {}}
      voiceListening={kind === 'typing'}
      speaking={false}
      onStopSpeaking={() => {}}
      streaming={streaming}
      onCancelStream={() => {}}
      canRetry={canRetry}
      onRetry={() => {}}
    />
  );
}
