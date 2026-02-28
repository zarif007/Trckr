/**
 * Performance Monitoring Utilities
 * 
 * Provides tools for measuring and monitoring the performance of
 * tracker calculations, validations, and binding resolutions.
 * 
 * @module utils/performance
 * 
 * Features:
 * - Aggregated statistics collection
 * - Timing measurements with high-resolution timestamps
 * - Cache hit/miss tracking across modules
 * - Debug mode for detailed logging
 * 
 * @example
 * ```ts
 * import { PerfMonitor, getGlobalStats } from '@/lib/utils/performance';
 * 
 * const monitor = new PerfMonitor('calculation');
 * const stop = monitor.start('applyCalculationsForRow');
 * // ... do work
 * stop();
 * 
 * console.log(getGlobalStats());
 * ```
 */

// ============================================================================
// Types
// ============================================================================

/** Statistics for a single operation type */
export interface OperationStats {
  /** Total number of calls */
  count: number
  /** Total time in milliseconds */
  totalMs: number
  /** Average time in milliseconds */
  avgMs: number
  /** Minimum time in milliseconds */
  minMs: number
  /** Maximum time in milliseconds */
  maxMs: number
  /** Last recorded time in milliseconds */
  lastMs: number
}

/** Statistics for a module (e.g., calculation, validation) */
export interface ModuleStats {
  [operationName: string]: OperationStats
}

/** Global statistics for all modules */
export interface GlobalStats {
  [moduleName: string]: ModuleStats
}

// ============================================================================
// Configuration
// ============================================================================

let debugMode = false
let enabled = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

/**
 * Enable performance monitoring.
 * Monitoring is enabled by default in development.
 */
export function enablePerformanceMonitoring(): void {
  enabled = true
}

/**
 * Disable performance monitoring.
 * Call this in production for zero overhead.
 */
export function disablePerformanceMonitoring(): void {
  enabled = false
}

/**
 * Enable debug mode for verbose logging.
 */
export function enableDebugMode(): void {
  debugMode = true
}

/**
 * Disable debug mode.
 */
export function disableDebugMode(): void {
  debugMode = false
}

// ============================================================================
// Global Stats Storage
// ============================================================================

const globalStats: GlobalStats = {}

/**
 * Get all collected statistics.
 * @returns Copy of global statistics
 */
export function getGlobalStats(): GlobalStats {
  return JSON.parse(JSON.stringify(globalStats))
}

/**
 * Get statistics for a specific module.
 * @param moduleName - Name of the module
 * @returns Module statistics or undefined
 */
export function getModuleStats(moduleName: string): ModuleStats | undefined {
  return globalStats[moduleName] ? { ...globalStats[moduleName] } : undefined
}

/**
 * Reset all collected statistics.
 */
export function resetGlobalStats(): void {
  Object.keys(globalStats).forEach(key => delete globalStats[key])
}

/**
 * Reset statistics for a specific module.
 * @param moduleName - Name of the module to reset
 */
export function resetModuleStats(moduleName: string): void {
  delete globalStats[moduleName]
}

// ============================================================================
// Performance Monitor Class
// ============================================================================

/**
 * Performance monitor for a specific module.
 * 
 * Tracks timing and provides aggregated statistics for operations.
 * 
 * @example
 * ```ts
 * const monitor = new PerfMonitor('validation');
 * 
 * // Method 1: Using start/stop
 * const stop = monitor.start('getValidationError');
 * // ... do work
 * stop();
 * 
 * // Method 2: Using measure
 * monitor.measure('compileValidationPlan', () => {
 *   // ... do work
 * });
 * 
 * // Get stats
 * console.log(monitor.getStats());
 * ```
 */
export class PerfMonitor {
  private moduleName: string

  constructor(moduleName: string) {
    this.moduleName = moduleName
    if (!globalStats[moduleName]) {
      globalStats[moduleName] = {}
    }
  }

  /**
   * Start timing an operation.
   * @param operationName - Name of the operation
   * @returns Stop function to call when operation completes
   */
  start(operationName: string): () => void {
    if (!enabled) return () => {}
    
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.record(operationName, duration)
    }
  }

  /**
   * Measure the duration of a synchronous operation.
   * @param operationName - Name of the operation
   * @param fn - Function to measure
   * @returns Result of the function
   */
  measure<T>(operationName: string, fn: () => T): T {
    if (!enabled) return fn()
    
    const startTime = performance.now()
    try {
      return fn()
    } finally {
      const duration = performance.now() - startTime
      this.record(operationName, duration)
    }
  }

  /**
   * Measure the duration of an async operation.
   * @param operationName - Name of the operation
   * @param fn - Async function to measure
   * @returns Promise resolving to function result
   */
  async measureAsync<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    if (!enabled) return fn()
    
    const startTime = performance.now()
    try {
      return await fn()
    } finally {
      const duration = performance.now() - startTime
      this.record(operationName, duration)
    }
  }

  /**
   * Record a duration for an operation.
   * @param operationName - Name of the operation
   * @param durationMs - Duration in milliseconds
   */
  record(operationName: string, durationMs: number): void {
    if (!enabled) return

    const moduleStats = globalStats[this.moduleName]!
    let opStats = moduleStats[operationName]

    if (!opStats) {
      opStats = {
        count: 0,
        totalMs: 0,
        avgMs: 0,
        minMs: Infinity,
        maxMs: 0,
        lastMs: 0,
      }
      moduleStats[operationName] = opStats
    }

    opStats.count++
    opStats.totalMs += durationMs
    opStats.avgMs = opStats.totalMs / opStats.count
    opStats.minMs = Math.min(opStats.minMs, durationMs)
    opStats.maxMs = Math.max(opStats.maxMs, durationMs)
    opStats.lastMs = durationMs

    if (debugMode) {
      console.log(
        `[Perf] ${this.moduleName}.${operationName}: ${durationMs.toFixed(2)}ms ` +
        `(avg: ${opStats.avgMs.toFixed(2)}ms, count: ${opStats.count})`
      )
    }
  }

  /**
   * Get statistics for this module.
   * @returns Copy of module statistics
   */
  getStats(): ModuleStats {
    return { ...globalStats[this.moduleName] }
  }

  /**
   * Reset statistics for this module.
   */
  reset(): void {
    globalStats[this.moduleName] = {}
  }
}

// ============================================================================
// Pre-configured Monitors
// ============================================================================

/** Performance monitor for calculation operations */
export const calculationMonitor = new PerfMonitor('calculation')

/** Performance monitor for validation operations */
export const validationMonitor = new PerfMonitor('validation')

/** Performance monitor for binding operations */
export const bindingMonitor = new PerfMonitor('binding')

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format statistics as a human-readable string.
 * @param stats - Statistics to format
 * @returns Formatted string
 */
export function formatStats(stats: GlobalStats): string {
  const lines: string[] = ['Performance Statistics', '='.repeat(50)]
  
  for (const [moduleName, moduleStats] of Object.entries(stats)) {
    lines.push(`\n${moduleName}:`)
    lines.push('-'.repeat(30))
    
    for (const [opName, opStats] of Object.entries(moduleStats)) {
      lines.push(
        `  ${opName}:` +
        ` count=${opStats.count}` +
        ` avg=${opStats.avgMs.toFixed(2)}ms` +
        ` min=${opStats.minMs === Infinity ? 'N/A' : opStats.minMs.toFixed(2) + 'ms'}` +
        ` max=${opStats.maxMs.toFixed(2)}ms`
      )
    }
  }
  
  return lines.join('\n')
}

/**
 * Log all statistics to console.
 */
export function logGlobalStats(): void {
  console.log(formatStats(getGlobalStats()))
}
