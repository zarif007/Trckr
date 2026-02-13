'use client'

import { createContext, useContext, useMemo } from 'react'
import type { TrackerGrid, TrackerField, TrackerLayoutNode, TrackerSection } from './types'
import type { TrackerContextForOptions } from '@/lib/resolve-options'

const TrackerOptionsContext = createContext<TrackerContextForOptions | null>(null)

export function TrackerOptionsProvider({
  grids,
  fields,
  layoutNodes,
  sections,
  children,
}: {
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes?: TrackerLayoutNode[]
  sections?: TrackerSection[]
  children: React.ReactNode
}) {
  const value = useMemo<TrackerContextForOptions>(
    () => ({ grids, fields, layoutNodes, sections }),
    [grids, fields, layoutNodes, sections]
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
