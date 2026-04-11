import type { UseKanbanPaginatedColumnsResult } from "./hooks/useKanbanPaginatedColumns";
import type { UsePaginatedGridDataResult } from "./hooks/usePaginatedGridData";
import { createOptimisticTempRowId } from "./optimistic-temp-row-id";
import { rowPayloadForPatch } from "./row-utils";

export type PaginatedRowPersistenceApi = Pick<
  UsePaginatedGridDataResult,
  | "createRowOnServer"
  | "prependRowLocal"
  | "refetch"
  | "patchRowOnServer"
  | "updateRowLocal"
  | "removeRowsLocal"
>;

export type KanbanCardPersistenceApi = Pick<
  UseKanbanPaginatedColumnsResult,
  | "prependCardLocally"
  | "removeCardLocally"
  | "createRowOnServer"
  | "refetchAll"
>;

/**
 * Persists a new row either via the tracker row HTTP API (paginated grids) or the in-memory snapshot handler.
 * Row API path is optimistic: inserts a temp row locally first, then saves on server in the background.
 */
export function persistNewTrackerGridRow(args: {
  mutateViaRowApi: boolean;
  pg: PaginatedRowPersistenceApi;
  values: Record<string, unknown>;
  onSnapshotAdd?: (row: Record<string, unknown>) => void;
}): void {
  if (args.mutateViaRowApi) {
    const tempId = createOptimisticTempRowId();
    args.pg.prependRowLocal({ ...args.values, _rowId: tempId });
    void args.pg
      .createRowOnServer(args.values)
      .then((created) => {
        args.pg.updateRowLocal(tempId, () => created);
      })
      .catch(() => {
        args.pg.removeRowsLocal([tempId]);
        args.pg.refetch();
      });
    return;
  }
  args.onSnapshotAdd?.(args.values);
}

/**
 * Optimistic create for kanban columns: temp card in the target column, then replace with the server row.
 */
export function persistNewKanbanCardViaRowApi(args: {
  kanban: KanbanCardPersistenceApi;
  groupId: string;
  values: Record<string, unknown>;
}): void {
  const tempId = createOptimisticTempRowId();
  args.kanban.prependCardLocally(args.groupId, {
    ...args.values,
    _rowId: tempId,
  });
  void args.kanban
    .createRowOnServer(args.values)
    .then((row) => {
      args.kanban.removeCardLocally(args.groupId, tempId);
      args.kanban.prependCardLocally(args.groupId, row);
    })
    .catch(() => {
      args.kanban.removeCardLocally(args.groupId, tempId);
      args.kanban.refetchAll();
    });
}

/**
 * Persists an edited row: row API path updates local state immediately then PATCHes (refetch on failure);
 * snapshot path calls `onSnapshotUpdate` per changed field.
 */
export async function persistEditedTrackerGridRow(args: {
  mutateViaRowApi: boolean;
  pg: PaginatedRowPersistenceApi;
  rowIndex: number;
  rows: Array<Record<string, unknown>>;
  values: Record<string, unknown>;
  onSnapshotUpdate?: (
    rowIndex: number,
    columnId: string,
    value: unknown,
  ) => void;
}): Promise<void> {
  if (args.mutateViaRowApi) {
    const row = args.rows[args.rowIndex] as Record<string, unknown> | undefined;
    const rid = row?._rowId;
    if (typeof rid === "string") {
      const merged = { ...row, ...args.values };
      args.pg.updateRowLocal(rid, () => merged as (typeof args.rows)[number]);
      void args.pg
        .patchRowOnServer(rid, rowPayloadForPatch(merged))
        .catch(() => {
          args.pg.refetch();
        });
    }
    return;
  }
  if (!args.onSnapshotUpdate) return;
  for (const [columnId, value] of Object.entries(args.values)) {
    args.onSnapshotUpdate(args.rowIndex, columnId, value);
  }
}
