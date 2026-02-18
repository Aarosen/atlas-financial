'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/browserClient';

export function LoginClient() {
  const sp = useSearchParams();
  const nextPath = sp.get('next') || '/conversation';
  const queryErrorDesc = sp.get('error_description');
  const code = sp.get('code');

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!queryErrorDesc) return;
    setStatus('error');
    setErr(queryErrorDesc);
  }, [queryErrorDesc]);

  useEffect(() => {
    if (!code) return;
    setStatus('sending');
    setErr(null);
    void (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setStatus('error');
        setErr(error.message);
        return;
      }

      window.location.assign(nextPath);
    })();
  }, [code, nextPath, supabase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = window.location.hash;
    if (!h || h.length < 2) return;

    const hs = new URLSearchParams(h.slice(1));
    const he = hs.get('error');
    const hed = hs.get('error_description');

    if (he) {
      setStatus('error');
      setErr(hed || 'Email link is invalid or has expired.');
      return;
    }

    const hasToken = !!hs.get('access_token') || !!hs.get('refresh_token');
    if (!hasToken) return;

    setStatus('sending');
    void (async () => {
      const access_token = hs.get('access_token') || '';
      const refresh_token = hs.get('refresh_token') || '';
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        setStatus('error');
        setErr(error.message);
        return;
      }

      try {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } catch {
        // ignore
      }
      window.location.assign(nextPath);
    })();
  }, [nextPath, supabase]);

  const sendLink = async () => {
    const e = email.trim();
    if (!e) return;

    setStatus('sending');
    setErr(null);

    const origin = window.location.origin;
    const redirectTo = `${origin}/login?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatus('error');
      setErr(error.message);
      return;
    }

    setStatus('sent');
  };

  return (
    <div className="container page animIn" style={{ maxWidth: 720 }}>
      <div className="badge">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'linear-gradient(135deg,var(--teal),var(--sky))', display: 'inline-block' }} />
        Account
      </div>

      <h1 className="h2" style={{ marginTop: 16 }}>
        Sign in to continue.
      </h1>
      <p className="lead" style={{ maxWidth: 640 }}>
        Atlas uses an account so your conversation and progress sync securely across devices.
      </p>

      <div className="card" style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 950, letterSpacing: '-0.02em' }}>Email magic link</div>
        <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>We’ll email you a link to sign in. No password.</div>

        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            inputMode="email"
            autoComplete="email"
            className="input"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1.5px solid var(--bdr2)', background: 'var(--card)', color: 'var(--ink)' }}
          />

          <button
            onClick={() => void sendLink()}
            disabled={status === 'sending' || !email.trim()}
            className="btn btnPrimary"
            style={{ justifySelf: 'start', padding: '12px 14px', borderRadius: 14, fontWeight: 900, opacity: status === 'sending' ? 0.7 : 1 }}
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>

          {status === 'sent' && <div style={{ marginTop: 6, color: 'var(--ink2)', lineHeight: 1.7 }}>Check your email for a sign-in link.</div>}

          {status === 'error' && <div style={{ marginTop: 6, color: 'var(--amber)', fontWeight: 800 }}>{err || 'Could not send link.'}</div>}
        </div>
      </div>

      <div style={{ marginTop: 14, color: 'var(--ink3)', fontSize: 13, lineHeight: 1.6 }}>
        By continuing, you agree to our <Link href="/privacy" className="navLink">privacy approach</Link>.
      </div>

      <div style={{ marginTop: 18 }}>
        <Link href="/" className="btn btnSecondary">
          ← Back
        </Link>
      </div>
    </div>
  );
}
