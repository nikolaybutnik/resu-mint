export interface TectonicHealth {
  status: string
  timestamp: string
  data: {
    tectonic: {
      binaryExists: boolean
      binaryPath: string
    }
    cache: {
      buildCache: {
        exists: boolean
        size: number
        sizeMB: number
        paths: {
          tectonic: string
          xdg: string
        }
      }
      runtimeCache: {
        exists: boolean
        size: number
        sizeMB: number
        paths: {
          tectonic: string
          xdg: string
        }
      }
      total: {
        size: number
        sizeMB: number
      }
    }
    recommendations: string[]
  }
}
