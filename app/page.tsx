'use client'

import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'
import Background from './components/landing-page/Background'
import Hero from './components/landing-page/Hero'
import Features from './components/landing-page/Features'
import Examples from './components/landing-page/Examples'
import Protocol from './components/landing-page/Protocol'
import CTA from './components/landing-page/CTA'
import Demo from './components/landing-page/Demo'

export default function Home() {
  const [selectedExample, setSelectedExample] = useState<string | null>(null)
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
      <Background mouseXSpring={mouseXSpring} mouseYSpring={mouseYSpring} />
      
      <div className="relative max-w-full mx-auto px-6 py-12 space-y-24 z-20">
        <Hero y1={y1} y2={y2} />

        <section className='max-w-7xl mx-auto flex flex-col space-y-20 md:space-y-40'>
          <Features />
          <Examples />
          <Protocol />
          <Demo />
          <CTA />
        </section>
      </div>
    </div>
  )
}
