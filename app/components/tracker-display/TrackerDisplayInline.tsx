'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrackerDisplayProps,
  TrackerTab,
  TrackerSection as ITrackerSection,
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  StyleOverrides,
  DependsOnRules,
} from './types'
import { TrackerSection } from './TrackerSection'
import { getInitialGridDataFromBindings } from '@/lib/resolve-bindings'
import { ensureDependsOnOptionGrids, SHARED_TAB_ID } from '@/lib/depends-on-options'

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
}: TrackerDisplayProps) {
  const normalizedTabs = useMemo(() => {
    return (tabs ?? [])
      .filter((tab) => !tab.config?.isHidden)
      .sort((a, b) => a.placeId - b.placeId)
  }, [tabs])

  const [activeTabId, setActiveTabId] = useState(
    normalizedTabs[0]?.id || '',
  )

  useEffect(() => {
    if (normalizedTabs.length > 0) {
      const tabExists = normalizedTabs.some(
        (tab) => tab.id === activeTabId,
      )
      if (!activeTabId || !tabExists) {
        setActiveTabId(normalizedTabs[0].id)
      }
    }
  }, [normalizedTabs, activeTabId])

  const seedGridData = useMemo(() => {
    const fromBindings = getInitialGridDataFromBindings(bindings ?? {})
    const fromInitial = initialGridData ?? {}
    const merged: Record<string, Array<Record<string, unknown>>> = {}
    const allGridIds = new Set([
      ...Object.keys(fromBindings),
      ...Object.keys(fromInitial),
    ])
    for (const gridId of allGridIds) {
      const initialRows = fromInitial[gridId]
      const bindingRows = fromBindings[gridId]
      if (initialRows && initialRows.length > 0) {
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
    value: unknown,
  ) => {
    setLocalGridData((prev) => {
      const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
      const next = [...current]
      // Ensure row exists (div grids use rowIndex 0 and start with empty array)
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

  if (!normalizedTabs.length) {
    return null
  }

  return (
    <div className="w-full space-y-6 p-6 bg-card border border-border rounded-lg animate-in fade-in-0 duration-300">
      <Tabs
        value={activeTabId}
        onValueChange={setActiveTabId}
        className="w-full"
      >
        {normalizedTabs.length > 0 && (
          <TabsList className="bg-slate-50 dark:bg-black transition-all duration-300">
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
            dependsOn={dependsOn}
            localGridData={localGridData}
            gridData={gridData}
            handleUpdate={handleUpdate}
            handleAddEntry={handleAddEntry}
            handleDeleteEntries={handleDeleteEntries}
          />
        ))}
      </Tabs>
    </div>
  )
}

function TrackerTabContent({
  tab,
  sections,
  grids,
  fields,
  layoutNodes,
  bindings,
  styles,
  dependsOn,
  localGridData,
  gridData,
  handleUpdate,
  handleAddEntry,
  handleDeleteEntries,
}: {
  tab: TrackerTab
  sections: ITrackerSection[]
  grids: TrackerGrid[]
  fields: TrackerField[]
  layoutNodes: TrackerLayoutNode[]
  bindings: TrackerBindings
  styles?: Record<string, StyleOverrides>
  dependsOn?: DependsOnRules
  localGridData: Record<string, Array<Record<string, unknown>>>
  gridData: Record<string, Array<Record<string, unknown>>>
  handleUpdate: (
    gridId: string,
    rowIndex: number,
    columnId: string,
    value: unknown,
  ) => void
  handleAddEntry: (gridId: string, newRow: Record<string, unknown>) => void
  handleDeleteEntries: (gridId: string, rowIndices: number[]) => void
}) {
  const tabSections = useMemo(() => {
    return sections
      .filter((section) => section.tabId === tab.id && !section.config?.isHidden)
      .sort((a, b) => a.placeId - b.placeId)
      .map((section) => ({
        ...section,
        grids: grids
          .filter((grid) => grid.sectionId === section.id)
          .sort((a, b) => a.placeId - b.placeId)
      }))
  }, [tab.id, sections, grids])

  return (
    <TabsContent
      key={tab.id}
      value={tab.id}
      className="space-y-6 mt-6"
    >
      {tabSections.map((section, index) => (
        <div
          key={section.id}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <TrackerSection
            tabId={tab.id}
            section={section}
            grids={section.grids}
            fields={fields}
            layoutNodes={layoutNodes}
            bindings={bindings}
            styles={styles}
            dependsOn={dependsOn}
            gridData={gridData}
            onUpdate={handleUpdate}
            onAddEntry={handleAddEntry}
            onDeleteEntries={handleDeleteEntries}
          />
        </div>
      ))}
    </TabsContent>
  )
}
