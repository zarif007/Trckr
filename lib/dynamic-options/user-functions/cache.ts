import type { DynamicOptionsResolveResult } from '../types'

interface CacheEntry {
  value: DynamicOptionsResolveResult
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export function getCachedDynamicOptions(
  key: string,
  nowMs: number,
): DynamicOptionsResolveResult | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (hit.expiresAt <= nowMs) {
    cache.delete(key)
    return null
  }
  return hit.value
}

export function setCachedDynamicOptions(
  key: string,
  value: DynamicOptionsResolveResult,
  ttlSeconds: number,
  nowMs: number,
): { expiresAt: number } {
  const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 300
  const expiresAt = nowMs + ttl * 1000
  cache.set(key, { value, expiresAt })
  return { expiresAt }
}

export function clearDynamicOptionsCache(): void {
  cache.clear()
}
