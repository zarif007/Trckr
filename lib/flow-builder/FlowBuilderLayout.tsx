"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";
import {
  Check,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

export interface FlowBuilderLayoutProps {
  /** Short instruction text (e.g. "Drag nodes from the palette, connect them, then click Apply.") */
  headerText: string;
  /** Optional right side of header (e.g. Delete selected button) */
  headerRight?: ReactNode;
  /** Left sidebar: palette of draggable nodes. Keep minimal (labels or compact list). */
  palette: ReactNode;
  /** Main canvas area. Will be wrapped in an expandable container. */
  children: ReactNode;
  /** Minimum height of the canvas (default 360px). Use larger for expandable view. */
  canvasMinHeight?: string;
  /** Height of the palette and canvas container (default same as canvasMinHeight). Both panels will be this height. */
  containerHeight?: string;
  /** Optional error message shown above Apply button */
  applyError?: string | null;
  /** Called when user clicks Apply */
  onApply: () => void;
  /** Label for the Apply button (default "Apply") */
  applyLabel?: string;
  /** Optional class for the canvas wrapper */
  canvasClassName?: string;
  /** Optional class for the palette wrapper (e.g. narrow width) */
  paletteClassName?: string;
  /** Optional success state for the apply button */
  applySuccess?: boolean;
}

/**
 * Reusable layout for flow builders (expression builder, dynamic options pipeline).
 * Modern n8n-inspired design with improved visual hierarchy and interactions.
 */
export function FlowBuilderLayout({
  headerText,
  headerRight,
  palette,
  children,
  canvasMinHeight = "600px",
  containerHeight,
  applyError,
  onApply,
  applyLabel = "Apply",
  canvasClassName,
  paletteClassName,
  applySuccess = false,
}: FlowBuilderLayoutProps) {
  const [paletteOpen, setPaletteOpen] = useState(true);
  const panelHeight = containerHeight ?? canvasMinHeight;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 border bg-card/50 p-4 ",
        theme.radius.md,
        theme.border.subtleAlt,
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground/80">
            {headerText}
          </span>
        </div>
        {headerRight && (
          <div className="flex items-center gap-2">{headerRight}</div>
        )}
      </div>

      {/* Main Content: Palette + Canvas */}
      <div
        className="flex min-h-0 min-w-0 w-full gap-4"
        style={{ height: panelHeight }}
      >
        {/* Palette Sidebar — collapsible */}
        <div
          className={cn(
            "flex shrink-0 flex-col border bg-muted/30 overflow-hidden transition-all duration-200 h-full",
            theme.radius.md,
            theme.border.verySubtle,
            paletteOpen ? (paletteClassName ?? "w-[180px]") : "w-9",
          )}
        >
          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => setPaletteOpen((v) => !v)}
            className="flex h-8 w-full shrink-0 items-center justify-center border-b border-border/20 hover:bg-muted/60 transition-colors"
            title={paletteOpen ? "Hide palette" : "Show palette"}
            aria-label={paletteOpen ? "Hide palette" : "Show palette"}
          >
            {paletteOpen ? (
              <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
            ) : (
              <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Palette Content — only shown when open */}
          {paletteOpen && (
            <div className="flex flex-col gap-3 overflow-y-auto p-3 flex-1">
              {palette}
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div
          className={cn(
            "flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden border bg-background/80 h-full",
            theme.radius.md,
            theme.border.subtleAlt,
            canvasClassName,
          )}
        >
          {children}
        </div>
      </div>

      {/* Error Message */}
      {applyError != null && applyError !== "" && (
        <div
          className={cn(
            "flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
            theme.radius.md,
          )}
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{applyError}</span>
        </div>
      )}

      {/* Apply Button */}
      <div className="flex justify-end pt-1">
        <Button
          type="button"
          size="sm"
          onClick={onApply}
          className={cn(
            "gap-2 transition-all duration-200",
            applySuccess
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-primary hover:bg-primary/90",
          )}
        >
          {applySuccess ? (
            <>
              <Check className="h-4 w-4" />
              Applied
            </>
          ) : (
            applyLabel
          )}
        </Button>
      </div>
    </div>
  );
}
