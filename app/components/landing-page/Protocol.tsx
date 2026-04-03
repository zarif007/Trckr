"use client";

import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

const STEPS = [
  {
    num: 1,
    label: "INPUT",
    title: "Describe it",
    body: "One sentence about what your team tracks.",
    mono: 'trckr.describe("client projects with budget and owner")',
  },
  {
    num: 2,
    label: "PROCESS",
    title: "AI generates the spec",
    body: "Fields, types, views, rules, and validations. All visual, zero config.",
    mono: "→ 5 fields · 3 views · 2 bindings",
  },
  {
    num: 3,
    label: "OUTPUT",
    title: "Run it. Ask the AI analyst.",
    body: "Your team fills it in. Ask questions, get reports, find trends.",
    mono: '→ "Which projects are over budget?" → answered.',
  },
];

export default function Protocol() {
  return (
    <section className="space-y-8 sm:space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/20 tabular-nums">
              003
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              How it works
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
            Up and running in minutes.
          </h3>
        </div>
        <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-sm sm:text-right">
          From idea to working tracker — without a single config screen.
        </p>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className={cn(
              "relative group rounded-sm border bg-background p-5 sm:p-6 overflow-hidden",
              theme.border.subtle,
              theme.surface.background,
              "transition-colors duration-100 hover:bg-secondary/10",
            )}
          >
            {/* Step number */}
            <span
              className="absolute -right-2 -top-3 select-none text-[5.5rem] font-black leading-none tracking-tighter"
              style={{ color: "hsl(var(--foreground) / 0.04)" }}
              aria-hidden
            >
              {step.num}
            </span>

            <div className="relative space-y-4">
              {/* Phase label */}
              <div className="flex items-center gap-2">
                <div className="h-px w-4 bg-foreground/15" />
                <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-foreground/30">
                  Phase {String(step.num).padStart(2, "0")} · {step.label}
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-semibold text-foreground tracking-tight leading-tight">
                {step.title}
              </h4>

              <p className="text-sm text-muted-foreground/70 leading-relaxed">
                {step.body}
              </p>

              {/* Monospace signal */}
              <div
                className={cn(
                  "rounded border px-3 py-2 font-mono text-[11px]",
                  theme.border.subtle,
                  theme.surface.secondarySubtle,
                  "text-muted-foreground/60",
                )}
              >
                {step.mono}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connector */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-border/20" />
        <span className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">
          input → generate → run
        </span>
        <div className="flex-1 h-px bg-border/20" />
      </div>
    </section>
  );
}
