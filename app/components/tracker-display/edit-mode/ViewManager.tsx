"use client";

import { useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import {
  Plus,
  Settings,
  Trash2,
  ChevronDown,
  LayoutGrid,
  Table2,
  FormInput,
  Calendar,
  GanttChart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TrackerGrid,
  TrackerGridView,
  TrackerField,
  TrackerLayoutNode,
} from "../types";
import type { GridType } from "../types";
import { computeViewKeyWarning } from "./view-key-config";

/**
 * Radix Select requires every `SelectItem` to have a non-empty `value`. Optional
 * keys (end date, timeline grouping, etc.) use this sentinel instead of `""`.
 */
const SELECT_NONE = "__view_config_none__";

/**
 * Kanban **group by** and Timeline **group by column**: fields whose values map
 * to lanes (option-backed lists, or distinct values from rows — same runtime
 * idea as `useKanbanGroups` when options are empty).
 */
const LANE_GROUPING_FIELD_DATA_TYPES = new Set<TrackerField["dataType"]>([
  "status",
  "options",
  "multiselect",
  "dynamic_select",
  "dynamic_multiselect",
  "field_mappings",
  "string",
  "text",
  "number",
  "boolean",
  "link",
  "email",
  "phone",
  "url",
  "currency",
  "percentage",
  "rating",
]);

function pickSelectValue(
  raw: string | undefined,
  allowedIds: ReadonlySet<string>,
): string {
  if (raw && allowedIds.has(raw)) return raw;
  return SELECT_NONE;
}

function ConfigSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-sm border p-4",
        theme.uiChrome.border,
        theme.radius.md,
      )}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground leading-none">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const VIEW_ICONS: Record<GridType, typeof Table2> = {
  table: Table2,
  kanban: LayoutGrid,
  div: FormInput,
  calendar: Calendar,
  timeline: GanttChart,
};

const VIEW_LABELS: Record<GridType, string> = {
  table: "Table",
  kanban: "Kanban",
  div: "Form",
  calendar: "Calendar",
  timeline: "Timeline",
};

interface ViewManagerProps {
  grid: TrackerGrid;
  fields: TrackerField[];
  /** Layout nodes for this grid (for key-field validation). */
  layoutNodes: TrackerLayoutNode[];
  onViewsChange: (views: TrackerGridView[]) => void;
  onActiveViewChange?: (viewId: string) => void;
  activeViewId?: string;
  /** Opens the same Add column / Add field dialog as the grid (incrementing nonce from parent). */
  onAddColumn?: () => void;
  /** When true, disables Add column (e.g. read-only or schema not editable). */
  addColumnDisabled?: boolean;
}

export function ViewManager({
  grid,
  fields,
  layoutNodes,
  onViewsChange,
  onActiveViewChange,
  activeViewId,
  onAddColumn,
  addColumnDisabled = false,
}: ViewManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [newViewType, setNewViewType] = useState<GridType>("table");
  const [newViewName, setNewViewName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  // Get current views
  const views = useMemo(() => {
    if (grid.views && grid.views.length > 0) {
      return grid.views.map((v, i) => ({
        ...v,
        id: v.id || `${grid.id}_${v.type}_view_${i}`,
        name: v.name || VIEW_LABELS[v.type],
      }));
    }
    // Fallback to single view from type
    const type = grid.type || "table";
    return [
      {
        id: `${grid.id}_${type}_view_0`,
        type,
        name: VIEW_LABELS[type],
        config: grid.config,
      },
    ];
  }, [grid]);

  const activeView = views.find((v) => v.id === activeViewId) || views[0];

  const viewKeyWarning = useMemo(
    () =>
      computeViewKeyWarning({
        gridId: grid.id,
        view: activeView,
        layoutNodes,
        fields,
      }),
    [grid.id, activeView, layoutNodes, fields],
  );

  const openConfigureActive = useCallback(() => {
    if (!activeView) return;
    setSelectedViewId(activeView.id);
    setShowConfigDialog(true);
  }, [activeView]);

  // Add a new view
  const handleAddView = useCallback(() => {
    if (!newViewName.trim()) return;

    const newView: TrackerGridView = {
      id: `${grid.id}_${newViewType}_view_${views.length}`,
      type: newViewType,
      name: newViewName.trim(),
      config: {},
    };

    // Add view-specific default config
    if (newViewType === "kanban") {
      const groupField = fields.find(
        (f) =>
          f.dataType === "status" ||
          f.dataType === "options" ||
          f.dataType === "multiselect",
      );
      if (groupField) {
        newView.config = { groupBy: groupField.id };
      }
    } else if (newViewType === "calendar") {
      const dateField = fields.find((f) => f.dataType === "date");
      if (dateField) {
        newView.config = { dateField: dateField.id };
      }
    } else if (newViewType === "timeline") {
      const dateFields = fields.filter((f) => f.dataType === "date");
      if (dateFields.length >= 2) {
        newView.config = {
          dateField: dateFields[0]!.id,
          endDateField: dateFields[1]!.id,
        };
      } else if (dateFields.length === 1) {
        newView.config = { dateField: dateFields[0]!.id };
      }
    }

    onViewsChange([...views, newView]);
    setShowAddDialog(false);
    setNewViewName("");
    setNewViewType("table");
  }, [grid.id, views, newViewType, newViewName, fields, onViewsChange]);

  // Remove a view
  const handleRemoveView = useCallback(
    (viewId: string) => {
      if (views.length <= 1) {
        // Don't allow removing the last view
        return;
      }
      const newViews = views.filter((v) => v.id !== viewId);
      onViewsChange(newViews);

      // If we removed the active view, switch to the first remaining
      if (activeViewId === viewId && newViews.length > 0) {
        onActiveViewChange?.(newViews[0].id);
      }
    },
    [views, activeViewId, onViewsChange, onActiveViewChange]
  );

  // Update view config
  const handleUpdateViewConfig = useCallback(
    (viewId: string, config: TrackerGridView["config"]) => {
      const newViews = views.map((v) =>
        v.id === viewId ? { ...v, config: { ...v.config, ...config } } : v
      );
      onViewsChange(newViews);
    },
    [views, onViewsChange]
  );

  const toolbarButtonClass =
    "h-7 gap-1.5 text-xs shrink-0 " +
    cn(theme.uiChrome.border, theme.uiChrome.hover);

  return (
    <div className="flex w-full min-w-0 flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={toolbarButtonClass}>
            {(() => {
              const Icon = VIEW_ICONS[activeView?.type || "table"];
              return <Icon className="h-3.5 w-3.5" />;
            })()}
            <span className="text-xs">{activeView?.name || "View"}</span>
            {views.length > 1 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                ({views.length})
              </span>
            )}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className={cn("w-56 p-2", theme.patterns.floatingChrome)}
        >
          <div className="space-y-1">
            {/* Existing views */}
            {views.map((view) => {
              const Icon = VIEW_ICONS[view.type];
              const isActive = view.id === activeViewId;

              return (
                <button
                  key={view.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "hover:bg-muted/50 text-foreground"
                  )}
                  onClick={() => {
                    onActiveViewChange?.(view.id);
                    setMenuOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left">{view.name}</span>
                  {isActive && <span className="text-primary text-xs">●</span>}
                </button>
              );
            })}

            <div className="h-px bg-border my-1" />

            {/* Add view */}
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-muted/50 text-foreground transition-colors"
              onClick={() => {
                setMenuOpen(false);
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Add view</span>
            </button>

            {/* Remove view (if more than 1) */}
            {views.length > 1 && activeView && (
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm hover:bg-muted/50 text-destructive transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  handleRemoveView(activeView.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Remove view</span>
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {onAddColumn ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={toolbarButtonClass}
          disabled={addColumnDisabled}
          onClick={() => onAddColumn()}
          aria-label="Add column"
        >
          <Plus className="h-3.5 w-3.5" />
          Add column
        </Button>
      ) : null}

      {activeView ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={toolbarButtonClass}
          onClick={openConfigureActive}
          aria-label="Configure view"
        >
          <Settings className="h-3.5 w-3.5" />
          Configure
        </Button>
      ) : null}
      </div>

      {viewKeyWarning ? (
        <div
          role="status"
          className={cn(
            "w-full max-w-xl rounded-sm border px-3 py-2 text-xs text-warning",
            theme.radius.md,
            theme.uiChrome.border,
            "border-warning/50 bg-warning/10",
          )}
        >
          {viewKeyWarning}
        </div>
      ) : null}

      {/* Add View Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent
          className={cn(
            "sm:max-w-md gap-0 p-0 overflow-hidden",
            theme.patterns.floatingChrome,
          )}
        >
          <DialogHeader className="space-y-1 border-b px-6 py-4 text-left">
            <DialogTitle className="text-base">Add new view</DialogTitle>
            <DialogDescription>
              Another way to look at the same grid data. Pick a type and a
              short label for the tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <div
              className={cn(
                "flex items-center gap-3 rounded-sm border px-3 py-2.5",
                theme.uiChrome.border,
                theme.radius.md,
              )}
            >
              {(() => {
                const Icon = VIEW_ICONS[newViewType];
                return (
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border",
                      theme.uiChrome.border,
                    )}
                  >
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                );
              })()}
              <p className="text-xs text-muted-foreground leading-snug">
                {newViewType === "table" &&
                  "Spreadsheet-style columns and sorting."}
                {newViewType === "kanban" &&
                  "Columns from a status or select field."}
                {newViewType === "calendar" &&
                  "Month, week, or day by a single date field."}
                {newViewType === "timeline" &&
                  "Gantt-style bars using start and end dates."}
                {newViewType === "div" &&
                  "Single-instance form (rare for data grids)."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                View type
              </label>
              <Select
                value={newViewType}
                onValueChange={(v) => setNewViewType(v as GridType)}
              >
                <SelectTrigger className={cn(theme.uiChrome.border)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VIEW_LABELS).map(([type, label]) => {
                    const Icon = VIEW_ICONS[type as GridType];
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                View name
              </label>
              <Input
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder={`e.g. ${VIEW_LABELS[newViewType]}`}
                className={cn(theme.uiChrome.border)}
              />
            </div>
          </div>
          <DialogFooter
            className={cn(
              "flex-row justify-end gap-2 border-t px-6 py-4 sm:justify-end",
              theme.uiChrome.border,
            )}
          >
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddView} disabled={!newViewName.trim()}>
              Add view
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configure View Dialog */}
      {selectedViewId && (
        <ViewConfigDialog
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          view={views.find((v) => v.id === selectedViewId)!}
          gridId={grid.id}
          layoutNodes={layoutNodes}
          fields={fields}
          onSave={(config) => handleUpdateViewConfig(selectedViewId, config)}
        />
      )}
    </div>
  );
}

// View configuration dialog
interface ViewConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: TrackerGridView;
  gridId: string;
  layoutNodes: TrackerLayoutNode[];
  fields: TrackerField[];
  onSave: (config: TrackerGridView["config"]) => void;
}

function ViewConfigDialog({
  open,
  onOpenChange,
  view,
  gridId,
  layoutNodes,
  fields,
  onSave,
}: ViewConfigDialogProps) {
  const [config, setConfig] = useState(view.config || {});

  useEffect(() => {
    if (open) setConfig(view.config || {});
  }, [open, view]);

  const fieldsOnGrid = useMemo(() => {
    const ids = new Set(
      layoutNodes.filter((n) => n.gridId === gridId).map((n) => n.fieldId),
    );
    return fields.filter((f) => ids.has(f.id));
  }, [layoutNodes, gridId, fields]);

  const laneGroupingFieldCandidates = useMemo(
    () =>
      fieldsOnGrid.filter((f) =>
        LANE_GROUPING_FIELD_DATA_TYPES.has(f.dataType),
      ),
    [fieldsOnGrid],
  );

  const dateCandidates = useMemo(
    () => fieldsOnGrid.filter((f) => f.dataType === "date"),
    [fieldsOnGrid],
  );

  const laneGroupingFieldIds = useMemo(
    () => new Set(laneGroupingFieldCandidates.map((f) => f.id)),
    [laneGroupingFieldCandidates],
  );
  const dateIds = useMemo(
    () => new Set(dateCandidates.map((f) => f.id)),
    [dateCandidates],
  );
  const fieldIdsOnGrid = useMemo(
    () => new Set(fieldsOnGrid.map((f) => f.id)),
    [fieldsOnGrid],
  );
  const startFieldId = useMemo(() => {
    const raw = config?.dateField as string | undefined;
    if (raw && dateIds.has(raw)) return raw;
    return undefined;
  }, [config?.dateField, dateIds]);

  const endDateCandidates = useMemo(() => {
    if (view.type !== "timeline") return [];
    if (!startFieldId) return dateCandidates;
    return dateCandidates.filter((f) => f.id !== startFieldId);
  }, [view.type, dateCandidates, startFieldId]);

  const endDateIds = useMemo(
    () => new Set(endDateCandidates.map((f) => f.id)),
    [endDateCandidates],
  );

  const timelineConfigValid = useMemo(() => {
    if (view.type !== "timeline") return true;
    if (dateCandidates.length < 2) return false;
    const s = config?.dateField as string | undefined;
    const e = config?.endDateField as string | undefined;
    return Boolean(
      s && e && s !== e && dateIds.has(s) && dateIds.has(e),
    );
  }, [view.type, dateCandidates.length, config, dateIds]);

  const handleSave = () => {
    if (view.type === "timeline" && !timelineConfigValid) return;
    if (view.type === "timeline") {
      const c = { ...(config || {}) } as Record<string, unknown>;
      const legacySwim = c.swimlaneField as string | undefined;
      const grp = c.groupingField as string | undefined;
      if ((typeof grp !== "string" || grp.length === 0) && legacySwim) {
        c.groupingField = legacySwim;
      }
      delete c.swimlaneField;
      onSave(c as TrackerGridView["config"]);
    } else {
      onSave(config);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg",
          theme.patterns.floatingChrome,
        )}
      >
        <DialogHeader
          className={cn(
            "shrink-0 space-y-1.5 border-b px-6 py-4 text-left",
            theme.uiChrome.border,
          )}
        >
          <DialogTitle className="text-base leading-tight">
            Configure · {view.name}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Keys use columns on this grid only. Add fields with{" "}
            <span className="font-medium text-foreground">Add column</span> next to
            Configure, then map them here.
            {view.type === "timeline"
              ? " Timeline views also support optional lane grouping under Grouping."
              : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {view.type === "kanban" && (
            <ConfigSection
              title="Board columns"
              description="Each lane matches one value of the field you group by."
            >
              {laneGroupingFieldCandidates.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Group by
                  </label>
                  <Select
                    value={pickSelectValue(
                      config?.groupBy as string | undefined,
                      laneGroupingFieldIds,
                    )}
                    onValueChange={(value) =>
                      setConfig((c) => ({
                        ...c,
                        groupBy: value === SELECT_NONE ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger className={cn("w-full", theme.uiChrome.border)}>
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>
                        <span className="text-muted-foreground">Choose column</span>
                      </SelectItem>
                      {laneGroupingFieldCandidates.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.ui.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add a column suitable for grouping (for example{" "}
                  <span className="font-medium text-foreground">status</span>,{" "}
                  <span className="font-medium text-foreground">options</span>, or{" "}
                  <span className="font-medium text-foreground">short text</span>
                  ), then choose it here.
                </p>
              )}
            </ConfigSection>
          )}

          {view.type === "calendar" && (
            <ConfigSection
              title="Event date"
              description="Which date column drives placement on the calendar."
            >
              {dateCandidates.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Date column
                  </label>
                  <Select
                    value={pickSelectValue(
                      config?.dateField as string | undefined,
                      dateIds,
                    )}
                    onValueChange={(value) =>
                      setConfig((c) => ({
                        ...c,
                        dateField: value === SELECT_NONE ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger className={cn("w-full", theme.uiChrome.border)}>
                      <SelectValue placeholder="Select date column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>
                        <span className="text-muted-foreground">Choose column</span>
                      </SelectItem>
                      {dateCandidates.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.ui.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add a date column to this grid first.
                </p>
              )}
            </ConfigSection>
          )}

          {view.type === "timeline" && (
            <ConfigSection
              title="Timeline range"
              description="Bars span from the start date through the end date. Two different date columns are required."
            >
              {dateCandidates.length < 2 ? (
                <div
                  role="status"
                  className={cn(
                    "rounded-sm border px-3 py-2.5 text-xs text-warning",
                    theme.radius.md,
                    theme.uiChrome.border,
                    "border-warning/50 bg-warning/10",
                  )}
                >
                  Add at least two date columns on this grid (for example start and
                  due dates), using Add column next to Configure.
                </div>
              ) : null}

              {dateCandidates.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Start date column
                  </label>
                  <Select
                    value={pickSelectValue(
                      config?.dateField as string | undefined,
                      dateIds,
                    )}
                    onValueChange={(value) => {
                      const nextStart =
                        value === SELECT_NONE ? undefined : value;
                      setConfig((c) => {
                        const prevEnd = c.endDateField as string | undefined;
                        const clearEnd =
                          nextStart && prevEnd === nextStart ? undefined : prevEnd;
                        return {
                          ...c,
                          dateField: nextStart,
                          endDateField: clearEnd,
                        };
                      });
                    }}
                  >
                    <SelectTrigger className={cn("w-full", theme.uiChrome.border)}>
                      <SelectValue placeholder="Start of bar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>
                        <span className="text-muted-foreground">Choose column</span>
                      </SelectItem>
                      {dateCandidates.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.ui.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              {view.type === "timeline" && dateCandidates.length >= 2 ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    End date column
                  </label>
                  {endDateCandidates.length > 0 ? (
                    <Select
                      value={pickSelectValue(
                        config?.endDateField as string | undefined,
                        endDateIds,
                      )}
                      onValueChange={(value) =>
                        setConfig((c) => ({
                          ...c,
                          endDateField:
                            value === SELECT_NONE ? undefined : value,
                        }))
                      }
                    >
                      <SelectTrigger className={cn("w-full", theme.uiChrome.border)}>
                        <SelectValue placeholder="End of bar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SELECT_NONE}>
                          <span className="text-muted-foreground">
                            Choose end column
                          </span>
                        </SelectItem>
                        {endDateCandidates.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.ui.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Choose a start date first; the end date must be a different column.
                    </p>
                  )}
                </div>
              ) : null}

              {view.type === "timeline" &&
              dateCandidates.length >= 2 &&
              !timelineConfigValid ? (
                <p className="text-xs text-destructive">
                  Pick a start and an end column (they must differ) to save.
                </p>
              ) : null}
            </ConfigSection>
          )}

          {(view.type === "calendar" || view.type === "timeline") && (
            <ConfigSection
              title="Labels"
              description="Optional title shown on calendar cells or timeline bars."
            >
              {fieldsOnGrid.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Title column
                  </label>
                  <Select
                    value={pickSelectValue(
                      config?.titleField as string | undefined,
                      fieldIdsOnGrid,
                    )}
                    onValueChange={(value) =>
                      setConfig((c) => ({
                        ...c,
                        titleField:
                          value === SELECT_NONE ? undefined : value,
                      }))
                    }
                  >
                    <SelectTrigger className={cn("w-full", theme.uiChrome.border)}>
                      <SelectValue placeholder="Title on item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELECT_NONE}>
                        <span className="text-muted-foreground">
                          Automatic (first column)
                        </span>
                      </SelectItem>
                      {fieldsOnGrid.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.ui.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add at least one column to choose a title field.
                </p>
              )}
            </ConfigSection>
          )}

          {view.type === "timeline" && (
            <ConfigSection
              title="Grouping"
              description="Choose which column splits the timeline into horizontal lanes. Leave unset to keep every row in one All items lane."
            >
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Group by column
                </label>
                <Select
                  disabled={laneGroupingFieldCandidates.length === 0}
                  value={pickSelectValue(
                    (config?.groupingField as string | undefined) ??
                      (config?.swimlaneField as string | undefined),
                    laneGroupingFieldIds,
                  )}
                  onValueChange={(value) =>
                    setConfig((c) => {
                      const next = {
                        ...(c ?? {}),
                      } as NonNullable<TrackerGridView["config"]>;
                      const rec = next as Record<string, unknown>;
                      delete rec.swimlaneField;
                      if (value === SELECT_NONE) {
                        delete rec.groupingField;
                      } else {
                        rec.groupingField = value;
                      }
                      return next;
                    })
                  }
                >
                  <SelectTrigger
                    className={cn("w-full", theme.uiChrome.border)}
                  >
                    <SelectValue placeholder="All items (single lane)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>
                      <span className="text-muted-foreground">
                        All items (no grouping)
                      </span>
                    </SelectItem>
                    {laneGroupingFieldCandidates.map((field) => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.ui.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {laneGroupingFieldCandidates.length === 0 ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Add a column suitable for grouping (for example{" "}
                    <span className="font-medium text-foreground">status</span>,{" "}
                    <span className="font-medium text-foreground">options</span>,{" "}
                    <span className="font-medium text-foreground">short text</span>
                    , or <span className="font-medium text-foreground">number</span>
                    ) on this grid to enable lane choices here.
                  </p>
                ) : null}
              </div>
            </ConfigSection>
          )}

          {view.type === "table" && (
            <ConfigSection
              title="Table"
              description="Column layout is edited on the grid. Here you only set the default page size."
            >
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Rows per page
                </label>
                <Select
                  value={String(config?.pageSize || 10)}
                  onValueChange={(value) =>
                    setConfig((c) => ({ ...c, pageSize: parseInt(value, 10) }))
                  }
                >
                  <SelectTrigger className={cn("w-full", theme.uiChrome.border)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 25, 50, 100].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} rows
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ConfigSection>
          )}

          {(view.type === "calendar" || view.type === "timeline") && (
            <ConfigSection
              title="Initial zoom"
              description="Which range is shown when this view opens."
            >
              <Select
                value={(config?.viewType as string) ||
                  (view.type === "calendar" ? "month" : "week")}
                onValueChange={(value) =>
                  setConfig((c) => ({ ...c, viewType: value }))
                }
              >
                <SelectTrigger className={cn("w-full", theme.uiChrome.border)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {view.type === "calendar" ? (
                    <>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="quarter">Quarter</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </ConfigSection>
          )}
        </div>

        <DialogFooter
          className={cn(
            "shrink-0 flex flex-row justify-end gap-2 border-t px-6 py-4",
            theme.uiChrome.border,
          )}
        >
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={view.type === "timeline" && !timelineConfigValid}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
