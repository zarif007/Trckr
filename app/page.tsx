'use client'

import Hero from './components/landing-page/Hero'
import Features from './components/landing-page/Features'
import LandingPlatformPower from './components/landing-page/LandingPlatformPower'
import Examples from './components/landing-page/Examples'
import Protocol from './components/landing-page/Protocol'
import CTA from './components/landing-page/CTA'
import Demo from './components/landing-page/Demo'

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans bg-background selection:bg-muted selection:text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-[0.06] dark:opacity-[0.11]"
      />
      <div className="relative z-10 max-w-full mx-auto px-0 py-0 space-y-16 md:space-y-24">
        <Hero />

        <section className='max-w-7xl mx-auto flex flex-col space-y-10 border-t border-border/35 px-4 pt-10 sm:space-y-12 sm:pt-12 md:space-y-14 md:px-4 md:pt-16 lg:space-y-20'>
          <Features />
          <LandingPlatformPower />
          <Demo />
          <Examples />
          <Protocol />
          <CTA />
        </section>
      </div>
    </div>
  )
}
