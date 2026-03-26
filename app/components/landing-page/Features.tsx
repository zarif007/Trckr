'use client'

import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import LandingAxisFrame from '@/app/components/landing-page/LandingAxisFrame'
import { UseCaseVisual } from '@/app/components/landing-page/landing-mini-visuals'
import { cn } from '@/lib/utils'
import { theme } from '@/lib/theme'

export default function Features() {
  return (
    <motion.section
      id="samples"
      className="space-y-5 sm:space-y-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Real ops
        </h3>
        <a
          href="#platform"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-muted-foreground hover:text-foreground w-fit"
        >
          Engine
          <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {[
          {
            category: 'Projects',
            title: 'Pipeline',
            visual: 'table' as const,
          },
          {
            category: 'Inventory',
            title: 'Stock & assets',
            visual: 'kanban' as const,
          },
          {
            category: 'Requests',
            title: 'HR & IT queue',
            visual: 'inbox' as const,
          },
        ].map((sample, idx) => (
          <motion.div
            key={sample.title}
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: idx * 0.06 }}
            className="relative"
          >
            <LandingAxisFrame
              contentClassName={cn(
                theme.surface.secondarySubtle,
                'flex flex-col gap-2.5 p-3.5 sm:p-4'
              )}
            >
              <UseCaseVisual variant={sample.visual} />
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] uppercase tracking-widest sm:text-[10px]',
                    theme.surface.badgeWash,
                    theme.border.subtleAlt
                  )}
                >
                  {sample.category}
                </Badge>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-foreground leading-tight">
                {sample.title}
              </h4>
            </LandingAxisFrame>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
