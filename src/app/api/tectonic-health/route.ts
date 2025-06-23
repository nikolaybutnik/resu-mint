import { NextRequest, NextResponse } from 'next/server'
import { createError, createErrorResponse } from '@/lib/types/errors'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

const TECTONIC_PATH = path.join(
  process.cwd(),
  'bin',
  process.platform === 'linux' ? 'tectonic-linux' : 'tectonic'
)

async function getDirSize(dirPath: string): Promise<number> {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true })
    let size = 0

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name)
      if (file.isDirectory()) {
        size += await getDirSize(fullPath)
      } else {
        const stats = await fs.stat(fullPath)
        size += stats.size
      }
    }

    return size
  } catch {
    return 0
  }
}

async function checkCacheStatus() {
  // Check cache directories - only project cache (persistent) and runtime cache (shared)
  const checks = [
    {
      name: 'Build Cache (Persistent)',
      path: path.join(process.cwd(), '.vercel-cache', 'tectonic-build-cache'),
      type: 'BUILD_CACHE' as const,
    },
    {
      name: 'Build XDG (Persistent)',
      path: path.join(process.cwd(), '.vercel-cache', 'xdg-build-cache'),
      type: 'BUILD_XDG' as const,
    },
    {
      name: 'Runtime Cache (Shared)',
      path: path.join(os.tmpdir(), 'tectonic-shared-cache'),
      type: 'RUNTIME_CACHE' as const,
    },
    {
      name: 'Runtime XDG (Shared)',
      path: path.join(os.tmpdir(), 'xdg-shared-cache'),
      type: 'RUNTIME_XDG' as const,
    },
  ]

  const results = await Promise.allSettled(
    checks.map((check) =>
      fs.access(check.path).then(() => getDirSize(check.path))
    )
  )

  const cacheSizes = results.map((result, index) => ({
    name: checks[index].name,
    path: checks[index].path,
    size: result.status === 'fulfilled' ? result.value : 0,
    type: checks[index].type,
  }))

  const totalCacheSize = cacheSizes.reduce(
    (total, cache) => total + cache.size,
    0
  )
  const hasBuildCache = cacheSizes.some(
    (cache) => cache.type === 'BUILD_CACHE' || cache.type === 'BUILD_XDG'
  )
  const hasRuntimeCache = cacheSizes.some(
    (cache) => cache.type === 'RUNTIME_CACHE' || cache.type === 'RUNTIME_XDG'
  )

  return {
    tectonic: {
      binaryExists: true,
      binaryPath: TECTONIC_PATH,
    },
    cache: {
      buildCache: {
        exists: hasBuildCache,
        size: cacheSizes
          .filter(
            (cache) =>
              cache.type === 'BUILD_CACHE' || cache.type === 'BUILD_XDG'
          )
          .reduce((total, cache) => total + cache.size, 0),
        sizeMB:
          Math.round(
            (cacheSizes
              .filter(
                (cache) =>
                  cache.type === 'BUILD_CACHE' || cache.type === 'BUILD_XDG'
              )
              .reduce((total, cache) => total + cache.size, 0) /
              1024 /
              1024) *
              100
          ) / 100,
        paths: {
          tectonic:
            cacheSizes.find((cache) => cache.type === 'BUILD_CACHE')?.path ||
            '',
          xdg:
            cacheSizes.find((cache) => cache.type === 'BUILD_XDG')?.path || '',
        },
      },
      runtimeCache: {
        exists: hasRuntimeCache,
        size: cacheSizes
          .filter(
            (cache) =>
              cache.type === 'RUNTIME_CACHE' || cache.type === 'RUNTIME_XDG'
          )
          .reduce((total, cache) => total + cache.size, 0),
        sizeMB:
          Math.round(
            (cacheSizes
              .filter(
                (cache) =>
                  cache.type === 'RUNTIME_CACHE' || cache.type === 'RUNTIME_XDG'
              )
              .reduce((total, cache) => total + cache.size, 0) /
              1024 /
              1024) *
              100
          ) / 100,
        paths: {
          tectonic:
            cacheSizes.find((cache) => cache.type === 'RUNTIME_CACHE')?.path ||
            '',
          xdg:
            cacheSizes.find((cache) => cache.type === 'RUNTIME_XDG')?.path ||
            '',
        },
      },
      total: {
        size: totalCacheSize,
        sizeMB: Math.round((totalCacheSize / 1024 / 1024) * 100) / 100,
      },
    },
    recommendations: [] as string[],
  }
}

export async function GET() {
  try {
    const status = await checkCacheStatus()

    // Add recommendations
    if (!status.tectonic.binaryExists) {
      status.recommendations.push(
        'Tectonic binary is missing. Run build process to download it.'
      )
    }

    if (!status.cache.buildCache.exists && !status.cache.runtimeCache.exists) {
      status.recommendations.push(
        'No cache found. First PDF generation will be slow (up to 8s) while downloading packages.'
      )
    } else if (!status.cache.buildCache.exists) {
      status.recommendations.push(
        'Build cache missing. Consider running cache warming during build for faster cold starts.'
      )
    }

    if (status.cache.total.sizeMB > 100) {
      status.recommendations.push(
        'Large cache detected. Consider clearing old cache if experiencing memory issues.'
      )
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      data: status,
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json(
      createErrorResponse([createError('server', 'Health check failed')]),
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json().catch(() => ({}))

    if (action === 'clear-cache') {
      // Only clear runtime cache (shared cache), keep persistent build cache
      const cacheDirectories = [
        path.join(os.tmpdir(), 'tectonic-shared-cache'),
        path.join(os.tmpdir(), 'xdg-shared-cache'),
      ]

      const results = await Promise.allSettled(
        cacheDirectories.map((dir) =>
          fs.rm(dir, { recursive: true, force: true })
        )
      )

      return NextResponse.json({
        action: 'clear-cache',
        success: true,
        message: 'Cache cleared successfully',
        details: results.map((result, index) => ({
          directory: cacheDirectories[index],
          success: result.status === 'fulfilled',
        })),
      })
    }

    return NextResponse.json(
      createErrorResponse([createError('client', 'Unknown action')]),
      { status: 400 }
    )
  } catch (error) {
    console.error('Health check action error:', error)
    return NextResponse.json(
      createErrorResponse([createError('server', 'Action failed')]),
      { status: 500 }
    )
  }
}
