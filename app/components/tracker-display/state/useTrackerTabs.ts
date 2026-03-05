import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TrackerTab } from '../types'
import { SHARED_TAB_ID } from '@/lib/depends-on-options'

const DEFAULT_SHARED_TAB: TrackerTab = {
  id: SHARED_TAB_ID,
  name: 'Shared',
  placeId: 999,
  config: {},
}

function getPreferredTabId(tabs: TrackerTab[]): string {
  const nonShared = tabs.find((tab) => tab.id !== SHARED_TAB_ID)
  return nonShared?.id ?? tabs[0]?.id ?? ''
}

export function useTrackerTabs(tabs: TrackerTab[] | undefined) {
  const normalizedTabs = useMemo(() => {
    const list = (tabs ?? []).filter((tab) => !tab.config?.isHidden)
    const hasShared = list.some((tab) => tab.id === SHARED_TAB_ID)
    if (!hasShared) {
      return [...list, DEFAULT_SHARED_TAB].sort((a, b) => a.placeId - b.placeId)
    }
    return list.sort((a, b) => a.placeId - b.placeId)
  }, [tabs])

  const [activeTabId, setActiveTabId] = useState(() => getPreferredTabId(normalizedTabs))
  const userSelectedTabRef = useRef(false)

  useEffect(() => {
    if (normalizedTabs.length === 0) return

    const tabExists = normalizedTabs.some((tab) => tab.id === activeTabId)
    const hasNonShared = normalizedTabs.some((tab) => tab.id !== SHARED_TAB_ID)
    const shouldAutoMoveFromShared =
      activeTabId === SHARED_TAB_ID && hasNonShared && !userSelectedTabRef.current

    if (!activeTabId || !tabExists || shouldAutoMoveFromShared) {
      setActiveTabId(getPreferredTabId(normalizedTabs))
    }
  }, [normalizedTabs, activeTabId])

  const handleTabChange = useCallback((nextTabId: string) => {
    userSelectedTabRef.current = true
    setActiveTabId(nextTabId)
  }, [])

  return {
    normalizedTabs,
    activeTabId,
    setActiveTabId,
    handleTabChange,
  }
}
