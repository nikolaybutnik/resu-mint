'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.scss'
import { TectonicHealth } from '@/lib/types/admin'

export default function AdminDashboard() {
  const [health, setHealth] = useState<TectonicHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchHealth = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tectonic-health')
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setHealth(data)
      setLastRefresh(new Date())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch health data'
      )
    } finally {
      setLoading(false)
    }
  }

  const clearCache = async () => {
    if (!confirm('Are you sure you want to clear all Tectonic caches?')) return

    try {
      const response = await fetch('/api/tectonic-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear-cache' }),
      })

      if (!response.ok) {
        throw new Error(`Failed to clear cache: ${response.statusText}`)
      }

      const result = await response.json()
      alert(`Cache cleared successfully: ${result.message}`)

      // Refresh health data
      fetchHealth()
    } catch (err) {
      alert(
        `Failed to clear cache: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`
      )
    }
  }

  useEffect(() => {
    fetchHealth()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (exists: boolean, performance?: string) => {
    if (!exists) return '❌'
    if (performance === 'fast') return '⚡'
    if (performance === 'medium') return '⏱️'
    return '✅'
  }

  const getPerformanceLevel = (buildCache: boolean, runtimeCache: boolean) => {
    if (buildCache) return 'fast'
    if (runtimeCache) return 'medium'
    return 'slow'
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>Admin Dashboard</h1>
        <div className={styles.actions}>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className={styles.refreshBtn}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={clearCache} className={styles.clearBtn}>
            Clear Cache
          </button>
        </div>
      </div>

      {lastRefresh && (
        <p className={styles.lastRefresh}>
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      )}

      {error && (
        <div className={styles.error}>
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}

      {health && (
        <div className={styles.healthData}>
          <div className={styles.section}>
            <h2>Tectonic Binary</h2>
            <div className={styles.status}>
              <span className={styles.icon}>
                {getStatusIcon(health.data.tectonic.binaryExists)}
              </span>
              <span>
                {health.data.tectonic.binaryExists ? 'Available' : 'Missing'}
              </span>
            </div>
            <p className={styles.path}>{health.data.tectonic.binaryPath}</p>
          </div>

          <div className={styles.section}>
            <h2>Cache Status</h2>

            <div className={styles.cacheItem}>
              <h3>Build Cache (Pre-warmed)</h3>
              <div className={styles.status}>
                <span className={styles.icon}>
                  {getStatusIcon(health.data.cache.buildCache.exists, 'fast')}
                </span>
                <span>
                  {health.data.cache.buildCache.exists
                    ? `${health.data.cache.buildCache.sizeMB}MB`
                    : 'Not found'}
                </span>
              </div>
              <p className={styles.performance}>
                Expected PDF speed:{' '}
                {health.data.cache.buildCache.exists
                  ? '⚡ 1-3 seconds'
                  : '❌ Not available'}
              </p>
            </div>

            <div className={styles.cacheItem}>
              <h3>Runtime Cache (On-demand)</h3>
              <div className={styles.status}>
                <span className={styles.icon}>
                  {getStatusIcon(
                    health.data.cache.runtimeCache.exists,
                    'medium'
                  )}
                </span>
                <span>
                  {health.data.cache.runtimeCache.exists
                    ? `${health.data.cache.runtimeCache.sizeMB}MB`
                    : 'Not found'}
                </span>
              </div>
              <p className={styles.performance}>
                Expected PDF speed:{' '}
                {health.data.cache.runtimeCache.exists
                  ? '⏱️ Up to 4 seconds'
                  : '❌ Not available'}
              </p>
            </div>

            <div className={styles.totalCache}>
              <h3>Total Cache Size</h3>
              <p>{health.data.cache.total.sizeMB}MB across all directories</p>
            </div>
          </div>

          <div className={styles.section}>
            <h2>Performance Summary</h2>
            <div className={styles.performanceSummary}>
              {(() => {
                const level = getPerformanceLevel(
                  health.data.cache.buildCache.exists,
                  health.data.cache.runtimeCache.exists
                )

                if (level === 'fast') {
                  return (
                    <div className={styles.fast}>
                      <span>⚡ Optimal Performance</span>
                      <p>PDF generation: 2-3 seconds</p>
                    </div>
                  )
                } else if (level === 'medium') {
                  return (
                    <div className={styles.medium}>
                      <span>⏱️ Medium Performance</span>
                      <p>PDF generation: Up to 4 seconds</p>
                    </div>
                  )
                } else {
                  return (
                    <div className={styles.slow}>
                      <span>🐌 Slow Performance</span>
                      <p>PDF generation: Up to 8 seconds (cold start)</p>
                    </div>
                  )
                }
              })()}
            </div>
          </div>

          {health.data.recommendations.length > 0 && (
            <div className={styles.section}>
              <h2>Recommendations</h2>
              <ul className={styles.recommendations}>
                {health.data.recommendations.map((rec, index) => (
                  <li key={index} className={styles.recommendation}>
                    💡 {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
