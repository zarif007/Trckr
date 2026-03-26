import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TrackerTab } from '../types'

function getPreferredTabId(tabs: TrackerTab[]): string {
  return tabs[0]?.id ?? ''
}

export function useTrackerTabs(tabs: TrackerTab[] | undefined) {
  const normalizedTabs = useMemo(() => {
    const list = (tabs ?? []).filter((tab) => !tab.config?.isHidden)
    return list.sort((a, b) => a.placeId - b.placeId)
  }, [tabs])

  const [activeTabId, setActiveTabId] = useState(() => getPreferredTabId(normalizedTabs))
  const userSelectedTabRef = useRef(false)

  useEffect(() => {
    if (normalizedTabs.length === 0) return

    const tabExists = normalizedTabs.some((tab) => tab.id === activeTabId)
    if (!activeTabId || !tabExists) {
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
