'use client'

import { useState, useEffect, useMemo, useCallback, useRef, type CSSProperties } from 'react'
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
  DEPENDS_ON_OPTIONS_SECTION_ID,
  rulesGridRowsToDependsOn,
} from '@/lib/depends-on-options'
// Bindings grid (Shared tab) intentionally unused; bindings are configured per field settings now.

const DEFAULT_SHARED_TAB: TrackerTab = {
  id: SHARED_TAB_ID,
  name: 'Shared',
  placeId: 999,
  config: {},
}

function getPreferredTabId(tabs: TrackerTab[]): string {
  const nonShared = tabs.find((tab) => tab.id !== SHARED_TAB_ID)
  return nonShared?.id ?? tabs[0]?.id ?? ''
}

// Stable component so tab row is not remounted on parent re-render (avoids animate-in re-trigger on add/edit).
function SortableTabRow({
  tab,
  editMode,
  onSchemaChange,
  onRenameTab,
  onRemoveTab,
}: {
  tab: TrackerTab
  editMode?: boolean
  onSchemaChange?: TrackerDisplayProps['onSchemaChange']
  onRenameTab: (tabId: string, name: string) => void
  /** When undefined, remove button is hidden (e.g. for non-removable Shared tab). */
  onRemoveTab: ((tabId: string) => void) | undefined
}) {
  const id = `tab-${tab.id}`
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-0.5 ${isDragging ? 'opacity-50' : ''}`}
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
              onChange={(name) => onRenameTab(tab.id, name)}
              className="text-sm font-medium truncate"
            />
          </span>
        ) : (
          tab.name
        )}
      </TabsTrigger>
      {editMode && onSchemaChange && onRemoveTab && (
        <span className="flex min-w-0 max-w-0 shrink-0 overflow-hidden transition-[max-width] duration-200 group-hover:max-w-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 rounded text-muted-foreground/50 hover:text-destructive"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRemoveTab(tab.id)
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
  undo,
  canUndo,
}: TrackerDisplayProps) {
  const normalizedTabs = useMemo(() => {
    const list = (tabs ?? []).filter((tab) => !tab.config?.isHidden)
    const hasShared = list.some((t) => t.id === SHARED_TAB_ID)
    if (!hasShared) {
      return [...list, DEFAULT_SHARED_TAB].sort((a, b) => a.placeId - b.placeId)
    }
    return list.sort((a, b) => a.placeId - b.placeId)
  }, [tabs])

  /** True when the Shared tab is in the displayed tab list (so we show Bindings + Rules sections there). */
  const hasSharedTabInView = useMemo(
    () => normalizedTabs.some((t) => t.id === SHARED_TAB_ID),
    [normalizedTabs]
  )

  const [activeTabId, setActiveTabId] = useState(() => getPreferredTabId(normalizedTabs))
  const userSelectedTabRef = useRef(false)

  useEffect(() => {
    if (normalizedTabs.length > 0) {
      const tabExists = normalizedTabs.some((tab) => tab.id === activeTabId)
      const hasNonShared = normalizedTabs.some((tab) => tab.id !== SHARED_TAB_ID)
      const shouldAutoMoveFromShared =
        activeTabId === SHARED_TAB_ID && hasNonShared && !userSelectedTabRef.current
      if (!activeTabId || !tabExists || shouldAutoMoveFromShared) {
        setActiveTabId(getPreferredTabId(normalizedTabs))
      }
    }
  }, [normalizedTabs, activeTabId])

  const handleTabChange = useCallback((nextTabId: string) => {
    userSelectedTabRef.current = true
    setActiveTabId(nextTabId)
  }, [])

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

  const sharedTabAug = useMemo(() => {
    if (!hasSharedTabInView) return null
    const dependsOnAug = ensureDependsOnOptionGrids({
      sections: sections ?? [],
      grids: grids ?? [],
      fields: fields ?? [],
      layoutNodes: layoutNodes ?? [],
      bindings: bindings ?? {},
      dependsOn: dependsOn ?? [],
    })
    const mergedSeedGridData = {
      ...dependsOnAug.seedGridData,
    }
    const sectionsWithOrder = dependsOnAug.sections.map((s) => {
      if (s.tabId !== SHARED_TAB_ID) return s
      if (s.id === DEPENDS_ON_OPTIONS_SECTION_ID) return { ...s, placeId: 0 }
      return { ...s, placeId: Math.max(1, (s.placeId ?? 0)) }
    })
    return {
      sections: sectionsWithOrder,
      grids: dependsOnAug.grids,
      fields: dependsOnAug.fields,
      layoutNodes: dependsOnAug.layoutNodes,
      bindings: dependsOnAug.bindings,
      seedGridData: mergedSeedGridData,
      hasBindingsGrid: false,
    }
  }, [hasSharedTabInView, sections, grids, fields, layoutNodes, bindings, dependsOn])

  const effectiveSections = sharedTabAug ? sharedTabAug.sections : (sections ?? [])
  const effectiveGrids = sharedTabAug ? sharedTabAug.grids : (grids ?? [])
  const effectiveFields = sharedTabAug ? sharedTabAug.fields : (fields ?? [])
  const effectiveLayoutNodes = sharedTabAug ? sharedTabAug.layoutNodes : (layoutNodes ?? [])

  const baseGridData = useMemo(() => {
    const merged = { ...seedGridData }
    if (sharedTabAug) {
      for (const [gridId, rows] of Object.entries(sharedTabAug.seedGridData)) {
        merged[gridId] = rows
      }
    }
    return merged
  }, [seedGridData, sharedTabAug])

  const gridData = useMemo(() => {
    const merged = { ...baseGridData }
    for (const [gridId, rows] of Object.entries(localGridData)) {
      if (Array.isArray(rows)) merged[gridId] = rows
    }
    return merged
  }, [baseGridData, localGridData])

  const gridDataRef = useRef<Record<string, Array<Record<string, unknown>>>>(gridData)
  gridDataRef.current = gridData

  const effectiveBindings = useMemo(() => bindings ?? {}, [bindings])

  const effectiveDependsOn = useMemo(() => {
    if (!sharedTabAug) return dependsOn ?? []
    const rulesRows = gridData[DEPENDS_ON_RULES_GRID]
    return rulesGridRowsToDependsOn(rulesRows)
  }, [sharedTabAug, gridData, dependsOn])

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
      if (!onSchemaChange || tabId === SHARED_TAB_ID) return
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
              {normalizedTabs.map((tab) => (
                <SortableTabRow
                  key={tab.id}
                  tab={tab}
                  editMode={editMode}
                  onSchemaChange={onSchemaChange}
                  onRenameTab={handleRenameTab}
                  onRemoveTab={tab.id === SHARED_TAB_ID ? undefined : handleRemoveTab}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          normalizedTabs.map((tab) => (
            <div key={tab.id} className="flex items-center gap-0.5">
              <TabsTrigger value={tab.id}>
                {tab.name}
              </TabsTrigger>
            </div>
          ))
        )}
      </TabsList>
    ) : null

  const content = (
    <div className="w-full min-w-0 space-y-6 px-0 py-4 md:p-6 bg-card rounded-lg">
      <Tabs value={activeTabId} onValueChange={handleTabChange} className="w-full min-w-0">
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
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
            gridDataRef={gridDataRef}
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
        undo={undo}
        canUndo={canUndo}
      >
        {content}
      </EditModeProvider>
    </TrackerOptionsProvider>
  )
}
