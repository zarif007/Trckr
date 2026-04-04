"use client";

import { Button } from "@/components/ui/button";
import LandingAxisFrame from "@/app/components/landing-page/LandingAxisFrame";
import { cn } from "@/lib/utils";
import { theme } from "@/lib/theme";

export default function Hero() {
  return (
    <section className="relative overflow-visible px-0 sm:px-2 pt-[1rem]">
      <div className="fixed inset-0 pointer-events-none z-0 bg-grid opacity-[0.04] dark:opacity-[0.07]" />

      <div className="relative z-10 mx-auto max-w-6xl mb-2 sm:mb-3">
        <LandingAxisFrame
          variant="blueprint"
          className="w-full max-w-6xl"
          extend={30}
          contentClassName={cn(
            theme.surface.secondaryHero,
            "px-0 bg-transparent",
          )}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 sm:px-10 md:px-16 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground/15" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground/35" />
              </div>
              <span className="text-[12px] font-bold uppercase tracking-[0.22em] text-muted-foreground/65">
                AI-native Data Tracking
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground/25 tabular-nums">
              describe anything → it builds it
            </span>
          </div>

          {/* Content */}
          <div className="px-6 sm:px-10 md:px-16 py-24 sm:py-32 md:py-44 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-[-0.035em] text-foreground max-w-3xl mx-auto">
              Track
              <br />
              <span className="relative inline-block px-1 sm:px-1.5">
                <span
                  className="absolute inset-x-0 bottom-[0.1em] top-[0.1em] rounded-sm bg-foreground"
                  aria-hidden
                />
                <span className="relative font-medium text-background">
                  everything your team runs on.
                </span>
              </span>
            </h1>
            <p className="mt-6 sm:mt-7 text-base sm:text-lg text-muted-foreground/60 leading-relaxed max-w-xl mx-auto">
              No forms. No schema. No config screens. AI generates fields,
              views, rules, and validations from a single sentence.
            </p>
            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                className="h-11 px-7 text-sm font-medium rounded-sm bg-foreground text-background hover:bg-foreground/90 transition-colors"
                asChild
              >
                <a href="/login?callbackUrl=/tracker">Start building</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  "h-11 px-7 text-sm font-medium bg-transparent hover:bg-muted/50 transition-colors",
                  theme.radius.md,
                  theme.border.default,
                )}
                asChild
              >
                <a href="#demo">Watch demo</a>
              </Button>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-6 sm:px-10 md:px-16 py-3 sm:py-4 border-t">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/25">
              No setup · No config · No exports · Grounded in your data
            </p>
          </div>
        </LandingAxisFrame>
      </div>
    </section>
  );
}
