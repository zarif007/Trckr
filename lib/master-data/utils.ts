export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function normalizeName(value: string): string {
  const trimmed = value.trim().toLowerCase()
  const alnum = trimmed.replace(/[^a-z0-9]+/g, '')
  if (alnum.length > 3 && alnum.endsWith('s')) return alnum.slice(0, -1)
  return alnum
}
