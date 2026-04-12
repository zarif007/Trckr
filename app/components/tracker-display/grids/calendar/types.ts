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

export type CalendarView = "month" | "week" | "day";

/** One occurrence of a row on a calendar day (includes index for edit routing). */
export type CalendarCellEvent = {
  row: Record<string, unknown>;
  rowIndex: number;
  /** Hour (0-23) if time information is available */
  hour?: number;
  /** Minute (0-59) if time information is available */
  minute?: number;
  /** Duration in days (for multi-day events) */
  duration?: number;
  /** End date (calculated from start date + duration) */
  endDate?: Date;
};

export interface TrackerCalendarGridProps {
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
  /** Active view id for merging `views[].config` when adding columns in layout edit. */
  activeViewId?: string;
  /** Increment from parent to open Add column dialog (view toolbar). */
  openAddColumnRequest?: number;
  /** Hide in-grid Add column when the view toolbar provides it. */
  suppressEmbeddedAddColumn?: boolean;
}
