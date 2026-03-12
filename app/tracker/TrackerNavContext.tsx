'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { TrackerFormAction } from '@/app/components/tracker-display/types'

export type TrackerNavState = {
  name: string
  onNameChange: (name: string) => void
} | null

export type TrackerSaveState = {
  onSaveTracker: (() => void) | null
  onSaveData: (() => void | Promise<void>) | null
  isAgentBuilding: boolean
  primaryNavAction: { label: string; href: string } | null
  /**
   * Save feedback for tracker data actions shown in the top nav.
   * - `autosaveEnabled` toggles autosave status badge visibility.
   * - `dataSaveStatus` tracks current save lifecycle state.
   */
  autosaveEnabled: boolean
  dataSaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  dataSaveError: string | null
  formActions: TrackerFormAction[]
  currentFormStatus: string | null
  previousFormStatus: string | null
  visibleFormActions: TrackerFormAction[]
  formActionSaving: boolean
  formActionError: string | null
  canConfigureFormActions: boolean
  onFormActionsChange: ((actions: TrackerFormAction[]) => void) | null
  onFormActionSelect: ((action: TrackerFormAction) => void | Promise<void>) | null
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
  autosaveEnabled: false,
  dataSaveStatus: 'idle',
  dataSaveError: null,
  formActions: [],
  currentFormStatus: null,
  previousFormStatus: null,
  visibleFormActions: [],
  formActionSaving: false,
  formActionError: null,
  canConfigureFormActions: false,
  onFormActionsChange: null,
  onFormActionSelect: null,
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
