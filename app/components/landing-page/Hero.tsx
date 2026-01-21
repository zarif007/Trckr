'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface HeroProps {
  y1: any
  y2: any
}

export default function Hero({ y1, y2 }: HeroProps) {
  return (
    <section className="relative pt-20 pb-40 overflow-visible">
      <motion.div 
        style={{ y: y1 }}
        className="absolute -top-20 -right-20 w-[500px] h-[500px] opacity-[0.15] pointer-events-none hidden lg:block"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full text-foreground">
          <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M50 50L150 50L150 150L50 150Z" />
          <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M80 20L180 20L180 120L80 120Z" />
          <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M50 50L80 20M150 50L180 20M150 150L180 120M50 150L80 120" />
        </svg>
      </motion.div>

      <motion.div 
        style={{ y: y2 }}
        className="absolute top-1/2 -left-32 w-80 h-80 opacity-[0.1] pointer-events-none hidden lg:block"
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full text-foreground">
          <rect x="20" y="20" width="50" height="160" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="75" y="20" width="50" height="160" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="130" y="20" width="50" height="160" rx="2" fill="none" stroke="currentColor" strokeWidth="0.5" />
          
          <rect x="25" y="30" width="40" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="25" y="55" width="40" height="25" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="25" y="85" width="40" height="15" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          
          <rect x="80" y="40" width="40" height="30" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="80" y="75" width="40" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          
          <rect x="135" y="30" width="40" height="40" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <rect x="135" y="75" width="40" height="15" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </motion.div>

      <div className="text-center space-y-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 rounded-md px-4 py-1.5 bg-secondary/30 backdrop-blur-xl border border-border/50 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-md h-2 w-2 bg-emerald-500"></span>
          </span>
          The Future of Data Tracking
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="font-space text-[3.2rem] md:text-[5rem] lg:text-[6.5rem] font-extrabold leading-[1.1] md:leading-[1.3]"
        >
          Track <span className="relative inline-block ml-2">
            <span className="absolute inset-0 bg-foreground -rotate-2 rounded-sm" />
            <span className="relative px-4 py-1 text-background font-bold tracking-tight">Anything.</span>
          </span> <br />
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-6 mt-10">
            {[
              { text: "Describe", gradient: "from-foreground via-foreground to-foreground/70" },
              { text: "generate", gradient: "from-foreground via-foreground/90 to-foreground/60" },
              { text: "log", gradient: "from-foreground via-foreground/80 to-foreground/50" }
            ].map((word, i) => (
              <motion.span
                key={word.text}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 + i * 0.2, ease: "easeOut" }}
                whileHover={{ scale: 1.05, filter: "brightness(1.2)" }}
                className={`text-[2rem] md:text-[3.8rem] lg:text-[4.8rem] text-transparent bg-clip-text bg-gradient-to-r ${word.gradient} font-medium tracking-tight cursor-default flex items-center gap-4`}
              >
                {word.text}
                {i < 2 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-foreground/20 hidden md:block"
                  />
                )}
              </motion.span>
            ))}
          </div>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-muted-foreground font-inter text-lg md:text-xl lg:text-2xl leading-[1.4] tracking-[-0.01em] text-muted-foreground/90 max-w-3xl mx-auto font-medium"
        >
          No templates. No complexity. <br />
          Just pure productivity from a single prompt.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8"
        >
          <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-md group transition-all hover:scale-105 active:scale-95 bg-foreground text-background" asChild>
            <a href="/tracker">
              Get Started
              <span className="inline-block transition-transform group-hover:translate-x-1 ml-2" aria-hidden>→</span>
            </a>
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold rounded-md hover:bg-secondary/50 border-border/50 transition-all" asChild>
            <a href="#demo">
              Watch Demo
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
