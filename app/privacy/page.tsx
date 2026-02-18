import Link from 'next/link';
import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { Inline, PageContainer } from '@/components/Layout';

export default function Page() {
  return (
    <PageContainer className="page animIn" maxWidth={1120}>
      <Badge>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'linear-gradient(135deg,var(--teal),var(--sky))', display: 'inline-block' }} />
        Privacy
      </Badge>

      <h1 className="h2" style={{ marginTop: 16 }}>Private by default. Calm by design.</h1>
      <p className="lead" style={{ maxWidth: 900 }}>
        Atlas is built to feel safe. Here’s the simple version of how we treat your data—what stays on your device, when anything leaves your device, and what we deliberately avoid.
      </p>

      <Inline style={{ marginTop: 22 }} gap={12}>
        <Link href="/conversation" className="btn btnPrimary" style={{ boxShadow: 'var(--sh3)' }}>
          Start a conversation →
        </Link>
        <Link href="/product" className="btn btnSecondary">
          Back to product
        </Link>
      </Inline>

      <div className="grid" style={{ marginTop: 26 }}>
        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>Local-first storage</div>
          <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            Your financial state is stored locally in your browser (IndexedDB). This is how Atlas can feel persistent without creating an account.
          </div>
        </Card>

        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>No bank connections</div>
          <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            Atlas does not ask for or store your bank login. We intentionally avoid bank syncing so you can stay in control.
          </div>
        </Card>

        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>When AI is used</div>
          <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            If you’ve configured an Anthropic key, messages you send may be forwarded to Anthropic to generate replies and extract key facts. Atlas only sends what you type.
          </div>
        </Card>

        <Card className="lift">
          <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>What we don’t do</div>
          <div style={{ marginTop: 8, display: 'grid', gap: 8, color: 'var(--ink2)', lineHeight: 1.9 }}>
            <div>We don’t sell your data.</div>
            <div>We don’t ask for your bank password.</div>
            <div>We don’t require an account just to try Atlas.</div>
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
        <Link href="/conversation" className="btn btnPrimary" style={{ boxShadow: 'var(--sh3)' }}>
          Try Atlas now →
        </Link>
        <Link href="/how-it-works" className="btn btnSecondary">
          See how it works
        </Link>
      </Inline>
    </PageContainer>
  );
}
