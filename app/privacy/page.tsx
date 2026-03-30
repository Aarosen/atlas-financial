import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { ButtonLink } from '@/components/Buttons';
import { Card } from '@/components/Card';
import { Inline, PageContainer } from '@/components/Layout';

export default function Page() {
  return (
    <PageContainer className="page animIn" maxWidth={1120}>
      <Badge>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'linear-gradient(135deg,var(--teal),var(--sky))', display: 'inline-block' }} />
        Privacy
      </Badge>

      <h1 className="h2" style={{ marginTop: 16 }}>Your data. Your control. Complete transparency.</h1>
      <p className="lead" style={{ maxWidth: 900 }}>
        Atlas is built to be honest about how your financial data is stored and used. Here's exactly what happens to your information.
      </p>

      <Inline style={{ marginTop: 22 }} gap={12}>
        <ButtonLink href="/conversation" variant="primary" style={{ boxShadow: 'var(--sh3)' }}>
          Start a conversation →
        </ButtonLink>
        <ButtonLink href="/product" variant="secondary">
          Back to product
        </ButtonLink>
      </Inline>

      <div className="grid" style={{ marginTop: 26 }}>
        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>Your data is stored securely in the cloud</div>
          <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            When you sign in and use Atlas, your goals, actions, conversations, and financial snapshots are stored in Supabase (a secure PostgreSQL database). This allows your data to persist across devices and sessions. Your data is encrypted in transit and at rest.
          </div>
        </Card>

        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>What data we store</div>
          <div style={{ marginTop: 8, display: 'grid', gap: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            <div>• Your email address and authentication token</div>
            <div>• Conversation messages and session history</div>
            <div>• Financial goals and action items you create</div>
            <div>• Financial snapshots (income, expenses, debt, savings)</div>
            <div>• Progress updates and milestone achievements</div>
          </div>
        </Card>

        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>What we don't store</div>
          <div style={{ marginTop: 8, display: 'grid', gap: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            <div>We don't ask for or store your bank login credentials.</div>
            <div>We don't connect to your bank accounts or import transactions.</div>
            <div>We don't sell your data to third parties.</div>
            <div>We don't require an account just to try Atlas (guests can chat without signing in).</div>
          </div>
        </Card>

        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>When AI is used</div>
          <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            Messages you type may be sent to Anthropic (Claude AI) to generate responses. Atlas only sends what you type for the current request. Your conversation history is stored in Atlas's database, not with Anthropic.
          </div>
        </Card>

        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>Your rights</div>
          <div style={{ marginTop: 8, display: 'grid', gap: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            <div>You can request to download all your data at any time.</div>
            <div>You can request to delete your account and all associated data.</div>
            <div>You can export your conversation history and financial goals.</div>
            <div>For deletion or export requests, contact us at privacy@atlasfinancial.com</div>
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 26, background: 'var(--bg2)' }}>
        <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>Transparency</div>
        <div style={{ marginTop: 10, color: 'var(--ink2)', lineHeight: 1.9 }}>
          Atlas is meant to be honest about uncertainty. If something is unclear, it should ask—not guess. If you ever want to reset, clear, or start fresh, you’re in control.
        </div>
      </Card>

      <Inline style={{ marginTop: 26 }} gap={12}>
        <ButtonLink href="/conversation" variant="primary" style={{ boxShadow: 'var(--sh3)' }}>
          Try Atlas now →
        </ButtonLink>
        <ButtonLink href="/how-it-works" variant="secondary">
          See how it works
        </ButtonLink>
      </Inline>
    </PageContainer>
  );
}
