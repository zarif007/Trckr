'use client'

import { useCallback } from 'react'
import type { TrackerDisplayProps, TrackerSection, TrackerGrid } from '../types'
import {
  createNewSectionId,
  createNewGridId,
  getNextSectionPlaceId,
  getNextGridPlaceId,
} from './utils'

/**
 * Hook that returns section and grid mutation actions for block-level editing.
 * Use in TrackerTabContent / TrackerSection when edit mode is on.
 */
export function useSectionGridActions(
  schema: TrackerDisplayProps | undefined,
  onSchemaChange: ((schema: TrackerDisplayProps) => void) | undefined
) {
  const apply = useCallback(
    (patch: Partial<Pick<TrackerDisplayProps, 'sections' | 'grids' | 'layoutNodes'>>) => {
      if (!schema || !onSchemaChange) return
      onSchemaChange({ ...schema, ...patch })
    },
    [schema, onSchemaChange]
  )

  const addSection = useCallback(
    (tabId: string, afterPlaceId?: number) => {
      if (!schema) return
      const sections = schema.sections ?? []
      const sectionIds = new Set(sections.map((s) => s.id))
      const id = createNewSectionId(sectionIds)
      const placeId = getNextSectionPlaceId(sections, tabId, afterPlaceId)
      const newSection: TrackerSection = {
        id,
        name: 'New section',
        tabId,
        placeId,
      }
      apply({ sections: [...sections, newSection] })
    },
    [schema, apply]
  )

  const removeSection = useCallback(
    (sectionId: string) => {
      if (!schema) return
      const sections = (schema.sections ?? []).filter((s) => s.id !== sectionId)
      const grids = (schema.grids ?? []).filter((g) => g.sectionId !== sectionId)
      const layoutNodes = (schema.layoutNodes ?? []).filter(
        (n) => !grids.some((g) => g.id === n.gridId)
      )
      apply({ sections, grids, layoutNodes })
    },
    [schema, apply]
  )

  const moveSection = useCallback(
    (sectionId: string, direction: 'up' | 'down') => {
      if (!schema) return
      const sections = [...(schema.sections ?? [])]
      const tabSections = sections
        .filter((s) => sections.find((x) => x.id === sectionId)?.tabId === s.tabId)
        .sort((a, b) => a.placeId - b.placeId)
      const idx = tabSections.findIndex((s) => s.id === sectionId)
      if (idx < 0) return
      const swap = direction === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= tabSections.length) return
      const tabId = tabSections[idx]!.tabId
      const reordered = [...tabSections]
      const a = reordered[idx]!
      const b = reordered[swap]!
      reordered[idx] = b
      reordered[swap] = a
      const newPlaceIds = reordered.map((s, i) => ({ ...s, placeId: i }))
      const rest = sections.filter((s) => s.tabId !== tabId)
      apply({ sections: [...rest, ...newPlaceIds] })
    },
    [schema, apply]
  )

  const renameSection = useCallback(
    (sectionId: string, name: string) => {
      if (!schema) return
      const sections = (schema.sections ?? []).map((s) =>
        s.id === sectionId ? { ...s, name: name.trim() || s.name } : s
      )
      apply({ sections })
    },
    [schema, apply]
  )

  const addGrid = useCallback(
    (
      sectionId: string,
      type: 'table' | 'div' | 'kanban',
      afterPlaceId?: number
    ) => {
      if (!schema) return
      const grids = schema.grids ?? []
      const gridIds = new Set(grids.map((g) => g.id))
      const id = createNewGridId(gridIds)
      const placeId = getNextGridPlaceId(grids, sectionId, afterPlaceId)
      const names: Record<string, string> = {
        table: 'New table',
        div: 'New form',
        kanban: 'New board',
      }
      const newGrid: TrackerGrid = {
        id,
        name: names[type] ?? 'New grid',
        sectionId,
        placeId,
        type,
      }
      apply({ grids: [...grids, newGrid] })
    },
    [schema, apply]
  )

  const removeGrid = useCallback(
    (gridId: string) => {
      if (!schema) return
      const grids = (schema.grids ?? []).filter((g) => g.id !== gridId)
      const layoutNodes = (schema.layoutNodes ?? []).filter((n) => n.gridId !== gridId)
      apply({ grids, layoutNodes })
    },
    [schema, apply]
  )

  const moveGrid = useCallback(
    (gridId: string, direction: 'up' | 'down') => {
      if (!schema) return
      const grids = [...(schema.grids ?? [])]
      const sectionGrids = grids
        .filter((g) => grids.find((x) => x.id === gridId)?.sectionId === g.sectionId)
        .sort((a, b) => a.placeId - b.placeId)
      const idx = sectionGrids.findIndex((g) => g.id === gridId)
      if (idx < 0) return
      const swap = direction === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= sectionGrids.length) return
      const sectionId = sectionGrids[idx]!.sectionId
      const reordered = [...sectionGrids]
      const a = reordered[idx]!
      const b = reordered[swap]!
      reordered[idx] = b
      reordered[swap] = a
      const newPlaceIds = reordered.map((g, i) => ({ ...g, placeId: i }))
      const rest = grids.filter((g) => g.sectionId !== sectionId)
      apply({ grids: [...rest, ...newPlaceIds] })
    },
    [schema, apply]
  )

  const renameGrid = useCallback(
    (gridId: string, name: string) => {
      if (!schema) return
      const grids = (schema.grids ?? []).map((g) =>
        g.id === gridId ? { ...g, name: name.trim() || g.name } : g
      )
      apply({ grids })
    },
    [schema, apply]
  )

  /** Reorder sections in a tab by new order of section ids (e.g. from drag end). */
  const reorderSections = useCallback(
    (tabId: string, sectionIdsInOrder: string[]) => {
      if (!schema) return
      const sections = [...(schema.sections ?? [])]
      const byTab = sections.filter((s) => s.tabId === tabId)
      const rest = sections.filter((s) => s.tabId !== tabId)
      const reordered = sectionIdsInOrder
        .map((id) => byTab.find((s) => s.id === id))
        .filter((s): s is TrackerSection => !!s)
        .map((s, i) => ({ ...s, placeId: i }))
      apply({ sections: [...rest, ...reordered] })
    },
    [schema, apply]
  )

  /** Reorder grids in a section by new order of grid ids (e.g. from drag end). */
  const reorderGrids = useCallback(
    (sectionId: string, gridIdsInOrder: string[]) => {
      if (!schema) return
      const grids = [...(schema.grids ?? [])]
      const bySection = grids.filter((g) => g.sectionId === sectionId)
      const rest = grids.filter((g) => g.sectionId !== sectionId)
      const reordered = gridIdsInOrder
        .map((id) => bySection.find((g) => g.id === id))
        .filter((g): g is TrackerGrid => !!g)
        .map((g, i) => ({ ...g, placeId: i }))
      apply({ grids: [...rest, ...reordered] })
    },
    [schema, apply]
  )

  return {
    addSection,
    removeSection,
    moveSection,
    renameSection,
    reorderSections,
    addGrid,
    removeGrid,
    moveGrid,
    renameGrid,
    reorderGrids,
  }
}
