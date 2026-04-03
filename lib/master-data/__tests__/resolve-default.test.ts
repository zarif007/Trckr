import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  project: { findFirst: vi.fn() },
  module: { findFirst: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { resolveMasterDataDefaultScope } from "@/lib/master-data/resolve-default";

describe("resolveMasterDataDefaultScope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefers the nearest ancestor module default", async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: "project-1",
      settings: { masterDataDefaultScope: "project" },
    });

    prismaMock.module.findFirst.mockImplementation(
      async ({ where }: { where: { id: string } }) => {
        if (where.id === "module-a") {
          return { id: "module-a", parentId: "module-b", settings: {} };
        }
        if (where.id === "module-b") {
          return {
            id: "module-b",
            parentId: "module-c",
            settings: { masterDataDefaultScope: "module" },
          };
        }
        if (where.id === "module-c") {
          return { id: "module-c", parentId: null, settings: {} };
        }
        return null;
      },
    );

    const result = await resolveMasterDataDefaultScope({
      projectId: "project-1",
      userId: "user-1",
      moduleId: "module-a",
    });

    expect(result).toEqual({
      inheritedDefault: "module",
      inheritedSource: "module",
      inheritedSourceModuleId: "module-b",
    });
  });

  it("falls back to project defaults when no module default exists", async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      id: "project-1",
      settings: { masterDataDefaultScope: "project" },
    });

    prismaMock.module.findFirst.mockImplementation(
      async ({ where }: { where: { id: string } }) => {
        if (where.id === "module-a") {
          return { id: "module-a", parentId: null, settings: {} };
        }
        return null;
      },
    );

    const result = await resolveMasterDataDefaultScope({
      projectId: "project-1",
      userId: "user-1",
      moduleId: "module-a",
    });

    expect(result).toEqual({
      inheritedDefault: "project",
      inheritedSource: "project",
    });
  });

  it("returns none when the project is missing", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);

    const result = await resolveMasterDataDefaultScope({
      projectId: "missing",
      userId: "user-1",
      moduleId: "module-a",
    });

    expect(result).toEqual({ inheritedDefault: null, inheritedSource: "none" });
  });
});
