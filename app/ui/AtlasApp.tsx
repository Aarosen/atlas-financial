 'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ClaudeClient } from '@/lib/api/client';
import { AtlasDb } from '@/lib/db/atlasDb';
import { StrategyEngine } from '@/lib/engine/strategyEngine';
import type { ChatMessage, FinancialState, Strategy } from '@/lib/state/types';
import { conversationReducer, createInitialConversationState, type Screen } from '@/lib/state/conversationMachine';
import { applyUserTurn, classifyInterruption, metaResponse, nextQuestionForMissing } from '@/lib/state/atlasConversationController';
import { decideNextAction } from '@/lib/ai/orchestrator';
import { createReplayEntry, detectReplayEmotion, logReplayEntry } from '@/lib/ai/replay';
import { buildActionFeedback, detectAction, estimateActionImpact } from '@/lib/ai/actions';
import { suggestActions } from '@/lib/ai/actionSuggestions';
import { buildNudge } from '@/lib/ai/nudges';
import { buildStreakMessage, computeActionStreak } from '@/lib/ai/streaks';
import { computeLearningStreak } from '@/lib/ai/learningStreaks';
import { recommendNextConcept } from '@/lib/ai/learningRecommendations';
import { detectLearnedConcepts } from '@/lib/ai/learningProgress';
import { detectLiteracyLevel, detectResponsePreference } from '@/lib/ai/personalization';
import { buildReasoningTrace } from '@/lib/ai/trace';
import { buildCheckinMessage, shouldShowCheckin } from '@/lib/ai/checkins';
import { createFeedbackEntry, shouldPromptFeedback } from '@/lib/ai/feedback';
import { createVoice } from '@/lib/voice/voice';
import { ConversationScreen, DashboardScreen, LandingScreen, PlanScreen, SettingsScreen, StrategyScreen, SummaryScreen, TierRevealScreen } from '@/screens';
import { buildMetricExplainer } from '@/lib/ui/metricExplainer';
import { generateStableOpeningMessage } from '@/lib/ai/initialGreetingEngine';
import { Button } from '@/components/Buttons';
import { BarChart3, LayoutList, MessageSquare, Settings } from 'lucide-react';
import type { SupportedLanguage } from '@/lib/ai/slangMapper';
import { trackOutcomeProgress, type UserOutcomeMetrics } from '@/lib/ai/phase4-integration';
import { useUser } from '@/lib/auth/userContext';
import { useAuth } from '@/lib/auth/useAuth';
import { useSessionId } from '@/lib/session/useSessionId';
import { useSessionFinalization } from '@/lib/session/useSessionFinalization';
import { useMultiGoals } from '@/lib/goals/useMultiGoals';
import { AuthPromptCard } from '@/components/AuthPromptCard';
import { ActionCompletionCard } from '@/components/ActionCompletionCard';
import { ProgressDisplay } from '@/components/ProgressDisplay';
import { processResponseForGoals } from '@/lib/ai/conversationGoalWiring';
import { OnboardingModal } from '@/components/OnboardingModal';
import { hasCompletedOnboarding, markOnboardingComplete } from '@/lib/onboarding/onboardingFlow';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { CompanionDashboard } from '@/components/CompanionDashboard';
import { useConversationMemory } from '@/lib/memory/useConversationMemory';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateMessageLength } from '@/lib/api/messageLengthValidator';
import { preserveUnsentMessage, retrieveUnsentMessage, clearUnsentMessage } from '@/lib/api/offlineHandler';

const NEED: Array<keyof FinancialState> = ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'primaryGoal', 'highInterestDebt', 'lowInterestDebt'];

const defaultFin: FinancialState = createInitialConversationState('landing').fin;

const fc = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const fp = (n: number) => `${Math.round((Number.isFinite(n) ? n : 0) * 100)}%`;

const tc = (t: Strategy['tier']) =>
  (
    {
      Foundation: { name: 'Foundation', desc: 'We steady the ground first.' },
      Stabilizing: { name: 'Stabilizing', desc: 'We reduce pressure and build buffer.' },
      Strategic: { name: 'Strategic', desc: 'We are building momentum with intent.' },
      GrowthReady: { name: 'Growth Ready', desc: 'We can lean into growth.' },
    } as const
  )[t];

export default function AtlasApp({ initialScreen = 'landing' }: { initialScreen?: Screen }) {
  const db = useMemo(() => new AtlasDb(), []);
  const claude = useMemo(() => new ClaudeClient(), []);
  const engine = useMemo(() => new StrategyEngine(), []);
  const { user, isLoading: authLoading } = useUser();
  const { session: authSession, error: authError } = useAuth();
  const { sessionId, updateSessionId } = useSessionId();
  const { finalizeSession } = useSessionFinalization();
  const { state: multiGoalState, addNewGoal, updateGoal, getCurrentGoals, getContext: getMultiGoalContext } = useMultiGoals();
  const userId = authSession?.userId || user?.id || 'guest';
  const [mounted, setMounted] = useState(false);
  const [apiStatus, setApiStatus] = useState(claude.status);
  const [voiceListening, setVoiceListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(true);
  const [responsePref, setResponsePref] = useState<'short' | 'explain' | null>(null);
  const [literacyLevel, setLiteracyLevel] = useState<'novice' | 'intermediate' | 'advanced' | null>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [pendingActionCompletion, setPendingActionCompletion] = useState<{ id: string; text: string; dueDate?: string } | null>(null);
  const [progressSnapshots, setProgressSnapshots] = useState<Array<{ metric: string; previousValue: number; currentValue: number; unit: string; isPositive: boolean }>>([]);
  const [daysSinceLast, setDaysSinceLast] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [currentMission, setCurrentMission] = useState<{ text: string; daysUntilCheckIn: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [milestonesToCelebrate, setMilestonesToCelebrate] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | undefined>(undefined);
  const token = authSession?.accessToken || '';
  const { memory, loadMemory, saveMemory, isLoaded } = useConversationMemory(userId || 'guest', sessionId || '', token);
  const voice = useMemo(
    () =>
      createVoice({
        onListeningChange: setVoiceListening,
        onSpeakingChange: setSpeaking,
      }),
    []
  );

  const buildMemorySummary = useCallback((fin: FinancialState, answered: Partial<Record<keyof FinancialState, boolean>>) => {
    const parts: string[] = [];
    if (answered.monthlyIncome && fin.monthlyIncome > 0) parts.push(`Monthly take-home: ${fc(fin.monthlyIncome)}.`);
    if (answered.essentialExpenses && fin.essentialExpenses > 0) parts.push(`Essentials: ${fc(fin.essentialExpenses)} / month.`);
    if (answered.totalSavings) parts.push(`Savings: ${fc(fin.totalSavings)}.`);
    if (answered.highInterestDebt) parts.push(`High-interest debt: ${fc(fin.highInterestDebt ?? 0)}.`);
    if (answered.lowInterestDebt) parts.push(`Low-interest debt: ${fc(fin.lowInterestDebt ?? 0)}.`);
    if (fin.primaryGoal) parts.push(`Primary goal: ${fin.primaryGoal}.`);
    if (fin.riskTolerance) parts.push(`Risk tolerance: ${fin.riskTolerance}.`);
    if (fin.timeHorizonYears) parts.push(`Time horizon: ${fin.timeHorizonYears} years.`);
    if (responsePref) parts.push(`Response preference: ${responsePref}.`);
    if (literacyLevel) parts.push(`Financial literacy: ${literacyLevel}.`);
    return parts.join(' ');
  }, [literacyLevel, responsePref]);

  // TASK 1.4 PART B: Initialize theme from localStorage with system preference fallback
  // Use null initially to avoid hydration mismatch, then set from useEffect
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('atlas_theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      return;
    }
    // Check system preference if no saved choice
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  // Check if user has completed onboarding
  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
  }, []);

  // FIX 7: Listen for milestone celebration events with persistence
  useEffect(() => {
    const handleMilestones = async (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        // Fix 5: Import persistence system and mark milestones as seen
        const { markMilestoneAsSeen, getUnseenMilestones } = await import('@/lib/celebrations/milestonePersistence');
        
        // Filter to only unseen milestones
        const unseenMilestones = getUnseenMilestones(customEvent.detail);
        
        if (unseenMilestones.length > 0) {
          setMilestonesToCelebrate(unseenMilestones);
          
          // Mark all milestones as seen
          unseenMilestones.forEach(m => markMilestoneAsSeen(m.id));
          
          // Auto-clear milestones after 5 seconds
          setTimeout(() => setMilestonesToCelebrate([]), 5000);
        }
      }
    };

    window.addEventListener('atlas:milestones', handleMilestones);
    return () => window.removeEventListener('atlas:milestones', handleMilestones);
  }, []);

  // Authentication: Keep JWT token fresh - refresh on token expiry
  useEffect(() => {
    if (!authSession) return;

    const checkTokenExpiry = () => {
      const expiresAt = authSession.expiresAt;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;
      
      // Refresh token 5 minutes before expiry
      if (timeUntilExpiry > 0 && timeUntilExpiry < 5 * 60 * 1000) {
        // Token is about to expire, trigger refresh
        // The useAuth hook will handle the refresh via Supabase
        console.log('[auth] Token expiring soon, will refresh on next request');
      }
    };

    // Check token expiry every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    return () => clearInterval(interval);
  }, [authSession]);

  // TASK 1.4 PART C: Three-state theme toggle (light → dark → system)
  const toggleTheme = () => {
    const saved = localStorage.getItem('atlas_theme');
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    let next: 'light' | 'dark';
    if (!saved) {
      // Currently: system (no override). Cycle to: force light
      next = 'light';
      localStorage.setItem('atlas_theme', next);
    } else if (saved === 'light') {
      // Currently: force light. Cycle to: force dark
      next = 'dark';
      localStorage.setItem('atlas_theme', next);
    } else {
      // Currently: force dark. Cycle to: system (remove override)
      localStorage.removeItem('atlas_theme');
      next = systemDark ? 'dark' : 'light';
    }

    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'talk' | 'plan' | 'dashboard' | 'settings'>('talk');
  const tabStacksRef = useRef({
    talk: 'conversation' as Screen,
    plan: 'plan' as Screen,
    dashboard: 'dashboard' as Screen,
    settings: 'settings' as Screen,
  });
  const [speakReplies, setSpeakReplies] = useState(false);
  const [voiceAutoSend, setVoiceAutoSend] = useState(false);
  const [editingLast, setEditingLast] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [outcomeMetrics, setOutcomeMetrics] = useState<UserOutcomeMetrics | null>(null);
  const [lastOutcomeState, setLastOutcomeState] = useState<{ debtBalance: number; savings: number } | null>(null);
  const [sessionState, setSessionState] = useState<Record<string, any>>({});
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (!restored) return;
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.atlasReady = 'true';
  }, [restored]);
  const lastSendSnapshotRef = useRef<typeof st | null>(null);
  const lastUserTextRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamIdRef = useRef(0);
  const lastKeydownHandledRef = useRef<number | null>(null);
  const lastGreetingLanguageRef = useRef<SupportedLanguage | null>(null);
  const sessionStateRef = useRef<Record<string, any>>({});
  const sendInProgressRef = useRef(false);
  const [st, dispatch] = useReducer(
    conversationReducer,
    initialScreen,
    (screen) => createInitialConversationState(screen)
  );
  const latestStateRef = useRef(st);
  const finRef = useRef<FinancialState>(st.fin);
  const inputDraftRef = useRef('');
  const hasUserInteractedRef = useRef(false);

  const bot = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    latestStateRef.current = st;
    finRef.current = st.fin;
  }, [st]);

  // Set user context on Claude client for companion features
  useEffect(() => {
    claude.setUserContext(userId !== 'guest' ? userId : null, sessionId);
  }, [claude, userId, sessionId]);

  // Load conversation memory for authenticated users
  useEffect(() => {
    if (userId && userId !== 'guest') {
      loadMemory();
    }
  }, [userId, loadMemory]);

  // First-session onboarding: inject opening message if conversation is empty
  useEffect(() => {
    if (st.msgs.length === 0 && mounted && st.scr === 'conversation' && isLoaded) {
      // Check if user has prior conversations (returning user)
      const isReturningUser = memory && Object.keys(memory).length > 0;
      
      let openingMessage: string;
      if (isReturningUser) {
        // Returning user: personalized greeting
        const primaryGoal = (memory as any)?.primaryGoal || st.fin?.primaryGoal || 'your financial goals';
        openingMessage = `Welcome back! Ready to continue working on ${primaryGoal}? What's on your mind today?`;
      } else {
        // First-time user: introduction
        openingMessage = "Hi! I'm Atlas, your financial companion. I'm here to help you build a stronger financial foundation, one conversation at a time. What's on your mind financially right now?";
      }
      
      dispatch({ type: 'SEND_ASKED', text: openingMessage });
    }
  }, [st.msgs.length, mounted, st.scr, memory, st.fin?.primaryGoal, isLoaded]);

  // Auto-save conversation messages every 5 messages
  useEffect(() => {
    if (st.msgs.length > 0 && st.msgs.length % 5 === 0 && userId && userId !== 'guest') {
      saveMemory(st.msgs, { primaryGoal: st.fin?.primaryGoal, financialSnapshot: st.fin });
    }
  }, [st.msgs.length, userId, st.fin, saveMemory]);

  // Handler for loading a session from the sidebar
  const handleSelectSession = useCallback((sessionId: string, messages?: any[]) => {
    if (messages && messages.length > 0) {
      const formattedMessages = messages.map((m: any) => ({
        r: m.role === 'user' ? ('u' as const) : ('a' as const),
        t: m.content,
      }));
      dispatch({ type: 'LOAD_SESSION', messages: formattedMessages });
    }
    setCurrentSessionId(sessionId);
  }, [dispatch]);

  // Finalize session when leaving conversation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userId !== 'guest' && sessionId && st.msgs.length > 0) {
        const conversationText = st.msgs.map((m) => `${m.r === 'u' ? 'User' : 'Atlas'}: ${m.t}`).join('\n');
        finalizeSession(userId, sessionId, conversationText, st.fin, token);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userId, sessionId, st.msgs, st.fin, finalizeSession, token]);

  const updateInput = useCallback(
    (text: string) => {
      inputDraftRef.current = text;
      hasUserInteractedRef.current = true;
      try {
        if (text.trim().length > 0) {
          window.localStorage.setItem('atlas:talkDraft', text);
        } else {
          window.localStorage.removeItem('atlas:talkDraft');
        }
      } catch {
        // ignore
      }
      dispatch({ type: 'SET_INPUT', text });
    },
    [dispatch]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (inputDraftRef.current.trim().length > 0) return;
    try {
      const stored = window.localStorage.getItem('atlas:talkDraft');
      if (stored && !st.inp.trim().length) {
        inputDraftRef.current = stored;
        updateInput(stored);
      }
    } catch {
      // ignore
    }
  }, [st.inp, updateInput]);

  const handleConfirmFin = useCallback(async () => {
    if (!st.pendingFin) return;
    const b = (await engine.run(st.pendingFin, { answered: st.answered, unknown: st.unknown })) as Strategy;
    await db.set('strat', { k: 'baseline', ...b });
    dispatch({ type: 'SEND_STRATEGY_READY', baseline: b });
    dispatch({ type: 'SET_SELECTED_LEVER', lever: b.lever });
    dispatch({ type: 'SET_PENDING_BLOCK', block: 'lever' });
  }, [db, engine, st.pendingFin, st.answered, st.unknown]);

  const handleEditFin = useCallback(() => {
    dispatch({ type: 'SET_PENDING_BLOCK', block: null });
    dispatch({ type: 'SET_PENDING_FIN', fin: null });
  }, [dispatch]);

  const handleConfirmNextStep = useCallback(async () => {
    if (st.pendingBlock === 'lever') {
      if (!st.baseline) return;
      dispatch({ type: 'SET_PENDING_BLOCK', block: 'next' });
      return;
    }
    if (st.pendingBlock === 'next') {
      dispatch({ type: 'SET_PENDING_BLOCK', block: null });
      dispatch({ type: 'SET_PENDING_FIN', fin: null });
      dispatch({ type: 'NAVIGATE', scr: 'summary' });
    }
  }, [db, st.pendingBlock, st.baseline, st.selectedLever, dispatch]);

  const metricExplainerText = useCallback(
    (metric: string, fin: FinancialState, baseline: Strategy) => buildMetricExplainer(metric, fin, baseline, { fc, fp }),
    []
  );

  const nextStepContent = useCallback(
    (fin: FinancialState, baseline: Strategy) => {
      const net = (baseline.metrics as any)?.net ?? fin.monthlyIncome - fin.essentialExpenses - fin.monthlyDebtPayments;
      if (baseline.lever === 'stabilize_cashflow') {
        return {
          direction: 'Get to money left each month.',
          action: 'Pick one bill or category to cut by $50–$150 this week (rent, groceries, subscriptions, phone, insurance).',
          time: 'Today or this week.',
        };
      }
      if (baseline.lever === 'eliminate_high_interest_debt') {
        return {
          direction: 'Reduce compounding interest.',
          action: 'List your credit cards (name + balance + APR, rough is fine).',
          time: 'Today.',
        };
      }
      if (baseline.lever === 'build_emergency_buffer') {
        return {
          direction: 'Build your emergency cushion.',
          action: 'Choose a weekly auto-transfer amount you can keep (even $10–$25).',
          time: 'This week.',
        };
      }
      if (baseline.lever === 'increase_future_allocation') {
        return {
          direction: 'Grow future savings.',
          action: 'Tell me if you have a 401(k) match or a Roth IRA option.',
          time: 'Today.',
        };
      }
      return {
        direction: 'Tighten discretionary spend.',
        action: 'Pick one category to shrink (dining, delivery, subscriptions, shopping).',
        time: 'This week.',
      };
    },
    []
  );

  const nextStepText = useCallback(
    (fin: FinancialState, baseline: Strategy) => {
      const next = nextStepContent(fin, baseline);
      return `Direction: ${next.direction}\nAction: ${next.action}\nTime: ${next.time}`;
    },
    [nextStepContent]
  );

  useEffect(() => {
    setMounted(true);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.mounted = 'true';
      document.documentElement.dataset.atlasReady = 'true';
    }
    if (typeof window !== 'undefined') {
      (window as typeof window & { __atlasMounted?: boolean }).__atlasMounted = true;
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.restored = restored ? 'true' : 'false';
  }, [restored]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as typeof window & { __atlasRestored?: boolean }).__atlasRestored = restored;
  }, [restored]);

  useEffect(() => {
    if (restored) return;
    const timeoutId = window.setTimeout(() => {
      setRestored(true);
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [restored]);

  useEffect(() => {
    if (restored || authLoading) return;
    db.get<{ userId?: string; state?: typeof st }>('conv', 'snapshot')
      .then((snap) => {
        if (!snap?.state) return;
        if (snap.userId && snap.userId !== userId) return;
        if (hasUserInteractedRef.current) return;
        if (inputDraftRef.current.trim().length > 0) return;
        const current = latestStateRef.current;
        const hasUserMessage = current.msgs.some((m) => m.r === 'u');
        if (hasUserMessage || current.inp.trim().length > 0 || current.pendingBlock || current.pendingFin) return;
        dispatch({ type: 'RESTORE', state: snap.state });
      })
      .catch(() => {})
      .finally(() => setRestored(true));
  }, [authLoading, db, restored, userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 719px)');
    const onChange = () => setIsMobile(!!mq.matches);
    onChange();
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  const persistDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    const el = document.getElementById('atlas-message-input') as HTMLTextAreaElement | null;
    // Prefer the ref (set by updateInput on every keystroke) over the DOM value,
    // because React's controlled-component reconciliation may have already reset
    // el.value to '' by the time a tab-switch fires this callback.
    const next = (inputDraftRef.current || el?.value || st.inp).trimEnd();
    try {
      if (next) {
        window.localStorage.setItem('atlas:talkDraft', next);
      } else {
        window.localStorage.removeItem('atlas:talkDraft');
      }
    } catch {
      // ignore
    }
    if (next && next !== st.inp) updateInput(next);
  }, [st.inp, updateInput]);

  const restoreDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    let draft = inputDraftRef.current;
    if (!draft) {
      try {
        draft = window.localStorage.getItem('atlas:talkDraft') || '';
      } catch {
        draft = '';
      }
    }
    if (!draft) return;
    // Only restore if React state is empty (don't override user's current input)
    if (draft !== st.inp) updateInput(draft);
  }, [st.inp, updateInput]);

  const captureDraftFromDom = useCallback(() => {
    if (typeof window === 'undefined') return;
    const el = document.getElementById('atlas-message-input') as HTMLTextAreaElement | null;
    const next = el?.value ?? '';
    if (next && next !== st.inp) updateInput(next);
  }, [st.inp, updateInput]);

  useEffect(() => {
    if (activeTab === 'talk') {
      requestAnimationFrame(() => restoreDraft());
    } else {
      captureDraftFromDom();
      persistDraft();
    }
  }, [activeTab, captureDraftFromDom, persistDraft, restoreDraft]);

  useEffect(() => {
    const tabForScreen = (scr: Screen) => {
      if (scr === 'conversation' || scr === 'summary' || scr === 'tier') return 'talk';
      if (scr === 'plan' || scr === 'strategy') return 'plan';
      if (scr === 'dashboard') return 'dashboard';
      if (scr === 'settings') return 'settings';
      return 'talk';
    };
    const tab = tabForScreen(st.scr);
    tabStacksRef.current[tab] = st.scr;
    setActiveTab(tab);
  }, [st.scr]);

  useEffect(() => {
    if (authLoading) return;
    if (!restored) return;
    const snapshot = {
      ...st,
      streaming: false,
      busy: false,
      inp: '',
    };
    void db.set('conv', { k: 'snapshot', userId, state: snapshot, ts: Date.now() });
  }, [authLoading, db, restored, st, userId]);

  // PROGRESS DISPLAY: Fetch progress data for returning authenticated users on session start
  useEffect(() => {
    if (authLoading) return;
    if (userId === 'guest') return; // Only for authenticated users
    if (st.msgs.length > 0) return; // Only on session start (no messages yet)

    // Fetch progress data from backend
    const fetchProgress = async () => {
      try {
        const response = await fetch('/api/progress/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, sessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.snapshots && data.snapshots.length > 0) {
            setProgressSnapshots(data.snapshots);
            setDaysSinceLast(data.daysSinceLast || 0);
            setShowProgress(true);
          }
        }
      } catch (error) {
        console.error('Error fetching progress data:', error);
      }
    };

    void fetchProgress();
  }, [authLoading, userId, st.scr, st.msgs.length, sessionId]);

  // ACTION COMPLETION: Fetch pending action check-in for returning authenticated users on session start
  useEffect(() => {
    if (authLoading) return;
    if (userId === 'guest') return; // Only for authenticated users
    if (st.scr !== 'conversation') return;
    if (st.msgs.length > 0) return; // Only on session start (no messages yet)

    // Fetch pending action from backend
    const fetchPendingAction = async () => {
      try {
        // Check for deep link from email check-in
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const checkinActionId = urlParams?.get('checkin');
        const checkinResult = urlParams?.get('result'); // 'yes' or 'no'

        if (checkinActionId) {
          // Clear the URL param without page reload
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }

          // If result is already provided via URL (user clicked yes/no in email)
          if (checkinResult === 'yes' || checkinResult === 'no') {
            const completed = checkinResult === 'yes';
            await handleActionCompletion(checkinActionId, completed);
            // Send message to start the conversation
            const message = completed
              ? `I completed my commitment: checking in from your email.` 
              : `I haven't completed my commitment yet — checking in from your email.`;
            void send(message);
            return;
          }

          // If just the checkin param (show the card)
          try {
            const response = await fetch('/api/actions/pending', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, sessionId, actionId: checkinActionId }),
            });
            if (response.ok) {
              const data = await response.json();
              if (data.action) {
                setPendingActionCompletion({
                  id: data.action.id,
                  text: data.action.text,
                  dueDate: data.action.dueDate,
                });
              }
            }
          } catch (error) {
            console.error('Error fetching check-in action:', error);
          }
          return;
        }

        // Normal flow: fetch most recent pending action
        const response = await fetch('/api/actions/pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, sessionId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.action) {
            const dueDate = new Date(data.action.dueDate);
            const now = new Date();
            const daysUntil = Math.max(0, Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            
            // Only show "current mission" if NOT yet due (ActionCompletionCard handles the due case)
            if (daysUntil > 0) {
              setCurrentMission({ text: data.action.text, daysUntilCheckIn: daysUntil });
            } else {
              // If due, show ActionCompletionCard instead
              setPendingActionCompletion({
                id: data.action.id,
                text: data.action.text,
                dueDate: data.action.dueDate,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching pending action:', error);
      }
    };

    void fetchPendingAction();
  }, [authLoading, userId, st.scr, st.msgs.length, sessionId]);

  useEffect(() => {
    if (authLoading) return;
    db.get<{ metrics?: UserOutcomeMetrics; lastState?: { debtBalance: number; savings: number } }>('outcomes', 'metrics')
      .then((stored) => {
        if (stored?.metrics) setOutcomeMetrics(stored.metrics);
        if (stored?.lastState) setLastOutcomeState(stored.lastState);
      })
      .catch(() => {});
  }, [authLoading, db]);

  useEffect(() => {
    if (authLoading) return;
    if (!st.baseline) return;
    const debtBalance = Number(st.fin.highInterestDebt || 0) + Number(st.fin.lowInterestDebt || 0);
    const savings = Number(st.fin.totalSavings || 0);
    if (lastOutcomeState && lastOutcomeState.debtBalance === debtBalance && lastOutcomeState.savings === savings) return;
    const prev = outcomeMetrics ? ({ ...outcomeMetrics, ...(lastOutcomeState || {}) } as any) : null;
    const nextMetrics = trackOutcomeProgress(prev, { debtBalance, savings });
    setOutcomeMetrics(nextMetrics);
    const nextState = { debtBalance, savings };
    setLastOutcomeState(nextState);
    void db.set('outcomes', { k: 'metrics', userId, metrics: nextMetrics, lastState: nextState, ts: Date.now() });
  }, [authLoading, db, lastOutcomeState, outcomeMetrics, st.baseline, st.fin.highInterestDebt, st.fin.lowInterestDebt, st.fin.totalSavings, userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (st.scr !== 'conversation') return;
    // Resolve 'unknown' quickly without spending tokens: checks whether /api/chat is reachable and configured.
    void claude.statusCheck().finally(() => setApiStatus(claude.status));
  }, [claude, st.scr]);

  useEffect(() => {
    if (!st.baseline) return;
    if (st.scr !== 'conversation') return;
    void db.get<{ v: number }>('prefs', 'lastCheckinAt').then((p) => {
      const last = typeof p?.v === 'number' ? p.v : null;
      if (!shouldShowCheckin({ lastCheckinAt: last })) return;
      const msg = buildCheckinMessage();
      dispatch({ type: 'SEND_ASKED', text: msg });
      void db.set('prefs', { k: 'lastCheckinAt', v: Date.now() });
    });
  }, [db, st.baseline, st.scr]);

  useEffect(() => {
    if (st.scr !== 'conversation') return;
    void db.get<{ v: number }>('prefs', 'lastFeedbackAt').then((p) => {
      const last = typeof p?.v === 'number' ? p.v : null;
      if (!shouldPromptFeedback({ lastPromptAt: last })) return;
      const msg = 'Quick check: was that last response helpful? Reply "helpful" or "not helpful".';
      dispatch({ type: 'SEND_ASKED', text: msg });
      void db.set('prefs', { k: 'lastFeedbackAt', v: Date.now() });
    });
  }, [db, st.scr]);

  // TASK 1.4 PART B: System preference listener - updates theme if user hasn't explicitly chosen
  useEffect(() => {
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (!mq) return;
    
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if user hasn't explicitly chosen
      if (!localStorage.getItem('atlas_theme')) {
        const systemTheme = e.matches ? 'dark' : 'light';
        setTheme(systemTheme);
        document.documentElement.setAttribute('data-theme', systemTheme);
      }
    };
    
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // TASK 1.4 PART B: Update theme in DOM and localStorage
  useEffect(() => {
    if (!theme) return; // Don't update until theme is initialized
    document.documentElement.setAttribute('data-theme', theme);
    db.set('prefs', { k: 'theme', v: theme }).catch(() => {});
    try {
      // Use 'atlas_theme' for localStorage (synchronous, used in blocking script)
      localStorage.setItem('atlas_theme', theme);
    } catch {
      // ignore
    }
  }, [theme, db]);

  useEffect(() => {
    if (st.scr !== 'conversation') return;
    if (lastGreetingLanguageRef.current === language) return;
    const hasUserMessage = st.msgs.some((m) => m.r === 'u');
    lastGreetingLanguageRef.current = language;
    if (hasUserMessage) return;
    if (st.inp.trim().length > 0) return;
    const nextGreeting = generateStableOpeningMessage(language);
    const nextState = { ...st, msgs: [{ r: 'a' as const, t: nextGreeting }] };
    dispatch({ type: 'RESTORE', state: nextState });
  }, [language, st, st.scr]);

  useEffect(() => {
    db.get<{ v: boolean }>('prefs', 'speakReplies')
      .then((p: { v: boolean } | undefined) => {
        if (typeof p?.v === 'boolean') setSpeakReplies(p.v);
      })
      .catch(() => {});
    db.get<{ v: boolean }>('prefs', 'voiceAutoSend')
      .then((p: { v: boolean } | undefined) => {
        if (typeof p?.v === 'boolean') setVoiceAutoSend(p.v);
      })
      .catch(() => {});
    db.get<{ v: boolean }>('prefs', 'replayEnabled')
      .then((p: { v: boolean } | undefined) => {
        if (typeof p?.v === 'boolean') setReplayEnabled(p.v);
      })
      .catch(() => {});
    db.get<{ v: 'short' | 'explain' }>('prefs', 'responsePref')
      .then((p: { v: 'short' | 'explain' } | undefined) => {
        if (p?.v) setResponsePref(p.v);
      })
      .catch(() => {});
    db.get<{ v: 'novice' | 'intermediate' | 'advanced' }>('prefs', 'literacyLevel')
      .then((p: { v: 'novice' | 'intermediate' | 'advanced' } | undefined) => {
        if (p?.v) setLiteracyLevel(p.v);
      })
      .catch(() => {});
    db.get<{ v: string }>('prefs', 'memorySummary')
      .then((p: { v: string } | undefined) => {
        if (typeof p?.v === 'string' && p.v.trim()) {
          dispatch({ type: 'SET_MEMORY_SUMMARY', summary: p.v.trim() });
        }
      })
      .catch(() => {});
    db.get<{ v: SupportedLanguage }>('prefs', 'language')
      .then((p: { v: SupportedLanguage } | undefined) => {
        if (p?.v && ['en', 'es', 'fr', 'zh'].includes(p.v)) {
          setLanguage(p.v);
          try {
            window.localStorage.setItem('atlas:language', p.v);
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    if (!speakReplies) return;
    if (!voice.ttsSupported) return;
    const last = st.msgs[st.msgs.length - 1];
    if (!last || last.r !== 'a') return;
    voice.speak(last.t);
  }, [st.msgs, speakReplies, voice]);

  useEffect(() => {
    db.get<any>('fin', 'cur')
      .then((v) => {
        if (v) {
          const nf: FinancialState = {
            ...defaultFin,
            ...v,
          };
          dispatch({ type: 'HYDRATE_FIN', fin: nf });
        }
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    db.get<Strategy>('strat', 'baseline')
      .then((s) => {
        if (s) dispatch({ type: 'HYDRATE_BASELINE', baseline: s });
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    bot.current?.scrollIntoView({ behavior: 'smooth' });
  }, [st.msgs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'atlas:dashboardOpenedAt') return;
      if (!st.baseline) return;
      if (st.scr === 'dashboard') return;
      if (st.scr !== 'conversation') dispatch({ type: 'NAVIGATE', scr: 'conversation' });
      dispatch({ type: 'SEND_ASKED', text: nextStepText(st.fin, st.baseline) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [st.baseline, st.fin, st.scr, nextStepText]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'atlas:explainMetric') return;
      if (!st.baseline) return;
      if (st.scr === 'dashboard') return;
      let metric = '';
      try {
        const parsed = JSON.parse(String(e.newValue || ''));
        metric = String(parsed?.metric || '');
      } catch {
        metric = '';
      }
      if (!metric) return;

      if (st.scr !== 'conversation') dispatch({ type: 'NAVIGATE', scr: 'conversation' });
      dispatch({ type: 'SEND_ASKED', text: metricExplainerText(metric, st.fin, st.baseline) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [metricExplainerText, st.baseline, st.fin, st.scr]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (st.scr !== 'dashboard') return;
    try {
      window.localStorage.setItem('atlas:dashboardOpenedAt', String(Date.now()));
    } catch {
      // ignore
    }
  }, [st.scr]);

  const missing = useCallback((f: FinancialState) => {
    // Use goal-specific required fields matching conversationOrchestrator.ts
    const goal = sessionStateRef.current?.goal || 'general_guidance';
    
    // Map of goal-specific required fields (must match conversationOrchestrator.ts REQUIRED_FIELDS)
    const requiredByGoal: Record<string, Array<keyof FinancialState>> = {
      affordability_check: ['monthlyIncome', 'essentialExpenses'],
      emergency_fund: ['monthlyIncome', 'essentialExpenses', 'totalSavings'],
      debt_payoff: ['monthlyIncome', 'essentialExpenses', 'highInterestDebt', 'lowInterestDebt'],
      budget_build: ['monthlyIncome', 'essentialExpenses'],
      investment_start: ['monthlyIncome', 'essentialExpenses', 'totalSavings'],
      retirement_planning: ['monthlyIncome', 'essentialExpenses', 'totalSavings'],
      general_guidance: ['monthlyIncome'],
    };
    
    const fieldsToCheck = requiredByGoal[goal] || NEED;
    
    return fieldsToCheck.filter((k) => {
      const value = f[k];
      // For debt fields: null/undefined = missing, 0 = explicitly none (valid answer)
      if (k === 'lowInterestDebt' || k === 'highInterestDebt') {
        return value === null || value === undefined;
      }
      // For other fields: undefined, null, or zero = missing
      return value === null || value === undefined || (typeof value === 'number' && value === 0);
    });
  }, []);

  const handleSessionState = useCallback((state: Record<string, any>) => {
    setSessionState(state);
    sessionStateRef.current = state;
  }, []);

  const doSend = useCallback(
    async (base: typeof st, ut: string) => {
      inputDraftRef.current = '';
      hasUserInteractedRef.current = true;
      dispatch({ type: 'SEND_START', text: ut });
      const kind = classifyInterruption(ut);
      const logReplay = (entry: ReturnType<typeof createReplayEntry>) => {
        void logReplayEntry({ enabled: replayEnabled, entry, set: db.set.bind(db) }).catch(() => {});
      };

      const pref = detectResponsePreference(ut);
      if (pref && pref !== responsePref) {
        setResponsePref(pref);
        void db.set('prefs', { k: 'responsePref', v: pref });
      }
      const literacy = detectLiteracyLevel(ut);
      if (literacy && literacy !== literacyLevel) {
        setLiteracyLevel(literacy);
        void db.set('prefs', { k: 'literacyLevel', v: literacy });
      }

      if (/^\s*(helpful|not helpful)\s*$/i.test(ut)) {
        const rating = /helpful/i.test(ut) ? 'helpful' : 'not_helpful';
        void db.set('feedback', createFeedbackEntry({ responseId: `resp_${Date.now()}`, rating }));
      }

      logReplay(createReplayEntry({ role: 'user', text: ut, kind, emotionTag: detectReplayEmotion(ut) }));

      const detectedAction = detectAction(ut);
      const actionImpact = estimateActionImpact(detectedAction);
      let actionFeedback = buildActionFeedback(detectedAction, actionImpact);
      if (detectedAction) {
        await db.set('actions', {
          id: `act_${Date.now()}`,
          ...detectedAction,
          impact: actionImpact,
        });
        const history = await db.all('actions');
        const streak = computeActionStreak(history as any[]);
        const streakMsg = buildStreakMessage(streak);
        if (streakMsg) actionFeedback = [actionFeedback, streakMsg].filter(Boolean).join('\n\n');
      }

      let nudgeText: string | null = null;
      if (!detectedAction) {
        const history = await db.all('actions');
        const last = (history as any[]).sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0))[0];
        nudgeText = buildNudge({ lastActionAt: last?.createdAt ?? null, primaryGoal: st.fin.primaryGoal });
      }

      const learningHistory = await db.all('replay');
      const learningDates = (learningHistory as any[])
        .filter((e) => e?.role === 'assistant')
        .map((e) => Number(e?.ts || e?.createdAt || 0))
        .filter((t) => t > 0);
      const learningStreak = computeLearningStreak(learningDates);
      const learningPrompt = learningStreak.days >= 2 ? `Learning streak: ${learningStreak.days} days. Keep it going.` : null;

      const prevMsgs: ChatMessage[] = [...base.msgs, { r: 'u' as const, t: ut }];
      try {
        const normalizeApiErr = (raw0: string) => {
          const raw = String(raw0 || '').trim();
          const t = raw.toLowerCase();
          if (!t) return 'Connection issue — retry when you’re ready.';
          if (t.includes('api not configured') || t.includes('anthropic_api_key')) return 'AI is not configured yet.';
          if (t.includes('too many requests') || t.includes('429')) return 'AI is rate-limited right now. Try again in a moment.';
          if (t.includes('proxy_error_') || t.includes('fetch') || t.includes('network') || t.includes('timeout')) return 'Connection issue — retry when you’re ready.';
          return raw;
        };

        const missBefore = base.missing.length ? base.missing : missing(base.fin);
        const resumeQ = missBefore.length ? nextQuestionForMissing(missBefore[0], prevMsgs.length) : null;
        const isAuthenticated = userId !== 'guest';

        if (kind === 'meta') {
          const ans = metaResponse(ut, isAuthenticated);
          const out = resumeQ ? `${ans} ${resumeQ.text}` : ans;
          logReplay(
            createReplayEntry({
              role: 'assistant',
              text: out,
              kind: 'meta',
              questionKey: resumeQ?.key,
              emotionTag: detectReplayEmotion(out),
            })
          );
          dispatch({ type: 'SEND_ASKED', text: out, questionKey: resumeQ?.key });
          return;
        }

        if (kind === 'followup_question') {
          const am = prevMsgs.slice(-10).map((m) => ({ role: m.r === 'u' ? ('user' as const) : ('assistant' as const), content: m.t }));

          streamAbortRef.current?.abort();
          const ctrl = new AbortController();
          streamAbortRef.current = ctrl;
          const myStreamId = ++streamIdRef.current;

          dispatch({ type: 'STREAM_START' });

          let streamed = '';
          const res = await claude.answerStream({
            msgs: am,
            question: ut,
            mode: 'explain',
            memorySummary: st.memorySummary,
            fin: st.fin,
            onDelta: (t) => {
              if (streamIdRef.current !== myStreamId) return;
              if (ctrl.signal.aborted) return;
              streamed += t;
              dispatch({ type: 'STREAM_DELTA', delta: t });
            },
            signal: ctrl.signal,
          });

          if (streamIdRef.current !== myStreamId) {
            // Canceled or replaced by a newer stream.
            return;
          }
          streamAbortRef.current = null;
          if (!res.ok && res.canceled) {
            dispatch({ type: 'STREAM_CANCELED' });
            return;
          }

          if (!res.ok) {
            dispatch({ type: 'SEND_ASKED', text: "I'm having trouble connecting right now. Please try again in a moment." });
          } else {
            dispatch({ type: 'STREAM_DONE' });
          }

          // Extract rate limit remaining from response
          if (res.rateLimitRemaining !== undefined) {
            setRateLimitRemaining(res.rateLimitRemaining);
          }

          if (res.ok) {
            logReplay(
              createReplayEntry({
                role: 'assistant',
                text: streamed.trim(),
                kind: 'followup_question',
                emotionTag: detectReplayEmotion(streamed),
              })
            );
            const learnedNow = detectLearnedConcepts(streamed);
            await Promise.all(
              learnedNow.map((concept) =>
                db.set('learned', {
                  k: concept.toLowerCase(),
                  concept,
                  ts: Date.now(),
                })
              )
            );
          }
          if (missBefore.length) {
            const followupMsgs = [
              ...am,
              { role: 'assistant' as const, content: streamed.trim() || '' },
            ];
            const followupCtrl = new AbortController();
            streamAbortRef.current = followupCtrl;
            
            let followupText = '';
            // MULTI-GOAL SERIALIZATION: Merge multiGoalState.goals into sessionState for backend
            const followupSessionState = {
              ...sessionStateRef.current,
              ...(multiGoalState?.goals && { goals: multiGoalState.goals }),
            };
            
            const followupRes = await claude.chatStream({
              msgs: followupMsgs,
              missing: missBefore as string[],
              memorySummary: st.memorySummary,
              fin: finRef.current,
              sessionState: followupSessionState,
              answered: st.answered,
              baseline: st.baseline,
              onDelta: (t) => { followupText += t; },
              onSessionState: handleSessionState,
              signal: followupCtrl.signal,
            });
            streamAbortRef.current = null;

            // Extract rate limit remaining from followup response
            if (followupRes.rateLimitRemaining !== undefined) {
              setRateLimitRemaining(followupRes.rateLimitRemaining);
            }

            // COMPANION: Capture sessionId from followup response if not yet set
            if (followupRes.sessionId && !sessionId) {
              updateSessionId(followupRes.sessionId);
            }
            
            const fallbackText = resumeQ?.text || 'What would help you most right now?';
            const askText = followupText.trim() || fallbackText;
            logReplay(
              createReplayEntry({
                role: 'assistant',
                text: askText,
                kind: 'ask',
                questionKey: resumeQ?.key || missBefore[0],
                emotionTag: detectReplayEmotion(askText),
                trace: buildReasoningTrace({
                  decision: 'ask',
                  questionKey: resumeQ?.key || missBefore[0],
                  missingCount: missBefore.length,
                  answeredCount: Object.keys(base.answered || {}).length,
                }),
              })
            );
            dispatch({ type: 'SEND_ASKED', text: askText, questionKey: resumeQ?.key || missBefore[0] });
          }
          return;
        }

      // Get the last assistant message (the question that was asked)
      const lastAssistantMsg = prevMsgs.slice().reverse().find((m) => m.r === 'a')?.t || '';
      
      const ex = await claude.extract(ut, base.fin, { language, lastQuestion: lastAssistantMsg });
      setApiStatus(claude.status);

      const st1 = applyUserTurn(
        {
          sessionId: 'ui',
          phase: missBefore.length ? ('onboarding' as const) : ('baseline_ready' as const),
          collected: base.fin,
          missing: missBefore,
          lastQuestionKey: base.lastQuestionKey,
          lastTurnAt: Date.now(),
          mode: base.mode,
          answered: base.answered,
          unknown: base.unknown,
        },
        {
          userText: ut,
          extractedFields: ex.fields as any,
          kind,
          now: Date.now(),
        }
      );

      const uf: FinancialState = st1.collected;
      const miss = st1.missing;
      const answeredNext = st1.answered;
      const unknownNext = st1.unknown;
      const extractedCount = Object.keys((ex.fields as Record<string, unknown>) || {}).length;

      const memorySummary = buildMemorySummary(uf, answeredNext);
      dispatch({ type: 'SET_MEMORY_SUMMARY', summary: memorySummary || null });
      if (memorySummary) {
        await db.set('prefs', { k: 'memorySummary', v: memorySummary, ts: Date.now() });
      }

      dispatch({
        type: 'SEND_EXTRACTED',
        finNext: uf,
        missingNext: miss,
        answeredNext,
        unknownNext,
        apiOk: ex.apiOk !== false,
        err: ex.apiOk === false ? normalizeApiErr(String((ex as any).err || '')) : null,
      });
      await db.set('fin', { k: 'cur', ...uf, ts: Date.now() });

      if (
        kind === 'answer_to_question' &&
        missBefore.length > 0 &&
        miss.length === missBefore.length &&
        miss[0] === missBefore[0] &&
        extractedCount === 0
      ) {
        const clarQuestion = nextQuestionForMissing(missBefore[0], base.msgs.length);
        const clar = clarQuestion.text;
        logReplay(
          createReplayEntry({
            role: 'assistant',
            text: clar,
            kind: 'clarify',
            questionKey: missBefore[0],
            emotionTag: detectReplayEmotion(clar),
            trace: buildReasoningTrace({
              decision: 'ask',
              questionKey: missBefore[0],
              missingCount: miss.length,
              answeredCount: Object.keys(answeredNext || {}).length,
            }),
          })
        );
        dispatch({ type: 'SEND_ASKED', text: clar, questionKey: missBefore[0] });
        return;
      }

      const action = decideNextAction({ kind, missing: miss, turnIndex: prevMsgs.length });
      if (action.type === 'complete') {
        if (actionFeedback) {
          logReplay(
            createReplayEntry({
              role: 'assistant',
              text: actionFeedback,
              kind: 'answer_to_question',
              emotionTag: detectReplayEmotion(actionFeedback),
            })
          );
          dispatch({ type: 'SEND_ASKED', text: actionFeedback });
        }
        
        // PRIORITY 2: Gate extraction - don't show CONFIRM card if extraction was gated
        // If source is 'extraction_gated' or fields is empty, skip confirmation flow
        const isExtractionGated = ex.src === 'extraction_gated' || Object.keys((ex.fields as Record<string, unknown>) || {}).length === 0;
        
        if (!isExtractionGated) {
          dispatch({ type: 'SET_PENDING_FIN', fin: uf });
          dispatch({ type: 'SET_PENDING_BLOCK', block: 'confirm' });
        }
        return;
      }
      if (action.type === 'ask') {
        const preface = [actionFeedback, nudgeText, learningPrompt].filter(Boolean).join('\n\n');
        const chatMsgs = prevMsgs.slice(-10).map((m) => ({ role: m.r === 'u' ? ('user' as const) : ('assistant' as const), content: m.t }));
        
        // Use chatStream to get guided responses with session state injection
        streamAbortRef.current?.abort();
        const ctrl = new AbortController();
        streamAbortRef.current = ctrl;
        const myStreamId = ++streamIdRef.current;

        dispatch({ type: 'STREAM_START' });

        let adaptiveAsk = '';
        // MULTI-GOAL SERIALIZATION: Merge multiGoalState.goals into sessionState for backend
        const sessionStateWithGoals = {
          ...sessionStateRef.current,
          ...(multiGoalState?.goals && { goals: multiGoalState.goals }),
        };
        
        const res = await claude.chatStream({
          msgs: chatMsgs,
          missing: miss as string[],
          onDelta: (t) => {
            if (streamIdRef.current !== myStreamId) return;
            if (ctrl.signal.aborted) return;
            adaptiveAsk += t;
            dispatch({ type: 'STREAM_DELTA', delta: t });
          },
          onSessionState: handleSessionState,
          signal: ctrl.signal,
          memorySummary: st.memorySummary,
          fin: finRef.current,
          extractedFields: ex.fields as any,
          sessionState: sessionStateWithGoals,
          answered: st.answered,
          baseline: st.baseline,
        });

        if (streamIdRef.current !== myStreamId) {
          return;
        }
        streamAbortRef.current = null;
        if (!res.ok && res.canceled) {
          dispatch({ type: 'STREAM_CANCELED' });
          return;
        }

        if (!res.ok) {
          dispatch({ type: 'SEND_ASKED', text: "I'm having trouble connecting right now. Please try again in a moment." });
        } else {
          dispatch({ type: 'STREAM_DONE' });
        }

        // Extract rate limit remaining from response
        if (res.rateLimitRemaining !== undefined) {
          setRateLimitRemaining(res.rateLimitRemaining);
        }

        // COMPANION: Capture sessionId returned from first response, persist to sessionStorage
        // This ensures finalization, action tracking, and progress display work on subsequent requests
        if (res.sessionId && !sessionId) {
          updateSessionId(res.sessionId);
        }
        
        // AUTHPROMPTCARD: Show auth prompt to guest users immediately after tier reveal
        // This is the highest-value moment — user has received their full financial analysis
        if (userId === 'guest' && st.baseline && !showAuthPrompt) {
          setShowAuthPrompt(true);
        }

        // GOAL DETECTION: Process response for goals and trigger addNewGoal if detected
        // FIX 4: Pass userId and token for goal persistence
        const token = authSession?.accessToken || undefined;
        const financialProfile = finRef.current ? {
          totalSavings: finRef.current.totalSavings,
          highInterestDebt: finRef.current.highInterestDebt || 0,
          monthlyIncome: finRef.current.monthlyIncome,
          essentialExpenses: finRef.current.essentialExpenses,
        } : undefined;
        await processResponseForGoals(adaptiveAsk || action.text, addNewGoal, userId !== 'guest' ? userId : undefined, token, undefined, financialProfile);
        
        // Only dispatch SEND_ASKED if streaming produced nothing
        // The streamed content is already in the UI via STREAM_DELTA
        if (!adaptiveAsk.trim()) {
          const askBody = action.text;
          const askText = preface ? `${preface}\n\n${askBody}` : askBody;
          logReplay(
            createReplayEntry({
              role: 'assistant',
              text: askText,
              kind: 'ask',
              questionKey: action.questionKey,
              emotionTag: detectReplayEmotion(askText),
              trace: buildReasoningTrace({
                decision: 'ask',
                questionKey: action.questionKey,
                missingCount: miss.length,
                answeredCount: Object.keys(answeredNext || {}).length,
              }),
            })
          );
          dispatch({ type: 'SEND_ASKED', text: askText, questionKey: action.questionKey });
        } else {
          // Stream produced content, just log the replay with what was streamed
          const askText = preface ? `${preface}\n\n${adaptiveAsk.trim()}` : adaptiveAsk.trim();
          logReplay(
            createReplayEntry({
              role: 'assistant',
              text: askText,
              kind: 'ask',
              questionKey: action.questionKey,
              emotionTag: detectReplayEmotion(askText),
              trace: buildReasoningTrace({
                decision: 'ask',
                questionKey: action.questionKey,
                missingCount: miss.length,
                answeredCount: Object.keys(answeredNext || {}).length,
              }),
            })
          );
        }
      }
    } catch (e: any) {
      const raw = String(e?.message || 'send_failed');
      const friendly = (() => {
        const t = raw.toLowerCase();
        if (t.includes('api not configured') || t.includes('anthropic_api_key')) return 'AI is not configured yet.';
        if (t.includes('too many requests') || t.includes('429')) return 'AI is rate-limited right now. Try again in a moment.';
        if (t.includes('proxy_error_') || t.includes('fetch') || t.includes('network') || t.includes('timeout')) return 'Connection issue — retry when you’re ready.';
        return raw;
      })();
      
      // Preserve message if it's a network failure
      if (!navigator.onLine || (e?.message && (e.message.includes('fetch') || e.message.includes('network') || e.message.includes('Failed to fetch')))) {
        preserveUnsentMessage(ut, sessionId || '');
      }
      
      setApiStatus(claude.status);
      dispatch({ type: 'SEND_FAILED', err: friendly });
    }
  },
    [claude, db, engine, missing]
  );

  const send = useCallback(
    async (overrideText?: string) => {
      if (sendInProgressRef.current || st.busy) return;
      sendInProgressRef.current = true;
      
      try {
        voice.stopSpeak();
        const ut = String((overrideText ?? st.inp) || '').trim();
        if (!ut) return;

        // Validate message length before sending
        const validation = validateMessageLength(ut);
        if (!validation.isValid) {
          dispatch({ type: 'SEND_ASKED', text: validation.error || `Your message is too long. Please shorten it and try again.` });
          return;
        }

        // Clear localStorage BEFORE updating state so the restore effect sees empty storage
        try {
          window.localStorage.removeItem('atlas:talkDraft');
        } catch {
          // ignore
        }
        inputDraftRef.current = '';
        
        // Clear input immediately before sending
        updateInput('');

        if (editingLast && lastSendSnapshotRef.current) {
          const snap = lastSendSnapshotRef.current;
          setEditingLast(false);
          dispatch({ type: 'RESTORE', state: snap });
          await doSend(snap, ut);
          return;
        }

        lastSendSnapshotRef.current = st;
        lastUserTextRef.current = ut;
        await doSend(st, ut);
      } finally {
        sendInProgressRef.current = false;
      }
    },
    [st, voice, editingLast, doSend, updateInput]
  );

  const canRetry = !!st.apiErr && !st.busy && !!lastSendSnapshotRef.current && !!lastUserTextRef.current;

  const retryLast = useCallback(() => {
    if (!canRetry) return;
    const snap = lastSendSnapshotRef.current;
    const ut = lastUserTextRef.current;
    if (!snap || !ut) return;
    dispatch({ type: 'RESTORE', state: snap });
    void doSend(snap, ut);
  }, [canRetry, doSend]);

  useEffect(() => {
    voice.setOnTranscript((t) => {
      updateInput(t);
      if (voiceAutoSend) {
        queueMicrotask(() => void send(t));
      }
    });
  }, [voice, voiceAutoSend, send, updateInput]);

  // Restore and re-send preserved messages when reconnecting
  useEffect(() => {
    const handleOnline = () => {
      const preserved = retrieveUnsentMessage(sessionId || '');
      if (preserved) {
        clearUnsentMessage(sessionId || '');
        void send(preserved);
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sessionId, send]);

  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const value = (e.currentTarget as HTMLTextAreaElement)?.value || latestStateRef.current.inp;
      if (value !== latestStateRef.current.inp) updateInput(value);
      void send(value);
    }
  }, [send, updateInput]);

  const handleActionCompletion = useCallback(async (actionId: string, completed: boolean) => {
    try {
      // Send action completion to backend
      const response = await fetch('/api/actions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          actionId,
          completed,
        }),
        keepalive: true,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[companion] Action completion recorded:', data);
        
        // Show acknowledgment message
        const acknowledgment = completed
          ? `That's fantastic! You followed through on your commitment. That consistency is what builds real financial progress.`
          : `No worries — life happens. Let's figure out what got in the way and adjust the plan.`;
        
        dispatch({ type: 'SEND_ASKED', text: acknowledgment });
      }
    } catch (error) {
      console.error('Error recording action completion:', error);
    } finally {
      setPendingActionCompletion(null);
    }
  }, [userId, sessionId]);

  const renderTalkStack = (scr: Screen) => (
    <>
      <div style={{ display: scr === 'conversation' ? 'block' : 'none' }}>
        {currentMission && !pendingActionCompletion && (
          <div className="w-full max-w-2xl mx-auto mb-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Your current mission</p>
            <p className="text-sm text-slate-800 mb-3">{currentMission.text}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {currentMission.daysUntilCheckIn === 1
                  ? 'Check-in tomorrow'
                  : `${currentMission.daysUntilCheckIn} days until check-in`}
              </span>
              <button
                onClick={() => {
                  setCurrentMission(null);
                  void send(`I'm checking in on my commitment: "${currentMission.text}"`);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Check in with Atlas →
              </button>
            </div>
          </div>
        )}
        {showProgress && (
          <ProgressDisplay
            snapshots={progressSnapshots}
            daysSinceLast={daysSinceLast}
            onDismiss={() => setShowProgress(false)}
          />
        )}
        {showAuthPrompt && <AuthPromptCard onDismiss={() => setShowAuthPrompt(false)} />}
        {pendingActionCompletion && (
          <ActionCompletionCard
            actionId={pendingActionCompletion.id}
            actionText={pendingActionCompletion.text}
            dueDate={pendingActionCompletion.dueDate}
            onConfirm={async (actionId, completed) => {
              await handleActionCompletion(actionId, completed);
              setPendingActionCompletion(null);
              // Automatically continue the conversation based on outcome
              const followupText = completed
                ? `I completed the action: "${pendingActionCompletion.text}"` 
                : `I didn't get to it yet: "${pendingActionCompletion.text}"`;
              void send(followupText);
            }}
            onDismiss={() => setPendingActionCompletion(null)}
          />
        )}
        {/* FIX 7: Milestone celebration UI */}
        {milestonesToCelebrate.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
            {milestonesToCelebrate.map((m: any, i: number) => (
              <div key={i} className="bg-green-500 text-white px-6 py-3 rounded-2xl shadow-lg text-sm font-medium animate-bounce">
                🎉 {m.message || m.title || 'Milestone reached!'}
              </div>
            ))}
          </div>
        )}
        <ConversationScreen
          inputEnabled={mounted}
          theme={theme ?? 'dark'}
          onToggleTheme={toggleTheme}
          apiErr={st.apiErr}
          apiStatus={apiStatus}
          msgs={st.msgs}
          busy={st.busy}
          pendingBlock={st.pendingBlock}
          pendingFin={st.pendingFin}
          selectedLever={st.selectedLever}
          baseline={st.baseline}
          onConfirmFin={handleConfirmFin}
          onEditFin={handleEditFin}
          onConfirmNextStep={handleConfirmNextStep}
          inp={st.inp}
          onChangeInp={updateInput}
          onKeyDown={onKeyDown}
          onSend={() => void send()}
          canRetry={canRetry}
          onRetry={retryLast}
          language={language}
          onLanguageChange={(lang: SupportedLanguage) => {
            setLanguage(lang);
            void db.set('prefs', { k: 'language', v: lang });
            try {
              window.localStorage.setItem('atlas:language', lang);
            } catch {
              // ignore
            }
          }}
          hydrated={mounted}
          onQuickReply={(text) => {
            updateInput(text);
            if (text.trim().endsWith(':')) return;
            void send(text);
          }}
          onEditLastUserMessage={() => {
            if (st.busy) return;
            const lastUser = [...st.msgs].reverse().find((m) => m.r === 'u');
            const t = String(lastUser?.t || '').trim();
            if (!t) return;
            setEditingLast(true);
            updateInput(t);
          }}
          nextStepHint={st.baseline && st.missing.length === 0 && !st.pendingBlock ? 'Continue with one step' : null}
          nextStepContent={st.baseline && st.missing.length === 0 ? nextStepContent(st.fin, st.baseline) : null}
          actionSuggestions={st.baseline && st.missing.length === 0 ? suggestActions({ fin: st.fin, baseline: st.baseline }) : null}
          lastQuestionKey={st.lastQuestionKey}
          onNextStep={
            st.baseline && st.missing.length === 0
              ? () => {
                  dispatch({ type: 'SEND_ASKED', text: nextStepText(st.fin, st.baseline!) });
                }
              : undefined
          }
          botRef={bot}
          voiceSupported={mounted ? voice.sttSupported : false}
          onVoiceStart={() => {
            dispatch({ type: 'SET_MODE', mode: 'voice' });
            voice.stopSpeak();
            voice.startStt();
          }}
          voiceListening={voiceListening}
          speaking={speaking}
          onStopSpeaking={() => voice.stopSpeak()}
          streaming={st.streaming}
          onCancelStream={() => {
            streamAbortRef.current?.abort();
            streamAbortRef.current = null;
            streamIdRef.current++;
            dispatch({ type: 'STREAM_CANCELED' });
          }}
          isGuest={!user}
          onResetConversation={() => dispatch({ type: 'NEW_CONVERSATION' })}
        />
        {rateLimitRemaining !== undefined && rateLimitRemaining <= 15 && (
          <div
            style={{
              position: 'fixed',
              bottom: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              background: rateLimitRemaining <= 5 ? '#ef4444' : 'rgba(0,0,0,0.65)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              zIndex: 20,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              letterSpacing: '0.01em',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            {rateLimitRemaining} message{rateLimitRemaining !== 1 ? 's' : ''} remaining today
          </div>
        )}
      </div>
      {st.baseline && (
        <div style={{ display: scr === 'summary' ? 'block' : 'none' }}>
          <SummaryScreen
            theme={theme ?? 'dark'}
            onToggleTheme={toggleTheme}
            apiErr={st.apiErr}
            apiStatus={claude.status}
            fin={st.fin}
            baseline={st.baseline}
            onShowTier={() => dispatch({ type: 'NAVIGATE', scr: 'tier' })}
            onEditViaChat={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
            fc={fc}
            fp={fp}
          />
        </div>
      )}
      {st.baseline && (
        <div style={{ display: scr === 'tier' ? 'block' : 'none' }}>
          <TierRevealScreen
            theme={theme ?? 'dark'}
            onToggleTheme={toggleTheme}
            apiErr={st.apiErr}
            apiStatus={claude.status}
            baseline={st.baseline}
            onOpenDashboard={() => {
              if (typeof window !== 'undefined') {
                window.open('/dashboard', '_blank', 'noopener,noreferrer');
              }
              dispatch({ type: 'NAVIGATE', scr: 'conversation' });
              dispatch({ type: 'SEND_ASKED', text: nextStepText(st.fin, st.baseline!) });
            }}
            onKeepTalking={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
            tc={tc}
            fp={fp}
          />
        </div>
      )}
    </>
  );

  const renderDashboard = () =>
    !st.baseline ? (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padY) var(--padX)' }}>
        <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 12, textAlign: 'center' }}>
          <h1 className="srOnly">Dashboard</h1>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Dashboard not ready yet</div>
          <div style={{ color: 'var(--ink2)', lineHeight: 1.7 }}>
            Once Atlas has a baseline strategy, your dashboard will populate automatically.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            <Button onClick={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })} variant="primary" size="md">
              Go to conversation →
            </Button>
          </div>
        </div>
      </div>
    ) : user ? (
      <div style={{ minHeight: '100dvh', padding: 'var(--padY) var(--padX)', background: 'var(--bg)' }}>
        <CompanionDashboard userId={userId} token={token} />
      </div>
    ) : (
      <DashboardScreen
        theme={theme ?? 'dark'}
        onToggleTheme={toggleTheme}
        apiErr={st.apiErr}
        apiStatus={apiStatus}
        fin={st.fin}
        baseline={st.baseline}
        onTalk={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
        onStrategy={() => dispatch({ type: 'NAVIGATE', scr: 'strategy' })}
        onSettings={() => dispatch({ type: 'NAVIGATE', scr: 'settings' })}
        fc={fc}
        fp={fp}
        getMetricExplainer={metricExplainerText}
        outcomeMetrics={outcomeMetrics}
      />
    );

  const renderPlan = () => {
    if (!st.baseline) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padY) var(--padX)' }}>
          <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 12, textAlign: 'center' }}>
            <h1 className="srOnly">Plan</h1>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Plan not ready yet</div>
            <div style={{ color: 'var(--ink2)', lineHeight: 1.7 }}>
              Once Atlas has a baseline strategy, your plan will populate automatically.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <Button onClick={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })} variant="primary" size="md">
                Go to conversation →
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (st.scr === 'strategy') {
      return (
        <StrategyScreen
          theme={theme ?? 'dark'}
          onToggleTheme={toggleTheme}
          apiErr={st.apiErr}
          apiStatus={claude.status}
          baseline={st.baseline}
          onBack={() => dispatch({ type: 'NAVIGATE', scr: 'dashboard' })}
          onAsk={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
          tc={tc}
        />
      );
    }
    return (
      <PlanScreen
        theme={theme ?? 'dark'}
        onToggleTheme={toggleTheme}
        apiErr={st.apiErr}
        apiStatus={claude.status}
        baseline={st.baseline}
        onRefine={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
      />
    );
  };

  const renderSettings = () => (
    <SettingsScreen
      theme={theme ?? 'dark'}
      onToggleTheme={toggleTheme}
      apiErr={st.apiErr}
      apiStatus={claude.status}
      onThemeLight={() => setTheme('light')}
      onThemeDark={() => setTheme('dark')}
      speakReplies={speakReplies}
      onToggleSpeakReplies={() => {
        const v = !speakReplies;
        setSpeakReplies(v);
        void db.set('prefs', { k: 'speakReplies', v });
        if (!v) voice.stopSpeak();
      }}
      voiceAutoSend={voiceAutoSend}
      onToggleVoiceAutoSend={() => {
        const v = !voiceAutoSend;
        setVoiceAutoSend(v);
        void db.set('prefs', { k: 'voiceAutoSend', v });
      }}
      replayEnabled={replayEnabled}
      onToggleReplayEnabled={() => {
        const v = !replayEnabled;
        setReplayEnabled(v);
        void db.set('prefs', { k: 'replayEnabled', v });
      }}
      onDeleteLocalData={() => {
        void (async () => {
          await db.nuke();
          dispatch({ type: 'RESET' });
        })();
      }}
      onBackToDashboard={() => dispatch({ type: 'NAVIGATE', scr: 'dashboard' })}
      canBackToDashboard={!!st.baseline}
      language={language}
      onLanguageChange={(lang: SupportedLanguage) => {
        setLanguage(lang);
        void db.set('prefs', { k: 'language', v: lang });
        try {
          window.localStorage.setItem('atlas:language', lang);
        } catch {
          // ignore
        }
      }}
    />
  );

  const showTabs = isMobile && st.scr !== 'landing';
  const tabTarget = (tab: typeof activeTab) => tabStacksRef.current[tab];
  const talkScr = showTabs ? tabTarget('talk') : st.scr;
  const talkVisible = showTabs
    ? activeTab === 'talk'
    : st.scr === 'conversation' || st.scr === 'summary' || st.scr === 'tier';

  const appContent = (
    <div
      data-atlas-ready={mounted ? 'true' : 'false'}
      data-restored={restored ? 'true' : 'false'}
      data-mounted={mounted ? 'true' : 'false'}
      style={{ minHeight: '100vh', background: 'var(--bg)' }}
    >
      {/* Fix 5b: Display auth error message when session expires */}
      {authError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 max-w-md text-center">
          {authError}
        </div>
      )}

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            markOnboardingComplete();
            setShowOnboarding(false);
          }}
        />
      )}

      {st.scr === 'landing' && <LandingScreen theme={theme ?? 'dark'} onToggleTheme={toggleTheme} onStart={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })} />}

      {/* Render sidebar and conversation together for authenticated users */}
      {user && st.scr === 'conversation' && (
        <div style={{ display: 'flex', height: '100vh' }}>
          {/* Mobile hamburger button */}
          <button
            onClick={() => setShowSidebar(s => !s)}
            className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          
          {/* Sidebar - hidden on mobile, visible on md+ screens */}
          <div className={`${showSidebar ? 'flex' : 'hidden'} md:flex w-[280px] flex-shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto bg-slate-50 dark:bg-slate-900`} style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
            <ConversationSidebar
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onNewConversation={() => dispatch({ type: 'NEW_CONVERSATION' })}
              userId={userId}
              token={token}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {renderTalkStack(talkScr)}
          </div>
        </div>
      )}

      {/* Render conversation without sidebar for guests or non-conversation screens */}
      {(!user || st.scr !== 'conversation') && (
        <div style={{ display: talkVisible ? 'block' : 'none' }}>{renderTalkStack(talkScr)}</div>
      )}

      {showTabs ? (
        <>
          <div style={{ display: activeTab === 'plan' ? 'block' : 'none' }}>{renderPlan()}</div>
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>{renderDashboard()}</div>
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>{renderSettings()}</div>

          <div className="atlasTabBar" role="tablist" aria-label="Primary">
            {([
              { id: 'talk', label: 'Talk', icon: MessageSquare },
              { id: 'plan', label: 'Plan', icon: LayoutList },
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={tab.label}
                  className={["atlasTabBtn", isActive ? "atlasTabBtnActive" : ""].filter(Boolean).join(' ')}
                  onClick={() => {
                    if (activeTab === 'talk' && tab.id !== 'talk') {
                      captureDraftFromDom();
                      persistDraft();
                    }
                    setActiveTab(tab.id);
                    dispatch({ type: 'NAVIGATE', scr: tabTarget(tab.id) });
                  }}
                >
                  <Icon size={18} aria-hidden />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {st.scr === 'dashboard' && renderDashboard()}
          {(st.scr === 'plan' || st.scr === 'strategy') && renderPlan()}
          {st.scr === 'settings' && renderSettings()}
        </>
      )}
    </div>
  );

  return (
    <ErrorBoundary>
      {appContent}
    </ErrorBoundary>
  );
}
