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
  const buildCacheDir = path.join(os.tmpdir(), 'tectonic-build-cache')
  const buildXdgCacheDir = path.join(os.tmpdir(), 'xdg-build-cache')
  const sharedCacheDir = path.join(os.tmpdir(), 'tectonic-shared-cache')
  const sharedXdgCacheDir = path.join(os.tmpdir(), 'xdg-shared-cache')

  const checks = await Promise.allSettled([
    fs.access(TECTONIC_PATH, fs.constants.F_OK | fs.constants.X_OK),
    fs.access(buildCacheDir).then(() => getDirSize(buildCacheDir)),
    fs.access(buildXdgCacheDir).then(() => getDirSize(buildXdgCacheDir)),
    fs.access(sharedCacheDir).then(() => getDirSize(sharedCacheDir)),
    fs.access(sharedXdgCacheDir).then(() => getDirSize(sharedXdgCacheDir)),
  ])

  const tectonicExists = checks[0].status === 'fulfilled'
  const buildCacheSize = checks[1].status === 'fulfilled' ? checks[1].value : 0
  const buildXdgCacheSize =
    checks[2].status === 'fulfilled' ? checks[2].value : 0
  const sharedCacheSize = checks[3].status === 'fulfilled' ? checks[3].value : 0
  const sharedXdgCacheSize =
    checks[4].status === 'fulfilled' ? checks[4].value : 0

  const totalCacheSize =
    buildCacheSize + buildXdgCacheSize + sharedCacheSize + sharedXdgCacheSize
  const hasBuildCache = buildCacheSize > 0 || buildXdgCacheSize > 0
  const hasRuntimeCache = sharedCacheSize > 0 || sharedXdgCacheSize > 0

  return {
    tectonic: {
      binaryExists: tectonicExists,
      binaryPath: TECTONIC_PATH,
    },
    cache: {
      buildCache: {
        exists: hasBuildCache,
        size: buildCacheSize + buildXdgCacheSize,
        sizeMB:
          Math.round(
            ((buildCacheSize + buildXdgCacheSize) / 1024 / 1024) * 100
          ) / 100,
        paths: {
          tectonic: buildCacheDir,
          xdg: buildXdgCacheDir,
        },
      },
      runtimeCache: {
        exists: hasRuntimeCache,
        size: sharedCacheSize + sharedXdgCacheSize,
        sizeMB:
          Math.round(
            ((sharedCacheSize + sharedXdgCacheSize) / 1024 / 1024) * 100
          ) / 100,
        paths: {
          tectonic: sharedCacheDir,
          xdg: sharedXdgCacheDir,
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
      const cacheDirectories = [
        path.join(os.tmpdir(), 'tectonic-build-cache'),
        path.join(os.tmpdir(), 'xdg-build-cache'),
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
