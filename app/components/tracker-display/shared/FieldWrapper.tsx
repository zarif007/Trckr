"use client";

import { cn } from "@/lib/utils";

export interface FieldWrapperProps {
  children: React.ReactNode;
  className?: string;
  /** When true, shows error border and ring. */
  error?: boolean;
  /** Accessible title/tooltip when error (e.g. validation message). */
  errorTitle?: string;
  /** Forward click to focus the first input inside (e.g. for div grid). */
  onPointerDown?: (e: React.PointerEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Single reusable wrapper for tracker fields (string, number, date, select, etc.)
 * used in div grid and in add/edit entry dialogs. Keeps border, uses transparent
 * background so it looks consistent and light.
 */
export function FieldWrapper({
  children,
  className,
  error,
  errorTitle,
  onPointerDown,
  onClick,
}: FieldWrapperProps) {
  return (
    <div
      className={cn(
        "relative min-w-0 rounded-sm border bg-transparent transition-colors",
        "hover:border-ring focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30",
        error
          ? "border-destructive/60 ring-1 ring-destructive/40"
          : "border-input",
        className,
      )}
      title={error ? errorTitle : undefined}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
