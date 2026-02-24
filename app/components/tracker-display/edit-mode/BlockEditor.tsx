'use client'

import { useMemo, useCallback, useState } from 'react'
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

import { BlockWrapper } from './BlockWrapper'
import { BlockCommandInput } from './BlockCommandInput'
import { AddColumnOrFieldDialog } from './AddColumnOrFieldDialog'
import { useEditMode } from './context'
import { useSectionGridActions } from './useSectionGridActions'
import { useLayoutActions } from './useLayoutActions'
import { getOrCreateSectionAndGridForField, getOrCreateSectionForGrid } from './ensureContainer'
import { createNewGridId, getNextGridPlaceId } from './utils'
import { GridBlockContent, GridBlockHeader } from '../blocks'
import { SectionBar, InlineEditableName } from '../layout'
import {
  SECTION_STACK_GAP,
  SECTION_GROUP_ROOT,
  GRIDS_CONTAINER,
  GRID_ITEM_WRAPPER,
  GRID_BLOCK_INNER,
} from '../layout'
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
// Sortable block wrapper
// ---------------------------------------------------------------------------

function SortableBlockItem({
  block,
  children,
  onRemove,
  label,
  afterBlockIndex,
  onOpenAddBlock,
}: {
  block: FlatBlock
  children: React.ReactNode
  onRemove: () => void
  label: string
  afterBlockIndex: number
  onOpenAddBlock: (insertAfterIndex: number) => void
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
      onAddBlockClick={() => onOpenAddBlock(afterBlockIndex + 1)}
    >
      {children}
    </BlockWrapper>
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
  validations,
  calculations,
  styles,
  dependsOn,
  gridData,
  gridDataRef,
  onUpdate,
  onAddEntry,
  onDeleteEntries,
}: BlockEditorProps) {
  const { schema, onSchemaChange } = useEditMode()
  const actions = useSectionGridActions(schema, onSchemaChange)

  // --- Add field from block level ---
  const [addFieldTargetGridId, setAddFieldTargetGridId] = useState<string | null>(null)
  const fieldLayoutActions = useLayoutActions(addFieldTargetGridId ?? '', schema, onSchemaChange)

  // --- Inline add-block inserter (opened by plus button on a block) ---
  const [insertInserterAfterBlockIndex, setInsertInserterAfterBlockIndex] = useState<number | null>(null)

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

  // Add grid (table/kanban/form): create section if none exists.
  // When we create a section (nextSchema !== schema), apply section + grid in one update
  // so the second update doesn't overwrite the first (stale closure bug when starting with no data).
  const handleAddGrid = useCallback(
    (afterBlockIndex: number, type: 'table' | 'kanban' | 'div') => {
      if (!schema || !onSchemaChange) return
      const { sectionId, nextSchema } = getOrCreateSectionForGrid(
        tab.id,
        afterBlockIndex,
        flatBlocks,
        schema
      )
      if (nextSchema !== schema) {
        const grids = nextSchema.grids ?? []
        const gridIds = new Set(grids.map((g) => g.id))
        const id = createNewGridId(gridIds)
        const placeId = getNextGridPlaceId(grids, sectionId)
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
        onSchemaChange({ ...nextSchema, grids: [...grids, newGrid] })
      } else {
        addGridToSection(sectionId, type)
      }
    },
    [tab.id, flatBlocks, schema, onSchemaChange, addGridToSection]
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

  // Context-aware command callbacks for a specific position in the block list.
  // All options always available: create section/grid when needed.
  const getCommandProps = useCallback(
    (afterBlockIndex: number) => ({
      onAddSection: addSectionAtEnd,
      onAddTable: () => handleAddGrid(afterBlockIndex, 'table'),
      onAddKanban: () => handleAddGrid(afterBlockIndex, 'kanban'),
      onAddForm: () => handleAddGrid(afterBlockIndex, 'div'),
      onAddField: () => handleAddField(afterBlockIndex),
    }),
    [addSectionAtEnd, handleAddGrid, handleAddField]
  )

  // Command props that also close the inline inserter when an action is selected.
  const getCommandPropsWithClose = useCallback(
    (afterBlockIndex: number) => {
      const props = getCommandProps(afterBlockIndex)
      const clear = () => setInsertInserterAfterBlockIndex(null)
      return {
        onAddSection: props.onAddSection ? () => { props.onAddSection!(); clear() } : undefined,
        onAddTable: props.onAddTable ? () => { props.onAddTable!(); clear() } : undefined,
        onAddKanban: props.onAddKanban ? () => { props.onAddKanban!(); clear() } : undefined,
        onAddForm: props.onAddForm ? () => { props.onAddForm!(); clear() } : undefined,
        onAddField: props.onAddField ? () => { props.onAddField!(); clear() } : undefined,
      }
    },
    [getCommandProps]
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
        <div className={`${SECTION_STACK_GAP} w-full min-w-0`}>
          {sectionGroups.map((group) => (
            <div key={group.section.id} className={SECTION_GROUP_ROOT}>
              {/* Section heading */}
              <SortableBlockItem
                block={{ type: 'section', id: group.section.id }}
                label={group.section.name}
                onRemove={() => actions.removeSection(group.section.id)}
                afterBlockIndex={group.sectionBlockIndex}
                onOpenAddBlock={setInsertInserterAfterBlockIndex}
              >
                <SectionBar name={group.section.name}>
                  <InlineEditableName
                    value={group.section.name}
                    onChange={(name) => actions.renameSection(group.section.id, name)}
                  />
                </SectionBar>
              </SortableBlockItem>

              {/* Inline add-block inserter below section (when plus clicked on section) */}
              {insertInserterAfterBlockIndex === group.sectionBlockIndex + 1 && (
                <div className="flex py-2 mt-2 w-full">
                  <div className="flex-1 min-w-0">
                    <BlockCommandInput
                      {...getCommandPropsWithClose(insertInserterAfterBlockIndex)}
                    />
                  </div>
                </div>
              )}

              {/* Grids in this section */}
              {group.gridBlocks.length > 0 && (
                <div className={GRIDS_CONTAINER}>
                  {group.gridBlocks.map(({ grid, blockIndex }) => (
                    <div key={grid.id} className={GRID_ITEM_WRAPPER}>
                      <SortableBlockItem
                        block={{ type: 'grid', id: grid.id, sectionId: group.section.id }}
                        label={grid.name}
                        onRemove={() => actions.removeGrid(grid.id)}
                        afterBlockIndex={blockIndex}
                        onOpenAddBlock={setInsertInserterAfterBlockIndex}
                      >
                        <div className={GRID_BLOCK_INNER}>
                          <GridBlockHeader
                            grid={grid}
                            name={grid.name}
                            editable
                            onNameChange={(name) => actions.renameGrid(grid.id, name)}
                          />
                  <GridBlockContent
                    tabId={tab.id}
                    grid={grid}
                    layoutNodes={layoutNodes}
                    allLayoutNodes={layoutNodes}
                    fields={fields}
                    allGrids={grids}
                    allFields={fields}
                    bindings={bindings}
                    validations={validations}
                    calculations={calculations}
                    styles={styles}
                    dependsOn={dependsOn}
                    gridData={gridData}
                    gridDataRef={gridDataRef}
                    onUpdate={onUpdate}
                    onAddEntry={onAddEntry}
                    onDeleteEntries={onDeleteEntries}
                            hideLabel
                          />
                        </div>
                      </SortableBlockItem>
                      {/* Inline add-block inserter below this grid (when plus clicked on grid) */}
                      {insertInserterAfterBlockIndex === blockIndex + 1 && (
                        <div className="flex py-2 mt-2 w-full">
                          <div className="flex-1 min-w-0">
                            <BlockCommandInput
                              {...getCommandPropsWithClose(insertInserterAfterBlockIndex)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty section: no default inserter; user clicks + on section to add */}
            </div>
          ))}

          {/* Only always-visible add-block row: at the bottom. Others appear on + click. */}
          <div className="flex pt-2 pb-0 w-full">
            <div className="flex-1 min-w-0">
              <BlockCommandInput
                {...getCommandProps(flatBlocks.length)}
              />
            </div>
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
