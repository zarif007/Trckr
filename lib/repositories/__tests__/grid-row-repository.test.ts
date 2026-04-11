import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    trackerSchema: { findFirst },
  },
}));

import {
  listGridRows,
  validateGridRowData,
} from "../grid-row-repository";

describe("validateGridRowData", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("returns valid when tracker is not found", async () => {
    findFirst.mockResolvedValue(null);
    const r = await validateGridRowData("missing", "g1", { x: 1 });
    expect(r).toEqual({ valid: true, errors: [] });
  });
});

describe("listGridRows", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("returns null when tracker is missing or not owned", async () => {
    findFirst.mockResolvedValue(null);
    const r = await listGridRows("tid", "g1", "uid");
    expect(r).toBeNull();
  });
});
