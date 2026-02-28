'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

export type TrackerNavState = {
  name: string
  onNameChange: (name: string) => void
} | null

export type TrackerSaveState = {
  onSaveTracker: (() => void) | null
  isAgentBuilding: boolean
}

const TrackerNavContext = createContext<{
  trackerNav: TrackerNavState
  setTrackerNav: (state: TrackerNavState) => void
  saveState: TrackerSaveState
  setSaveState: (state: Partial<TrackerSaveState>) => void
} | null>(null)

const initialSaveState: TrackerSaveState = {
  onSaveTracker: null,
  isAgentBuilding: false,
}

export function TrackerNavProvider({ children }: { children: ReactNode }) {
  const [trackerNav, setTrackerNav] = useState<TrackerNavState>(null)
  const [saveState, setSaveStateInternal] = useState<TrackerSaveState>(initialSaveState)

  const setSaveState = useCallback((patch: Partial<TrackerSaveState>) => {
    setSaveStateInternal((prev) => ({ ...prev, ...patch }))
  }, [])

  return (
    <TrackerNavContext.Provider
      value={{ trackerNav, setTrackerNav, saveState, setSaveState }}
    >
      {children}
    </TrackerNavContext.Provider>
  )
}

export function useTrackerNav() {
  const ctx = useContext(TrackerNavContext)
  if (!ctx) return null
  return ctx
}
