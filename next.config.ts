import type { NextConfig } from 'next';
import path from 'node:path';

// Force cache invalidation - v2
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Security: Add CORS headers for API routes
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-financial.vercel.app',
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET,POST,PUT,DELETE,OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type,Authorization',
        },
        {
          key: 'Access-Control-Max-Age',
          value: '86400',
        },
      ],
    },
  ],
};

export default nextConfig;
