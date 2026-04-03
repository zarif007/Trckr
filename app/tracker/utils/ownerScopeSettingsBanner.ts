import type { OwnerScopeSettingsBanner } from '@/app/tracker/views/TrackerAIView/types'

export function ownerScopeSettingsBannerFromTracker(tracker: {
 systemType?: string | null
 moduleId?: string | null
 ownerScopeSettings?: unknown
}): OwnerScopeSettingsBanner | undefined {
 if (tracker.systemType !== 'SETTINGS') return undefined
 return {
 source: tracker.moduleId ? 'module' : 'project',
 settings: 'ownerScopeSettings' in tracker ? tracker.ownerScopeSettings : null,
 }
}
