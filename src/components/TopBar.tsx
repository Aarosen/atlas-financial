import type { ReactNode } from 'react';
import type { ClaudeApiStatus } from '@/lib/api/client';
import type { SupportedLanguage } from '@/lib/ai/slangMapper';
import { Moon, Sun } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { LanguageSelector } from '@/components/LanguageSelector';

function Logo() {
  return (
    <button
      onClick={() => window.location.href = '/'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        color: 'inherit',
        fontSize: 'inherit',
        fontFamily: 'inherit',
      }}
      aria-label="Atlas - Go to home"
      title="Go to home"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M12 2.8c5.08 0 9.2 4.12 9.2 9.2 0 5.08-4.12 9.2-9.2 9.2-5.08 0-9.2-4.12-9.2-9.2 0-5.08 4.12-9.2 9.2-9.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.9"
        />
        <path d="M12 6.2 6.8 17.8h10.4L12 6.2Z" fill="currentColor" opacity="0.9" />
      </svg>
      <span style={{ fontWeight: 950, letterSpacing: '-0.02em' }}>Atlas</span>
    </button>
  );
}

function StatusPill({ apiErr, status }: { apiErr: string | null; status: ClaudeApiStatus }) {
  if (apiErr && (apiErr.toLowerCase().includes('api not configured') || apiErr.toLowerCase().includes('not configured'))) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--amber-lt)', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(194,115,10,.2)' }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--amber)', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 800 }}>API not configured</span>
      </div>
    );
  }

  if (status === 'online') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--green-lt)', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(46,125,82,.2)' }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--green)', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 800 }}>Atlas AI active</span>
      </div>
    );
  }

  if (status === 'degraded') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--amber-lt)', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(194,115,10,.2)' }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--amber)', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 800 }}>AI degraded</span>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--amber-lt)', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(194,115,10,.2)' }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--amber)', display: 'inline-block' }} />
        <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 800 }}>AI offline</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg2)', borderRadius: 999, padding: '6px 12px', border: '1px solid var(--bdr)' }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink3)', display: 'inline-block', opacity: 0.6 }} />
      <span style={{ fontSize: 11, color: 'var(--ink2)', fontWeight: 800 }}>AI status unknown</span>
    </div>
  );
}

export function TopBar({
  title,
  theme,
  onToggleTheme,
  apiErr,
  apiStatus,
  language,
  onLanguageChange,
}: {
  title: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiErr: string | null;
  apiStatus: ClaudeApiStatus;
  language?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}) {
  // TASK 2.5: Clean conversation header - only show logo on left, controls on right
  // Remove redundant title label and simplify status display
  const showStatusBadge = apiStatus === 'offline' || apiStatus === 'degraded' || apiErr;
  
  return (
    <div className="atlasHeader">
      <div className="atlasHeaderInner">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Logo />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {language && onLanguageChange && (
          <LanguageSelector currentLanguage={language} onLanguageChange={onLanguageChange} />
        )}
        {showStatusBadge && <StatusPill apiErr={apiErr} status={apiStatus} />}
        <IconButton onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title="Theme">
          {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </IconButton>
      </div>
      </div>
    </div>
  );
}

export function ScreenWrap({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>{children}</div>;
}
