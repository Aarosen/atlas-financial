import { ScreenWrap } from '@/components/TopBar';

export function LandingScreen({
  theme,
  onToggleTheme,
  onStart,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onStart: () => void;
}) {
  return (
    <ScreenWrap>
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(28px, var(--padY)) var(--padX)' }}>
        <div style={{ width: '100%', maxWidth: 720, textAlign: 'center' }}>
          <h1 style={{ fontSize: 'var(--fsHero)', lineHeight: 1.06, margin: 0, letterSpacing: '-0.03em' }}>The clarity you’ve always wanted about your money.</h1>
          <p style={{ margin: '18px auto 0', maxWidth: 560, color: 'var(--ink2)', lineHeight: 1.7, fontSize: 16 }}>
            Atlas talks with you, understands your real situation, and gives you one clear step forward — like a brilliant friend who genuinely cares about your future.
          </p>

          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={onStart} style={{ background: 'linear-gradient(135deg,var(--teal),var(--sky))', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 22px', fontWeight: 800, cursor: 'pointer' }}>
              Let’s talk with Atlas →
            </button>
            <button
              onClick={onToggleTheme}
              style={{ background: 'transparent', border: '1px solid var(--bdr2)', borderRadius: 16, padding: '14px 18px', fontWeight: 700, cursor: 'pointer', color: 'var(--ink2)' }}
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>

          <div style={{ marginTop: 26, color: 'var(--ink3)', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div>🔒 No bank sync</div>
            <div>📱 Stays on your device</div>
            <div>🎯 One step at a time</div>
            <div>💬 Real conversation</div>
          </div>
        </div>
      </div>
    </ScreenWrap>
  );
}
