"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildGridFieldMap,
  buildAllGridsPickerOptions,
  resolvePathLabel,
} from "../../bindings/bindings-utils";
import type { TrackerDisplayProps } from "../../types";
import type { BindingDraft } from "../../bindings/bindings-utils";

type Step = "tracker" | "grid" | "field";

export interface BindingSourceCascadeProps {
  localSchema: TrackerDisplayProps;
  currentTrackerSchemaId: string | null | undefined;
  currentTrackerName?: string | null;
  projectId: string | null | undefined;
  siblingTrackers: Array<{ id: string; name: string | null }>;
  siblingsLoading: boolean;
  sourceSchema: TrackerDisplayProps | null;
  sourceSchemaLoading: boolean;
  bindingDraft: BindingDraft;
  onPick: (pick: {
    optionsSourceSchemaId?: string;
    optionsGrid: string;
    labelField: string;
  }) => void;
  disabled?: boolean;
}

function pickSchema(
  sourceId: string | undefined,
  localSchema: TrackerDisplayProps,
  sourceSchema: TrackerDisplayProps | null,
): TrackerDisplayProps | null {
  if (!sourceId?.trim()) return localSchema;
  return sourceSchema;
}

export function BindingSourceCascade({
  localSchema,
  currentTrackerSchemaId,
  currentTrackerName,
  projectId,
  siblingTrackers,
  siblingsLoading,
  sourceSchema,
  sourceSchemaLoading,
  bindingDraft,
  onPick,
  disabled,
}: BindingSourceCascadeProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("tracker");
  const [pendingGridId, setPendingGridId] = useState<string | null>(null);

  const draftSourceId = bindingDraft.optionsSourceSchemaId?.trim();

  const pickerSchema = useMemo(
    () => pickSchema(draftSourceId, localSchema, sourceSchema),
    [draftSourceId, localSchema, sourceSchema],
  );

  const gridPickerOptions = useMemo(
    () => buildAllGridsPickerOptions(pickerSchema?.grids ?? []),
    [pickerSchema],
  );

  const gridFieldMap = useMemo(
    () => buildGridFieldMap(pickerSchema?.layoutNodes ?? []),
    [pickerSchema],
  );

  const resetFlow = useCallback(() => {
    setStep("tracker");
    setPendingGridId(null);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) resetFlow();
    },
    [resetFlow],
  );

  const summary = useMemo(() => {
    const og = bindingDraft.optionsGrid.trim();
    const lf = bindingDraft.labelField.trim();
    if (!og || !lf) return null;
    const sid = bindingDraft.optionsSourceSchemaId?.trim();
    const trackerLabel = sid
      ? siblingTrackers.find((t) => t.id === sid)?.name?.trim() || sid
      : currentTrackerName?.trim() || "This tracker";
    const grids = pickerSchema?.grids ?? localSchema.grids ?? [];
    const fields = pickerSchema?.fields ?? localSchema.fields ?? [];
    const gridName = grids.find((g) => g.id === og)?.name ?? og;
    const fieldLabel = resolvePathLabel(lf, grids, fields);
    return { trackerLabel, gridName, fieldLabel };
  }, [
    bindingDraft,
    siblingTrackers,
    currentTrackerName,
    pickerSchema,
    localSchema,
  ]);

  const foreignLoading =
    Boolean(draftSourceId) && (sourceSchemaLoading || !pickerSchema);

  const selectThisTracker = () => {
    onPick({
      optionsSourceSchemaId: undefined,
      optionsGrid: "",
      labelField: "",
    });
    setStep("grid");
  };

  const selectOtherTracker = (id: string) => {
    onPick({ optionsSourceSchemaId: id, optionsGrid: "", labelField: "" });
    setStep("grid");
  };

  const selectGrid = (gridId: string) => {
    setPendingGridId(gridId);
    setStep("field");
  };

  const selectField = (fieldId: string) => {
    if (!pendingGridId) return;
    onPick({
      optionsSourceSchemaId: draftSourceId || undefined,
      optionsGrid: pendingGridId,
      labelField: `${pendingGridId}.${fieldId}`,
    });
    setOpen(false);
    resetFlow();
  };

  const headerTitle =
    step === "tracker" ? "Tracker" : step === "grid" ? "Grid" : "Field";

  const showBack = step !== "tracker";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-9 text-left",
            !summary && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {summary
              ? `${summary.trackerLabel} → ${summary.gridName} → ${summary.fieldLabel}`
              : "Select tracker, then grid, then field…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,380px)] p-0" align="start">
        <div className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5">
          {showBack && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                if (step === "field") {
                  setStep("grid");
                  setPendingGridId(null);
                } else if (step === "grid") {
                  setStep("tracker");
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {headerTitle}
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {step === "tracker" && (
            <div className="flex flex-col">
              <button
                type="button"
                className="px-3 py-2 text-left text-sm hover:bg-muted/80 rounded-none"
                onClick={selectThisTracker}
              >
                <div className="font-medium">This tracker</div>
                <div className="text-xs text-muted-foreground">
                  {currentTrackerName?.trim() ||
                    currentTrackerSchemaId ||
                    "Current schema"}
                </div>
              </button>
              {!projectId ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No project id — cannot list other trackers.
                </div>
              ) : siblingsLoading ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Loading trackers…
                </div>
              ) : (
                siblingTrackers
                  .filter((t) => t.id !== currentTrackerSchemaId)
                  .map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="px-3 py-2 text-left text-sm hover:bg-muted/80 rounded-none"
                      onClick={() => selectOtherTracker(t.id)}
                    >
                      {t.name?.trim() || t.id}
                    </button>
                  ))
              )}
            </div>
          )}
          {step === "grid" && (
            <div className="flex flex-col">
              {foreignLoading ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {sourceSchemaLoading
                    ? "Loading schema…"
                    : "Could not load source tracker schema."}
                </div>
              ) : gridPickerOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No grids in this tracker.
                </div>
              ) : (
                gridPickerOptions.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    className="px-3 py-2 text-left text-sm hover:bg-muted/80 rounded-none"
                    onClick={() => selectGrid(g.value)}
                  >
                    {g.label}
                  </button>
                ))
              )}
            </div>
          )}
          {step === "field" && pendingGridId && (
            <div className="flex flex-col">
              {(() => {
                const ids = gridFieldMap.get(pendingGridId);
                if (!ids || ids.size === 0) {
                  return (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No fields in this grid.
                    </div>
                  );
                }
                return Array.from(ids).map((fid) => {
                  const path = `${pendingGridId}.${fid}`;
                  const label = resolvePathLabel(
                    path,
                    pickerSchema?.grids ?? [],
                    pickerSchema?.fields ?? [],
                  );
                  return (
                    <button
                      key={fid}
                      type="button"
                      className="px-3 py-2 text-left text-sm hover:bg-muted/80 rounded-none"
                      onClick={() => selectField(fid)}
                    >
                      {label}
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
