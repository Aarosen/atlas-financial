// CDN Configuration & Integration - Phase 4C
// Vercel Edge Network and static asset optimization

export interface CDNConfig {
  enabled: boolean;
  provider: 'vercel' | 'cloudflare' | 'aws-cloudfront';
  cacheControl: {
    static: string; // e.g., 'public, max-age=31536000, immutable'
    dynamic: string; // e.g., 'public, max-age=3600, s-maxage=86400'
    html: string; // e.g., 'public, max-age=0, s-maxage=3600'
    api?: string; // e.g., 'private, no-cache, no-store'
  };
  compressionEnabled: boolean;
  imageOptimization: boolean;
  geoRestrictions?: string[]; // ISO country codes
}

export interface CDNAsset {
  path: string;
  contentType: string;
  cacheControl: string;
  gzip: boolean;
  brotli: boolean;
}

export interface EdgeFunction {
  name: string;
  path: string;
  regions?: string[];
  timeout: number; // milliseconds
}

export const DEFAULT_CDN_CONFIG: CDNConfig = {
  enabled: true,
  provider: 'vercel',
  cacheControl: {
    static: 'public, max-age=31536000, immutable',
    dynamic: 'public, max-age=3600, s-maxage=86400',
    html: 'public, max-age=0, s-maxage=3600',
  },
  compressionEnabled: true,
  imageOptimization: true,
};

// Asset caching strategy
export const ASSET_CACHE_STRATEGY: Record<string, CDNAsset> = {
  // JavaScript bundles - long cache with immutable flag
  'js': {
    path: '/_next/static/**/*.js',
    contentType: 'application/javascript',
    cacheControl: 'public, max-age=31536000, immutable',
    gzip: true,
    brotli: true,
  },

  // CSS files - long cache with immutable flag
  'css': {
    path: '/_next/static/**/*.css',
    contentType: 'text/css',
    cacheControl: 'public, max-age=31536000, immutable',
    gzip: true,
    brotli: true,
  },

  // Images - long cache
  'images': {
    path: '/images/**/*',
    contentType: 'image/*',
    cacheControl: 'public, max-age=31536000',
    gzip: false,
    brotli: false,
  },

  // Fonts - long cache
  'fonts': {
    path: '/fonts/**/*',
    contentType: 'font/*',
    cacheControl: 'public, max-age=31536000, immutable',
    gzip: true,
    brotli: true,
  },

  // HTML pages - short cache with stale-while-revalidate
  'html': {
    path: '/**/*.html',
    contentType: 'text/html',
    cacheControl: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    gzip: true,
    brotli: true,
  },

  // API responses - no cache
  'api': {
    path: '/api/**/*',
    contentType: 'application/json',
    cacheControl: 'private, no-cache, no-store, must-revalidate',
    gzip: true,
    brotli: true,
  },
};

// Edge functions for performance optimization
export const EDGE_FUNCTIONS: EdgeFunction[] = [
  {
    name: 'redirect-www',
    path: '/api/edge/redirect-www',
    regions: ['all'],
    timeout: 1000,
  },
  {
    name: 'security-headers',
    path: '/api/edge/security-headers',
    regions: ['all'],
    timeout: 500,
  },
  {
    name: 'rate-limit',
    path: '/api/edge/rate-limit',
    regions: ['all'],
    timeout: 2000,
  },
  {
    name: 'geo-redirect',
    path: '/api/edge/geo-redirect',
    regions: ['all'],
    timeout: 1000,
  },
];

export class CDNManager {
  private config: CDNConfig;

  constructor(config: Partial<CDNConfig> = {}) {
    this.config = {
      ...DEFAULT_CDN_CONFIG,
      ...config,
    };
  }

  /**
   * Get cache control header for asset
   */
  getCacheControl(assetPath: string): string {
    // Check against asset cache strategy
    for (const [key, strategy] of Object.entries(ASSET_CACHE_STRATEGY)) {
      if (this.matchesPattern(assetPath, strategy.path)) {
        return strategy.cacheControl;
      }
    }

    // Default to dynamic cache
    return this.config.cacheControl.dynamic;
  }

  /**
   * Check if path matches pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\//g, '\\/');
    return new RegExp(`^${regexPattern}$`).test(path);
  }

  /**
   * Get compression headers
   */
  getCompressionHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.config.compressionEnabled) {
      headers['Content-Encoding'] = 'gzip, br';
      headers['Vary'] = 'Accept-Encoding';
    }

    return headers;
  }

  /**
   * Get security headers
   */
  getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    };
  }

  /**
   * Get performance headers
   */
  getPerformanceHeaders(): Record<string, string> {
    return {
      'Cache-Control': this.config.cacheControl.dynamic,
      'X-Content-Type-Options': 'nosniff',
      'Link': '</fonts/inter.woff2>; rel=preload; as=font; crossorigin',
    };
  }

  /**
   * Generate vercel.json configuration
   */
  generateVercelConfig(): Record<string, any> {
    return {
      buildCommand: 'npm run build',
      outputDirectory: '.next',
      framework: 'nextjs',
      regions: ['iad1', 'sfo1', 'lhr1', 'sin1'],
      env: {
        NEXT_PUBLIC_SUPABASE_URL: '@supabase_url',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: '@supabase_key',
        ANTHROPIC_API_KEY: '@anthropic_key',
      },
      headers: [
        {
          source: '/api/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: this.config.cacheControl.api || 'private, no-cache',
            },
          ],
        },
        {
          source: '/_next/static/(.*)',
          headers: [
            {
              key: 'Cache-Control',
              value: this.config.cacheControl.static,
            },
          ],
        },
        {
          source: '/(.*)',
          headers: Object.entries(this.getSecurityHeaders()).map(([key, value]) => ({
            key,
            value,
          })),
        },
      ],
      redirects: [
        {
          source: '/www/(.*)',
          destination: '/$1',
          permanent: true,
        },
      ],
    };
  }

  /**
   * Generate next.config.js optimization settings
   */
  generateNextConfig(): Record<string, any> {
    return {
      images: {
        domains: ['supabase.co', 'cdn.example.com'],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
        minimumCacheTTL: 31536000,
      },
      compress: true,
      poweredByHeader: false,
      productionBrowserSourceMaps: false,
      swcMinify: true,
      experimental: {
        optimizePackageImports: ['@supabase/supabase-js'],
      },
    };
  }

  /**
   * Get CDN statistics and recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.config.compressionEnabled) {
      recommendations.push('Enable gzip/brotli compression for faster asset delivery');
    }

    if (!this.config.imageOptimization) {
      recommendations.push('Enable image optimization for smaller file sizes and faster loading');
    }

    if (this.config.provider === 'vercel') {
      recommendations.push('Use Vercel Analytics to monitor CDN performance');
      recommendations.push('Enable Vercel Web Analytics for real user monitoring');
    }

    recommendations.push('Implement service worker for offline support and faster repeat visits');
    recommendations.push('Use HTTP/2 Server Push for critical resources');
    recommendations.push('Implement preconnect for third-party domains');

    return recommendations;
  }
}

// Singleton instance
let cdnManagerInstance: CDNManager | null = null;

export function getCDNManager(): CDNManager {
  if (!cdnManagerInstance) {
    cdnManagerInstance = new CDNManager(DEFAULT_CDN_CONFIG);
  }
  return cdnManagerInstance;
}

// Middleware for CDN headers
export function cdnHeadersMiddleware(req: any, res: any, next: any) {
  const cdnManager = getCDNManager();
  const path = req.path;

  // Set cache control header
  const cacheControl = cdnManager.getCacheControl(path);
  res.setHeader('Cache-Control', cacheControl);

  // Set security headers
  const securityHeaders = cdnManager.getSecurityHeaders();
  for (const [key, value] of Object.entries(securityHeaders)) {
    res.setHeader(key, value);
  }

  // Set compression headers
  const compressionHeaders = cdnManager.getCompressionHeaders();
  for (const [key, value] of Object.entries(compressionHeaders)) {
    res.setHeader(key, value);
  }

  next();
}
