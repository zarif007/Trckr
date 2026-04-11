import type { RefObject } from "react";
import type {
  TrackerGrid,
  TrackerField,
  TrackerLayoutNode,
  TrackerBindings,
  GridDataRecord,
} from "../../types";
import type { TrackerContextForOptions } from "@/lib/binding";
import type {
  FieldCalculationRule,
  FieldValidationRule,
} from "@/lib/functions/types";
import type { FieldRulesMap } from "@/lib/field-rules";

export type TimelineView = "day" | "week" | "month" | "quarter";

export interface TimelineItem {
  row: Record<string, unknown>;
  rowIndex: number;
  startDate: Date;
  endDate: Date;
  title: string;
}

/** One swimlane row (group column + track). `id` matches stored row values (kanban column ids). */
export interface TimelineSwimlaneLane {
  id: string;
  label: string;
}

/** Timeline bar with vertical stack position inside its swimlane track. */
export interface PlacedTimelineBar {
  item: TimelineItem;
  swimlaneKey: string;
  stackIndex: number;
  /** Number of stacked rows needed for this swimlane (>= 1). */
  stackDepth: number;
}

export interface TrackerTimelineGridProps {
  tabId: string;
  grid: TrackerGrid;
  layoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
  bindings?: TrackerBindings;
  validations?: Record<string, FieldValidationRule[]>;
  calculations?: Record<string, FieldCalculationRule>;
  fieldRulesV2?: FieldRulesMap;
  gridData?: Record<string, Array<Record<string, unknown>>>;
  gridDataRef?: RefObject<GridDataRecord> | null;
  gridDataForThisGrid?: Array<Record<string, unknown>>;
  readOnly?: boolean;
  onUpdate?: (rowIndex: number, columnId: string, value: unknown) => void;
  onCrossGridUpdate?: (
    gridId: string,
    rowIndex: number,
    fieldId: string,
    value: unknown,
  ) => void;
  onAddEntry?: (newRow: Record<string, unknown>) => void;
  onAddEntryToGrid?: (gridId: string, newRow: Record<string, unknown>) => void;
  onDeleteEntries?: (rowIndices: number[]) => void;
  trackerContext?: TrackerContextForOptions;
  activeViewId?: string;
  /** Increment from parent to open Add column dialog (view toolbar). */
  openAddColumnRequest?: number;
  /** Hide in-grid Add column when the view toolbar provides it. */
  suppressEmbeddedAddColumn?: boolean;
}

/** Emitted after a timeline bar drag ends; parent persists lane + optional day shift. */
export interface TimelineDragEndPayload {
  rowIndex: number;
  deltaX: number;
  trackWidthPx: number;
  targetLaneId: string | null;
}

/**
 * Props for the scrollable timeline body (`DndContext`, axis, swimlanes, bars).
 * Owned by `TrackerTimelineGrid` for data; this component is presentation + interaction only.
 */
export interface TimelineCanvasProps {
  placedBars: PlacedTimelineBar[];
  swimlanes: TimelineSwimlaneLane[];
  timeRange: { start: Date; end: Date; days: number };
  view: TimelineView;
  swimlaneFieldId?: string;
  minContentWidthPx: number;
  timelineClickToAddEnabled: boolean;
  mutateViaRowApi: boolean;
  timelineDragEnabled: boolean;
  onTimelineClick: (date: Date) => void;
  onItemClick: (rowIndex: number) => void;
  onBarDragEnd?: (payload: TimelineDragEndPayload) => void;
}
