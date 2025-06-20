import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Critical for react-pdf in Next.js 15
  swcMinify: false,

  webpack: (config) => {
    // Disable canvas for react-pdf
    config.resolve.alias.canvas = false

    // Help with PDF.js worker loading
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    }

    return config
  },

  // Enable static file serving for PDF worker
  experimental: {
    esmExternals: 'loose',
  },
}

export default nextConfig
