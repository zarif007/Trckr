/**
 * Debug logging for the bindings system.
 * Enable via localStorage BINDING_DEBUG=true or enableBindingDebug().
 */

const DEBUG_KEY = 'BINDING_DEBUG'

export function isBindingDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DEBUG_KEY) === 'true'
}

export function enableBindingDebug(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEBUG_KEY, 'true')
    console.log('[Bindings] Debug mode enabled. Refresh to see detailed logs.')
  }
}

export function disableBindingDebug(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEBUG_KEY)
    console.log('[Bindings] Debug mode disabled.')
  }
}

export function debugLog(message: string, ...args: unknown[]): void {
  if (isBindingDebugEnabled()) {
    console.log(`[Bindings:DEBUG] ${message}`, ...args)
  }
}
