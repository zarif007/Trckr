import type { TrackerLike } from '@/lib/validate-tracker'

const OVERVIEW_TAB_ID = 'overview_tab'

/**
 * If overview_tab exists but no section references it, and another tab has content,
 * drop overview_tab so users are not left with a useless empty Overview next to real tabs.
 * Does not run when overview_tab is the only tab (avoids leaving zero tabs).
 */
export function removeEmptyOverviewTabIfUnused(tracker: TrackerLike): TrackerLike {
  const tabs = tracker.tabs
  const sections = tracker.sections
  if (!Array.isArray(tabs) || !Array.isArray(sections)) return tracker
  const hasOverview = tabs.some((t) => t?.id === OVERVIEW_TAB_ID)
  if (!hasOverview) return tracker
  const overviewUsed = sections.some((s) => s?.tabId === OVERVIEW_TAB_ID)
  if (overviewUsed) return tracker
  if (tabs.length <= 1) return tracker
  return {
    ...tracker,
    tabs: tabs.filter((t) => t?.id !== OVERVIEW_TAB_ID),
  }
}
