'use client'

import { motion } from 'framer-motion'
import { Sparkles, PencilRuler, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
}

export interface TrackerModeChoiceProps {
  onSelectAI: () => void
  onSelectManual: () => void
}

export function TrackerModeChoice({ onSelectAI, onSelectManual }: TrackerModeChoiceProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-col items-center justify-center flex-1 px-2 md:px-6 pb-24"
    >
      <div className="relative max-w-4xl mx-auto w-full">
        <motion.div
          variants={item}
          className="text-center mb-10 md:mb-14"
        >
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Create a <span className="relative inline-block">
              <span className="absolute inset-0 bg-primary -rotate-2 rounded-md" />
              <span className="relative px-2 text-primary-foreground">tracker</span>
            </span>
          </h1>
          <p className="mt-3 text-sm md:text-base text-muted-foreground/90 font-medium">
            Choose how you&apos;d like to start
          </p>
        </motion.div>

        <div className="grid gap-4 md:gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
          <motion.div variants={item}>
            <button
              type="button"
              onClick={onSelectAI}
              className="block h-full w-full text-left group"
            >
              <Card className="h-full border-border/60 bg-card/70 hover:bg-card hover:border-primary/40 transition-all duration-200 cursor-pointer overflow-hidden">
                <CardContent className="p-6 md:p-8 flex flex-col gap-5">
                  <div className="w-12 h-12 rounded-md flex items-center justify-center bg-foreground text-background">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      Create with AI
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Describe what you need in plain English and get a tracker generated instantly.
                    </p>
                  </div>
                  <span className="inline-flex items-center mt-auto w-fit rounded-md h-9 px-4 text-sm font-medium bg-foreground text-background group-hover:bg-foreground/90 transition-colors">
                    Get started
                    <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </button>
          </motion.div>

          <motion.div variants={item}>
            <button
              type="button"
              onClick={onSelectManual}
              className="block h-full w-full text-left group"
            >
              <Card className="h-full border-border/60 bg-card/70 hover:bg-card hover:border-primary/40 transition-all duration-200 cursor-pointer overflow-hidden">
                <CardContent className="p-6 md:p-8 flex flex-col gap-5">
                  <div className="w-12 h-12 rounded-md flex items-center justify-center border-2 border-border bg-background">
                    <PencilRuler className="w-6 h-6 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      Start from scratch
                    </h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Build your tracker manually from a blank canvas with full control.
                    </p>
                  </div>
                  <span className="inline-flex items-center mt-auto w-fit rounded-md h-9 px-4 text-sm font-medium border border-input bg-background group-hover:bg-accent transition-colors">
                    Open editor
                    <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
