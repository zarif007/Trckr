/**
 * Ensures a section and grid exist at a given block insertion context,
 * creating them when necessary so a new field can be added without friction.
 *
 * Shared between BlockEditor (edit existing tracker) and from-scratch page.
 */

import type {
  TrackerDisplayProps,
  TrackerSection,
  TrackerGrid,
} from "../types";
import type { FlatBlock } from "./types";
import {
  createNewSectionId,
  createNewGridId,
  getNextSectionPlaceId,
  getNextGridPlaceId,
} from "./utils";

export interface EnsureContainerResult {
  /** The section id (may have been freshly created). */
  sectionId: string;
  /** The grid id where the field should be added (may have been freshly created). */
  gridId: string;
  /** The updated schema after any section/grid creation (always returned, even if unchanged). */
  nextSchema: TrackerDisplayProps;
}

/**
 * Given a tab + insertion context (block index), returns a { sectionId, gridId }
 * where a new field can be placed. Auto-creates section and/or div grid when needed.
 *
 * Rules:
 * - If the nearest grid is a **data grid** (table, kanban, calendar, timeline), new
 *   fields attach to that grid (same as using in-grid "Add column").
 * - If the nearest grid is a **form** (`div`), fields go there.
 * - After a section with no grid in scope → create a div grid in that section.
 * - No section at all (empty state) → create section + div grid.
 *
 * Returns the updated schema so the caller can apply it in one shot.
 */
export function getOrCreateSectionAndGridForField(
  tabId: string,
  afterBlockIndex: number,
  flatBlocks: FlatBlock[],
  schema: TrackerDisplayProps,
): EnsureContainerResult {
  const sections = schema.sections ?? [];
  const grids = schema.grids ?? [];

  const DATA_GRID_TYPES = new Set([
    "table",
    "kanban",
    "calendar",
    "timeline",
  ]);

  // Walk backwards from insertion point to find nearest section and target grid
  let lastSectionId: string | null = null;
  let lastGridId: string | null = null;

  for (let i = afterBlockIndex - 1; i >= 0; i--) {
    const block = flatBlocks[i];
    if (!block) continue;

    if (block.type === "grid" && !lastGridId) {
      const grid = grids.find((g) => g.id === block.id);
      if (grid) {
        const section = sections.find(
          (s) => s.id === grid.sectionId && s.tabId === tabId,
        );
        if (section) {
          lastSectionId = grid.sectionId;
          const surfaceType = grid.type ?? "";
          if (grid.type === "div" || DATA_GRID_TYPES.has(surfaceType)) {
            lastGridId = block.id;
          }
          break;
        }
      }
    }

    if (block.type === "section" && !lastSectionId) {
      const section = sections.find(
        (s) => s.id === block.id && s.tabId === tabId,
      );
      if (section) {
        lastSectionId = block.id;
        break; // found a section but no grid after it → will create grid below
      }
    }
  }

  let nextSections = sections;
  let nextGrids = grids;

  // Ensure we have a section
  let sectionId = lastSectionId;
  if (!sectionId) {
    const existingIds = new Set(sections.map((s) => s.id));
    const newId = createNewSectionId(existingIds);
    const placeId = getNextSectionPlaceId(sections, tabId);
    const newSection: TrackerSection = {
      id: newId,
      name: "New section",
      tabId,
      placeId,
    };
    nextSections = [...sections, newSection];
    sectionId = newId;
  }

  // Ensure we have a grid in that section
  let gridId = lastGridId;
  if (!gridId) {
    const existingIds = new Set(grids.map((g) => g.id));
    const newGridId = createNewGridId(existingIds);
    const placeId = getNextGridPlaceId(nextGrids, sectionId);
    const newGrid: TrackerGrid = {
      id: newGridId,
      name: "New form",
      sectionId,
      placeId,
      type: "div",
    };
    nextGrids = [...grids, newGrid];
    gridId = newGridId;
  }

  const nextSchema: TrackerDisplayProps = {
    ...schema,
    ...(nextSections !== sections ? { sections: nextSections } : {}),
    ...(nextGrids !== grids ? { grids: nextGrids } : {}),
  };

  return { sectionId, gridId, nextSchema };
}

export interface EnsureSectionResult {
  sectionId: string;
  nextSchema: TrackerDisplayProps;
}

/**
 * Ensures a section exists at the insertion context, creating one if needed.
 * Use when adding a grid (table, kanban, form) and we need a section to add it to.
 */
export function getOrCreateSectionForGrid(
  tabId: string,
  afterBlockIndex: number,
  flatBlocks: FlatBlock[],
  schema: TrackerDisplayProps,
): EnsureSectionResult {
  const sections = schema.sections ?? [];

  let lastSectionId: string | null = null;
  for (let i = afterBlockIndex - 1; i >= 0; i--) {
    const block = flatBlocks[i];
    if (!block) continue;
    if (block.type === "section") {
      const section = sections.find(
        (s) => s.id === block.id && s.tabId === tabId,
      );
      if (section) {
        lastSectionId = block.id;
        break;
      }
    }
    if (block.type === "grid") {
      const grids = schema.grids ?? [];
      const grid = grids.find((g) => g.id === block.id);
      if (grid) {
        const section = sections.find(
          (s) => s.id === grid.sectionId && s.tabId === tabId,
        );
        if (section) {
          lastSectionId = grid.sectionId;
          break;
        }
      }
    }
  }

  let sectionId = lastSectionId;
  let nextSections = sections;
  if (!sectionId) {
    const existingIds = new Set(sections.map((s) => s.id));
    const newId = createNewSectionId(existingIds);
    const placeId = getNextSectionPlaceId(sections, tabId);
    const newSection: TrackerSection = {
      id: newId,
      name: "New section",
      tabId,
      placeId,
    };
    nextSections = [...sections, newSection];
    sectionId = newId;
  }

  const nextSchema: TrackerDisplayProps = {
    ...schema,
    ...(nextSections !== sections ? { sections: nextSections } : {}),
  };
  return { sectionId, nextSchema };
}
