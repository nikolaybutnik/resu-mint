import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  sassOptions: {
    // Silence specific Dart Sass deprecations that clutter the console
    // See: https://sass-lang.com/d/import and https://sass-lang.com/d/mixed-decls
    silenceDeprecations: ['legacy-js-api'],
    // Don't surface deprecations coming from dependencies
    quietDeps: true,
  },
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

  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'react',
      'lodash',
      'react-icons',
      'zod',
      'zustand',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      '@dnd-kit/modifiers',
    ],
  },
}

export default nextConfig
