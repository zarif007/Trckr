import { describe, expect, it, vi } from "vitest";
import { loadLatestTrackerSnapshot } from "../load-latest-tracker-snapshot";
import type { TrackerResponse } from "@/app/tracker/hooks/useTrackerChat";
import type { TrackerPageRecord } from "../schema-with-tracker-name";

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: ok ? 200 : 404,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("loadLatestTrackerSnapshot", () => {
  it("requests instance row when instanceId is set", async () => {
    const fetchImpl = vi.fn((path: string) => {
      expect(path).toBe("/api/trackers/t1/data/row-1");
      return jsonResponse({
        id: "row-1",
        label: null,
        data: { g: [{ x: 1 }] },
        updatedAt: "2020-01-01T00:00:00.000Z",
        formStatus: null,
      });
    });

    const tracker: TrackerPageRecord = {
      id: "t1",
      name: null,
      schema: {},
      instance: "SINGLE",
    };
    const schema = { grids: [] } as unknown as TrackerResponse;

    const snap = await loadLatestTrackerSnapshot(fetchImpl, {
      trackerId: "t1",
      instanceId: "row-1",
      tracker,
      schema,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(snap?.id).toBe("row-1");
    expect(snap?.data).toEqual({ g: [{ x: 1 }] });
  });

  it("returns null for MULTI without instanceId", async () => {
    const fetchImpl = vi.fn();
    const tracker: TrackerPageRecord = {
      id: "t1",
      name: null,
      schema: {},
      instance: "MULTI",
    };
    const schema = { grids: [] } as unknown as TrackerResponse;

    const snap = await loadLatestTrackerSnapshot(fetchImpl, {
      trackerId: "t1",
      instanceId: null,
      tracker,
      schema,
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(snap).toBeNull();
  });
});
