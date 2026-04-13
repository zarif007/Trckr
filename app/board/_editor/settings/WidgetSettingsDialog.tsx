"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { BoardElement } from "@/lib/boards/board-definition";

interface WidgetSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widget: BoardElement | null;
  onUpdate: (updater: (el: BoardElement) => BoardElement) => void;
}

/**
 * Configuration dialog for widget properties.
 * Allows editing title, width (colSpan), and height (rowSpan).
 */
export function WidgetSettingsDialog({
  open,
  onOpenChange,
  widget,
  onUpdate,
}: WidgetSettingsDialogProps) {
  const [title, setTitle] = useState("");
  const [colSpan, setColSpan] = useState(6);
  const [rowSpan, setRowSpan] = useState(1);

  // Sync local state with widget props when dialog opens
  useEffect(() => {
    if (widget) {
      setTitle(widget.title ?? "");
      setColSpan(widget.colSpan ?? 6);
      setRowSpan(widget.rowSpan ?? 1);
    }
  }, [widget, open]);

  const handleSave = useCallback(() => {
    if (!widget) return;

    onUpdate((w) => ({
      ...w,
      title: title.trim() || undefined,
      colSpan: Math.max(1, Math.min(12, colSpan)),
      rowSpan: Math.max(1, rowSpan),
    }));

    onOpenChange(false);
  }, [widget, title, colSpan, rowSpan, onUpdate, onOpenChange]);

  if (!widget) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Widget Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional widget title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="colSpan" className="text-sm font-medium">
                Width (columns, 1-12)
              </label>
              <Input
                id="colSpan"
                type="number"
                min={1}
                max={12}
                value={colSpan}
                onChange={(e) => setColSpan(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                12 columns = full width
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="rowSpan" className="text-sm font-medium">
                Height (rows)
              </label>
              <Input
                id="rowSpan"
                type="number"
                min={1}
                value={rowSpan}
                onChange={(e) => setRowSpan(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Minimum height: 1 row
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
