import type { NextConfig } from 'next';
import path from 'node:path';

// Force cache invalidation - v2
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
