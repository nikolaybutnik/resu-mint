import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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

  // Include Tectonic cache in deployment
  outputFileTracingIncludes: {
    '/api/create-pdf': ['.vercel-cache/**/*'],
  },
}

export default nextConfig
