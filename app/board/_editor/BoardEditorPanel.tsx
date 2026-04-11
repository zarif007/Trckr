"use client";

import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

/**
 * Shell aligned with {@link app/tracker/views/TrackerPanel.tsx} (chat hidden):
 * left panel surface, floating Preview | Edit, scroll region under the chrome.
 */
export function BoardEditorPanel({
  editMode,
  setEditMode,
  saveError,
  extraToolbar,
  children,
}: {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  saveError?: string | null;
  extraToolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative h-full min-h-0 w-full overflow-hidden bg-background/40 backdrop-blur-sm border-l transition-shadow duration-300",
        theme.radius.md,
        theme.uiChrome.border,
      )}
    >
      <div
        className={cn(
          "absolute right-1 top-3 z-20 flex max-w-[calc(100%-0.5rem)] flex-wrap items-center justify-end gap-1 rounded-sm border p-0.5 backdrop-blur-md sm:right-3",
          theme.patterns.floatingChrome,
        )}
      >
        <div
          className={cn(
            "inline-flex shrink-0 items-center rounded-sm border p-0.5",
            theme.uiChrome.border,
            "bg-muted/20",
          )}
        >
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className={cn(
              "rounded-sm p-1.5 transition-colors duration-150 ease-out sm:px-3 sm:py-1",
              !editMode
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            )}
            aria-pressed={!editMode}
            aria-label="Preview"
          >
            <Eye className="h-3.5 w-3.5 sm:hidden" aria-hidden />
            <span className="hidden text-xs font-semibold sm:inline">Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className={cn(
              "rounded-sm p-1.5 transition-colors duration-150 ease-out sm:px-3 sm:py-1",
              editMode
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            )}
            aria-pressed={editMode}
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5 sm:hidden" aria-hidden />
            <span className="hidden text-xs font-semibold sm:inline">Edit</span>
          </button>
        </div>
        {extraToolbar}
      </div>

      {saveError ? (
        <p
          className={cn(
            "shrink-0 border-b px-3 py-2 text-xs text-destructive",
            theme.uiChrome.border,
          )}
        >
          {saveError}
        </p>
      ) : null}

      <div className="h-full overflow-y-auto px-0 pb-1 pt-12 sm:px-2 sm:pb-2 sm:pt-14">
        {children}
      </div>
    </section>
  );
}
