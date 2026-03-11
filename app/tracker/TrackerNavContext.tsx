'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type TrackerNavState = {
  name: string
  onNameChange: (name: string) => void
} | null

export type TrackerSaveState = {
  onSaveTracker: (() => void) | null
  onSaveData: (() => void) | null
  isAgentBuilding: boolean
  primaryNavAction: { label: string; href: string } | null
}

const TrackerNavContext = createContext<{
  trackerNav: TrackerNavState
  setTrackerNav: (state: TrackerNavState) => void
  saveState: TrackerSaveState
  setSaveState: (state: Partial<TrackerSaveState>) => void
} | null>(null)

const initialSaveState: TrackerSaveState = {
  onSaveTracker: null,
  onSaveData: null,
  isAgentBuilding: false,
  primaryNavAction: null,
}

export function TrackerNavProvider({ children }: { children: ReactNode }) {
  const [trackerNav, setTrackerNav] = useState<TrackerNavState>(null)
  const [saveState, setSaveStateInternal] = useState<TrackerSaveState>(initialSaveState)

  const setSaveState = useCallback((patch: Partial<TrackerSaveState>) => {
    setSaveStateInternal((prev) => ({ ...prev, ...patch }))
  }, [])

  const value = useMemo(
    () => ({ trackerNav, setTrackerNav, saveState, setSaveState }),
    [trackerNav, saveState, setSaveState]
  )

  return (
    <TrackerNavContext.Provider value={value}>
      {children}
    </TrackerNavContext.Provider>
  )
}

export function useTrackerNav() {
  const ctx = useContext(TrackerNavContext)
  if (!ctx) return null
  return ctx
}
