'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

export default function Examples() {
  return (
    <motion.section 
      id="examples" 
      className="space-y-12"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="space-y-4 text-center">
        <h3 className="text-2xl font-bold tracking-tight text-foreground">
          Describe your workflow—AI builds the tracker
        </h3>
        <p className="text-muted-foreground text-base max-w-2xl font-medium mx-auto">
          From project pipelines to equipment logs, type in plain language and get a ready-to-use tracker for your team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {[
          'Track our project pipeline with status, owner, due date, and priority',
          'Create an internal requests board for IT and facilities with assignee and SLA',
          'Track hiring pipeline with role, stage, recruiter, interviewer, and feedback',
          'Log all company equipment with who has it, where it lives, and current status',
          'Track vendor contracts with renewal dates, owners, and cost per month',
          'Monitor inventory levels with location, reorder thresholds, and supplier',
        ].map((prompt, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="group relative"
          >
            <div className="p-4 rounded-md bg-secondary/20 border border-border/40 hover:bg-secondary/40 hover:border-border transition-all cursor-pointer">
              <p className="text-sm text-foreground/80 font-mono leading-relaxed">
                "{prompt}"
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center">
        <Button size="lg" className="rounded-md px-8" asChild>
          <a href="/login?callbackUrl=/tracker">Try it yourself →</a>
        </Button>
      </div>
    </motion.section>
  )
}
