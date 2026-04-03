import { useCallback } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { DragEndEvent } from '@dnd-kit/core'
import { createNewTabId, getNextTabPlaceId } from '../edit-mode'
import type { TrackerDisplayProps, TrackerTab } from '../types'
import { SHARED_TAB_ID } from '@/lib/field-rules-options'

interface UseSchemaTabActionsInput {
 tabs: TrackerDisplayProps['tabs']
 sections: TrackerDisplayProps['sections']
 grids: TrackerDisplayProps['grids']
 fields: TrackerDisplayProps['fields']
 layoutNodes: TrackerDisplayProps['layoutNodes']
 bindings: TrackerDisplayProps['bindings']
 validations: TrackerDisplayProps['validations']
 calculations: TrackerDisplayProps['calculations']
 styles: TrackerDisplayProps['styles']
 dynamicOptions: TrackerDisplayProps['dynamicOptions']
 onSchemaChange: TrackerDisplayProps['onSchemaChange']
 normalizedTabs: TrackerTab[]
 activeTabId: string
 setActiveTabId: (tabId: string) => void
}

export function useSchemaTabActions({
 tabs,
 sections,
 grids,
 fields,
 layoutNodes,
 bindings,
 validations,
 calculations,
 styles,
 dynamicOptions,
 onSchemaChange,
 normalizedTabs,
 activeTabId,
 setActiveTabId,
}: UseSchemaTabActionsInput) {
 const handleAddTab = useCallback(() => {
 if (!onSchemaChange) return
 const tabList = tabs ?? []
 const existingIds = new Set(tabList.map((tab) => tab.id))
 const id = createNewTabId(existingIds)
 const placeId = getNextTabPlaceId(tabList)
 const newTab = { id, name: 'New tab', placeId, config: {} }

 onSchemaChange({
 tabs: [...tabList, newTab],
 sections: sections ?? [],
 grids: grids ?? [],
 fields: fields ?? [],
 layoutNodes: layoutNodes ?? [],
 bindings: bindings ?? {},
 validations,
 calculations,
 styles,
 dynamicOptions,
 })
 setActiveTabId(id)
 }, [tabs, sections, grids, fields, layoutNodes, bindings, validations, calculations, styles, dynamicOptions, onSchemaChange, setActiveTabId])

 const handleRemoveTab = useCallback((tabId: string) => {
 if (!onSchemaChange || tabId === SHARED_TAB_ID) return

 const tabList = (tabs ?? []).filter((tab) => tab.id !== tabId)
 const sectionIdsInTab = new Set((sections ?? []).filter((section) => section.tabId === tabId).map((section) => section.id))
 const nextSections = (sections ?? []).filter((section) => section.tabId !== tabId)
 const nextGrids = (grids ?? []).filter((grid) => !sectionIdsInTab.has(grid.sectionId))
 const removedGridIds = new Set((grids ?? []).filter((grid) => sectionIdsInTab.has(grid.sectionId)).map((grid) => grid.id))
 const nextLayoutNodes = (layoutNodes ?? []).filter((node) => !removedGridIds.has(node.gridId))

 onSchemaChange({
 tabs: tabList,
 sections: nextSections,
 grids: nextGrids,
 fields: fields ?? [],
 layoutNodes: nextLayoutNodes,
 bindings: bindings ?? {},
 validations,
 calculations,
 styles,
 dynamicOptions,
 })

 if (activeTabId === tabId) {
 setActiveTabId(tabList[0]?.id ?? '')
 }
 }, [tabs, sections, grids, fields, layoutNodes, bindings, validations, calculations, styles, dynamicOptions, onSchemaChange, activeTabId, setActiveTabId])

 const handleRenameTab = useCallback((tabId: string, name: string) => {
 if (!onSchemaChange || !tabs) return

 const nextTabs = tabs.map((tab) =>
 tab.id === tabId ? { ...tab, name: name.trim() || tab.name } : tab
 )

 onSchemaChange({
 tabs: nextTabs,
 sections: sections ?? [],
 grids: grids ?? [],
 fields: fields ?? [],
 layoutNodes: layoutNodes ?? [],
 bindings: bindings ?? {},
 validations,
 calculations,
 styles,
 dynamicOptions,
 })
 }, [tabs, sections, grids, fields, layoutNodes, bindings, validations, calculations, styles, dynamicOptions, onSchemaChange])

 const handleTabDragEnd = useCallback((event: DragEndEvent) => {
 const { active, over } = event
 if (!onSchemaChange || !over || active.id === over.id) return

 const activeId = String(active.id)
 const overId = String(over.id)
 if (!activeId.startsWith('tab-') || !overId.startsWith('tab-')) return

 const activeTabIdFromDrag = activeId.slice(4)
 const overTabIdFromDrag = overId.slice(4)

 const oldIndex = normalizedTabs.findIndex((tab) => tab.id === activeTabIdFromDrag)
 const newIndex = normalizedTabs.findIndex((tab) => tab.id === overTabIdFromDrag)
 if (oldIndex < 0 || newIndex < 0) return

 const reordered = arrayMove(normalizedTabs, oldIndex, newIndex)
 const hiddenTabs = (tabs ?? []).filter((tab) => tab.config?.isHidden)
 const reorderedWithPlaceIds: TrackerTab[] = reordered.map((tab, index) => ({
 ...tab,
 placeId: index,
 }))
 const hiddenWithPlaceIds: TrackerTab[] = hiddenTabs.map((tab, index) => ({
 ...tab,
 placeId: reordered.length + index,
 }))

 onSchemaChange({
 tabs: [...reorderedWithPlaceIds, ...hiddenWithPlaceIds],
 sections: sections ?? [],
 grids: grids ?? [],
 fields: fields ?? [],
 layoutNodes: layoutNodes ?? [],
 bindings: bindings ?? {},
 validations,
 calculations,
 styles,
 dynamicOptions,
 })
 }, [normalizedTabs, tabs, sections, grids, fields, layoutNodes, bindings, validations, calculations, styles, dynamicOptions, onSchemaChange])

 return {
 handleAddTab,
 handleRemoveTab,
 handleRenameTab,
 handleTabDragEnd,
 }
}
