"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { resolveFieldRulesForRow } from "@/lib/field-rules";
import type { FieldRulesMap } from "@/lib/field-rules";
import {
  EntryFormDialog,
  type EntryFormSavePayload,
} from "../grids/data-table/entry-form-dialog";
import {
  ROW_ACCENT_HEX_CLIENT_KEY,
  parseRowAccentHex,
} from "@/lib/tracker-grid-rows";
import { EntryWayButton } from "../entry-way/EntryWayButton";
import type { EntryWayDefinition } from "../entry-way/entry-way-types";
import {
  KanbanCard,
  SortableKanbanCard,
  DroppableEmptyColumn,
  ColumnDropZone,
} from "../grids/kanban";
import { GridLayoutEditChrome } from "../grids/shared/GridLayoutEditChrome";
import {
  KanbanBoardSkeleton,
  KanbanColumnCardsSkeleton,
} from "../grids/shared/GridViewDataSkeleton";
import type { TrackerGrid, TrackerField, TrackerFieldType } from "../types";
import type { FieldCalculationRule } from "@/lib/functions/types";
import type { FieldMetadata } from "../grids/data-table/utils";
import type { UseKanbanPaginatedColumnsResult } from "@/lib/tracker-grid-rows";

/** Matches {@link useKanbanGroups} `cardFieldsDisplay` entries and {@link KanbanCard} `cardFields`. */
type KanbanCardFieldDisplay = {
  id: string;
  dataType: TrackerFieldType;
  label: string;
};

type KanbanCardStyleProps = {
  cardPadding: string;
  labelFontSize: string;
  valueFontSize: string;
  fontWeight: string;
  valueTextColor: string;
};

type GroupDescriptor = { id: string; label: string };

type GroupedCard = Record<string, unknown> & { _originalIdx: number };

export interface TrackerKanbanGridContentProps {
  grid: TrackerGrid;
  addable: boolean;
  cardFieldsDisplay: KanbanCardFieldDisplay[];
  canEditLayout: boolean;
  activeViewId?: string;
  existingLayoutFieldIds: string[];
  fields: TrackerField[];
  openAddColumnRequest: number;
  suppressEmbeddedAddColumn: boolean;
  effectiveCardVisibility: Record<string, boolean>;
  toggleCardFieldVisibility: (fieldId: string, visible: boolean) => void;
  entryWays: EntryWayDefinition[];
  mutateKanbanViaRowApi: boolean;
  onAddEntry?: (newRow: Record<string, unknown>) => void;
  showAddDialog: boolean;
  setShowAddDialog: (open: boolean) => void;
  groupByFieldId: string;
  groups: GroupDescriptor[];
  persistKanbanNewCard: (payload: EntryFormSavePayload) => void;
  getBindingUpdates: (
    fieldId: string,
    value: unknown,
  ) => Record<string, unknown>;
  fieldRulesV2?: FieldRulesMap;
  calculations?: Record<string, FieldCalculationRule>;
  gridDataForCards: Record<string, Array<Record<string, unknown>>>;
  fieldMetadata: FieldMetadata;
  fieldOrder: string[];
  editable: boolean;
  editCard: Record<string, unknown> | null;
  editRowIndex: number | null;
  setEditRowIndex: (idx: number | null) => void;
  setEditCard: (row: Record<string, unknown> | null) => void;
  rows: Array<Record<string, unknown>>;
  handlePaginatedEditSave: (payload: EntryFormSavePayload) => void | Promise<void>;
  handleEditSave: (payload: EntryFormSavePayload) => void;
  columnDiscoveryError: string | null;
  distinctKanbanGroupValuesLoading: boolean;
  groupedCards: Map<string, GroupedCard[]>;
  kanbanCols: UseKanbanPaginatedColumnsResult;
  canDrag: boolean;
  getCardSortId: (card: GroupedCard, groupId: string) => string;
  visibleCardFields: KanbanCardFieldDisplay[];
  deleteable: boolean;
  onDeleteEntries?: (rowIndices: number[]) => void;
  paginatedKanbanDisplay: boolean;
  cardStyles: KanbanCardStyleProps;
}

export function TrackerKanbanGridContent({
  grid,
  addable,
  cardFieldsDisplay,
  canEditLayout,
  activeViewId,
  existingLayoutFieldIds,
  fields,
  openAddColumnRequest,
  suppressEmbeddedAddColumn,
  effectiveCardVisibility,
  toggleCardFieldVisibility,
  entryWays,
  mutateKanbanViaRowApi,
  onAddEntry,
  showAddDialog,
  setShowAddDialog,
  groupByFieldId,
  groups,
  persistKanbanNewCard,
  getBindingUpdates,
  fieldRulesV2,
  calculations,
  gridDataForCards,
  fieldMetadata,
  fieldOrder,
  editable,
  editCard,
  editRowIndex,
  setEditRowIndex,
  setEditCard,
  rows,
  handlePaginatedEditSave,
  handleEditSave,
  columnDiscoveryError,
  distinctKanbanGroupValuesLoading,
  groupedCards,
  kanbanCols,
  canDrag,
  getCardSortId,
  visibleCardFields,
  deleteable,
  onDeleteEntries,
  paginatedKanbanDisplay,
  cardStyles,
}: TrackerKanbanGridContentProps) {
  return (
    <div className="w-full space-y-4">
      {(addable || cardFieldsDisplay.length > 0) && (
        <>
          <div className="flex justify-end items-center gap-2">
            {canEditLayout ? (
              <GridLayoutEditChrome
                gridId={grid.id}
                viewType="kanban"
                activeViewId={activeViewId}
                canEditLayout={canEditLayout}
                existingLayoutFieldIds={existingLayoutFieldIds}
                allFields={fields}
                openAddColumnRequest={openAddColumnRequest}
                showAddButton={!suppressEmbeddedAddColumn}
              />
            ) : null}
            {cardFieldsDisplay.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                    aria-label="Card preview fields"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent
                  className="sm:max-w-[300px]"
                  onInteractOutside={(e) => e.preventDefault()}
                >
                  <DialogHeader>
                    <DialogTitle>Card preview fields</DialogTitle>
                  </DialogHeader>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Choose which fields to show on cards (up to 5).
                  </p>
                  <div className="py-2 max-h-[50vh] overflow-y-auto pr-2 space-y-2">
                    {cardFieldsDisplay.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`card-field-${field.id}`}
                          checked={effectiveCardVisibility[field.id] ?? false}
                          onCheckedChange={(checked) =>
                            toggleCardFieldVisibility(field.id, !!checked)
                          }
                        />
                        <label
                          htmlFor={`card-field-${field.id}`}
                          className="text-sm font-medium leading-none cursor-pointer flex-1"
                        >
                          {field.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {addable && (
              <EntryWayButton
                onNewEntryClick={() => setShowAddDialog(true)}
                entryWays={entryWays}
                onSelectEntryWay={() => {}}
                disabled={!mutateKanbanViaRowApi && !onAddEntry}
              />
            )}
          </div>

          {addable && (
            <EntryFormDialog
              open={showAddDialog}
              onOpenChange={setShowAddDialog}
              title="Add New Entry"
              submitLabel="Add Entry"
              fieldMetadata={fieldMetadata}
              fieldOrder={fieldOrder}
              initialValues={
                groupByFieldId && groups.length > 0
                  ? {
                      [groupByFieldId]:
                        (groups.find((g) => g.id !== "") ?? groups[0])?.id ??
                        "",
                    }
                  : {}
              }
              onSave={(payload) => {
                if (mutateKanbanViaRowApi) {
                  persistKanbanNewCard(payload);
                  setShowAddDialog(false);
                  return;
                }
                const values = { ...payload.values };
                if (payload.rowAccentHex != null)
                  values[ROW_ACCENT_HEX_CLIENT_KEY] = payload.rowAccentHex;
                else delete values[ROW_ACCENT_HEX_CLIENT_KEY];
                onAddEntry?.(values);
                setShowAddDialog(false);
              }}
              onSaveAnother={(payload) => {
                if (mutateKanbanViaRowApi) {
                  persistKanbanNewCard(payload);
                  return;
                }
                const values = { ...payload.values };
                if (payload.rowAccentHex != null)
                  values[ROW_ACCENT_HEX_CLIENT_KEY] = payload.rowAccentHex;
                else delete values[ROW_ACCENT_HEX_CLIENT_KEY];
                onAddEntry?.(values);
              }}
              getBindingUpdates={getBindingUpdates}
              getFieldOverrides={(values, fieldId) => {
                const { overrides } = resolveFieldRulesForRow(
                  fieldRulesV2,
                  grid.id,
                  values,
                  0,
                );
                return overrides[fieldId] as
                  | Record<string, unknown>
                  | undefined;
              }}
              gridId={grid.id}
              calculations={calculations}
              gridData={gridDataForCards}
            />
          )}
        </>
      )}

      {editable && (
        <EntryFormDialog
          open={mutateKanbanViaRowApi ? editCard !== null : editRowIndex !== null}
          onOpenChange={(open) => {
            if (!open) {
              setEditRowIndex(null);
              setEditCard(null);
            }
          }}
          title="Row Details"
          submitLabel="Update Entry"
          fieldMetadata={fieldMetadata}
          fieldOrder={fieldOrder}
          initialValues={
            mutateKanbanViaRowApi
              ? { ...(editCard ?? {}) }
              : editRowIndex != null
                ? (rows[editRowIndex] ?? {})
                : {}
          }
          initialRowAccentHex={
            mutateKanbanViaRowApi
              ? parseRowAccentHex(
                  (editCard as Record<string, unknown> | null)?.[
                    ROW_ACCENT_HEX_CLIENT_KEY
                  ],
                )
              : editRowIndex != null
                ? parseRowAccentHex(
                    (rows[editRowIndex] as Record<string, unknown> | undefined)?.[
                      ROW_ACCENT_HEX_CLIENT_KEY
                    ],
                  )
                : null
          }
          onSave={
            mutateKanbanViaRowApi
              ? (payload) => {
                  void handlePaginatedEditSave(payload);
                }
              : handleEditSave
          }
          getBindingUpdates={getBindingUpdates}
          getFieldOverrides={(values, fieldId) => {
            const rowIndex = mutateKanbanViaRowApi ? 0 : (editRowIndex ?? 0);
            const { overrides } = resolveFieldRulesForRow(
              fieldRulesV2,
              grid.id,
              values,
              rowIndex,
            );
            return overrides[fieldId] as Record<string, unknown> | undefined;
          }}
          gridId={grid.id}
          calculations={calculations}
          gridData={gridDataForCards}
        />
      )}

      {columnDiscoveryError ? (
        <p
          className={cn(
            "mb-2 rounded-sm border px-3 py-2 text-xs text-warning",
            theme.uiChrome.border,
            theme.radius.md,
          )}
          role="status"
        >
          {columnDiscoveryError} — columns may be incomplete until you refresh.
        </p>
      ) : null}

      {mutateKanbanViaRowApi &&
      distinctKanbanGroupValuesLoading &&
      groups.length === 0 ? (
        <KanbanBoardSkeleton columnCount={5} className="py-2" />
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {groups.map((group) => {
          const cardsInGroup = groupedCards.get(group.id) ?? [];

          return (
            <div key={group.id} className="shrink-0 w-[320px]">
              <div
                className={cn(
                  "mb-3 border bg-muted/50 px-4 py-3",
                  theme.radius.md,
                  theme.border.verySubtle,
                )}
              >
                <h3
                  className={`${theme.typography.headingXsMono} font-semibold text-foreground text-sm flex items-center justify-between gap-2`}
                >
                  <span className="truncate">
                    {group.label || "Uncategorized"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      theme.typography.badge,
                      "bg-background/50",
                    )}
                  >
                    {mutateKanbanViaRowApi
                      ? (kanbanCols.columns[group.id]?.total ?? 0)
                      : cardsInGroup.length}
                  </span>
                </h3>
              </div>
              <div className="space-y-3 min-h-[100px] flex flex-col">
                {mutateKanbanViaRowApi &&
                kanbanCols.columns[group.id]?.loading &&
                cardsInGroup.length === 0 ? (
                  <KanbanColumnCardsSkeleton count={3} />
                ) : null}
                {canDrag ? (
                  mutateKanbanViaRowApi &&
                  kanbanCols.columns[group.id]?.loading &&
                  cardsInGroup.length === 0 ? null : (
                    <SortableContext
                      id={group.id}
                      items={cardsInGroup.map((c) => getCardSortId(c, group.id))}
                      strategy={verticalListSortingStrategy}
                    >
                      {cardsInGroup.length === 0 ? (
                        <DroppableEmptyColumn id={group.id} />
                      ) : (
                        <>
                          {cardsInGroup.map((card) => {
                            const sortId = getCardSortId(card, group.id);
                            return (
                              <SortableKanbanCard
                                key={sortId}
                                id={sortId}
                                card={card}
                                cardFields={visibleCardFields}
                                gridId={grid.id}
                                gridData={gridDataForCards}
                                fieldRules={fieldRulesV2}
                                fieldMetadata={fieldMetadata}
                                onEditRow={
                                  editable && !mutateKanbanViaRowApi
                                    ? setEditRowIndex
                                    : undefined
                                }
                                onEditCard={
                                  editable && mutateKanbanViaRowApi
                                    ? () =>
                                        setEditCard({
                                          ...(card as Record<string, unknown>),
                                        })
                                    : undefined
                                }
                                onDeleteRow={
                                  mutateKanbanViaRowApi && deleteable
                                    ? () => {
                                        const rid = String(
                                          (card as Record<string, unknown>)
                                            ._rowId ?? "",
                                        );
                                        if (!rid) return;
                                        void kanbanCols
                                          .deleteRowOnServer(rid)
                                          .then(() =>
                                            kanbanCols.removeCardLocally(
                                              group.id,
                                              rid,
                                            ),
                                          )
                                          .catch(() => kanbanCols.refetchAll());
                                      }
                                    : deleteable && onDeleteEntries
                                      ? () =>
                                          onDeleteEntries([card._originalIdx])
                                      : undefined
                                }
                                styles={cardStyles}
                              />
                            );
                          })}
                          <ColumnDropZone id={group.id} />
                        </>
                      )}
                    </SortableContext>
                  )
                ) : cardsInGroup.length === 0 ? (
                  <div className="text-xs text-muted-foreground/70 px-2 py-2">
                    No entries
                  </div>
                ) : (
                  cardsInGroup.map((card) => (
                    <KanbanCard
                      key={`${group.id}-${card.row_id ?? card.id ?? card._originalIdx ?? "row"}`}
                      card={card}
                      cardFields={visibleCardFields}
                      gridId={grid.id}
                      gridData={gridDataForCards}
                      fieldRules={fieldRulesV2}
                      fieldMetadata={fieldMetadata}
                      styles={cardStyles}
                    />
                  ))
                )}
                {paginatedKanbanDisplay &&
                (kanbanCols.columns[group.id]?.total ?? 0) >
                  (kanbanCols.columns[group.id]?.rows.length ?? 0) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    disabled={
                      kanbanCols.columns[group.id]?.loadingMore ?? false
                    }
                    onClick={() => void kanbanCols.loadMore(group.id)}
                  >
                    {kanbanCols.columns[group.id]?.loadingMore
                      ? "Loading…"
                      : "Load more"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
