'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

export default function Features() {
  return (
    <motion.section 
      id="samples" 
      className="space-y-12"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="space-y-4">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">
          Built in seconds. Used for life.
        </h3>
        <p className="text-muted-foreground text-base max-w-2xl font-medium">
          Trckr handles personal habits, team rituals, and operational
          checklists. From wellness to finance, describe it and track it.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            category: 'Wellness',
            title: 'Hydration coach',
            body: 'Log each glass, set a daily target, and keep a streak without thinking.',
            footer: 'Fields: date, cups, notes • Views: daily log, weekly streak',
          },
          {
            category: 'Fitness',
            title: 'Strength tracker',
            body: 'Capture exercises, sets, and weights with PRs highlighted automatically.',
            footer: 'Fields: exercise, sets, weight • Views: today, PRs',
          },
          {
            category: 'Money',
            title: 'Lightweight budget',
            body: 'Track expenses by category and get a monthly summary, no spreadsheet needed.',
            footer: 'Fields: date, category, amount • Views: monthly summary',
          },
        ].map((sample, idx) => (
          <motion.div
            key={sample.title}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className="group relative p-6 rounded-md bg-secondary/30 border border-border/50 transition-all hover:bg-secondary/50 hover:border-border"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-widest bg-background/50 border-border/50"
                >
                  {sample.category}
                </Badge>
              </div>
              <h4 className="text-xl font-bold text-foreground">
                {sample.title}
              </h4>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {sample.body}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-tight pt-4 border-t border-border/30">
                {sample.footer}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
