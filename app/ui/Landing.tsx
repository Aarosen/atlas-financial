import Link from 'next/link';
import AtlasLogo from './AtlasLogo';

export default function Landing() {
  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="container page animIn">
        <div className="grid2">
          <div>
            <div className="badge">
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'linear-gradient(135deg,var(--teal),var(--sky))', display: 'inline-block' }} />
              Private, calm, human guidance
            </div>

            <h1 className="h1" style={{ marginTop: 16 }}>
              Clarity you can feel good about.
            </h1>
            <p className="lead" style={{ maxWidth: 600, marginTop: 16 }}>
              Atlas is a money mentor that talks with you, understands your real situation, and gives you one confident next step.
            </p>

            <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                href="/conversation"
                className="btn btnPrimary"
                style={{ boxShadow: 'var(--sh3)' }}
              >
                Start a conversation →
              </Link>
              <Link
                href="/how-it-works"
                className="btn btnSecondary"
              >
                See how it works
              </Link>
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--ink3)', fontSize: 13, fontWeight: 700 }}>
              <div>🔒 No bank sync</div>
              <div>📱 Stays on your device</div>
              <div>🎯 One step at a time</div>
              <div>💬 Real conversation</div>
            </div>
          </div>

          <div className="card cardLg lift" style={{ background: 'radial-gradient(1200px 600px at 10% 10%, color-mix(in srgb, var(--teal) 22%, transparent) 0%, transparent 56%), radial-gradient(900px 520px at 90% 30%, color-mix(in srgb, var(--sky) 18%, transparent) 0%, transparent 60%)' }}>
            <div className="card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                  <div style={{ color: 'var(--ink3)', fontSize: 12, fontWeight: 800 }}>Your financial companion</div>
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <div style={{ padding: '12px 14px', borderRadius: 18, background: 'var(--bg2)', border: '1px solid var(--bdr)', color: 'var(--ink2)', lineHeight: 1.6, fontWeight: 750 }}>
                  Tell me what’s going on with money right now.
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 18, background: 'linear-gradient(135deg,var(--teal),var(--sky))', color: '#fff', lineHeight: 1.6, fontWeight: 800, marginLeft: '14%' }}>
                  I feel behind. I make $5.5k/mo, rent is $2k, and I’ve got $4k in credit card debt.
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 18, background: 'var(--bg2)', border: '1px solid var(--bdr)', color: 'var(--ink2)', lineHeight: 1.6, fontWeight: 750 }}>
                  We can fix this. Let’s pick one lever: reduce the interest pressure, then build a buffer.
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                {[
                  { l: 'Buffer', v: '1.2 mo' },
                  { l: 'Future', v: '9%' },
                  { l: 'Debt', v: 'Moderate' },
                ].map((x) => (
                  <div key={x.l} style={{ padding: '10px 12px', borderRadius: 16, border: '1px solid var(--bdr)', background: 'var(--card)' }}>
                    <div style={{ color: 'var(--ink3)', fontSize: 11, fontWeight: 900, letterSpacing: '0.08em' }}>{x.l.toUpperCase()}</div>
                    <div style={{ marginTop: 6, fontWeight: 980, letterSpacing: '-0.02em' }}>{x.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
