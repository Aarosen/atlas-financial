import { useState } from 'react';
import { motion } from 'framer-motion';
import { ScreenWrap } from '@/components/TopBar';
import { Button } from '@/components/Buttons';
import { Lock, MessageSquare, Smartphone, Target, X } from 'lucide-react';
import { PageContainer, Stack } from '@/components/Layout';
import { MagicLinkAuth } from '@/components/MagicLinkAuth';

export function LandingScreen({
  theme,
  onToggleTheme,
  onStart,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onStart: () => void;
}) {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <ScreenWrap>
      <PageContainer
        maxWidth={720}
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 'max(20px, var(--padY))',
          paddingBottom: 'max(20px, var(--padY))',
          textAlign: 'center',
        }}
      >
        {/* TASK 2.1: Fix hero vertical spacing - reduce gaps between sections */}
        {/* TASK 3.19: Hero stagger animation */}
        {/* TASK 2.6: Add hero visual mockup */}
        <Stack gap={0}>
          <h1 className="srOnly">Atlas landing</h1>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ fontSize: 'var(--fsHero)', lineHeight: 1.06, margin: 0, letterSpacing: '-0.03em' }}
          >
            The clarity you've always wanted about your money.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            style={{ margin: '14px auto 0', maxWidth: 560, color: 'var(--ink2)', lineHeight: 1.7, fontSize: 16 }}
          >
            Atlas talks with you, understands your real situation, and gives you one clear step forward — like a brilliant friend who genuinely cares about your future.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            style={{
              marginTop: 28,
              marginBottom: 24,
              width: '100%',
              maxWidth: 500,
              margin: '28px auto 24px',
              padding: '20px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, var(--bg2) 0%, var(--bg) 100%)',
              border: '1px solid var(--bdr)',
              boxShadow: 'var(--sh2)',
            }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--bdr)' }}>
                <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 600, marginBottom: 6 }}>MONTHLY SURPLUS</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--teal)' }}>$1,240</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--bdr)' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600 }}>Emergency Fund</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>$4,500 target</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--card)', border: '1px solid var(--bdr)' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600 }}>Debt Payoff</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', marginTop: 4 }}>18 months</div>
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--teal-lt)', border: '1px solid var(--teal)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Next step: Build emergency fund to $4,500</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            style={{
              marginTop: 20,
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Button onClick={onStart} variant="primary" size="md" style={{ width: '100%', maxWidth: 280 }}>
              Start a conversation →
            </Button>
            <Button onClick={() => setShowAuth(true)} variant="secondary" size="md" style={{ width: '100%', maxWidth: 280 }}>
              Log in
            </Button>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            style={{ marginTop: 12, fontSize: 13, color: 'var(--ink3)' }}
          >
            New to Atlas? Just start a conversation — no account needed.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
            style={{ marginTop: 20, color: 'var(--ink3)', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Lock size={16} aria-hidden />
              No bank sync
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Smartphone size={16} aria-hidden />
              Works across devices
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} aria-hidden />
              One step at a time
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={16} aria-hidden />
              Real conversation
            </div>
          </motion.div>
        </Stack>
      </PageContainer>

      {showAuth && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAuth(false)}
        >
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 12,
              padding: 32,
              maxWidth: 400,
              width: '90%',
              position: 'relative',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAuth(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink2)',
              }}
            >
              <X size={20} />
            </button>

            <MagicLinkAuth onAuthSuccess={() => setShowAuth(false)} />
          </div>
        </div>
      )}
    </ScreenWrap>
  );
}
