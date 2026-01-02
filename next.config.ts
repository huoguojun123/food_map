import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export', // Static export for deployment
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev', // Cloudflare R2
      },
      {
        protocol: 'https',
        hostname: '**.cloudflarestorage.com', // Alternative R2 domain
      },
    ],
  },
  // Disable trailing slashes for cleaner URLs
  trailingSlash: false,
}

export default nextConfig
