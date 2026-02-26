export function getByPath(value: unknown, path: string): unknown {
  if (!path) return value
  const segments = path.split('.').filter(Boolean)
  let current: unknown = value
  for (const segment of segments) {
    if (current == null) return undefined
    if (Array.isArray(current)) {
      const idx = Number(segment)
      if (!Number.isInteger(idx) || idx < 0 || idx >= current.length) return undefined
      current = current[idx]
      continue
    }
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

export function toPlainString(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

export function toStableKey(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}
