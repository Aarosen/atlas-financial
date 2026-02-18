import { ScreenWrap } from '@/components/TopBar';
import { Button } from '@/components/Buttons';
import { Lock, MessageSquare, Smartphone, Target } from 'lucide-react';
import { PageContainer, Stack } from '@/components/Layout';

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
      <PageContainer
        maxWidth={720}
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 'max(28px, var(--padY))',
          paddingBottom: 'max(28px, var(--padY))',
          textAlign: 'center',
        }}
      >
        <Stack gap={0}>
          <h1 className="srOnly">Atlas landing</h1>
          <h1 style={{ fontSize: 'var(--fsHero)', lineHeight: 1.06, margin: 0, letterSpacing: '-0.03em' }}>The clarity you’ve always wanted about your money.</h1>
          <p style={{ margin: '18px auto 0', maxWidth: 560, color: 'var(--ink2)', lineHeight: 1.7, fontSize: 16 }}>
            Atlas talks with you, understands your real situation, and gives you one clear step forward — like a brilliant friend who genuinely cares about your future.
          </p>

          <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button onClick={onStart} variant="primary" size="md">
              Let’s talk with Atlas →
            </Button>
            <Button onClick={onToggleTheme} variant="secondary" size="md">
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </Button>
          </div>

          <div style={{ marginTop: 26, color: 'var(--ink3)', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Lock size={16} aria-hidden />
              No bank sync
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={16} aria-hidden />
              Stays on your device
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} aria-hidden />
              One step at a time
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={16} aria-hidden />
              Real conversation
            </div>
          </div>
        </Stack>
      </PageContainer>
    </ScreenWrap>
  );
}
