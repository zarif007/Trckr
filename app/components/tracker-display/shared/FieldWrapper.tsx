"use client";

import { cn } from "@/lib/utils";

export interface FieldWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** When true, shows error border and ring (blocks submission). */
  error?: boolean;
  /** When true, shows warning border and ring (allows submission). */
  warning?: boolean;
  /** Accessible title/tooltip for validation message (error or warning). */
  validationTitle?: string;
  /** Backward compatibility: deprecated in favor of validationTitle. */
  errorTitle?: string;
  /** Forward click to focus the first input inside (e.g. for div grid). */
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Single reusable wrapper for tracker fields (string, number, date, select, etc.)
 * used in div grid and in add/edit entry dialogs. Keeps border, uses transparent
 * background so it looks consistent and light.
 *
 * Supports both error (red, blocking) and warning (amber, non-blocking) states.
 */
export function FieldWrapper({
  children,
  className,
  error,
  warning,
  validationTitle,
  errorTitle,
  onPointerDown,
  onClick,
}: FieldWrapperProps) {
  const title = validationTitle ?? errorTitle;

  return (
    <div
      className={cn(
        "relative min-w-0 rounded-sm border bg-transparent transition-colors",
        "hover:border-ring focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30",
        error
          ? "border-destructive/60 ring-1 ring-destructive/40"
          : warning
            ? "border-warning/50 ring-1 ring-warning/30"
            : "border-input",
        className,
      )}
      title={(error || warning) ? title : undefined}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
