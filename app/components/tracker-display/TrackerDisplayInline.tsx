'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import type { TrackerDisplayProps } from './types'
import type { TrackerTab } from './types'
import { TrackerTabContent } from './sections'
import { InlineEditableName } from './layout'
import { TrackerOptionsProvider } from './tracker-options-context'
import { EditModeProvider } from './edit-mode'
import { createNewTabId, getNextTabPlaceId } from './edit-mode'
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
  validations,
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

  const handleUpdate = useCallback(
    (gridId: string, rowIndex: number, columnId: string, value: unknown) => {
      setLocalGridData((prev) => {
        const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
        const next = [...current]
        while (next.length <= rowIndex) next.push({})
        next[rowIndex] = { ...next[rowIndex], [columnId]: value }
        return { ...(prev ?? {}), [gridId]: next }
      })
    },
    [baseGridData]
  )

  const handleAddEntry = useCallback(
    (gridId: string, newRow: Record<string, unknown>) => {
      setLocalGridData((prev) => {
        const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
        return { ...(prev ?? {}), [gridId]: [...current, newRow] }
      })
    },
    [baseGridData]
  )

  const handleDeleteEntries = useCallback(
    (gridId: string, rowIndices: number[]) => {
      setLocalGridData((prev) => {
        const current = prev?.[gridId] ?? baseGridData[gridId] ?? []
        const filtered = current.filter((_, index) => !rowIndices.includes(index))
        return { ...(prev ?? {}), [gridId]: filtered }
      })
    },
    [baseGridData]
  )

  const editModeSchema = useMemo(
    () =>
      editMode
        ? { tabs, sections, grids, fields, layoutNodes, bindings, validations, styles, dependsOn }
        : undefined,
    [editMode, tabs, sections, grids, fields, layoutNodes, bindings, validations, styles, dependsOn]
  )

  const handleAddTab = useCallback(() => {
    if (!onSchemaChange) return
    const tabList = tabs ?? []
    const existingIds = new Set(tabList.map((t) => t.id))
    const id = createNewTabId(existingIds)
    const placeId = getNextTabPlaceId(tabList)
    const newTab = { id, name: 'New tab', placeId }
    onSchemaChange({
      tabs: [...tabList, newTab],
      sections: sections ?? [],
      grids: grids ?? [],
      fields: fields ?? [],
      layoutNodes: layoutNodes ?? [],
      bindings: bindings ?? {},
      validations,
      styles,
      dependsOn,
    })
    setActiveTabId(id)
  }, [tabs, sections, grids, fields, layoutNodes, bindings, validations, styles, dependsOn, onSchemaChange])

  const handleRemoveTab = useCallback(
    (tabId: string) => {
      if (!onSchemaChange) return
      const tabList = (tabs ?? []).filter((t) => t.id !== tabId)
      const sectionIdsInTab = new Set(
        (sections ?? []).filter((s) => s.tabId === tabId).map((s) => s.id)
      )
      const nextSections = (sections ?? []).filter((s) => s.tabId !== tabId)
      const nextGrids = (grids ?? []).filter((g) => !sectionIdsInTab.has(g.sectionId))
      const removedGridIds = new Set(
        (grids ?? []).filter((g) => sectionIdsInTab.has(g.sectionId)).map((g) => g.id)
      )
      const nextLayoutNodes = (layoutNodes ?? []).filter(
        (n) => !removedGridIds.has(n.gridId)
      )
      onSchemaChange({
        tabs: tabList,
        sections: nextSections,
        grids: nextGrids,
        fields: fields ?? [],
        layoutNodes: nextLayoutNodes,
        bindings: bindings ?? {},
        validations,
        styles,
        dependsOn,
      })
      if (activeTabId === tabId) {
        const next = tabList[0]?.id ?? ''
        setActiveTabId(next)
      }
    },
    [
      tabs,
      sections,
      grids,
      fields,
      layoutNodes,
      bindings,
      validations,
      styles,
      dependsOn,
      onSchemaChange,
      activeTabId,
    ]
  )

  const handleRenameTab = useCallback(
    (tabId: string, name: string) => {
      if (!onSchemaChange || !tabs) return
      const nextTabs = (tabs ?? []).map((t) =>
        t.id === tabId ? { ...t, name: name.trim() || t.name } : t
      )
      onSchemaChange({
        tabs: nextTabs,
        sections: sections ?? [],
        grids: grids ?? [],
        fields: fields ?? [],
        layoutNodes: layoutNodes ?? [],
        bindings: bindings ?? {},
        validations,
        styles,
        dependsOn,
      })
    },
    [tabs, sections, grids, fields, layoutNodes, bindings, validations, styles, dependsOn, onSchemaChange]
  )

  const handleTabDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!onSchemaChange || !over || active.id === over.id) return

      const activeId = String(active.id)
      const overId = String(over.id)
      if (!activeId.startsWith('tab-') || !overId.startsWith('tab-')) return
      const activeTabIdFromDrag = activeId.slice(4)
      const overTabIdFromDrag = overId.slice(4)

      const oldIndex = normalizedTabs.findIndex((t) => t.id === activeTabIdFromDrag)
      const newIndex = normalizedTabs.findIndex((t) => t.id === overTabIdFromDrag)
      if (oldIndex < 0 || newIndex < 0) return

      const reordered = arrayMove(normalizedTabs, oldIndex, newIndex)
      const hiddenTabs = (tabs ?? []).filter((t) => t.config?.isHidden)
      const reorderedWithPlaceIds: TrackerTab[] = reordered.map((t, i) => ({
        ...t,
        placeId: i,
      }))
      const hiddenWithPlaceIds: TrackerTab[] = hiddenTabs.map((t, i) => ({
        ...t,
        placeId: reordered.length + i,
      }))
      onSchemaChange({
        tabs: [...reorderedWithPlaceIds, ...hiddenWithPlaceIds],
        sections: sections ?? [],
        grids: grids ?? [],
        fields: fields ?? [],
        layoutNodes: layoutNodes ?? [],
        bindings: bindings ?? {},
        validations,
        styles,
        dependsOn,
      })
    },
    [
      normalizedTabs,
      tabs,
      sections,
      grids,
      fields,
      layoutNodes,
      bindings,
      validations,
      styles,
      dependsOn,
      onSchemaChange,
    ]
  )

  const tabSortableIds = useMemo(
    () => normalizedTabs.map((t) => `tab-${t.id}`),
    [normalizedTabs]
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function SortableTabRow({ tab, index }: { tab: TrackerTab; index: number }) {
    const id = `tab-${tab.id}`
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id })
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      animationDelay: `${index * 50}ms`,
    }
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group flex items-center gap-0.5 animate-in fade-in-0 slide-in-from-left-2 duration-300 ${isDragging ? 'opacity-50' : ''}`}
      >
        {editMode && onSchemaChange && (
          <span
            className="flex min-w-0 max-w-0 shrink-0 cursor-grab active:cursor-grabbing items-center justify-center rounded text-muted-foreground/50 overflow-hidden transition-[max-width] duration-200 group-hover:max-w-6 hover:bg-muted/80"
            aria-hidden
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0" />
          </span>
        )}
        <TabsTrigger value={tab.id}>
          {editMode && onSchemaChange ? (
            <span onClick={(e) => e.stopPropagation()} className="min-w-0 truncate">
              <InlineEditableName
                value={tab.name}
                onChange={(name) => handleRenameTab(tab.id, name)}
                className="text-sm font-medium truncate"
              />
            </span>
          ) : (
            tab.name
          )}
        </TabsTrigger>
        {editMode && onSchemaChange && (
          <span className="flex min-w-0 max-w-0 shrink-0 overflow-hidden transition-[max-width] duration-200 group-hover:max-w-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 rounded text-muted-foreground/50 hover:text-destructive"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRemoveTab(tab.id)
              }}
              aria-label={`Remove tab ${tab.name}`}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
            </Button>
          </span>
        )}
      </div>
    )
  }

  if (!normalizedTabs.length && !editMode) return null

  const tabListContent =
    normalizedTabs.length > 0 || editMode ? (
      <TabsList>
        {editMode && onSchemaChange ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleTabDragEnd}
          >
            <SortableContext
              items={tabSortableIds}
              strategy={horizontalListSortingStrategy}
            >
              {normalizedTabs.map((tab, index) => (
                <SortableTabRow key={tab.id} tab={tab} index={index} />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          normalizedTabs.map((tab, index) => (
            <div
              key={tab.id}
              className="flex items-center gap-0.5 animate-in fade-in-0 slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <TabsTrigger value={tab.id}>
                {tab.name}
              </TabsTrigger>
            </div>
          ))
        )}
      </TabsList>
    ) : null

  const content = (
    <div className="w-full space-y-6 p-6 bg-card rounded-lg animate-in fade-in-0 duration-300">
      <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
        <div className="flex items-center gap-2">
          {tabListContent}
          {editMode && onSchemaChange && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleAddTab}
              aria-label="Add tab"
              className="shrink-0 h-9 w-9"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        {normalizedTabs.map((tab) => (
          <TrackerTabContent
            key={tab.id}
            tab={tab}
            sections={effectiveSections}
            grids={effectiveGrids}
            fields={effectiveFields}
            layoutNodes={effectiveLayoutNodes}
            bindings={effectiveBindings}
            validations={validations}
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
