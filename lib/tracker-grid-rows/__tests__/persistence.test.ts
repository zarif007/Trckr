import { describe, it, expect, vi } from "vitest";
import {
  persistNewTrackerGridRow,
  persistEditedTrackerGridRow,
  persistNewKanbanCardViaRowApi,
} from "../persistence";

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe("persistNewTrackerGridRow (optimistic)", () => {
  function makePg() {
    return {
      createRowOnServer: vi
        .fn()
        .mockResolvedValue({ _rowId: "srv_1", title: "hello" }),
      prependRowLocal: vi.fn(),
      removeRowsLocal: vi.fn(),
      refetch: vi.fn(),
      patchRowOnServer: vi.fn(),
      updateRowLocal: vi.fn(),
    };
  }

  it("prepends a temp row immediately, then replaces with server row", async () => {
    const pg = makePg();
    persistNewTrackerGridRow({
      mutateViaRowApi: true,
      pg,
      values: { title: "hello" },
    });

    expect(pg.prependRowLocal).toHaveBeenCalledTimes(1);
    const tempRow = pg.prependRowLocal.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(tempRow.title).toBe("hello");
    expect(typeof tempRow._rowId).toBe("string");
    expect((tempRow._rowId as string).startsWith("__optimistic_")).toBe(true);

    await flushMicrotasks();
    expect(pg.updateRowLocal).toHaveBeenCalledWith(
      tempRow._rowId,
      expect.any(Function),
    );
    const updater = pg.updateRowLocal.mock.calls[0][1] as () => Record<
      string,
      unknown
    >;
    expect(updater()).toEqual({ _rowId: "srv_1", title: "hello" });
  });

  it("removes temp row and refetches on server error", async () => {
    const pg = makePg();
    pg.createRowOnServer.mockRejectedValue(new Error("network"));

    persistNewTrackerGridRow({
      mutateViaRowApi: true,
      pg,
      values: { x: 1 },
    });

    const tempRow = pg.prependRowLocal.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    await flushMicrotasks();
    expect(pg.removeRowsLocal).toHaveBeenCalledWith([tempRow._rowId]);
    expect(pg.refetch).toHaveBeenCalledTimes(1);
  });

  it("calls snapshot handler when not using row API", () => {
    const pg = makePg();
    const onSnapshotAdd = vi.fn();
    persistNewTrackerGridRow({
      mutateViaRowApi: false,
      pg,
      values: { a: 1 },
      onSnapshotAdd,
    });
    expect(pg.prependRowLocal).not.toHaveBeenCalled();
    expect(onSnapshotAdd).toHaveBeenCalledWith({ a: 1 });
  });
});

describe("persistNewKanbanCardViaRowApi", () => {
  function makeKanban() {
    return {
      prependCardLocally: vi.fn(),
      removeCardLocally: vi.fn(),
      createRowOnServer: vi
        .fn()
        .mockResolvedValue({ _rowId: "srv_k", title: "card" }),
      refetchAll: vi.fn(),
    };
  }

  it("prepends temp card then swaps for server row", async () => {
    const kanban = makeKanban();
    persistNewKanbanCardViaRowApi({
      kanban,
      groupId: "col_a",
      values: { status: "col_a", title: "card" },
    });

    expect(kanban.prependCardLocally).toHaveBeenCalledTimes(1);
    expect(kanban.prependCardLocally).toHaveBeenCalledWith(
      "col_a",
      expect.objectContaining({ title: "card", status: "col_a" }),
    );
    const firstRow = kanban.prependCardLocally.mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(String(firstRow._rowId).startsWith("__optimistic_")).toBe(true);

    await flushMicrotasks();
    expect(kanban.removeCardLocally).toHaveBeenCalledWith(
      "col_a",
      firstRow._rowId,
    );
    expect(kanban.prependCardLocally).toHaveBeenCalledTimes(2);
    expect(kanban.prependCardLocally).toHaveBeenLastCalledWith("col_a", {
      _rowId: "srv_k",
      title: "card",
    });
  });

  it("removes temp card and refetches on error", async () => {
    const kanban = makeKanban();
    kanban.createRowOnServer.mockRejectedValue(new Error("fail"));

    persistNewKanbanCardViaRowApi({
      kanban,
      groupId: "g1",
      values: { x: 1 },
    });

    const tempId = (kanban.prependCardLocally.mock.calls[0][1] as Record<
      string,
      unknown
    >)._rowId;
    await flushMicrotasks();
    expect(kanban.removeCardLocally).toHaveBeenCalledWith("g1", tempId);
    expect(kanban.refetchAll).toHaveBeenCalledTimes(1);
    expect(kanban.prependCardLocally).toHaveBeenCalledTimes(1);
  });
});

describe("persistEditedTrackerGridRow", () => {
  it("applies updateRowLocal before invoking patchRowOnServer", async () => {
    const callOrder: string[] = [];
    const pg = {
      createRowOnServer: vi.fn(),
      prependRowLocal: vi.fn(),
      removeRowsLocal: vi.fn(),
      refetch: vi.fn(),
      patchRowOnServer: vi.fn().mockImplementation(() => {
        callOrder.push("patch");
        return Promise.resolve();
      }),
      updateRowLocal: vi.fn().mockImplementation(() => {
        callOrder.push("updateLocal");
      }),
    };
    const rows = [{ _rowId: "r1", title: "a" }];
    await persistEditedTrackerGridRow({
      mutateViaRowApi: true,
      pg,
      rowIndex: 0,
      rows,
      values: { title: "b" },
    });
    expect(callOrder).toEqual(["updateLocal", "patch"]);
    expect(pg.updateRowLocal).toHaveBeenCalledWith("r1", expect.any(Function));
    const updater = pg.updateRowLocal.mock.calls[0][1] as () => Record<
      string,
      unknown
    >;
    expect(updater()).toEqual({ _rowId: "r1", title: "b" });
    expect(pg.patchRowOnServer).toHaveBeenCalledWith("r1", {
      data: { title: "b" },
    });
    expect(pg.refetch).not.toHaveBeenCalled();
    await flushMicrotasks();
    expect(pg.refetch).not.toHaveBeenCalled();
  });

  it("calls refetch when PATCH rejects", async () => {
    const pg = {
      createRowOnServer: vi.fn(),
      prependRowLocal: vi.fn(),
      removeRowsLocal: vi.fn(),
      refetch: vi.fn(),
      patchRowOnServer: vi.fn().mockRejectedValue(new Error("network")),
      updateRowLocal: vi.fn(),
    };
    const rows = [{ _rowId: "r1", x: 1 }];
    await persistEditedTrackerGridRow({
      mutateViaRowApi: true,
      pg,
      rowIndex: 0,
      rows,
      values: { x: 2 },
    });
    expect(pg.updateRowLocal).toHaveBeenCalled();
    expect(pg.refetch).not.toHaveBeenCalled();
    await flushMicrotasks();
    expect(pg.refetch).toHaveBeenCalledTimes(1);
  });
});
