import Link from 'next/link';

export default function Page() {
  return (
    <div className="container page animIn">
      <div className="badge">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'linear-gradient(135deg,var(--teal),var(--sky))', display: 'inline-block' }} />
        Product
      </div>

      <h1 className="h2" style={{ marginTop: 16 }}>
        A calmer way to get good with money.
      </h1>
      <p className="lead" style={{ maxWidth: 820 }}>
        Atlas turns messy real life into one confident next step. No bank connections. No shame. Just a practical plan we build together—through conversation.
      </p>

      <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href="/conversation" className="btn btnPrimary" style={{ boxShadow: 'var(--sh3)' }}>
          Start a conversation →
        </Link>
        <Link href="/how-it-works" className="btn btnSecondary">
          See how it works
        </Link>
      </div>

      <div className="gridCards" style={{ marginTop: 30 }}>
        {[
          { t: 'Private by default', d: 'Your financial state stays on your device. You control what you share and when.' },
          { t: 'Conversation-led', d: 'We start with your story. Rough numbers are fine. Atlas listens, then helps you simplify.' },
          { t: 'One lever at a time', d: 'A single move that matters most right now—so you don’t get overwhelmed.' },
          { t: 'Trust-first tone', d: 'Warm, direct guidance that respects your autonomy and avoids guilt or fear.' },
          { t: 'Clarity, not complexity', d: 'You’ll see buffer, debt pressure, and a clear baseline—without a spreadsheet marathon.' },
          { t: 'Built for real humans', d: 'Designed for anxious, busy, ambitious people who still want to feel steady.' },
        ].map((x) => (
          <div key={x.t} className="card lift">
            <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>{x.t}</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{x.d}</div>
          </div>
        ))}
      </div>

      <div className="card cardLg" style={{ marginTop: 34 }}>
        <div style={{ fontWeight: 980, letterSpacing: '-0.02em', fontSize: 18 }}>What you get</div>
        <div style={{ marginTop: 12, display: 'grid', gap: 10, color: 'var(--ink2)', lineHeight: 1.85 }}>
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
        </div>
      </div>

      <div className="card" style={{ marginTop: 18, background: 'var(--bg2)' }}>
        <div style={{ fontWeight: 980, letterSpacing: '-0.02em' }}>What Atlas won’t do</div>
        <div style={{ marginTop: 10, display: 'grid', gap: 8, color: 'var(--ink2)', lineHeight: 1.85 }}>
          <div>It won’t ask you to connect your bank.</div>
          <div>It won’t pretend there’s one “correct” path for everyone.</div>
          <div>It won’t overwhelm you with a 27-step plan on day one.</div>
        </div>
      </div>

      <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href="/conversation" className="btn btnPrimary" style={{ boxShadow: 'var(--sh3)' }}>
          Try Atlas now →
        </Link>
        <Link href="/privacy" className="btn btnSecondary">
          Read privacy
        </Link>
      </div>
    </div>
  );
}
