import Link from 'next/link';
import AtlasLogo from './AtlasLogo';

export default function NavBar() {
  return (
    <div className="atlasHeader">
      <div className="atlasHeaderInner container">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--ink)' }}>
          <AtlasLogo size={22} />
          <span style={{ fontWeight: 950, letterSpacing: '-0.02em' }}>Atlas</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href="/product" className="navLink">
            Product
          </Link>
          <Link href="/how-it-works" className="navLink">
            How it works
          </Link>
          <Link href="/privacy" className="navLink">
            Privacy
          </Link>
          <Link
            href="/conversation"
            className="btn btnPrimary"
            style={{ padding: '10px 14px', borderRadius: 14, fontWeight: 900, fontSize: 13 }}
          >
            Start
          </Link>
        </div>
      </div>
    </div>
  );
}
