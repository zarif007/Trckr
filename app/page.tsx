'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import Demo from './components/Demo'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const { scrollY } = useScroll()
  
  const springConfig = { damping: 25, stiffness: 150 }
  const mouseXSpring = useSpring(0, springConfig)
  const mouseYSpring = useSpring(0, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseXSpring.set(e.clientX)
      mouseYSpring.set(e.clientY)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseXSpring, mouseYSpring])

  const y1 = useTransform(scrollY, [0, 500], [0, 200])
  const y2 = useTransform(scrollY, [0, 500], [0, -150])

  return (
    <div className="min-h-screen font-sans bg-background selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      {/* Spotlight Effect */}
      <motion.div 
        className="fixed inset-0 pointer-events-none z-10 opacity-50"
        style={{
          background: useTransform(
            [mouseXSpring, mouseYSpring],
            ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(139, 92, 246, 0.08), transparent 80%)`
          )
        }}
      />

      {/* Mesh Gradient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[130px] animate-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[130px] animate-glow-delayed" />
      </div>

      {/* Background Grid */}
      <div className="fixed inset-0 bg-grid mask-radial opacity-20 pointer-events-none z-0" />
      
      <div className="relative max-w-full mx-auto px-6 py-12 space-y-24 z-20">
        {/* Hero Section */}
        <section className="relative pt-20 pb-40 overflow-visible">
          {/* Floating Geometric Shapes */}
          <motion.div 
            style={{ y: y1 }}
            className="absolute -top-20 -right-20 w-[500px] h-[500px] opacity-[0.15] pointer-events-none hidden lg:block"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          >
            {/* Cube wireframe */}
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
            {/* Pyramid/Prism wireframe */}
            <svg viewBox="0 0 200 200" className="w-full h-full text-foreground">
              <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M100 20L180 150L20 150Z" />
              <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M100 20L100 150" />
              <path fill="none" stroke="currentColor" strokeWidth="0.5" d="M100 20L60 180L140 180Z" />
            </svg>
          </motion.div>

          {/* Smaller Floating Boxes */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-foreground/5 border border-foreground/10 rounded-lg pointer-events-none hidden lg:block"
              style={{
                width: Math.random() * 40 + 20,
                height: Math.random() * 40 + 20,
                top: `${Math.random() * 80 + 10}%`,
                left: `${Math.random() * 80 + 10}%`,
                y: useTransform(scrollY, [0, 1000], [0, (i + 1) * -50]),
              }}
              animate={{
                rotate: [0, 90, 180, 270, 360],
                opacity: [0.05, 0.1, 0.05],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}

          <div className="text-center space-y-8 relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-secondary/30 backdrop-blur-xl border border-border/50 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.3em] text-muted-foreground"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              The Future of Data Infrastucture
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-foreground max-w-4xl mx-auto"
            >
              Track anything. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground to-muted-foreground/20">Describe, generate, log.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="text-muted-foreground text-xl md:text-2xl lg:text-3xl leading-tight max-w-3xl mx-auto font-medium"
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
              <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-full group transition-all hover:scale-105 active:scale-95 bg-foreground text-background" asChild>
                <a href="/tracker">
                  Get Started
                  <span className="inline-block transition-transform group-hover:translate-x-1 ml-2" aria-hidden>→</span>
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 text-lg font-bold rounded-full hover:bg-secondary/50 border-border/50 transition-all" asChild>
                <a href="#demo">
                  Watch Demo
                </a>
              </Button>
            </motion.div>
          </div>
        </section>

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
                className="group relative p-6 rounded-2xl bg-secondary/30 border border-border/50 transition-all hover:bg-secondary/50 hover:border-border"
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

        <section id="how" className="space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold tracking-tight text-foreground">
                The Trckr Protocol
              </h3>
              <p className="text-muted-foreground text-base max-w-xl font-medium">
                A guided flow designed for speed and precision. 
                From idea to interface in under 60 seconds.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="w-fit text-muted-foreground hover:text-foreground">
              <a href="#samples">Skip to examples <span className="ml-2">↓</span></a>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                title: 'Natural Input',
                body: "Describe what you track, how often, and the goals you care about in plain English.",
              },
              {
                title: 'Neural Synthesis',
                body: 'Our AI engine proposes schema, views, and reminders tailored to your specific workflow.',
              },
              {
                title: 'Live Deployment',
                body: 'Refine the proposal or start tracking immediately. Your board is ready to use.',
              },
            ].map((item, idx) => (
              <div
                key={item.title}
                className="relative space-y-4 group"
              >
                <div className="text-[40px] font-black text-muted-foreground/10 group-hover:text-primary/10 transition-colors">
                  0{idx + 1}
                </div>
                <h4 className="text-xl font-bold text-foreground tracking-tight">
                  {item.title}
                </h4>
                <p className="text-muted-foreground text-sm leading-relaxed font-medium">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Demo />

        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative text-center py-32 border-t border-border/30 overflow-hidden"
        >
          {/* Local Spotlight */}
          <div className="absolute inset-0 bg-grid-small opacity-10 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
          
          <div className="space-y-12 relative z-10">
            <h3 className="text-4xl md:text-7xl font-black tracking-tighter text-foreground max-w-3xl mx-auto leading-[0.9]">
              The future of tracking <br />
              <span className="text-muted-foreground/40">is here today.</span>
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button size="lg" className="h-16 px-12 text-xl font-black rounded-full group transition-all hover:scale-105 active:scale-95 bg-foreground text-background shadow-2xl shadow-primary/20" asChild>
                <a href="/tracker">
                  Start Building Now
                  <span className="inline-block transition-transform group-hover:translate-x-2 ml-3" aria-hidden>→</span>
                </a>
              </Button>
            </div>
            <p className="text-muted-foreground text-base font-bold tracking-tight uppercase opacity-60">
              Trusted by 50,000+ developers worldwide
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
