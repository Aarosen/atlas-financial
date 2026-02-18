import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import type { ChatMessage, Lever } from '@/lib/state/types';
import { TopBar } from '@/components/TopBar';
import { IconButton } from '@/components/IconButton';
import { Textarea } from '@/components/TextInput';
import { Button } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { PageContainer } from '@/components/Layout';
import { ArrowUp, Mic, Pencil, Square } from 'lucide-react';

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
  pendingBlock,
  pendingFin,
  selectedLever,
  onConfirmFin,
  onEditFin,
  onSelectLever,
  onConfirmNextStep,
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
  pendingBlock?: 'confirm' | 'lever' | 'next' | null;
  pendingFin?: { monthlyIncome: number; essentialExpenses: number; totalSavings: number; highInterestDebt: number | null; lowInterestDebt: number | null } | null;
  selectedLever?: string | null;
  onConfirmFin?: () => void;
  onEditFin?: () => void;
  onSelectLever?: (lever: Lever) => void;
  onConfirmNextStep?: () => void;
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
  const [editAffForMsgIdx, setEditAffForMsgIdx] = useState<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const hasInput = inp.trim().length > 0;
  const showMic = !!voiceSupported && !!onVoiceStart && !hasInput;
  const showSend = hasInput || !showMic;

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
  const lastAssistantIdx = useMemo(() => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]?.r === 'a') return i;
    }
    return -1;
  }, [msgs]);
  const jumpLabel = useMemo(() => {
    if (!showJump) return '';
    if (lastMsgRole === 'a') return 'New messages ↓';
    return 'Jump to latest ↓';
  }, [lastMsgRole, showJump]);

  const leverOptions = [
    { id: 'stabilize_cashflow', label: 'Stabilize cashflow' },
    { id: 'eliminate_high_interest_debt', label: 'Eliminate high-interest debt' },
    { id: 'build_emergency_buffer', label: 'Build emergency buffer' },
    { id: 'increase_future_allocation', label: 'Increase future allocation' },
    { id: 'optimize_discretionary_spend', label: 'Optimize discretionary spend' },
  ];

  const startLongPress = (idx: number) => {
    if (isDesktop) return;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      setEditAffForMsgIdx(idx);
    }, 450);
  };

  const cancelLongPress = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <TopBar title="Conversation" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />

      <div ref={scRef} data-testid="conversationScroll" style={{ flex: 1, overflowY: 'auto', paddingTop: 'var(--padY)', paddingBottom: 'var(--padY)' }}>
        <PageContainer maxWidth={720}>
          <h1 className="srOnly">Conversation</h1>
          {showJump && (
            <div style={{ position: 'sticky', top: 10, zIndex: 5, display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <Button
                onClick={scrollToBottom}
                variant="secondary"
                size="sm"
                data-testid="jumpToLatest"
                style={{ borderRadius: 999, fontWeight: 900, fontSize: 12, boxShadow: 'var(--sh1)' }}
              >
                {jumpLabel}
              </Button>
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
              <div className={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 'atlasBubbleWrap' : undefined} style={{ display: 'flex', alignItems: 'center', gap: m.r === 'u' ? '8px' : '0' }}>
                {m.r === 'u' && i === lastUserIdx && onEditLastUserMessage && (
                  <div className={['atlasEditAff', editAffForMsgIdx === i ? 'atlasEditAffShow' : ''].filter(Boolean).join(' ')}>
                    <IconButton
                      aria-label="Edit last message"
                      title="Edit"
                      onClick={() => {
                        setEditAffForMsgIdx(null);
                        onEditLastUserMessage();
                      }}
                    >
                      <Pencil size={16} aria-hidden />
                    </IconButton>
                  </div>
                )}

                <div
                  className={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 'atlasBubbleInteractive' : undefined}
                  onClick={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? onEditLastUserMessage : undefined}
                  onPointerDown={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? () => startLongPress(i) : undefined}
                  onPointerUp={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? cancelLongPress : undefined}
                  onPointerCancel={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? cancelLongPress : undefined}
                  role={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 'button' : undefined}
                  tabIndex={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 0 : undefined}
                  onKeyDown={
                    m.r === 'u' && i === lastUserIdx && onEditLastUserMessage
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onEditLastUserMessage();
                          }
                        }
                      : undefined
                  }
                  data-testid={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 'lastUserBubble' : undefined}
                  style={{
                    maxWidth: m.r === 'a' ? '86%' : 'auto',
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
                  title={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? (isDesktop ? 'Click to edit and resend' : 'Tap to edit • Long-press for options') : undefined}
                  onMouseLeave={m.r === 'u' && i === lastUserIdx ? () => setEditAffForMsgIdx(null) : undefined}
                >
                  {m.r === 'a' ? (
                    <div
                      className={i === lastAssistantIdx ? 'atlasMsgAEnter' : undefined}
                      data-testid={i === lastAssistantIdx ? 'lastAssistantBubble' : undefined}
                    >
                      {renderMessageText(m.t)}
                    </div>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{m.t}</div>
                  )}
                </div>
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
          {pendingBlock === 'confirm' && pendingFin && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
              <div style={{ maxWidth: '86%', width: '100%' }}>
                <Card>
                  <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', color: 'var(--ink2)' }}>CONFIRM CAPTURED NUMBERS</div>
                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                    {[
                      { label: 'Monthly income', value: `$${pendingFin.monthlyIncome.toLocaleString()}` },
                      { label: 'Essentials', value: `$${pendingFin.essentialExpenses.toLocaleString()}` },
                      { label: 'Savings', value: `$${pendingFin.totalSavings.toLocaleString()}` },
                      { label: 'High-interest debt', value: pendingFin.highInterestDebt === null ? 'Unknown' : `$${pendingFin.highInterestDebt.toLocaleString()}` },
                      { label: 'Low-interest debt', value: pendingFin.lowInterestDebt === null ? 'Unknown' : `$${pendingFin.lowInterestDebt.toLocaleString()}` },
                    ].map((row) => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                        <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>{row.label}</div>
                        <div style={{ fontWeight: 950 }}>{row.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button onClick={onConfirmFin} variant="primary" size="sm" disabled={!onConfirmFin}>Yes, looks right</Button>
                    <Button onClick={onEditFin} variant="secondary" size="sm" disabled={!onEditFin}>Edit numbers</Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
          {pendingBlock === 'lever' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
              <div style={{ maxWidth: '86%', width: '100%' }}>
                <Card>
                  <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', color: 'var(--ink2)' }}>PICK ONE LEVER</div>
                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                    {leverOptions.map((opt) => {
                      const active = selectedLever === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onSelectLever?.(opt.id as Lever)}
                          className="atlasNextStep"
                          aria-pressed={active}
                          style={{
                            textAlign: 'left',
                            padding: '10px 12px',
                            borderRadius: 12,
                            border: '1px solid var(--bdr)',
                            background: active ? 'color-mix(in srgb, var(--teal) 12%, var(--bg2))' : 'var(--bg2)',
                            fontWeight: 850,
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button onClick={onConfirmNextStep} variant="primary" size="sm" disabled={!selectedLever || !onConfirmNextStep}>Confirm lever</Button>
                    <Button onClick={onEditFin} variant="secondary" size="sm" disabled={!onEditFin}>Edit numbers</Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
          {pendingBlock === 'next' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
              <div style={{ maxWidth: '86%', width: '100%' }}>
                <Card>
                  <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', color: 'var(--ink2)' }}>ONE NEXT STEP</div>
                  <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{nextStepHint || 'Confirm and we’ll turn this into a simple action.'}</div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button onClick={onConfirmNextStep} variant="primary" size="sm" disabled={!onConfirmNextStep}>Confirm step</Button>
                    <Button onClick={onEditFin} variant="secondary" size="sm" disabled={!onEditFin}>Refine in Talk</Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
          <div ref={botRef} />
        </PageContainer>
      </div>

      <div style={{ padding: '14px var(--padX)', paddingBottom: 'max(14px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--bdr)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
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
              <Button
                onClick={onRetry}
                disabled={busy}
                variant="secondary"
                size="sm"
                style={{ borderRadius: 999, fontWeight: 950, fontSize: 12, boxShadow: 'var(--sh1)' }}
                aria-label="Retry last message"
                title="Retry"
              >
                Retry
              </Button>
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
          <div style={{ position: 'relative', width: '100%' }}>
            <Textarea
              ref={taRef}
              value={inp}
              onChange={(e) => onChangeInp(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setInpFocused(true)}
              onBlur={() => setInpFocused(false)}
              placeholder="Tell Atlas anything…"
              rows={1}
              style={{ padding: `12px ${showMic ? 104 : 56}px 12px 14px`, resize: 'none', maxHeight: 140, overflowY: 'auto' }}
            />
            {voiceListening && (
              <div style={{ position: 'absolute', left: 12, bottom: 44, fontSize: 12, color: 'var(--ink2)', background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 999, padding: '4px 10px', boxShadow: 'var(--sh1)' }}>Listening…</div>
            )}
            {speaking && onStopSpeaking && (
              <div style={{ position: 'absolute', right: voiceSupported && onVoiceStart ? 90 : 48, top: '50%', transform: 'translateY(-50%)' }}>
                <Button
                  onClick={onStopSpeaking}
                  disabled={busy}
                  variant="secondary"
                  size="sm"
                  aria-label="Stop speaking"
                  title="Stop speaking"
                >
                  <Square size={16} aria-hidden />
                  Stop
                </Button>
              </div>
            )}
            {streaming && onCancelStream && (
              <div style={{ position: 'absolute', right: voiceSupported && onVoiceStart ? 90 : 48, top: '50%', transform: 'translateY(-50%)' }}>
                <Button onClick={onCancelStream} variant="secondary" size="sm" aria-label="Cancel response" title="Cancel">
                  Cancel
                </Button>
              </div>
            )}
            {showMic && (
              <div style={{ position: 'absolute', right: 54, top: '50%', transform: 'translateY(-50%)' }}>
                <IconButton
                  onClick={onVoiceStart}
                  disabled={busy}
                  aria-label={voiceListening ? 'Voice input (listening)' : 'Voice input'}
                  title="Voice input"
                >
                  <Mic size={18} aria-hidden />
                </IconButton>
              </div>
            )}
            {showSend && (
              <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
                <IconButton
                  onClick={onSend}
                  disabled={!hasInput || busy}
                  variant="primary"
                  aria-label="Send message"
                  title="Send"
                >
                  <ArrowUp size={18} aria-hidden />
                </IconButton>
              </div>
            )}
          </div>
          {inpFocused && isDesktop && !busy && (
            <div style={{ marginTop: 8, textAlign: 'center', fontSize: 12, color: 'var(--ink3)' }}>Enter to send • Shift+Enter for a new line</div>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink2)', marginTop: 8 }}>Try: “I make $4k/month and spend about $2.5k on essentials”</div>
      </div>
    </div>
  );
}
