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
}) {
  const lastUserIdx = (() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.r === 'u') return i;
    }
    return -1;
  })();

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <TopBar title="Conversation" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />

      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--padY) var(--padX)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
          {msgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.r === 'u' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
              <div
                onClick={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? onEditLastUserMessage : undefined}
                style={{
                  maxWidth: '78%',
                  lineHeight: 1.6,
                  fontSize: 'var(--fsBody)',
                  padding: '12px 14px',
                  borderRadius: m.r === 'u' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                  background: m.r === 'u' ? 'linear-gradient(135deg,var(--teal),var(--sky))' : 'var(--card)',
                  color: m.r === 'u' ? '#fff' : 'var(--ink)',
                  border: m.r === 'u' ? 'none' : '1px solid var(--bdr)',
                  boxShadow: 'var(--sh1)',
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
              <div style={{ padding: '12px 14px', borderRadius: 18, border: '1px solid var(--bdr)', background: 'var(--card)', boxShadow: 'var(--sh1)', color: 'var(--ink2)' }}>Thinking…</div>
            </div>
          )}
          <div ref={botRef} />
        </div>
      </div>

      <div style={{ padding: '14px var(--padX)', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--bdr)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', width: '100%' }}>
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
            value={inp}
            onChange={(e) => onChangeInp(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tell Atlas anything…"
            rows={1}
            style={{ width: '100%', padding: '12px 50px 12px 14px', borderRadius: 14, border: '1.5px solid var(--bdr2)', background: 'var(--card)', outline: 'none', resize: 'none', color: 'var(--ink)', maxHeight: 140, overflowY: 'auto' }}
          />
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
