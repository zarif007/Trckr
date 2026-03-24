/**
 * Parse `Project.settings` / `Module.settings` JSON for display (Settings system tracker).
 */

export type ParsedProjectModuleSettings = {
  masterDataDefaultScope: string | null
}

export function parseProjectModuleSettings(settings: unknown): ParsedProjectModuleSettings {
  if (settings == null) return { masterDataDefaultScope: null }
  if (typeof settings !== 'object' || Array.isArray(settings)) {
    return { masterDataDefaultScope: null }
  }
  const raw = (settings as Record<string, unknown>).masterDataDefaultScope
  if (typeof raw !== 'string') return { masterDataDefaultScope: null }
  const trimmed = raw.trim()
  return { masterDataDefaultScope: trimmed.length > 0 ? trimmed : null }
}
