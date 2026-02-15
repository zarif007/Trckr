'use client'

import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LayoutList, Table2, LayoutGrid, FormInput } from 'lucide-react'

import { BlockWrapper } from './BlockWrapper'
import { BlockCommandInput } from './BlockCommandInput'
import { AddColumnOrFieldDialog } from './AddColumnOrFieldDialog'
import { useEditMode } from './context'
import { useSectionGridActions } from './useSectionGridActions'
import { useLayoutActions } from './useLayoutActions'
import { getOrCreateSectionAndGridForField } from './ensureContainer'
import { GridBlockContent } from '../GridBlockContent'
import type { FlatBlock, BlockEditorProps, AddColumnOrFieldResult } from './types'
import type { TrackerSection, TrackerGrid } from '../types'

// ---------------------------------------------------------------------------
// Sortable ID helpers
// ---------------------------------------------------------------------------

const SECTION_PREFIX = 'block-section-'
const GRID_PREFIX = 'block-grid-'

function blockSortableId(block: FlatBlock): string {
  return block.type === 'section'
    ? `${SECTION_PREFIX}${block.id}`
    : `${GRID_PREFIX}${block.id}`
}

function parseBlockSortableId(sortableId: string): FlatBlock | null {
  if (sortableId.startsWith(SECTION_PREFIX)) {
    return { type: 'section', id: sortableId.slice(SECTION_PREFIX.length) }
  }
  if (sortableId.startsWith(GRID_PREFIX)) {
    return { type: 'grid', id: sortableId.slice(GRID_PREFIX.length), sectionId: '' }
  }
  return null
}

// ---------------------------------------------------------------------------
// Inline editable section name
// ---------------------------------------------------------------------------

function InlineEditableName({
  value,
  onChange,
}: {
  value: string
  onChange: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        className="text-base font-semibold text-foreground hover:text-primary cursor-text transition-colors text-left truncate leading-7"
        onClick={() => setEditing(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') setEditing(true) }}
        title="Click to rename"
      >
        {value}
      </span>
    )
  }

  return (
    <input
      ref={inputRef}
      className="text-base font-semibold text-foreground bg-transparent border-b border-primary/50 outline-none w-full leading-7"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim()
        if (trimmed && trimmed !== value) onChange(trimmed)
        setEditing(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const trimmed = draft.trim()
          if (trimmed && trimmed !== value) onChange(trimmed)
          setEditing(false)
        }
        if (e.key === 'Escape') {
          setDraft(value)
          setEditing(false)
        }
      }}
    />
  )
}

// ---------------------------------------------------------------------------
// Sortable block wrapper
// ---------------------------------------------------------------------------

function SortableBlockItem({
  block,
  children,
  onRemove,
  label,
}: {
  block: FlatBlock
  children: React.ReactNode
  onRemove: () => void
  label: string
}) {
  const id = blockSortableId(block)
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
  }

  return (
    <BlockWrapper
      blockId={block.id}
      variant={block.type === 'section' ? 'section' : 'grid'}
      label={label}
      onRemove={onRemove}
      wrapperRef={setNodeRef}
      wrapperStyle={style}
      dragHandleProps={{ ...attributes, ...listeners }}
      isDragging={isDragging}
    >
      {children}
    </BlockWrapper>
  )
}

// ---------------------------------------------------------------------------
// Grid type badge
// ---------------------------------------------------------------------------

function GridTypeBadge({ grid }: { grid: TrackerGrid }) {
  const type = grid.views?.[0]?.type ?? grid.type ?? 'table'
  const map: Record<string, { icon: typeof Table2; label: string }> = {
    table: { icon: Table2, label: 'Table' },
    kanban: { icon: LayoutGrid, label: 'Kanban' },
    div: { icon: FormInput, label: 'Form' },
  }
  const info = map[type] ?? map.table!
  const Icon = info.icon
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
      <Icon className="h-3 w-3" />
      {info.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// BlockEditor
// ---------------------------------------------------------------------------

/**
 * Flat Notion-like block editor for a single tab.
 * Renders sections and grids as a flat vertical list of blocks
 * with drag-and-drop, inline rename, and slash commands.
 */
export function BlockEditor({
  tab,
  sections,
  grids,
  fields,
  layoutNodes,
  bindings,
  styles,
  dependsOn,
  gridData,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: BlockEditorProps) {
  const { schema, onSchemaChange } = useEditMode()
  const actions = useSectionGridActions(schema, onSchemaChange)

  // --- Add field from block level ---
  const [addFieldTargetGridId, setAddFieldTargetGridId] = useState<string | null>(null)
  const fieldLayoutActions = useLayoutActions(addFieldTargetGridId ?? '', schema, onSchemaChange)

  // Build flat block list: [section, ...its grids, section, ...its grids, ...]
  const { flatBlocks, sectionMap, gridMap } = useMemo(() => {
    const tabSections = sections
      .filter((s) => s.tabId === tab.id && !s.config?.isHidden)
      .sort((a, b) => a.placeId - b.placeId)

    const sectionMap = new Map<string, TrackerSection>()
    tabSections.forEach((s) => sectionMap.set(s.id, s))

    const gridMap = new Map<string, TrackerGrid>()
    grids.forEach((g) => gridMap.set(g.id, g))

    const blocks: FlatBlock[] = []
    for (const section of tabSections) {
      blocks.push({ type: 'section', id: section.id })
      const sectionGrids = grids
        .filter((g) => g.sectionId === section.id)
        .sort((a, b) => a.placeId - b.placeId)
      for (const grid of sectionGrids) {
        blocks.push({ type: 'grid', id: grid.id, sectionId: section.id })
      }
    }

    return { flatBlocks: blocks, sectionMap, gridMap }
  }, [tab.id, sections, grids])

  const sortableIds = useMemo(
    () => flatBlocks.map(blockSortableId),
    [flatBlocks]
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // --- Drag end handler ---
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeBlock = parseBlockSortableId(String(active.id))
      const overBlock = parseBlockSortableId(String(over.id))
      if (!activeBlock || !overBlock) return

      const activeIdx = flatBlocks.findIndex(
        (b) => b.type === activeBlock.type && b.id === activeBlock.id
      )
      const overIdx = flatBlocks.findIndex(
        (b) => b.type === overBlock.type && b.id === overBlock.id
      )
      if (activeIdx < 0 || overIdx < 0) return

      const reordered = arrayMove(flatBlocks, activeIdx, overIdx)

      if (!schema || !onSchemaChange) return

      let currentSectionId: string | null = null
      let sectionPlaceId = 0
      const gridPlaceCounters: Record<string, number> = {}

      const updatedSections = [...(schema.sections ?? [])]
      const updatedGrids = [...(schema.grids ?? [])]

      for (const block of reordered) {
        if (block.type === 'section') {
          currentSectionId = block.id
          const sIdx = updatedSections.findIndex((s) => s.id === block.id)
          if (sIdx >= 0) {
            updatedSections[sIdx] = { ...updatedSections[sIdx], placeId: sectionPlaceId }
          }
          sectionPlaceId++
          gridPlaceCounters[block.id] = 0
        } else if (block.type === 'grid' && currentSectionId) {
          const gIdx = updatedGrids.findIndex((g) => g.id === block.id)
          if (gIdx >= 0) {
            const counter = gridPlaceCounters[currentSectionId] ?? 0
            updatedGrids[gIdx] = {
              ...updatedGrids[gIdx],
              sectionId: currentSectionId,
              placeId: counter,
            }
            gridPlaceCounters[currentSectionId] = counter + 1
          }
        }
      }

      onSchemaChange({
        ...schema,
        sections: updatedSections,
        grids: updatedGrids,
      })
    },
    [flatBlocks, schema, onSchemaChange]
  )

  // --- Add block helpers ---
  const addSectionAtEnd = useCallback(() => {
    actions.addSection(tab.id)
  }, [tab.id, actions])

  const addGridToSection = useCallback(
    (sectionId: string, type: 'table' | 'kanban' | 'div') => {
      actions.addGrid(sectionId, type)
    },
    [actions]
  )

  // "Add field" from block level: ensure section+grid exist, then open dialog
  const handleAddField = useCallback(
    (afterBlockIndex: number) => {
      if (!schema || !onSchemaChange) return
      const { gridId, nextSchema } = getOrCreateSectionAndGridForField(
        tab.id,
        afterBlockIndex,
        flatBlocks,
        schema
      )
      if (nextSchema !== schema) {
        onSchemaChange(nextSchema)
      }
      setAddFieldTargetGridId(gridId)
    },
    [tab.id, flatBlocks, schema, onSchemaChange]
  )

  const handleAddFieldConfirm = useCallback(
    (result: AddColumnOrFieldResult) => {
      fieldLayoutActions.add(result)
      setAddFieldTargetGridId(null)
    },
    [fieldLayoutActions]
  )

  // Context-aware command callbacks for a specific position in the block list
  const getCommandProps = useCallback(
    (afterBlockIndex: number) => {
      let sectionId: string | null = null
      for (let i = afterBlockIndex; i >= 0; i--) {
        if (flatBlocks[i]?.type === 'section') {
          sectionId = flatBlocks[i].id
          break
        }
      }

      return {
        onAddSection: addSectionAtEnd,
        onAddTable: sectionId ? () => addGridToSection(sectionId!, 'table') : undefined,
        onAddKanban: sectionId ? () => addGridToSection(sectionId!, 'kanban') : undefined,
        onAddForm: sectionId ? () => addGridToSection(sectionId!, 'div') : undefined,
        onAddField: () => handleAddField(afterBlockIndex),
      }
    },
    [flatBlocks, addSectionAtEnd, addGridToSection, handleAddField]
  )

  // --- Group blocks by section for visual hierarchy ---
  const sectionGroups = useMemo(() => {
    const groups: Array<{
      section: TrackerSection
      sectionBlockIndex: number
      gridBlocks: Array<{ grid: TrackerGrid; blockIndex: number }>
    }> = []
    let currentGroup: (typeof groups)[number] | null = null

    flatBlocks.forEach((block, index) => {
      if (block.type === 'section') {
        const section = sectionMap.get(block.id)
        if (section) {
          currentGroup = { section, sectionBlockIndex: index, gridBlocks: [] }
          groups.push(currentGroup)
        }
      } else if (block.type === 'grid' && currentGroup) {
        const grid = gridMap.get(block.id)
        if (grid) {
          currentGroup.gridBlocks.push({ grid, blockIndex: index })
        }
      }
    })

    return groups
  }, [flatBlocks, sectionMap, gridMap])

  // --- Render ---
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {sectionGroups.map((group) => (
            <div key={group.section.id} className="pl-10">
              {/* Section heading */}
              <SortableBlockItem
                block={{ type: 'section', id: group.section.id }}
                label={group.section.name}
                onRemove={() => actions.removeSection(group.section.id)}
              >
                <div className="flex items-center gap-2 pb-1">
                  <LayoutList className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                  <InlineEditableName
                    value={group.section.name}
                    onChange={(name) => actions.renameSection(group.section.id, name)}
                  />
                </div>
              </SortableBlockItem>

              {/* Grids nested under section with visual indentation */}
              {group.gridBlocks.length > 0 && (
                <div className="ml-2 pl-4 border-l-2 border-border/50 space-y-3 mt-1">
                  {group.gridBlocks.map(({ grid, blockIndex }) => (
                    <div key={grid.id}>
                      <SortableBlockItem
                        block={{ type: 'grid', id: grid.id, sectionId: group.section.id }}
                        label={grid.name}
                        onRemove={() => actions.removeGrid(grid.id)}
                      >
                        <div className="space-y-2 py-1">
                          <div className="flex items-center gap-2">
                            <GridTypeBadge grid={grid} />
                            <InlineEditableName
                              value={grid.name}
                              onChange={(name) => actions.renameGrid(grid.id, name)}
                            />
                          </div>
                          <GridBlockContent
                            tabId={tab.id}
                            grid={grid}
                            layoutNodes={layoutNodes}
                            allLayoutNodes={layoutNodes}
                            fields={fields}
                            allGrids={grids}
                            allFields={fields}
                            bindings={bindings}
                            styles={styles}
                            dependsOn={dependsOn}
                            gridData={gridData}
                            onUpdate={onUpdate}
                            onAddEntry={onAddEntry}
                            onDeleteEntries={onDeleteEntries}
                            hideLabel
                          />
                        </div>
                      </SortableBlockItem>
                    </div>
                  ))}
                  {/* Add block inside this section (for grids/fields) */}
                  <BlockCommandInput
                    {...getCommandProps(
                      group.gridBlocks.length > 0
                        ? group.gridBlocks[group.gridBlocks.length - 1].blockIndex + 1
                        : group.sectionBlockIndex + 1
                    )}
                  />
                </div>
              )}

              {/* If section has no grids yet, show inserter directly */}
              {group.gridBlocks.length === 0 && (
                <div className="ml-2 pl-4 border-l-2 border-dashed border-border/30 mt-1">
                  <p className="text-xs text-muted-foreground/50 py-1">Empty section — add a grid or field below</p>
                  <BlockCommandInput
                    {...getCommandProps(group.sectionBlockIndex + 1)}
                  />
                </div>
              )}
            </div>
          ))}

          {/* Final inserter at the bottom for adding top-level sections */}
          <div className="pl-10">
            <BlockCommandInput
              {...getCommandProps(flatBlocks.length)}
            />
          </div>

          {/* Add-field dialog (opened from slash command → Field) */}
          {addFieldTargetGridId && (
            <AddColumnOrFieldDialog
              open
              onOpenChange={(open) => {
                if (!open) setAddFieldTargetGridId(null)
              }}
              variant="field"
              existingFieldIds={
                layoutNodes
                  .filter((n) => n.gridId === addFieldTargetGridId)
                  .map((n) => n.fieldId)
              }
              allFields={fields}
              onConfirm={handleAddFieldConfirm}
            />
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}
