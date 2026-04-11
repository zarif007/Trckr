"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import type { TrackerField } from "../../types";
import type { GridType } from "../../types";
import type { AddColumnOrFieldResult } from "../../edit-mode/types";
import { AddColumnOrFieldDialog } from "../../edit-mode/block-editor/AddColumnOrFieldDialog";
import { useEditMode } from "../../edit-mode";
import { applyAddLayoutFieldWithDataGridViewPatch } from "../../edit-mode/apply-add-layout-field";

export interface GridLayoutEditChromeProps {
  gridId: string;
  /** Active surface (merged view type). */
  viewType: GridType;
  activeViewId: string | undefined;
  canEditLayout: boolean;
  /** Field ids already on this grid layout (for the add dialog). */
  existingLayoutFieldIds: string[];
  allFields: TrackerField[];
  className?: string;
  /** Parent increments this to open the Add column dialog (e.g. view toolbar). */
  openAddColumnRequest?: number;
  /** When false, only the dialog is used (toolbar opens it). Default true. */
  showAddButton?: boolean;
}

/**
 * Table-style "Add column" control for calendar, timeline, and kanban surfaces in layout edit mode.
 */
export function GridLayoutEditChrome({
  gridId,
  viewType,
  activeViewId,
  canEditLayout,
  existingLayoutFieldIds,
  allFields,
  className,
  openAddColumnRequest = 0,
  showAddButton = true,
}: GridLayoutEditChromeProps) {
  const { schema, onSchemaChange } = useEditMode();
  const [open, setOpen] = useState(false);
  const lastOpenAddColumnRequestRef = useRef(0);

  useEffect(() => {
    if (!canEditLayout) return;
    if (openAddColumnRequest <= lastOpenAddColumnRequestRef.current) return;
    lastOpenAddColumnRequestRef.current = openAddColumnRequest;
    setOpen(true);
  }, [openAddColumnRequest, canEditLayout]);

  const handleConfirm = useCallback(
    (result: AddColumnOrFieldResult) => {
      if (!schema || !onSchemaChange) return;
      onSchemaChange(
        applyAddLayoutFieldWithDataGridViewPatch({
          schema,
          gridId,
          activeViewId,
          viewType,
          result,
        }),
      );
      setOpen(false);
    },
    [schema, onSchemaChange, gridId, activeViewId, viewType],
  );

  const variant = useMemo(
    () => (viewType === "div" ? "field" : "column"),
    [viewType],
  );

  if (!canEditLayout) return null;

  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      {showAddButton ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-7 text-xs gap-1",
            theme.uiChrome.border,
            theme.uiChrome.hover,
          )}
          onClick={() => setOpen(true)}
          aria-label="Add column"
        >
          <Plus className="h-3.5 w-3.5" />
          Add column
        </Button>
      ) : null}
      <AddColumnOrFieldDialog
        open={open}
        onOpenChange={setOpen}
        variant={variant}
        existingFieldIds={existingLayoutFieldIds}
        allFields={allFields}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
