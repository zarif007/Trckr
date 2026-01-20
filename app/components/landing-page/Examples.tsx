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
          Just describe what you want to track
        </h3>
        <p className="text-muted-foreground text-base max-w-2xl font-medium mx-auto">
          Type naturally and let AI build your tracker. Here are some examples to get you started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {[
          "I want to track my daily water intake with a goal of 8 glasses per day",
          "Create a workout log with exercises, sets, reps, and weight",
          "Track my reading progress with book titles, pages read, and ratings",
          "Monitor my spending by category with monthly summaries",
          "Log my meditation sessions with duration and notes",
          "Track job applications with company name, position, status, and follow-up dates"
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
          <a href="/tracker">Try it yourself →</a>
        </Button>
      </div>
    </motion.section>
  )
}
