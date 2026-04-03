'use client'

import { Button } from '@/components/ui/button'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

export default function CTA() {
  return (
    <section className="relative py-12 sm:py-20 md:py-28">
      <LandingAxisFrame
        className="relative mx-auto max-w-4xl"
        contentClassName={cn(
          theme.surface.secondarySubtle,
          'px-5 py-12 sm:px-8 sm:py-16 md:px-12 md:py-20',
        )}
      >
        <div className="space-y-8 sm:space-y-10 text-center">
          {/* Overline */}
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-6 bg-border/30" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60">
              The bar is lower now
            </span>
            <div className="h-px w-6 bg-border/30" />
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h3 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tighter text-foreground leading-[0.95] max-w-2xl mx-auto">
              Your spreadsheets
              <br />
              should&apos;ve been smarter.
            </h3>
            <p className="text-sm text-muted-foreground/65 max-w-md mx-auto leading-relaxed">
              Built for teams who&apos;ve outgrown Notion tables and Excel sheets. Describe what you need — it&apos;s already built.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 px-8 text-sm font-medium rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
              asChild
            >
              <a href="/login?callbackUrl=/tracker" className="inline-flex items-center justify-center gap-2">
                Start building
                <span className="text-background/80" aria-hidden>→</span>
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={cn(
                'h-12 px-8 text-sm font-medium bg-transparent hover:bg-muted/50 transition-colors',
                theme.radius.md,
                theme.border.default
              )}
              asChild
            >
              <a href="#demo">Watch demo</a>
            </Button>
          </div>

          {/* Footer */}
          <span className="inline-flex items-center rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            Free to start · No credit card · No config
          </span>
        </div>
      </LandingAxisFrame>
    </section>
  )
}
