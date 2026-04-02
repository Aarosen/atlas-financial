import type { FinancialState } from './types';

export type ClaudeApiStatus = 'unknown' | 'online' | 'degraded' | 'offline';

export class Claude {
  private ep = '/api/chat';
  private _apiStatus: ClaudeApiStatus = 'unknown';
  private _hadSuccess = false;
  private _lastErrorStatus: number | null = null;

  async extract(msg: string, _ctx: Partial<FinancialState> = {}) {
    try {
      const r = await fetch(this.ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'extract', messages: [{ role: 'user', content: msg }] }),
      });
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

  async chat(msgs: Array<{ role: 'user' | 'assistant'; content: string }>, missing: string[]) {
    try {
      const r = await fetch(this.ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chat', messages: msgs, missing }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        this._lastErrorStatus = r.status;
        this._setStatusFromHttpError(r.status);
        throw new Error(t || `proxy_error_${r.status}`);
      }

      // Read SSE stream instead of JSON
      const reader = r.body?.getReader();
      if (!reader) throw new Error('no_stream');
      
      const dec = new TextDecoder();
      let fullText = '';
      let carry = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = dec.decode(value, { stream: true });
        carry += chunk;

        // Process complete SSE frames
        while (true) {
          const idx = carry.indexOf('\n\n');
          if (idx < 0) break;
          
          const frame = carry.slice(0, idx);
          carry = carry.slice(idx + 2);

          const lines = frame.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const j = JSON.parse(line.slice(6));
              if (j.delta) fullText += j.delta;
              if (j.done) break;
            } catch { /* ignore parse errors */ }
          }
        }
      }

      this._hadSuccess = true;
      this._apiStatus = 'online';
      this._lastErrorStatus = null;
      return fullText || this._fallbackQuestion(missing[0]);
    } catch {
      if (!this._hadSuccess) {
        this._apiStatus = 'unknown';
      } else if (this._lastErrorStatus === null) {
        this._apiStatus = 'offline';
      }
      return this._fallbackQuestion(missing[0]);
    }
  }

  async statusCheck() {
    try {
      const r = await fetch('/api/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!r.ok) {
        this._lastErrorStatus = r.status;
        this._setStatusFromHttpError(r.status);
        throw new Error(`status_check_failed_${r.status}`);
      }
      const d = await r.json();
      if (d.status === 'ok' && d.configured) {
        this._hadSuccess = true;
        this._apiStatus = 'online';
        this._lastErrorStatus = null;
      } else {
        this._apiStatus = 'offline';
      }
    } catch (e: any) {
      if (!this._hadSuccess) {
        this._apiStatus = 'unknown';
      } else if (this._lastErrorStatus === null) {
        this._apiStatus = 'offline';
      }
    }
  }

  get status() {
    return this._apiStatus;
  }

  get lastErrorStatus() {
    return this._lastErrorStatus;
  }

  private _setStatusFromHttpError(status: number) {
    if (!this._hadSuccess) {
      this._apiStatus = 'unknown';
      return;
    }
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

    if (/no\s+(?:debt|loan|credit)|(?:debt|loan).free|zero\s+debt/i.test(t)) {
      if (!('highInterestDebt' in x)) x.highInterestDebt = 0;
      if (!('lowInterestDebt' in x)) x.lowInterestDebt = 0;
    }

    if (/no\s+savings?|zero\s+saved|nothing\s+saved/i.test(t)) x.totalSavings = 0;

    if (/stable|stability|secure|peace.of.mind/i.test(t)) x.primaryGoal = 'stability';
    else if (/wealth|retire|financial.independence|FIRE|passive/i.test(t)) x.primaryGoal = 'wealth_building';
    else if (/grow|invest|returns|portfolio/i.test(t)) x.primaryGoal = 'growth';
    else if (/flexib|freedom|liquid/i.test(t)) x.primaryGoal = 'flexibility';

    if (/cautious|conservative|risk.averse/i.test(t)) x.riskTolerance = 'cautious';
    else if (/aggressive|bold|high.risk/i.test(t)) x.riskTolerance = 'growth';
    else if (/balanced|moderate/i.test(t)) x.riskTolerance = 'balanced';

    return { fields: x, src: 'fallback' };
  }
}
