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

const TrackerNavContext = createContext<{
  trackerNav: TrackerNavState
  setTrackerNav: (state: TrackerNavState) => void
} | null>(null)

export function TrackerNavProvider({ children }: { children: ReactNode }) {
  const [trackerNav, setTrackerNav] = useState<TrackerNavState>(null)
  return (
    <TrackerNavContext.Provider value={{ trackerNav, setTrackerNav }}>
      {children}
    </TrackerNavContext.Provider>
  )
}

export function useTrackerNav() {
  const ctx = useContext(TrackerNavContext)
  if (!ctx) return null
  return ctx
}
