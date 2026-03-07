'use client'

import { motion } from 'framer-motion'
import { MessageSquare, Cpu, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STEPS = [
  {
    title: 'Natural Input',
    body: 'Describe what your team tracks, how often, and the outcomes you care about in plain English.',
    icon: MessageSquare,
  },
  {
    title: 'Neural Synthesis',
    body: "Our AI engine proposes schema, views, and reminders tailored to your team's workflow.",
    icon: Cpu,
  },
  {
    title: 'Live Deployment',
    body: 'Refine the proposal or start tracking immediately. Your board is ready to use.',
    icon: Rocket,
  },
]

export default function Protocol() {
  return (
    <motion.section
      id="how"
      className="space-y-8 sm:space-y-12"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            The Trckr Protocol
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl font-medium">
            A guided flow designed for speed and precision.
            Describe your workflow—from idea to live tracker in under 60 seconds.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground hover:text-foreground">
          <a href="#examples">Skip to examples <span className="ml-2">↓</span></a>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {STEPS.map((item, idx) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -2 }}
              className="group relative p-4 sm:p-6 rounded-md bg-secondary/30 border border-border/50 transition-all hover:bg-secondary/50 hover:border-border"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <span className="text-2xl sm:text-[32px] font-black text-primary/10">
                  0{idx + 1}
                </span>
                <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" aria-hidden />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                {item.title}
              </h4>
              <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-medium mt-1.5 sm:mt-2">
                {item.body}
              </p>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
