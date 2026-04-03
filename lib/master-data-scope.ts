/**
 * Parse `Project.settings` / `Module.settings` JSON for display (Settings system tracker).
 */

export const MASTER_DATA_SCOPES = ['tracker', 'module', 'project'] as const

export type MasterDataScope = (typeof MASTER_DATA_SCOPES)[number]

export type ParsedProjectModuleSettings = {
 masterDataDefaultScope: MasterDataScope | null
}

export function normalizeMasterDataScope(value: unknown): MasterDataScope | null {
 if (typeof value !== 'string') return null
 const trimmed = value.trim()
 if (!trimmed) return null
 return (MASTER_DATA_SCOPES as readonly string[]).includes(trimmed)
 ? (trimmed as MasterDataScope)
 : null
}

export function parseProjectModuleSettings(settings: unknown): ParsedProjectModuleSettings {
 if (settings == null) return { masterDataDefaultScope: null }
 if (typeof settings !== 'object' || Array.isArray(settings)) {
 return { masterDataDefaultScope: null }
 }
 const raw = (settings as Record<string, unknown>).masterDataDefaultScope
 return { masterDataDefaultScope: normalizeMasterDataScope(raw) }
}

export function isMasterDataModuleSettings(settings: unknown): boolean {
 if (settings == null || typeof settings !== 'object' || Array.isArray(settings)) {
 return false
 }
 return (settings as Record<string, unknown>).masterDataModule === true
}

export function resolveMasterDataScopeFromTracker(tracker?: { masterDataScope?: unknown } | null): MasterDataScope {
 return normalizeMasterDataScope(tracker?.masterDataScope) ?? 'tracker'
}
