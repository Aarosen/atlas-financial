import type { FinancialState } from '../state/types';
import type { SupportedLanguage } from '@/lib/ai/slangMapper';

export type ClaudeApiStatus = 'unknown' | 'online' | 'degraded' | 'offline';

export class ClaudeClient {
  private ep = '/api/chat';
  private _apiStatus: ClaudeApiStatus = 'unknown';
  private _hadSuccess = false;
  private _lastErrorStatus: number | null = null;
  private _userId: string | null = null;
  private _sessionId: string | null = null;

  // Set userId and sessionId for companion features
  setUserContext(userId: string | null, sessionId: string | null) {
    this._userId = userId;
    this._sessionId = sessionId;
  }

  async statusCheck(): Promise<{ configured: boolean } | null> {
    try {
      const r = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!r.ok) {
        this._lastErrorStatus = r.status;
        this._setStatusFromHttpError(r.status);
        return null;
      }
      const d = await r.json().catch(() => ({}));
      // If the status endpoint is reachable and configured, we consider AI "online".
      if (d?.configured) {
        this._hadSuccess = true;
        this._apiStatus = 'online';
        this._lastErrorStatus = null;
        return { configured: true };
      }
      this._apiStatus = 'unknown';
      return null;
    } catch {
      // Network / fetch failure.
      this._apiStatus = this._hadSuccess ? 'offline' : 'offline';
      return null;
    }
  }

  async extract(msg: string, _ctx: Partial<FinancialState> = {}, opts?: { language?: SupportedLanguage; lastQuestion?: string }) {
    try {
      // TASK 1.1: Add 15-second timeout to prevent indefinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const r = await fetch(this.ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'extract', 
            messages: [{ role: 'user', content: msg }], 
            language: opts?.language, 
            lastQuestion: opts?.lastQuestion,
            userId: this._userId,
            sessionId: this._sessionId,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!r.ok) {
          this._lastErrorStatus = r.status;
          this._setStatusFromHttpError(r.status);
          const t = await r.text().catch(() => '');
          throw new Error(t || `proxy_error_${r.status}`);
        }
        const d = await r.json();
        if (d.error) {
          this._lastErrorStatus = null;
          if (this._hadSuccess) this._apiStatus = 'degraded';
          throw new Error(d.error);
        }
        this._hadSuccess = true;
        this._apiStatus = 'online';
        this._lastErrorStatus = null;
        return { fields: (d.fields || {}) as Record<string, unknown>, src: 'claude', apiOk: true as const };
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (e: any) {
      if (!this._hadSuccess) {
        this._apiStatus = 'unknown';
      } else if (this._lastErrorStatus === null) {
        this._apiStatus = 'offline';
      }
      const fb = this._fallback(msg);
      return { ...fb, apiOk: false as const, err: String(e?.message || 'api_error') };
    }
  }

  async answerStream(args: {
    msgs: Array<{ role: 'user' | 'assistant'; content: string }>;
    question: string;
    onDelta: (t: string) => void;
    signal?: AbortSignal;
    mode?: 'short' | 'explain';
    memorySummary?: string | null;
    fin?: Partial<FinancialState> | null;
    language?: SupportedLanguage;
  }): Promise<{ ok: boolean; canceled: boolean; sessionId?: string; rateLimitRemaining?: number }> {
    const { question, onDelta, signal, mode, memorySummary, fin } = args;
    const slow = String(question || '').toLowerCase().includes('slowstream');
    const type = mode === 'explain' ? 'answer_explain_stream' : 'answer_stream';
    
    // Create AbortController with 30s timeout, combined with caller's signal
    const timeoutCtrl = new AbortController();
    const timeoutId = setTimeout(() => timeoutCtrl.abort(), 30_000);
    const combinedSignal = AbortSignal.any([timeoutCtrl.signal, signal || new AbortController().signal]);
    
    try {
      const r = await fetch(this.ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          messages: args.msgs, 
          question, 
          memorySummary, 
          fin: fin ?? null, 
          language: args.language,
          userId: this._userId,
          sessionId: this._sessionId,
        }),
        signal: combinedSignal,
      });

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        this._lastErrorStatus = r.status;
        this._setStatusFromHttpError(r.status);
        throw new Error(t || `proxy_error_${r.status}`);
      }

      if (!r.body) throw new Error('stream_missing_body');

      const _rl = parseInt(r.headers.get('X-RateLimit-Remaining') ?? '', 10);
      const rlRemaining: number | undefined = Number.isFinite(_rl) ? _rl : undefined;

      const dec = new TextDecoder();
      const reader = r.body.getReader();
      let carry = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        carry += dec.decode(value, { stream: true });

        while (true) {
          const idx = carry.indexOf('\n\n');
          if (idx < 0) break;
          const frame = carry.slice(0, idx);
          carry = carry.slice(idx + 2);
          const lines = frame.split('\n');

          for (const ln of lines) {
            if (!ln.startsWith('data:')) continue;
            const payload = ln.slice(5).trim();
            if (!payload) continue;
            try {
              const j = JSON.parse(payload);
              if (slow) {
                await new Promise((r) => setTimeout(r, 600));
                if (signal?.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
              }
              if (typeof j?.delta === 'string' && j.delta) onDelta(j.delta);
              if (j?.done) {
                this._hadSuccess = true;
                this._apiStatus = 'online';
                this._lastErrorStatus = null;
                // Capture sessionId from response if present
                if (j?.sessionId && !this._sessionId) {
                  this._sessionId = j.sessionId;
                }
                try {
                  reader.releaseLock();
                } catch {
                  // ignore
                }
                clearTimeout(timeoutId);
                return { ok: true, canceled: false, sessionId: j?.sessionId, rateLimitRemaining: rlRemaining };
              }
            } catch (frameErr: any) {
              if (frameErr?.name === 'AbortError') throw frameErr;
              // ignore other errors (e.g. JSON parse errors)
            }
          }
        }
      }

      this._hadSuccess = true;
      this._apiStatus = 'online';
      this._lastErrorStatus = null;
      clearTimeout(timeoutId);
      return { ok: true, canceled: false, rateLimitRemaining: rlRemaining };
    } catch (e: any) {
      clearTimeout(timeoutId);
      const canceled = String(e?.name || '').toLowerCase() === 'aborterror';
      if (!this._hadSuccess) {
        this._apiStatus = 'unknown';
      } else if (this._lastErrorStatus === null) {
        this._apiStatus = 'offline';
      }
      return { ok: false, canceled };
    }
  }

  async chatStream(args: {
    msgs: Array<{ role: 'user' | 'assistant'; content: string }>;
    missing: string[];
    onDelta: (t: string) => void;
    onSessionState?: (state: any) => void;
    onReplace?: (text: string) => void;
    signal?: AbortSignal;
    memorySummary?: string | null;
    fin?: Partial<FinancialState> | null;
    extractedFields?: Record<string, unknown>;
    sessionState?: Record<string, any>;
    answered?: Record<string, boolean>;
    language?: SupportedLanguage;
    baseline?: any | null;
  }): Promise<{ ok: boolean; canceled: boolean; sessionId?: string; rateLimitRemaining?: number }> {
    const { msgs, missing, onDelta, onSessionState, onReplace, signal, memorySummary, fin, extractedFields, sessionState, answered, language, baseline } = args;
    
    // Create a timeout abort controller (30 second timeout for chat streaming)
    const TIMEOUT_MS = 30_000;
    const timeoutCtrl = new AbortController();
    const timeoutId = setTimeout(() => timeoutCtrl.abort(), TIMEOUT_MS);
    
    // Combine caller's signal (if present) and timeout signal
    const signals = [signal, timeoutCtrl.signal].filter(Boolean) as AbortSignal[];
    const combinedSignal = signals.length > 1 ? AbortSignal.any(signals) : signals[0];
    
    try {
      const r = await fetch(this.ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          messages: msgs,
          missing,
          memorySummary: memorySummary ?? null,
          fin: fin ?? null,
          extractedFields: extractedFields ?? null,
          sessionState: sessionState ?? {},
          answered: answered ?? {},
          language,
          baseline: baseline ?? null,
          userId: this._userId,
          sessionId: this._sessionId,
        }),
        signal: combinedSignal,
      });

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        this._lastErrorStatus = r.status;
        this._setStatusFromHttpError(r.status);
        throw new Error(t || `proxy_error_${r.status}`);
      }

      if (!r.body) throw new Error('stream_missing_body');

      const _rl = parseInt(r.headers.get('X-RateLimit-Remaining') ?? '', 10);
      const rlRemaining: number | undefined = Number.isFinite(_rl) ? _rl : undefined;

      const dec = new TextDecoder();
      const reader = r.body.getReader();
      let carry = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        carry += dec.decode(value, { stream: true });

        while (true) {
          const idx = carry.indexOf('\n\n');
          if (idx < 0) break;
          const frame = carry.slice(0, idx);
          carry = carry.slice(idx + 2);
          const lines = frame.split('\n');

          for (const ln of lines) {
            if (!ln.startsWith('data:')) continue;
            const payload = ln.slice(5).trim();
            if (!payload) continue;
            try {
              const j = JSON.parse(payload);
              // Handle session state events
              if (j?.type === 'session_state' && onSessionState) {
                onSessionState(j.state);
              }
              // Handle replace event (final cleaned response from server)
              if (j?.type === 'replace' && typeof j?.text === 'string') {
                onReplace?.(j.text);
              }
              // Handle text deltas
              if (typeof j?.delta === 'string' && j.delta) {
                onDelta(j.delta);
              }
              if (j?.done) {
                this._hadSuccess = true;
                this._apiStatus = 'online';
                this._lastErrorStatus = null;
                // Capture sessionId from response if present
                if (j?.sessionId && !this._sessionId) {
                  this._sessionId = j.sessionId;
                }
                try {
                  reader.releaseLock();
                } catch {
                  // ignore
                }
                clearTimeout(timeoutId);
                return { ok: true, canceled: false, sessionId: j?.sessionId, rateLimitRemaining: rlRemaining };
              }
            } catch (frameErr: any) {
              if (frameErr?.name === 'AbortError') throw frameErr;
              // ignore other errors (e.g. JSON parse errors)
            }
          }
        }
      }

      this._hadSuccess = true;
      this._apiStatus = 'online';
      this._lastErrorStatus = null;
      clearTimeout(timeoutId);
      return { ok: true, canceled: false, rateLimitRemaining: rlRemaining };
    } catch (e: any) {
      clearTimeout(timeoutId);
      const canceled = String(e?.name || '').toLowerCase() === 'aborterror';
      if (!this._hadSuccess) {
        this._apiStatus = 'unknown';
      } else if (this._lastErrorStatus === null) {
        this._apiStatus = 'offline';
      }
      return { ok: false, canceled };
    }
  }

  async chat(
    msgs: Array<{ role: 'user' | 'assistant'; content: string }>,
    missing: string[],
    args?: { memorySummary?: string | null; fin?: Partial<FinancialState> | null; language?: SupportedLanguage }
  ) {
    try {
      // TASK 1.1: Add 15-second timeout to prevent indefinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const r = await fetch(this.ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'chat',
            messages: msgs,
            missing,
            memorySummary: args?.memorySummary ?? null,
            fin: args?.fin ?? null,
            language: args?.language,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!r.ok) {
          const t = await r.text().catch(() => '');
          this._lastErrorStatus = r.status;
          this._setStatusFromHttpError(r.status);
          throw new Error(t || `proxy_error_${r.status}`);
        }
        const d = await r.json();
        if (d.error) throw new Error(d.error);
        this._hadSuccess = true;
        this._apiStatus = 'online';
        this._lastErrorStatus = null;
        return (d.text as string) || this._fallbackQuestion(missing[0]);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch {
      if (!this._hadSuccess) {
        this._apiStatus = 'unknown';
      } else if (this._lastErrorStatus === null) {
        this._apiStatus = 'offline';
      }
      return this._fallbackQuestion(missing[0]);
    }
  }

  async answer(
    msgs: Array<{ role: 'user' | 'assistant'; content: string }>,
    question: string,
    args?: { mode?: 'short' | 'explain'; memorySummary?: string | null; fin?: Partial<FinancialState> | null }
  ) {
    try {
      const type = args?.mode === 'explain' ? 'answer_explain' : 'answer';
      const r = await fetch(this.ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          messages: msgs,
          question,
          memorySummary: args?.memorySummary ?? null,
          fin: args?.fin ?? null,
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        this._lastErrorStatus = r.status;
        this._setStatusFromHttpError(r.status);
        throw new Error(t || `proxy_error_${r.status}`);
      }
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      this._hadSuccess = true;
      this._apiStatus = 'online';
      this._lastErrorStatus = null;
      return (d.text as string) || '';
    } catch {
      if (!this._hadSuccess) {
        this._apiStatus = 'unknown';
      } else if (this._lastErrorStatus === null) {
        this._apiStatus = 'offline';
      }
      return '';
    }
  }

  get status() {
    return this._apiStatus;
  }

  get lastErrorStatus() {
    return this._lastErrorStatus;
  }

  private _setStatusFromHttpError(status: number) {
    // Even before we have a successful call, an HTTP error is still a real signal.
    if (status === 429 || status >= 500) {
      this._apiStatus = 'degraded';
      return;
    }
    this._apiStatus = 'offline';
  }

  private _fallbackQuestion(f?: string) {
    const q: Record<string, string> = {
      monthlyIncome: "What's your monthly take-home income? A rough number is totally fine.",
      essentialExpenses: 'About how much goes to essentials each month — rent, groceries, utilities?',
      totalSavings: 'How much do you currently have saved? This helps me understand your safety net.',
      highInterestDebt: 'Do you carry any high-interest debt, like credit cards? Zero is perfectly fine.',
      lowInterestDebt: 'Any other loans — student debt, car loan?',
      primaryGoal: 'What matters most right now: stability, growth, flexibility?',
      riskTolerance: 'Do you prefer playing it safe, or are you comfortable with some risk for better long-term returns?',
    };
    return q[f || ''] || 'Tell me a bit more about your financial situation.';
  }

  private _fallback(t: string) {
    const x: Record<string, unknown> = {};
    const num = (s: string) => {
      const m = s.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:k|thousand)?/i);
      if (!m) return null;
      let v = parseFloat(m[1].replace(/,/g, ''));
      if (/k|thousand/i.test(m[0])) v *= 1000;
      return v;
    };

    [
      /(?:make|earn|salary|income|take.home|bring.in)[^\d$]*(\$?[\d,]+(?:\.\d+)?\s*(?:k|thousand)?)/i,
      /(\$?[\d,]+(?:\.\d+)?\s*(?:k|thousand)?)\s*(?:per.month|\/mo|a.month|monthly)/i,
    ].some((p) => {
      const m = t.match(p);
      if (m) {
        const v = num(m[1]);
        if (v && v > 500 && v < 1e6) {
          x.monthlyIncome = v;
          return true;
        }
      }
      return false;
    });

    if (/rent|essentials|bills|expenses/i.test(t)) {
      const m = t.match(/(?:spend|expense|rent|bill)[^\d$]*(\$?[\d,]+(?:\.\d+)?\s*(?:k|thousand)?)/i);
      if (m) {
        const v = num(m[1]);
        if (v && v > 100 && v < 1e6) x.essentialExpenses = v;
      }
    }

    [
      /(?:saved?|savings?|emergency)[^\d$]*(\$?[\d,]+(?:\.\d+)?\s*(?:k|thousand)?)/i,
      /(\$?[\d,]+(?:\.\d+)?\s*(?:k|thousand)?)\s*(?:saved?|in.savings)/i,
    ].some((p) => {
      const m = t.match(p);
      if (m) {
        const v = num(m[1]);
        if (v !== null && v >= 0) {
          x.totalSavings = v;
          return true;
        }
      }
      return false;
    });

    const hd = t.match(/(?:credit.card|high.interest)[^\d$]*(\$?[\d,]+(?:\.\d+)?\s*(?:k|thousand)?)/i);
    if (hd) {
      const v = num(hd[1]);
      if (v !== null && v >= 0) x.highInterestDebt = v;
    }

    const ld = t.match(/(?:student.loan|car.loan|mortgage)[^\d$]*(\$?[\d,]+(?:\.\d+)?\s*(?:k|thousand)?)/i);
    if (ld) {
      const v = num(ld[1]);
      if (v !== null && v >= 0) x.lowInterestDebt = v;
    }

    if (/no\s+(?:debt|loan|credit)|(?:debt|loan).free|zero\s+debt|no\s+(?:debt|loans?|credit)\s+(?:at\s+all|whatsoever|period)/i.test(t)) {
      if (!('highInterestDebt' in x)) x.highInterestDebt = 0;
      if (!('lowInterestDebt' in x)) x.lowInterestDebt = 0;
    }

    // Handle "no other debts" or "no student loans" etc. to set lowInterestDebt to 0
    if (/no\s+(?:other|additional)?\s*(?:debt|loan|student.loan|car.loan|mortgage)|don't\s+have\s+(?:any\s+)?(?:student|car|other)?\s*(?:debt|loan)/i.test(t)) {
      if (!('lowInterestDebt' in x)) x.lowInterestDebt = 0;
    }

    if (/no\s+savings?|zero\s+saved|nothing\s+saved/i.test(t)) x.totalSavings = 0;

    if (/stable|stability|secure|peace.of.mind/i.test(t)) x.primaryGoal = 'stability';
    else if (/wealth|retire|financial.independence|fire|f\.i\.r\.e|passive|early.retire/i.test(t)) x.primaryGoal = 'wealth_building';
    else if (/grow|invest|returns|portfolio/i.test(t)) x.primaryGoal = 'growth';
    else if (/flexib|freedom|liquid/i.test(t)) x.primaryGoal = 'flexibility';

    if (/cautious|conservative|risk.averse/i.test(t)) x.riskTolerance = 'cautious';
    else if (/aggressive|bold|high.risk/i.test(t)) x.riskTolerance = 'growth';
    else if (/balanced|moderate/i.test(t)) x.riskTolerance = 'balanced';

    return { fields: x, src: 'fallback' };
  }
}
