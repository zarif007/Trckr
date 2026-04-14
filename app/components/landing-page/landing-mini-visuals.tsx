"use client";

import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

const frame = cn(
  "rounded-sm border overflow-hidden",
  theme.border.subtle,
  "bg-muted/20",
);

/** Ops use-cases: projects, inventory, requests */
export function UseCaseVisual({
  variant,
  className,
}: {
  variant: "table" | "kanban" | "inbox";
  className?: string;
}) {
  if (variant === "kanban") {
    return (
      <div
        className={cn("flex gap-1 p-2 h-[4.25rem]", frame, className)}
        aria-hidden
      >
        {[0.4, 0.55, 0.35].map((w, i) => (
          <div
            key={i}
            className="flex flex-1 flex-col gap-1 rounded border bg-background/60 p-1 min-w-0"
          >
            <div className="h-1 w-2/3 rounded-sm bg-foreground/12" />
            <div
              className="mt-auto h-6 rounded-sm bg-foreground/12 border border-border/60"
              style={{ width: `${w * 100}%` }}
            />
          </div>
        ))}
      </div>
    );
  }
  if (variant === "inbox") {
    return (
      <div
        className={cn("space-y-1.5 p-2 h-[4.25rem]", frame, className)}
        aria-hidden
      >
        {[0.92, 0.78, 0.85].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/20" />
            <div
              className="h-2 rounded-sm bg-foreground/10"
              style={{ width: `${w * 100}%` }}
            />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      className={cn("space-y-1.5 p-2 h-[4.25rem]", frame, className)}
      aria-hidden
    >
      {[0.95, 0.72, 0.88, 0.65].map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-2 rounded-sm bg-foreground/10"
            style={{ width: `${w * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** Platform capability tiles — abstract UI metaphors */
export function CapabilityVisual({
  variant,
  className,
}: {
  variant:
    | "aiBuild"
    | "aiAnalyst"
    | "editor"
    | "drag"
    | "calc"
    | "validate"
    | "master"
    | "analysisDocument";
  className?: string;
}) {
  const h = "h-[3.35rem]";

  if (variant === "aiBuild") {
    return (
      <div className={cn("flex gap-1.5 p-2", frame, h, className)} aria-hidden>
        <div className="flex flex-1 flex-col justify-end gap-1 min-w-0">
          <div className="h-2 w-[72%] rounded-full bg-foreground/18 ml-auto" />
          <div className="h-2 w-[88%] rounded-full bg-muted-foreground/15 ml-auto" />
          <div className="h-2 w-[55%] rounded-full bg-muted-foreground/12 ml-auto" />
        </div>
        <div className="w-[42%] shrink-0 rounded border bg-background/70 p-1 space-y-1">
          <div className="h-1 rounded-sm bg-foreground/10" />
          <div className="h-1 w-4/5 rounded-sm bg-foreground/8" />
          <div className="h-1 w-3/5 rounded-sm bg-foreground/8" />
        </div>
      </div>
    );
  }

  if (variant === "aiAnalyst") {
    return (
      <div
        className={cn("p-2 flex flex-col gap-1.5", frame, h, className)}
        aria-hidden
      >
        <div className="flex items-end gap-0.5 h-8 px-0.5">
          {[35, 55, 40, 70, 45, 60].map((pct, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-foreground/18 min-w-0"
              style={{ height: `${pct}%` }}
            />
          ))}
        </div>
        <div className="h-1.5 w-2/3 rounded-sm bg-foreground/10" />
      </div>
    );
  }

  if (variant === "editor") {
    return (
      <div
        className={cn("flex items-stretch gap-1 p-2", frame, h, className)}
        aria-hidden
      >
        {[0.15, 0.35, 0.22].map((opacity, i) => (
          <div
            key={i}
            className="flex-1 rounded border bg-background/60 flex flex-col gap-1 p-1 min-w-0"
          >
            <div className="flex gap-0.5">
              <div className="h-1 w-1 rounded-sm bg-muted-foreground/35" />
              <div className="h-1 w-1 rounded-sm bg-muted-foreground/35" />
            </div>
            <div
              className="mt-auto h-3 rounded-sm bg-foreground/10"
              style={{ opacity: 0.5 + opacity }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "drag") {
    return (
      <div
        className={cn("flex items-center gap-1 p-2", frame, h, className)}
        aria-hidden
      >
        <div className="flex flex-col gap-0.5 px-0.5 opacity-40">
          <div className="flex gap-0.5">
            <div className="h-0.5 w-0.5 rounded-full bg-foreground" />
            <div className="h-0.5 w-0.5 rounded-full bg-foreground" />
          </div>
          <div className="flex gap-0.5">
            <div className="h-0.5 w-0.5 rounded-full bg-foreground" />
            <div className="h-0.5 w-0.5 rounded-full bg-foreground" />
          </div>
        </div>
        <div className="flex-1 flex gap-1 items-center min-w-0">
          <div className="h-7 flex-1 rounded border bg-foreground/8 border-border/60" />
          <div className="h-7 flex-1 rounded border bg-background/70" />
          <div className="h-7 flex-1 rounded border bg-background/70" />
        </div>
      </div>
    );
  }

  if (variant === "calc") {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-1 px-2 py-1.5",
          frame,
          h,
          className,
        )}
        aria-hidden
      >
        <div className="h-6 w-7 rounded border bg-background/70" />
        <span className="text-[10px] font-bold text-muted-foreground">×</span>
        <div className="h-6 w-7 rounded border bg-background/70" />
        <span className="text-[10px] font-bold text-muted-foreground">=</span>
        <div className="h-6 w-9 rounded border bg-foreground/10 border-border/60" />
      </div>
    );
  }

  if (variant === "validate") {
    return (
      <div
        className={cn(
          "flex flex-col justify-center gap-1.5 p-2",
          frame,
          h,
          className,
        )}
        aria-hidden
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded border-2 border-foreground/35 bg-foreground/8 shrink-0" />
          <div className="h-2 flex-1 rounded-sm bg-foreground/10" />
        </div>
        <div className="flex items-center gap-2 opacity-50">
          <div className="h-3 w-3 rounded border border-muted-foreground/30 shrink-0" />
          <div className="h-2 flex-1 rounded-sm bg-foreground/8" />
        </div>
      </div>
    );
  }

  if (variant === "master") {
    return (
      <div
        className={cn("flex items-center gap-1.5 p-2", frame, h, className)}
        aria-hidden
      >
        <div className="flex-1 h-full rounded border bg-background/70 p-1 space-y-1 min-w-0">
          <div className="h-2 rounded-sm bg-foreground/12 w-full" />
          <div className="h-2 rounded-sm bg-foreground/8 w-3/4" />
        </div>
        <div className="text-[9px] text-muted-foreground font-bold shrink-0">
          →
        </div>
        <div className="w-[38%] h-full rounded border bg-muted/40 p-1 space-y-0.5 shrink-0">
          <div className="h-1.5 rounded-sm bg-foreground/15" />
          <div className="h-1.5 rounded-sm bg-foreground/12" />
          <div className="h-1.5 rounded-sm bg-foreground/10" />
        </div>
      </div>
    );
  }

  if (variant === "analysisDocument") {
    return (
      <div
        className={cn("p-2 flex flex-col gap-1", frame, h, className)}
        aria-hidden
      >
        <div className="h-2 w-1/2 rounded-sm bg-foreground/15" />
        <div className="flex-1 rounded border bg-background/60 p-1 space-y-0.5 min-h-0">
          <div className="h-1 rounded-sm bg-foreground/10" />
          <div className="h-1 w-5/6 rounded-sm bg-foreground/8" />
          <div className="h-1 w-4/6 rounded-sm bg-foreground/8" />
        </div>
      </div>
    );
  }

  return null;
}

const askH = "h-[4.25rem]";

/** Ask-data examples: muted blocks only (landing), matches UseCaseVisual energy */
export function AnalystAskVisual({
  variant,
}: {
  variant: "summary" | "trends" | "suggestions";
}) {
  if (variant === "summary") {
    return (
      <div className={cn("p-2 flex flex-col gap-1.5", frame, askH)} aria-hidden>
        <div className="h-1.5 w-[40%] rounded-sm bg-foreground/18" />
        <div className="flex-1 rounded border bg-background/60 p-1.5 space-y-1 min-h-0">
          <div className="h-1 rounded-sm bg-foreground/10 w-full" />
          <div className="h-1 rounded-sm bg-foreground/10 w-[92%]" />
          <div className="h-1 rounded-sm bg-foreground/8 w-[78%]" />
          <div className="h-1 rounded-sm bg-foreground/8 w-[85%]" />
        </div>
      </div>
    );
  }

  if (variant === "trends") {
    return (
      <div className={cn("p-2 flex flex-col gap-1.5", frame, askH)} aria-hidden>
        <div className="flex items-end gap-0.5 flex-1 min-h-0 px-0.5">
          {[38, 52, 44, 68, 48, 58, 42].map((pct, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-foreground/15 min-w-0"
              style={{ height: `${pct}%` }}
            />
          ))}
        </div>
        <div className="h-1 w-2/3 rounded-sm bg-foreground/10 shrink-0" />
      </div>
    );
  }

  return (
    <div className={cn("p-2 space-y-1.5", frame, askH)} aria-hidden>
      {[0.88, 0.72, 0.8].map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 shrink-0 rounded-full border border-foreground/25 bg-foreground/8" />
          <div
            className="h-2 rounded-sm bg-foreground/10"
            style={{ width: `${w * 100}%` }}
          />
        </div>
      ))}
    </div>
  );
}
