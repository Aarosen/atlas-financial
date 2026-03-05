import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { ButtonLink } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { Grid, Inline, PageContainer, Stack } from '@/components/Layout';

export default function Page() {
  return (
    <PageContainer className="page animIn" maxWidth={1120}>
      <Stack gap={0}>
        <Badge>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: 'linear-gradient(135deg,var(--teal),var(--sky))', display: 'inline-block' }} />
          How it works
        </Badge>

        <h1 className="h2" style={{ marginTop: 16 }}>A simple flow that keeps you calm.</h1>
        <p className="lead" style={{ maxWidth: 860 }}>
          Atlas is designed to feel like a trusted friend with financial depth: warm when you need warmth, analytical when you want numbers, and always focused on one next step.
        </p>

        <Inline style={{ marginTop: 22 }} gap={12}>
          <ButtonLink href="/conversation" variant="primary" style={{ boxShadow: 'var(--sh3)' }}>
            Start a conversation →
          </ButtonLink>
          <ButtonLink href="/privacy" variant="secondary">
            Privacy & data
          </ButtonLink>
        </Inline>
      </Stack>

      <div className="grid" style={{ marginTop: 26 }}>
        {[
          {
            n: '01',
            t: 'Talk like a human',
            d: 'Tell Atlas what’s going on. Rough numbers are completely fine—clarity beats perfection.',
          },
          {
            n: '02',
            t: 'Capture the essentials',
            d: 'Atlas pulls out the minimum facts needed to be useful (income, essentials, buffer, debt) and nothing more.',
          },
          {
            n: '03',
            t: 'Choose the right tier',
            d: 'A tier isn’t a label—it’s a decision framework so advice fits your reality right now.',
          },
          {
            n: '04',
            t: 'Pick one lever',
            d: 'Atlas recommends one high-impact move so you can make progress without feeling overwhelmed.',
          },
          {
            n: '05',
            t: 'Repeat gently',
            d: 'As your life changes, the “one next step” changes too. You stay in control the whole time.',
          },
        ].map((x) => (
          <Grid key={x.n} className="card lift" columns="72px 1fr" gap={14}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,var(--teal),color-mix(in srgb, var(--teal) 40%, var(--sky)))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 950 }}>
              {x.n}
            </div>
            <div>
              <div style={{ fontWeight: 980, letterSpacing: '-0.02em', fontSize: 16 }}>{x.t}</div>
              <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.8 }}>{x.d}</div>
            </div>
          </Grid>
        ))}
      </div>

      <div className="gridCards" style={{ marginTop: 26 }}>
        {[
          { t: 'No bank login required', d: 'Atlas doesn’t need your bank credentials to help you get unstuck.' },
          { t: 'You’re in control', d: 'You can share as little or as much as you want. Atlas works with what you provide.' },
          { t: 'Honest about uncertainty', d: 'If something is unclear, Atlas will ask—not guess.' },
        ].map((x) => (
          <Card key={x.t} className="lift">
            <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>{x.t}</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.8 }}>{x.d}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 26, background: 'var(--bg2)' }}>
        <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>Important</div>
        <div style={{ marginTop: 10, color: 'var(--ink2)', lineHeight: 1.9 }}>
          Atlas is built for clarity and confidence—not perfection. The goal is to help you choose one high-integrity move that makes your life feel lighter.
        </div>
        <div style={{ marginTop: 10, color: 'var(--ink3)', lineHeight: 1.8, fontSize: 13 }}>
          AI responses are powered by Claude.
        </div>
      </Card>

      <Inline style={{ marginTop: 26 }} gap={12}>
        <ButtonLink href="/conversation" variant="primary" style={{ boxShadow: 'var(--sh3)' }}>
          Try Atlas now →
        </ButtonLink>
        <ButtonLink href="/product" variant="secondary">
          Explore product
        </ButtonLink>
      </Inline>
    </PageContainer>
  );
}
