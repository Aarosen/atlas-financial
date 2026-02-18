import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { ButtonLink } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { Inline, PageContainer, Stack } from '@/components/Layout';

export default function Page() {
  return (
    <PageContainer className="page animIn" maxWidth={1120}>
      <Badge>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'linear-gradient(135deg,var(--teal),var(--sky))', display: 'inline-block' }} />
        Product
      </Badge>

      <h1 className="h2" style={{ marginTop: 16 }}>
        A calmer way to get good with money.
      </h1>
      <p className="lead" style={{ maxWidth: 820 }}>
        Atlas turns messy real life into one confident next step. No bank connections. No shame. Just a practical plan we build together—through conversation.
      </p>

      <Inline style={{ marginTop: 22 }} gap={12}>
        <ButtonLink href="/conversation" variant="primary" style={{ boxShadow: 'var(--sh3)' }}>
          Start a conversation →
        </ButtonLink>
        <ButtonLink href="/how-it-works" variant="secondary">
          See how it works
        </ButtonLink>
      </Inline>

      <div className="gridCards" style={{ marginTop: 30 }}>
        {[
          { t: 'Private by default', d: 'Your financial state stays on your device. You control what you share and when.' },
          { t: 'Conversation-led', d: 'We start with your story. Rough numbers are fine. Atlas listens, then helps you simplify.' },
          { t: 'One lever at a time', d: 'A single move that matters most right now—so you don’t get overwhelmed.' },
          { t: 'Trust-first tone', d: 'Warm, direct guidance that respects your autonomy and avoids guilt or fear.' },
          { t: 'Clarity, not complexity', d: 'You’ll see buffer, debt pressure, and a clear baseline—without a spreadsheet marathon.' },
          { t: 'Built for real humans', d: 'Designed for anxious, busy, ambitious people who still want to feel steady.' },
        ].map((x) => (
          <Card key={x.t} className="lift">
            <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>{x.t}</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{x.d}</div>
          </Card>
        ))}
      </div>

      <Card className="cardLg" style={{ marginTop: 34 }}>
        <div style={{ fontWeight: 980, letterSpacing: '-0.02em', fontSize: 18 }}>What you get</div>
        <Stack style={{ marginTop: 12, color: 'var(--ink2)', lineHeight: 1.85 }} gap={10}>
          <div>
            <strong>1.</strong> A clear baseline of where you stand (buffer, debt pressure, essentials).
          </div>
          <div>
            <strong>2.</strong> A tier that matches your reality—so advice fits your moment.
          </div>
          <div>
            <strong>3.</strong> One confident next lever to pull—with the why, not just the what.
          </div>
          <div>
            <strong>4.</strong> A calmer plan you can actually follow—because it’s sized to your capacity.
          </div>
        </Stack>
      </Card>

      <Card style={{ marginTop: 18, background: 'var(--bg2)' }}>
        <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>What Atlas won’t do</div>
        <Stack style={{ marginTop: 10, color: 'var(--ink2)', lineHeight: 1.85 }} gap={8}>
          <div>It won’t ask you to connect your bank.</div>
          <div>It won’t pretend there’s one “correct” path for everyone.</div>
          <div>It won’t overwhelm you with a 27-step plan on day one.</div>
        </Stack>
      </Card>

      <Inline style={{ marginTop: 26 }} gap={12}>
        <ButtonLink href="/conversation" variant="primary" style={{ boxShadow: 'var(--sh3)' }}>
          Try Atlas now →
        </ButtonLink>
        <ButtonLink href="/privacy" variant="secondary">
          Read privacy
        </ButtonLink>
      </Inline>
    </PageContainer>
  );
}
