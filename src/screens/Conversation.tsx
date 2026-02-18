import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import type { ChatMessage } from '@/lib/state/types';
import { TopBar } from '@/components/TopBar';

function renderMessageText(text: string): ReactNode {
  const t = String(text || '').replace(/\r\n/g, '\n');
  const lines = t.split('\n');

  const blocks: Array<{ kind: 'p' | 'ul' | 'ol'; lines: string[] }> = [];
  let cur: { kind: 'p' | 'ul' | 'ol'; lines: string[] } | null = null;

  const flush = () => {
    if (!cur) return;
    if (cur.kind === 'p') {
      const joined = cur.lines.join('\n').trim();
      if (joined) blocks.push({ kind: 'p', lines: [joined] });
    } else {
      const items = cur.lines.map((x) => x.trim()).filter(Boolean);
      if (items.length) blocks.push({ kind: cur.kind, lines: items });
    }
    cur = null;
  };

  const isUl = (s: string) => /^\s*[-*]\s+/.test(s);
  const isOl = (s: string) => /^\s*(\d+)[.)]\s+/.test(s);
  const stripUl = (s: string) => s.replace(/^\s*[-*]\s+/, '');
  const stripOl = (s: string) => s.replace(/^\s*(\d+)[.)]\s+/, '');

  for (const ln of lines) {
    const line = ln ?? '';
    const blank = line.trim().length === 0;
    if (blank) {
      flush();
      continue;
    }

    if (isUl(line)) {
      const item = stripUl(line);
      if (!cur || cur.kind !== 'ul') {
        flush();
        cur = { kind: 'ul', lines: [] };
      }
      cur.lines.push(item);
      continue;
    }

    if (isOl(line)) {
      const item = stripOl(line);
      if (!cur || cur.kind !== 'ol') {
        flush();
        cur = { kind: 'ol', lines: [] };
      }
      cur.lines.push(item);
      continue;
    }

    if (!cur || cur.kind !== 'p') {
      flush();
      cur = { kind: 'p', lines: [] };
    }
    cur.lines.push(line);
  }
  flush();

  if (blocks.length === 0) return null;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {blocks.map((b, i) => {
        if (b.kind === 'p') {
          return (
            <div key={i} style={{ whiteSpace: 'pre-wrap' }}>
              {b.lines[0]}
            </div>
          );
        }

        if (b.kind === 'ul') {
          return (
            <ul key={i} style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
              {b.lines.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        }

        return (
          <ol key={i} style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            {b.lines.map((it, j) => (
              <li key={j}>{it}</li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}

export function ConversationScreen({
  theme,
  onToggleTheme,
  apiErr,
  apiStatus,
  msgs,
  busy,
  inp,
  onChangeInp,
  onKeyDown,
  onSend,
  onEditLastUserMessage,
  nextStepHint,
  onNextStep,
  botRef,
  voiceSupported,
  onVoiceStart,
  voiceListening,
  speaking,
  onStopSpeaking,
  streaming,
  onCancelStream,
  canRetry,
  onRetry,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiErr: string | null;
  apiStatus: 'unknown' | 'online' | 'degraded' | 'offline';
  msgs: ChatMessage[];
  busy: boolean;
  inp: string;
  onChangeInp: (v: string) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onEditLastUserMessage?: () => void;
  nextStepHint?: string | null;
  onNextStep?: () => void;
  botRef: RefObject<HTMLDivElement | null>;
  voiceSupported?: boolean;
  onVoiceStart?: () => void;
  voiceListening?: boolean;
  speaking?: boolean;
  onStopSpeaking?: () => void;
  streaming?: boolean;
  onCancelStream?: () => void;
  canRetry?: boolean;
  onRetry?: () => void;
}) {
  const lastUserIdx = (() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.r === 'u') return i;
    }
    return -1;
  })();

  const scRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [inpFocused, setInpFocused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const scrollToBottom = () => {
    try {
      botRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const el = scRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsNearBottom(dist < 120);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 720px)');
    const onChange = () => setIsDesktop(!!mq.matches);
    onChange();
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      // Safari fallback
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [inp]);

  useEffect(() => {
    if (isNearBottom) scrollToBottom();
  }, [isNearBottom, msgs.length, busy]);

  const showJump = useMemo(() => !isNearBottom && msgs.length > 3, [isNearBottom, msgs.length]);
  const lastMsgRole = msgs.length ? msgs[msgs.length - 1]?.r : undefined;
  const jumpLabel = useMemo(() => {
    if (!showJump) return '';
    if (lastMsgRole === 'a') return 'New messages ↓';
    return 'Jump to latest ↓';
  }, [lastMsgRole, showJump]);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <TopBar title="Conversation" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />

      <div ref={scRef} style={{ flex: 1, overflowY: 'auto', padding: 'var(--padY) var(--padX)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
          {showJump && (
            <div style={{ position: 'sticky', top: 10, zIndex: 5, display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <button
                onClick={scrollToBottom}
                className="btn btnSecondary"
                style={{ padding: '8px 12px', borderRadius: 999, fontWeight: 900, fontSize: 12, boxShadow: 'var(--sh1)' }}
              >
                {jumpLabel}
              </button>
            </div>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: m.r === 'u' ? 'flex-end' : 'flex-start',
                marginBottom: i > 0 && msgs[i - 1]?.r === m.r ? 6 : 10,
              }}
            >
              <div
                onClick={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? onEditLastUserMessage : undefined}
                style={{
                  maxWidth: '86%',
                  lineHeight: 1.6,
                  fontSize: 'var(--fsBody)',
                  padding: '11px 13px',
                  borderRadius: m.r === 'u' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                  background: m.r === 'u' ? 'linear-gradient(135deg,var(--teal),var(--sky))' : 'var(--bg2)',
                  color: m.r === 'u' ? '#fff' : 'var(--ink)',
                  border: m.r === 'u' ? 'none' : '1px solid var(--bdr)',
                  boxShadow:
                    m.r === 'u'
                      ? i === lastUserIdx && onEditLastUserMessage
                        ? '0 0 0 2px color-mix(in srgb, var(--sky) 26%, transparent)'
                        : 'none'
                      : 'var(--sh1)',
                  cursor: m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 'pointer' : 'default',
                  opacity: m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 0.98 : 1,
                }}
                title={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 'Click to edit and resend' : undefined}
              >
                {m.r === 'a' ? renderMessageText(m.t) : <div style={{ whiteSpace: 'pre-wrap' }}>{m.t}</div>}
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
              <div
                style={{ padding: '12px 14px', borderRadius: 18, border: '1px solid var(--bdr)', background: 'var(--card)', boxShadow: 'var(--sh1)', color: 'var(--ink2)' }}
                aria-label="Atlas is typing"
                title="Atlas is typing"
              >
                <span className="atlasTyping" aria-hidden>
                  <span className="atlasDot" />
                  <span className="atlasDot" />
                  <span className="atlasDot" />
                </span>
              </div>
            </div>
          )}
          <div ref={botRef} />
        </div>
      </div>

      <div style={{ padding: '14px var(--padX)', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--bdr)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', width: '100%' }}>
          {(apiErr || apiStatus === 'offline' || apiStatus === 'degraded' || apiStatus === 'unknown') && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <div
                style={{
                  maxWidth: 680,
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: '1px solid var(--bdr)',
                  background: 'var(--bg2)',
                  boxShadow: 'var(--sh1)',
                  color: 'var(--ink2)',
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                {apiErr
                  ? apiErr
                  : apiStatus === 'offline'
                    ? 'AI is offline right now — Atlas will do its best in local mode. You can retry anytime.'
                    : apiStatus === 'degraded'
                      ? 'AI is a bit slow/unreliable at the moment — if a response fails, hit Retry.'
                      : 'AI status is unknown — if anything feels off, hit Retry.'}
              </div>
            </div>
          )}
          {apiErr && canRetry && onRetry && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <button
                onClick={onRetry}
                disabled={busy}
                className="btn btnSecondary"
                style={{ padding: '8px 12px', borderRadius: 999, fontWeight: 950, fontSize: 12, boxShadow: 'var(--sh1)' }}
                aria-label="Retry last message"
                title="Retry"
              >
                Retry
              </button>
            </div>
          )}
          {onNextStep && nextStepHint && (
            <button
              onClick={onNextStep}
              disabled={busy}
              className="atlasNextStep"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 14,
                border: '1px solid var(--bdr)',
                background: 'var(--bg2)',
                boxShadow: 'var(--sh1)',
                color: 'var(--ink)',
                cursor: busy ? 'not-allowed' : 'pointer',
                marginBottom: 10,
              }}
              aria-label="Next step"
              title="Next step"
            >
              <div style={{ display: 'grid', gap: 2, textAlign: 'left' }}>
                <div style={{ fontWeight: 950, fontSize: 12, letterSpacing: '0.06em', color: 'var(--ink2)' }}>NEXT STEP</div>
                <div style={{ fontWeight: 850, fontSize: 13, lineHeight: 1.35 }}>{nextStepHint}</div>
              </div>
              <div style={{ fontWeight: 950, color: 'var(--ink2)' }}>→</div>
            </button>
          )}
          <textarea
            ref={taRef}
            value={inp}
            onChange={(e) => onChangeInp(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setInpFocused(true)}
            onBlur={() => setInpFocused(false)}
            placeholder="Tell Atlas anything…"
            rows={1}
            style={{ width: '100%', padding: '12px 50px 12px 14px', borderRadius: 14, border: '1.5px solid var(--bdr2)', background: 'var(--card)', outline: 'none', resize: 'none', color: 'var(--ink)', maxHeight: 140, overflowY: 'auto' }}
          />
          {inpFocused && isDesktop && !busy && (
            <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: 'var(--ink3)' }}>Enter to send • Shift+Enter for a new line</div>
          )}
          {voiceListening && (
            <div style={{ position: 'absolute', left: 12, bottom: 44, fontSize: 12, color: 'var(--ink2)', background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 999, padding: '4px 10px', boxShadow: 'var(--sh1)' }}>Listening…</div>
          )}
          {speaking && onStopSpeaking && (
            <button
              onClick={onStopSpeaking}
              disabled={busy}
              style={{ position: 'absolute', right: voiceSupported && onVoiceStart ? 90 : 48, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: '1px solid var(--bdr2)', color: 'var(--ink2)', height: 34, borderRadius: 12, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1, padding: '0 10px' }}
              aria-label="Stop speaking"
              title="Stop speaking"
            >
              Stop
            </button>
          )}
          {streaming && onCancelStream && (
            <button
              onClick={onCancelStream}
              style={{ position: 'absolute', right: voiceSupported && onVoiceStart ? 90 : 48, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: '1px solid var(--bdr2)', color: 'var(--ink2)', height: 34, borderRadius: 12, cursor: 'pointer', padding: '0 10px' }}
              aria-label="Cancel response"
              title="Cancel"
            >
              Cancel
            </button>
          )}
          {voiceSupported && onVoiceStart && (
            <button
              onClick={onVoiceStart}
              disabled={busy}
              style={{ position: 'absolute', right: 48, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: '1px solid var(--bdr2)', color: 'var(--ink2)', width: 38, height: 34, borderRadius: 12, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.5 : 1 }}
              aria-label="Voice input"
              title="Voice input"
            >
              🎙️
            </button>
          )}
          <button
            onClick={onSend}
            disabled={!inp.trim() || busy}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'linear-gradient(135deg,var(--teal),var(--sky))', border: 'none', color: '#fff', width: 38, height: 34, borderRadius: 12, cursor: busy ? 'not-allowed' : 'pointer', opacity: !inp.trim() || busy ? 0.5 : 1 }}
          >
            →
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>Try: “I make $4k/month and spend about $2.5k on essentials”</div>
      </div>
    </div>
  );
}
