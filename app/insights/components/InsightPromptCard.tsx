"use client";

import type { ReactNode } from "react";

type InsightPromptCardProps = {
  label: string;
  labelHtmlFor: string;
  /** Prompt field (e.g. `InsightMultilinePrompt`). */
  prompt: ReactNode;
  footer: ReactNode;
  /** Shown under the card (errors, hints). */
  belowCard?: ReactNode;
};

export function InsightPromptCard({
  label,
  labelHtmlFor,
  prompt,
  footer,
  belowCard,
}: InsightPromptCardProps) {
  return (
    <div className="mb-6 space-y-2">
      <label
        className="text-xs font-medium text-muted-foreground"
        htmlFor={labelHtmlFor}
      >
        {label}
      </label>
      <div className="rounded-sm border border-border/50 bg-background overflow-hidden">
        <div className="flex flex-col">
          {prompt}
          <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3 border-t border-border/40 bg-muted/20">
            {footer}
          </div>
        </div>
      </div>
      {belowCard}
    </div>
  );
}
