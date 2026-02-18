import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import type { ChatMessage } from '@/lib/state/types';
import { TopBar } from '@/components/TopBar';

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
                  whiteSpace: 'pre-wrap',
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
                {m.t}
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
