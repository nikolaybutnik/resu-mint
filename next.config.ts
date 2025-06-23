import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Disable canvas for react-pdf
    config.resolve.alias.canvas = false

    // Help with PDF.js worker loading
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    }

    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ensure tiktoken can find its WASM file
        'tiktoken/tiktoken_bg.wasm': require.resolve(
          'tiktoken/tiktoken_bg.wasm'
        ),
      }

      // Include WASM files in the bundle
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      })
    }

    return config
  },

  // Include Tectonic cache in deployment
  outputFileTracingIncludes: {
    '/api/create-pdf': ['.vercel-cache/**/*'],
    '/api/generate-bullets': ['node_modules/tiktoken/**/*'],
  },

  // Ensure tiktoken is bundled properly for serverless
  serverExternalPackages: [],

  // Transpile tiktoken for serverless compatibility
  transpilePackages: ['tiktoken'],
}

export default nextConfig
