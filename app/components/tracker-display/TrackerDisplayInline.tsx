'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TrackerDisplayProps } from './types'
import { TrackerTabContent } from './TrackerTabContent'
import { TrackerOptionsProvider } from './tracker-options-context'
import { EditModeProvider } from './edit-mode'
import { getInitialGridDataFromBindings } from '@/lib/resolve-bindings'
import {
  ensureDependsOnOptionGrids,
  SHARED_TAB_ID,
  DEPENDS_ON_RULES_GRID,
  rulesGridRowsToDependsOn,
} from '@/lib/depends-on-options'

export function TrackerDisplayInline({
  tabs,
  sections,
  grids,
  fields,
  layoutNodes = [],
  bindings = {},
  styles,
  initialGridData,
  getDataRef,
  dependsOn,
  editMode,
  onSchemaChange,
}: TrackerDisplayProps) {
  const normalizedTabs = useMemo(
    () =>
      (tabs ?? [])
        .filter((tab) => !tab.config?.isHidden)
        .sort((a, b) => a.placeId - b.placeId),
    [tabs]
  )

  const [activeTabId, setActiveTabId] = useState(normalizedTabs[0]?.id ?? '')

  useEffect(() => {
    if (normalizedTabs.length > 0) {
      const tabExists = normalizedTabs.some((tab) => tab.id === activeTabId)
      if (!activeTabId || !tabExists) {
        setActiveTabId(normalizedTabs[0].id)
      }
    }
  }, [normalizedTabs, activeTabId])

  const seedGridData = useMemo(() => {
    const fromBindings = getInitialGridDataFromBindings(bindings ?? {})
    const fromInitial = initialGridData ?? {}
    const merged: Record<string, Array<Record<string, unknown>>> = {}
    const allGridIds = new Set([...Object.keys(fromBindings), ...Object.keys(fromInitial)])
    for (const gridId of allGridIds) {
      const initialRows = fromInitial[gridId]
      const bindingRows = fromBindings[gridId]
      if (initialRows?.length > 0) {
        merged[gridId] = initialRows
      } else if (Array.isArray(bindingRows)) {
        merged[gridId] = bindingRows
      } else {
        merged[gridId] = []
      }
    }
    return merged
  }, [bindings, initialGridData])

  const [localGridData, setLocalGridData] = useState<
    Record<string, Array<Record<string, unknown>>>
  >(() => ({}))

  const hasSharedTab = (tabs ?? []).some((t) => t.id === SHARED_TAB_ID)
  const dependsOnAug = useMemo(() => {
    if (!hasSharedTab) return null
    return ensureDependsOnOptionGrids({
      sections: sections ?? [],
      grids: grids ?? [],
      fields: fields ?? [],
      layoutNodes: layoutNodes ?? [],
      bindings: bindings ?? {},
      dependsOn: dependsOn ?? [],
    })
  }, [hasSharedTab, sections, grids, fields, layoutNodes, bindings, dependsOn])

  const effectiveSections = dependsOnAug ? dependsOnAug.sections : (sections ?? [])
  const effectiveGrids = dependsOnAug ? dependsOnAug.grids : (grids ?? [])
  const effectiveFields = dependsOnAug ? dependsOnAug.fields : (fields ?? [])
  const effectiveLayoutNodes = dependsOnAug ? dependsOnAug.layoutNodes : (layoutNodes ?? [])
  const effectiveBindings = dependsOnAug ? dependsOnAug.bindings : (bindings ?? {})

  const baseGridData = useMemo(() => {
    const merged = { ...seedGridData }
    if (dependsOnAug) {
      for (const [gridId, rows] of Object.entries(dependsOnAug.seedGridData)) {
        merged[gridId] = rows
      }
    }
    return merged
  }, [seedGridData, dependsOnAug])

  const gridData = useMemo(() => {
    const merged = { ...baseGridData }
    for (const [gridId, rows] of Object.entries(localGridData)) {
      if (Array.isArray(rows)) merged[gridId] = rows
    }
    return merged
  }, [baseGridData, localGridData])

  const effectiveDependsOn = useMemo(() => {
    if (!dependsOnAug) return dependsOn ?? []
    const rulesRows = gridData[DEPENDS_ON_RULES_GRID]
    return rulesGridRowsToDependsOn(rulesRows)
  }, [dependsOnAug, gridData, dependsOn])

  useEffect(() => {
    if (getDataRef) {
      getDataRef.current = () => gridData
      return () => {
        getDataRef.current = null
      }
    }
  }, [gridData, getDataRef])

  const handleUpdate = (
    gridId: string,
    rowIndex: number,
    columnId: string,
    value: unknown
  ) => {
    setLocalGridData((prev) => {
      const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
      const next = [...current]
      while (next.length <= rowIndex) next.push({})
      next[rowIndex] = { ...next[rowIndex], [columnId]: value }
      return { ...(prev ?? {}), [gridId]: next }
    })
  }

  const handleAddEntry = (gridId: string, newRow: Record<string, unknown>) => {
    setLocalGridData((prev) => {
      const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
      return { ...(prev ?? {}), [gridId]: [...current, newRow] }
    })
  }

  const handleDeleteEntries = (gridId: string, rowIndices: number[]) => {
    setLocalGridData((prev) => {
      const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
      const filtered = current.filter((_, index) => !rowIndices.includes(index))
      return { ...(prev ?? {}), [gridId]: filtered }
    })
  }

  if (!normalizedTabs.length) return null

  const editModeSchema = editMode
    ? { tabs, sections, grids, fields, layoutNodes, bindings, styles, dependsOn }
    : undefined

  const content = (
    <div className="w-full space-y-6 p-6 bg-card border border-border rounded-lg animate-in fade-in-0 duration-300">
      <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
        {normalizedTabs.length > 0 && (
          <TabsList className="bg-muted transition-all duration-300">
            {normalizedTabs.map((tab, index) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="animate-in fade-in-0 slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
        )}
        {normalizedTabs.map((tab) => (
          <TrackerTabContent
            key={tab.id}
            tab={tab}
            sections={effectiveSections}
            grids={effectiveGrids}
            fields={effectiveFields}
            layoutNodes={effectiveLayoutNodes}
            bindings={effectiveBindings}
            styles={styles}
            dependsOn={effectiveDependsOn}
            gridData={gridData}
            onUpdate={handleUpdate}
            onAddEntry={handleAddEntry}
            onDeleteEntries={handleDeleteEntries}
          />
        ))}
      </Tabs>
    </div>
  )

  return (
    <TrackerOptionsProvider
      grids={effectiveGrids}
      fields={effectiveFields}
      layoutNodes={effectiveLayoutNodes}
      sections={effectiveSections}
    >
      <EditModeProvider
        editMode={!!editMode}
        schema={editModeSchema}
        onSchemaChange={onSchemaChange}
      >
        {content}
      </EditModeProvider>
    </TrackerOptionsProvider>
  )
}
