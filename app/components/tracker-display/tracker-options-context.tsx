'use client'

import { createContext, useContext, useMemo } from 'react'
import type { TrackerGrid, TrackerField, TrackerLayoutNode, TrackerSection } from './types'
import type { TrackerContextForOptions } from '@/lib/binding'
import type { DynamicOptionsDefinitions, ForeignBindingSourceSchema } from '@/lib/dynamic-options'

const TrackerOptionsContext = createContext<TrackerContextForOptions | null>(null)

export function TrackerOptionsProvider({
 grids,
 fields,
 layoutNodes,
 sections,
 dynamicOptions,
 gridData,
 trackerSchemaId,
 foreignGridDataBySchemaId,
 foreignSchemaBySchemaId,
 onAddEntryToForeignGrid,
 children,
}: {
 grids: TrackerGrid[]
 fields: TrackerField[]
 layoutNodes?: TrackerLayoutNode[]
 sections?: TrackerSection[]
 dynamicOptions?: DynamicOptionsDefinitions
 gridData?: Record<string, Array<Record<string, unknown>>>
 trackerSchemaId?: string | null
 foreignGridDataBySchemaId?: Record<string, Record<string, Array<Record<string, unknown>>>> | null
 foreignSchemaBySchemaId?: Record<string, ForeignBindingSourceSchema> | null
 onAddEntryToForeignGrid?: (sourceSchemaId: string, gridId: string, row: Record<string, unknown>) => void
 children: React.ReactNode
}) {
 const value = useMemo<TrackerContextForOptions>(
 () => ({
 grids,
 fields,
 layoutNodes,
 sections,
 dynamicOptions,
 gridData,
 ...(trackerSchemaId ? { trackerSchemaId } : {}),
 ...(foreignGridDataBySchemaId && Object.keys(foreignGridDataBySchemaId).length > 0
 ? { foreignGridDataBySchemaId }
 : {}),
 ...(foreignSchemaBySchemaId && Object.keys(foreignSchemaBySchemaId).length > 0
 ? { foreignSchemaBySchemaId }
 : {}),
 ...(onAddEntryToForeignGrid ? { onAddEntryToForeignGrid } : {}),
 }),
 [
 grids,
 fields,
 layoutNodes,
 sections,
 dynamicOptions,
 gridData,
 trackerSchemaId,
 foreignGridDataBySchemaId,
 foreignSchemaBySchemaId,
 onAddEntryToForeignGrid,
 ]
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
