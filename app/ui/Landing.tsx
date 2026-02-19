import Link from 'next/link';
import AtlasLogo from './AtlasLogo';
import { Lock, MessageSquare, Smartphone, Target } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ButtonLink } from '@/components/Buttons';
import { Grid, Inline, PageContainer, Stack } from '@/components/Layout';

export default function Landing() {
  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <PageContainer className="page animIn" maxWidth={1120}>
        <div className="grid2">
          <div>
            <Badge>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'linear-gradient(135deg,var(--teal),var(--sky))', display: 'inline-block' }} />
              Private, calm, human guidance
            </Badge>

            <h1 className="h1" style={{ marginTop: 16 }}>
              Clarity you can feel good about.
            </h1>
            <p className="lead" style={{ maxWidth: 600, marginTop: 16 }}>
              Atlas is a money mentor that talks with you, understands your real situation, and gives you one confident next step.
            </p>

            <Inline style={{ marginTop: 22 }} gap={12}>
              <ButtonLink href="/conversation" variant="primary" style={{ boxShadow: 'var(--sh3)' }}>
                Start a conversation →
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </Inline>

            <Inline style={{ marginTop: 18, color: 'var(--ink)', fontSize: 13, fontWeight: 700 }} gap={14}>
              <Inline gap={8} wrap={false}>
                <Lock size={16} aria-hidden />
                No bank sync
              </Inline>
              <Inline gap={8} wrap={false}>
                <Smartphone size={16} aria-hidden />
                Stays on your device
              </Inline>
              <Inline gap={8} wrap={false}>
                <Target size={16} aria-hidden />
                One step at a time
              </Inline>
              <Inline gap={8} wrap={false}>
                <MessageSquare size={16} aria-hidden />
                Real conversation
              </Inline>
            </Inline>
          </div>

          <Card className="cardLg lift" style={{ background: 'radial-gradient(1200px 600px at 10% 10%, color-mix(in srgb, var(--teal) 22%, transparent) 0%, transparent 56%), radial-gradient(900px 520px at 90% 30%, color-mix(in srgb, var(--sky) 18%, transparent) 0%, transparent 60%)' }}>
            <Card style={{ padding: 18 }}>
              <Inline gap={10}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg,var(--teal),color-mix(in srgb, var(--teal) 40%, var(--sky)))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: 'var(--sh1)',
                  }}
                >
                  <AtlasLogo size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 950, letterSpacing: '-0.02em' }}>Atlas</div>
                  <div style={{ color: 'var(--ink2)', fontSize: 12, fontWeight: 800 }}>Your financial companion</div>
                </div>
              </Inline>

              <Stack style={{ marginTop: 14 }} gap={10}>
                <div style={{ padding: '12px 14px', borderRadius: 18, background: 'var(--bg2)', border: '1px solid var(--bdr)', color: 'var(--ink1)', lineHeight: 1.6, fontWeight: 750 }}>
                  Tell me what’s going on with money right now.
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 18, background: 'linear-gradient(135deg,var(--teal),var(--sky))', color: '#fff', lineHeight: 1.6, fontWeight: 800, marginLeft: '14%' }}>
                  I feel behind. I make $5.5k/mo, rent is $2k, and I’ve got $4k in credit card debt.
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 18, background: 'var(--bg2)', border: '1px solid var(--bdr)', color: 'var(--ink1)', lineHeight: 1.6, fontWeight: 750 }}>
                  We can fix this. Let’s pick one lever: reduce the interest pressure, then build a buffer.
                </div>
              </Stack>

              <Grid style={{ marginTop: 14 }} gap={10} columns="repeat(3, minmax(0, 1fr))">
                {[
                  { l: 'Buffer', v: '1.2 mo' },
                  { l: 'Future', v: '9%' },
                  { l: 'Debt', v: 'Moderate' },
                ].map((x) => (
                  <div key={x.l} style={{ padding: '10px 12px', borderRadius: 16, border: '1px solid var(--bdr)', background: 'var(--card)' }}>
                    <div style={{ color: 'var(--ink2)', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em' }}>{x.l.toUpperCase()}</div>
                    <div style={{ marginTop: 6, fontWeight: 980, letterSpacing: '-0.02em' }}>{x.v}</div>
                  </div>
                ))}
              </Grid>
            </Card>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
