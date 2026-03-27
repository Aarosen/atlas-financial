// TASK 2.8-2.9: Footer with semantic HTML and proper links
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{ 
      borderTop: '1px solid var(--bdr)', 
      background: 'var(--bg)', 
      padding: 'var(--padY) var(--padX)',
      marginTop: 'auto'
    }}>
      <div style={{ 
        maxWidth: 820, 
        margin: '0 auto',
        display: 'grid',
        gap: 24,
      }}>
        {/* Footer Navigation */}
        <nav style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
          <Link href="/about" style={{ color: 'var(--ink2)', textDecoration: 'none', fontWeight: 600 }}>
            About
          </Link>
          <Link href="/privacy" style={{ color: 'var(--ink2)', textDecoration: 'none', fontWeight: 600 }}>
            Privacy
          </Link>
          <Link href="/terms" style={{ color: 'var(--ink2)', textDecoration: 'none', fontWeight: 600 }}>
            Terms
          </Link>
          <a 
            href="https://github.com/aarosen/atlas-financial" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: 'var(--ink2)', textDecoration: 'none', fontWeight: 600 }}
          >
            GitHub
          </a>
        </nav>

        {/* Footer Text */}
        <div style={{ 
          fontSize: 12, 
          color: 'var(--ink3)', 
          lineHeight: 1.6,
          borderTop: '1px solid var(--bdr)',
          paddingTop: 16,
        }}>
          <p style={{ margin: 0 }}>
            Atlas is an educational financial companion. Not investment advice. Always consult a financial advisor for personalized guidance.
          </p>
          <p style={{ margin: '8px 0 0 0' }}>
            © {currentYear} Atlas Financial. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
