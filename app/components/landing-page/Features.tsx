'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'

export default function Features() {
  return (
    <motion.section 
      id="samples" 
      className="space-y-8 sm:space-y-12"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Built for how small teams actually work.
        </h3>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl font-medium">
          Trckr handles internal projects, inventory, requests, hiring, and day-to-day operations—more powerful than
          spreadsheets, easier than stitching together docs and Notion pages.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {[
          {
            category: 'Projects & Ops',
            title: 'Project pipeline',
            body: 'See every initiative in one place with owners, due dates, and status so nothing slips.',
            footer: 'Fields: project, owner, status, due date • Views: table, kanban',
          },
          {
            category: 'Inventory & Assets',
            title: 'Equipment tracker',
            body: 'Know what you own, where it is, and who is responsible—without wrestling a giant spreadsheet.',
            footer: 'Fields: item, location, owner, status • Views: inventory table',
          },
          {
            category: 'Requests & HR',
            title: 'Internal requests',
            body: 'Centralize IT, facilities, and HR requests with clear assignees and SLAs for your team.',
            footer: 'Fields: type, requester, assignee, status • Views: inbox, by owner',
          },
        ].map((sample, idx) => (
          <motion.div
            key={sample.title}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className="group relative p-4 sm:p-6 rounded-md bg-secondary/30 border border-border/50 transition-all hover:bg-secondary/50 hover:border-border"
          >
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className="text-[9px] sm:text-[10px] uppercase tracking-widest bg-background/50 border-border/50"
                >
                  {sample.category}
                </Badge>
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-foreground">
                {sample.title}
              </h4>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                {sample.body}
              </p>
              <p className="text-[9px] sm:text-[10px] font-medium text-muted-foreground/60 uppercase tracking-tight pt-3 sm:pt-4 border-t border-border/30">
                {sample.footer}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
