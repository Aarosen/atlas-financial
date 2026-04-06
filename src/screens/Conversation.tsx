import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from 'react';
import type { ChatMessage, Strategy } from '@/lib/state/types';
import type { SupportedLanguage } from '@/lib/ai/slangMapper';
import { TopBar } from '@/components/TopBar';
import { IconButton } from '@/components/IconButton';
import { Textarea } from '@/components/TextInput';
import { Button } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { PageContainer } from '@/components/Layout';
import { ArrowUp, Mic, Pencil, Square } from 'lucide-react';
import { humanizeFieldList } from '@/lib/ui/fieldLabels';
import { MetricCardPayload } from '@/components/MetricCardPayload';
import { extractMetricCardFromResponse } from '@/lib/ai/metricCardPrompt';
import ReactMarkdown from 'react-markdown';
import { generateRecommendationBody } from '@/lib/ui/recommendationBodyGenerator';
import { humanizeReasonCodes } from '@/lib/ui/reasonCodeLabels';

function renderMessageText(text: string): ReactNode {
  // Use react-markdown to properly render markdown including bold, italic, lists, etc.
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <div style={{ marginBottom: 8 }}>{children}</div>,
        strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        ul: ({ children }) => (
          <ul style={{ margin: '8px 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{ margin: '8px 0', paddingLeft: 18, display: 'grid', gap: 6 }}>
            {children}
          </ol>
        ),
        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        code: ({ children }) => (
          <code style={{ backgroundColor: '#f0f0f0', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace' }}>
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 6, overflow: 'auto', marginBottom: 8 }}>
            {children}
          </pre>
        ),
      }}
    >
      {String(text || '')}
    </ReactMarkdown>
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
  baseline,
  onConfirmFin,
  onEditFin,
  onConfirmNextStep,
  inp,
  onChangeInp,
  onKeyDown,
  onSend,
  onEditLastUserMessage,
  onQuickReply,
  nextStepHint,
  nextStepContent,
  actionSuggestions,
  lastQuestionKey,
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
  language,
  onLanguageChange,
  hydrated: appHydrated,
  isGuest = false,
  onResetConversation,
  inputEnabled = true,
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
  baseline?: Strategy | null;
  onConfirmFin?: () => void;
  onEditFin?: () => void;
  onConfirmNextStep?: () => void;
  inp: string;
  onChangeInp: (v: string) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onEditLastUserMessage?: () => void;
  onQuickReply?: (text: string) => void;
  nextStepHint?: string | null;
  nextStepContent?: { direction: string; action: string; time: string } | null;
  actionSuggestions?: Array<{ title: string; prompt: string }> | null;
  lastQuestionKey?: string | null;
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
  language?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
  hydrated?: boolean;
  isGuest?: boolean;
  onResetConversation?: () => void;
  inputEnabled?: boolean;
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
  const isNearBottomRef = useRef(true);
  const [inpFocused, setInpFocused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [editAffForMsgIdx, setEditAffForMsgIdx] = useState<number | null>(null);
  const [showExplain, setShowExplain] = useState(false);
  const [inputHydrated, setInputHydrated] = useState(false);
  const inpRef = useRef(inp);
  const handleInputBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setInpFocused(false);
    const next = e.currentTarget.value;
    if (next !== inp) onChangeInp(next);
  };

  useEffect(() => {
    inpRef.current = inp;
  }, [inp]);

  useEffect(() => {
    if (inputHydrated) return;
    const el = taRef.current;
    if (!el) return;
    const domValue = el.value?.trim();
    if (domValue && domValue !== inp) {
      onChangeInp(domValue);
    }
    setInputHydrated(true);
  }, [inputHydrated, inp, onChangeInp]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    const sync = () => {
      const next = el.value;
      if (next !== inp) onChangeInp(next);
    };
    el.addEventListener('input', sync);
    el.addEventListener('change', sync);
    return () => {
      el.removeEventListener('input', sync);
      el.removeEventListener('change', sync);
    };
  }, [inp, onChangeInp]);

  useEffect(() => {
    return () => {
      const el = taRef.current;
      if (!el) return;
      const next = el.value?.trim();
      if (!next) return;
      if (inp.trim().length > 0) return;
      onChangeInp(next);
    };
  }, [inp, onChangeInp]);
  const longPressTimerRef = useRef<number | null>(null);
  const hasInput = inp.trim().length > 0;
  const showMic = !!voiceSupported && !!onVoiceStart && !hasInput;
  const showSend = hasInput || !showMic;

  const scrollToBottom = () => {
    try {
      const el = scRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const el = scRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setIsNearBottom(dist < 60);
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

  // TASK 2.4: Auto-expanding textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [inp]);

  // Keep isNearBottomRef in sync
  useEffect(() => {
    isNearBottomRef.current = isNearBottom;
  }, [isNearBottom]);

  // Auto-scroll when new messages arrive, only if user was near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [msgs.length]);

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

  const leverLabels: Record<string, string> = {
    stabilize_cashflow: 'Stabilize cashflow',
    eliminate_high_interest_debt: 'Eliminate high-interest debt',
    build_emergency_buffer: 'Build emergency cushion',
    increase_future_allocation: 'Grow future savings',
    optimize_discretionary_spend: 'Optimize discretionary spend',
  };
  const tierCopy: Record<Strategy['tier'], { name: string; desc: string }> = {
    Foundation: { name: 'Foundation', desc: 'We steady the ground first.' },
    Stabilizing: { name: 'Stabilizing', desc: 'We reduce pressure and build buffer.' },
    Strategic: { name: 'Strategic', desc: 'We’re building momentum with intent.' },
    GrowthReady: { name: 'Growth Ready', desc: 'We can lean into growth.' },
  };
  const recommendedLever = baseline?.lever || selectedLever || 'stabilize_cashflow';
  const leverLabel = leverLabels[recommendedLever] || recommendedLever;
  const leverBasedOn = baseline?.explainability?.inputsUsed
    ? humanizeFieldList(Object.keys(baseline.explainability.inputsUsed).filter(Boolean))
    : ['income', 'essentials', 'savings', 'debt'];
  const explainability = baseline?.explainability;
  // AUDIT 9 FIX: Convert raw reason codes to human-readable explanations
  const rawReasonCodes = explainability?.reasonCodes ?? [];
  const explainReasons = humanizeReasonCodes(rawReasonCodes);
  const explainInputs = explainability?.inputsUsed ?? {};
  const explainAssumptions = explainability?.assumptions ?? [];
  const tierInfo = baseline?.tier ? tierCopy[baseline.tier] : null;
  const showInlineNextStep = !!(onNextStep && nextStepHint && !pendingBlock);
  const showGoalReplies = !pendingBlock && lastQuestionKey === 'primaryGoal' && !!onQuickReply;
  const showActionSuggestions = !pendingBlock && !!actionSuggestions?.length && !!onQuickReply;

  useEffect(() => {
    setShowExplain(false);
  }, [pendingBlock, recommendedLever]);

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
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', position: 'relative' }}>
      {/* Single unified header - no duplicate navbar */}
      <TopBar
        title="Conversation"
        theme={theme}
        onToggleTheme={onToggleTheme}
        apiErr={apiErr}
        apiStatus={apiStatus}
        language={language}
        onLanguageChange={onLanguageChange}
      />

      {/* AUDIT 3 FIX: Guest conversation reset button */}
      {isGuest && msgs.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 16px',
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--bdr)',
        }}>
          <Button
            onClick={onResetConversation}
            variant="secondary"
            size="sm"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            Start over
          </Button>
        </div>
      )}

      {showJump && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
        }}>
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

      {/* Main scrollable conversation area - optimized for single-screen view */}
      {/* TASK 2.3: Anchor messages to bottom using spacer element instead of justify-content: flex-end */}
      <div ref={scRef} data-testid="conversationScroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0, overflowAnchor: 'none' } as React.CSSProperties}>
        <div style={{ flex: 1, minHeight: 0 }} aria-hidden />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', width: '100%', maxWidth: '720px', margin: '0 auto', paddingLeft: 'var(--padX)', paddingRight: 'var(--padX)', paddingTop: '2px', paddingBottom: '2px' }}>
          <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>Conversation</h1>
          {msgs.map((m, i) => {
            const isAssistant = m.r === 'a';
            const parsed = isAssistant ? extractMetricCardFromResponse(m.t) : { text: m.t, card: null };
            const displayText = parsed.text || '';

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: m.r === 'u' ? 'flex-end' : 'flex-start',
                  marginBottom: i > 0 && msgs[i - 1]?.r === m.r ? 1 : 3,
                }}
              >
                <div className={m.r === 'u' && i === lastUserIdx && onEditLastUserMessage ? 'atlasBubbleWrap' : undefined}>
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
                      maxWidth: m.r === 'a' ? '86%' : undefined,
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
                    title={
                      m.r === 'u' && i === lastUserIdx && onEditLastUserMessage
                        ? isDesktop
                          ? 'Click to edit and resend'
                          : 'Tap to edit • Long-press for options'
                        : undefined
                    }
                    onMouseLeave={m.r === 'u' && i === lastUserIdx ? () => setEditAffForMsgIdx(null) : undefined}
                  >
                    {m.r === 'a' ? (
                      <div
                        className={i === lastAssistantIdx ? 'atlasMsgAEnter' : undefined}
                        data-testid={i === lastAssistantIdx ? 'lastAssistantBubble' : undefined}
                      >
                        {renderMessageText(displayText)}
                      </div>
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.t}</div>
                    )}
                  </div>
                  {parsed.card && m.r === 'a' && (
                    <div style={{ marginTop: 10 }}>
                      <MetricCardPayload card={parsed.card} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
          {showGoalReplies && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '86%', width: '100%' }}>
                <Card>
                  <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', color: 'var(--ink2)' }}>WHAT ARE YOU OPTIMIZING FOR?</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Stability', value: 'Stability' },
                      { label: 'Growth', value: 'Growth' },
                      { label: 'Flexibility', value: 'Flexibility' },
                      { label: 'Wealth building', value: 'Wealth building' },
                    ].map((goal) => (
                      <Button key={goal.label} onClick={() => onQuickReply?.(goal.value)} variant="secondary" size="sm">
                        {goal.label}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
          {showActionSuggestions && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '86%', width: '100%' }}>
                <Card>
                  <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', color: 'var(--ink2)' }}>ACTION IDEAS</div>
                  <div style={{ marginTop: 6, color: 'var(--ink2)', lineHeight: 1.6, fontSize: 13 }}>Pick one small step to build momentum.</div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {actionSuggestions?.map((s) => (
                      <Button key={s.title} onClick={() => onQuickReply?.(s.prompt)} variant="secondary" size="sm">
                        {s.title}
                      </Button>
                    ))}
                    <Button onClick={() => onQuickReply?.('Something else: ')} variant="secondary" size="sm">
                      Something else
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
          {pendingBlock === 'confirm' && pendingFin && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
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
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '86%', width: '100%' }}>
                <Card>
                  <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', color: 'var(--ink2)' }}>ATLAS RECOMMENDS</div>
                  <div style={{ marginTop: 8, fontWeight: 950, fontSize: 16 }}>{leverLabel}</div>
                  {tierInfo && (
                    <div style={{ marginTop: 6, color: 'var(--ink2)', fontWeight: 800 }}>
                      Tier: {tierInfo.name} • {tierInfo.desc}
                    </div>
                  )}
                  <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>
                    {pendingFin ? generateRecommendationBody(recommendedLever, pendingFin) : 'Let me analyze your situation.'}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button onClick={onConfirmNextStep} variant="primary" size="sm" disabled={!onConfirmNextStep}>Yes, use this lever</Button>
                    <Button onClick={onEditFin} variant="secondary" size="sm" disabled={!onEditFin}>Discuss other options</Button>
                    {explainability && (
                      <Button onClick={() => setShowExplain((v) => !v)} variant="secondary" size="sm">
                        {showExplain ? 'Hide why' : 'Why this?'}
                      </Button>
                    )}
                  </div>
                  {showExplain && explainability && (
                    <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>REASONS</div>
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {explainReasons.map((c) => (
                            <div key={c} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid var(--bdr)', background: 'var(--bg2)', fontWeight: 800, color: 'var(--ink2)' }}>
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>INPUTS USED</div>
                        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                          {Object.entries(explainInputs).map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                              <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>{k}</div>
                              <div style={{ fontWeight: 950 }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>ASSUMPTIONS</div>
                        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                          {explainAssumptions.length ? (
                            explainAssumptions.map((a) => (
                              <div key={a} style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)', color: 'var(--ink2)', fontWeight: 800 }}>
                                {a}
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)', color: 'var(--ink2)', fontWeight: 800 }}>None</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
          {pendingBlock === 'next' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
              <div style={{ maxWidth: '86%', width: '100%' }}>
                <Card>
                  <div style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.08em', color: 'var(--ink2)' }}>ONE NEXT STEP</div>
                  {nextStepContent ? (
                    <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
                      {[
                        { label: 'Direction', value: nextStepContent.direction },
                        { label: 'Action', value: nextStepContent.action },
                        { label: 'Time', value: nextStepContent.time },
                      ].map((row) => (
                        <div key={row.label} style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                          <div style={{ fontWeight: 900, fontSize: 11, letterSpacing: '0.08em', color: 'var(--ink3)' }}>{row.label.toUpperCase()}</div>
                          <div style={{ marginTop: 4, color: 'var(--ink2)', fontWeight: 800 }}>{row.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{nextStepHint || 'Confirm and we’ll turn this into a simple action.'}</div>
                  )}
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Button onClick={onConfirmNextStep} variant="primary" size="sm" disabled={!onConfirmNextStep}>Confirm step</Button>
                    <Button onClick={onEditFin} variant="secondary" size="sm" disabled={!onEditFin}>Refine in Talk</Button>
                  </div>
                </Card>
              </div>
            </div>
          )}
          <div ref={botRef} />
        </div>
      </div>

      {/* Fixed bottom input area - always visible on mobile */}
      <div style={{ padding: '10px var(--padX)', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--bdr)', background: 'var(--bg)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
          {streaming && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--bdr)',
                  background: 'var(--bg2)',
                  color: 'var(--ink2)',
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                Streaming response…
              </div>
            </div>
          )}
          {(apiErr || apiStatus === 'offline' || apiStatus === 'degraded') && (
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
          {showInlineNextStep && (
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
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              {inputEnabled ? (
                <>
                  <Textarea
                    ref={taRef}
                    id="atlas-message-input"
                    name="message"
                    data-app-hydrated={appHydrated ? 'true' : 'false'}
                    value={inp}
                    autoFocus
                    onChange={(e) => onChangeInp(e.target.value)}
                    onInput={(e) => onChangeInp((e.currentTarget as HTMLTextAreaElement).value)}
                    onKeyDown={onKeyDown}
                    onFocus={() => setInpFocused(true)}
                    onBlur={handleInputBlur}
                    placeholder="Tell Atlas anything…"
                    rows={1}
                    style={{ padding: '8px 10px', resize: 'none', maxHeight: 80, overflowY: 'auto', width: '100%', borderRadius: 14 }}
                  />
                  {voiceListening && (
                    <div style={{ position: 'absolute', left: 12, bottom: 50, fontSize: 12, color: 'var(--ink2)', background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 999, padding: '4px 10px', boxShadow: 'var(--sh1)' }}>Listening…</div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    padding: '8px 10px',
                    width: '100%',
                    borderRadius: 14,
                    minHeight: 24,
                    background: 'var(--bg2)',
                    border: '1px solid var(--bdr)',
                  }}
                />
              )}
            </div>
            {speaking && onStopSpeaking && (
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
            )}
            {streaming && onCancelStream && (
              <Button onClick={onCancelStream} variant="secondary" size="sm" aria-label="Cancel response" title="Cancel">
                Cancel
              </Button>
            )}
            {!speaking && !streaming && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                {showMic && (
                  <button
                    onClick={onVoiceStart}
                    disabled={busy}
                    aria-label={voiceListening ? 'Voice input (listening)' : 'Voice input'}
                    title="Voice input"
                    style={{
                      width: 44,
                      minWidth: 44,
                      borderRadius: 12,
                      border: 'none',
                      background: voiceListening ? 'var(--teal)' : 'var(--bg2)',
                      color: voiceListening ? 'white' : 'var(--ink)',
                      cursor: busy ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: voiceListening ? 'var(--sh1)' : '0 1px 2px rgba(0,0,0,0.05)',
                      opacity: busy ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <Mic size={20} aria-hidden />
                  </button>
                )}
                {showSend && (
                  <button
                    onClick={onSend}
                    disabled={!hasInput || busy}
                    aria-label="Send message"
                    title="Send"
                    style={{
                      width: 44,
                      minWidth: 44,
                      borderRadius: 12,
                      border: 'none',
                      background: hasInput && !busy ? 'linear-gradient(135deg, var(--teal), var(--sky))' : 'var(--bg3)',
                      color: hasInput && !busy ? 'white' : 'var(--ink3)',
                      cursor: hasInput && !busy ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      boxShadow: hasInput && !busy ? 'var(--sh1)' : '0 1px 2px rgba(0,0,0,0.05)',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    <ArrowUp size={20} aria-hidden />
                  </button>
                )}
              </div>
            )}
          </div>
          {inpFocused && isDesktop && !busy && (
            <div style={{ marginTop: 6, textAlign: 'center', fontSize: 11, color: 'var(--ink3)' }}>Enter to send • Shift+Enter for a new line</div>
          )}
          <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink3)', marginTop: '8px', paddingBottom: '4px' }}>Messages you type may be sent to our AI provider to generate responses. Atlas only sends what you type for the current request.</div>
        </div>
      </div>
    </div>
  );
}
