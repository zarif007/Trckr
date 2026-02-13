'use client'

import { createContext, useContext, useMemo } from 'react'
import type { TrackerGrid, TrackerField } from './types'
import type { TrackerContextForOptions } from '@/lib/resolve-options'

const TrackerOptionsContext = createContext<TrackerContextForOptions | null>(null)

export function TrackerOptionsProvider({
  grids,
  fields,
  children,
}: {
  grids: TrackerGrid[]
  fields: TrackerField[]
  children: React.ReactNode
}) {
  const value = useMemo<TrackerContextForOptions>(
    () => ({ grids, fields }),
    [grids, fields]
  )
  return (
    <TrackerOptionsContext.Provider value={value}>
      {children}
    </TrackerOptionsContext.Provider>
  )
}

export function useTrackerOptionsContext(): TrackerContextForOptions | null {
  return useContext(TrackerOptionsContext)
}
