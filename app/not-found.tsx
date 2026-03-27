import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: 'var(--padX)',
    }}>
      <div style={{
        maxWidth: 500,
        textAlign: 'center',
        display: 'grid',
        gap: 24,
      }}>
        {/* Logo */}
        <div style={{ fontSize: 48, fontWeight: 950 }}>
          Atlas
        </div>

        {/* Heading */}
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 950, margin: 0, color: 'var(--ink)' }}>
            Page not found
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink2)', margin: '8px 0 0 0', lineHeight: 1.6 }}>
            The page you're looking for doesn't exist. Let's get you back on track.
          </p>
        </div>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
          <Link
            href="/"
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--teal), var(--sky))',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 950,
              fontSize: 14,
              textAlign: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Back to home
          </Link>
          <Link
            href="/conversation"
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              background: 'var(--bg2)',
              color: 'var(--ink)',
              textDecoration: 'none',
              fontWeight: 950,
              fontSize: 14,
              textAlign: 'center',
              border: '1px solid var(--bdr)',
              cursor: 'pointer',
            }}
          >
            Start a conversation
          </Link>
        </div>

        {/* Footer text */}
        <p style={{
          fontSize: 12,
          color: 'var(--ink3)',
          margin: 0,
          lineHeight: 1.6,
        }}>
          If you think this is a mistake, please <Link href="/contact" style={{ color: 'var(--ink2)', textDecoration: 'underline' }}>contact us</Link>.
        </p>
      </div>
    </div>
  );
}
