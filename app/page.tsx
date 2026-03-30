'use client'

import Hero from './components/landing-page/Hero'
import Platform from './components/landing-page/Platform'
import Demo from './components/landing-page/Demo'
import IntelligenceSpotlight from './components/landing-page/IntelligenceSpotlight'
import AnalyticsSpotlight from './components/landing-page/AnalyticsSpotlight'
import Protocol from './components/landing-page/Protocol'
import CTA from './components/landing-page/CTA'

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans bg-background selection:bg-muted selection:text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-grid opacity-[0.06] dark:opacity-[0.11]"
      />
      <div className="relative z-10 max-w-full mx-auto px-0 py-0 space-y-20 md:space-y-32">
        <Hero />

        <section className='max-w-7xl mx-auto flex flex-col space-y-16 sm:space-y-20 md:space-y-24 lg:space-y-28 px-4 pt-6 sm:pt-8 md:pt-10 md:px-4'>
          {/* Gradient divider */}
          <div
            aria-hidden
            className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent"
          />
          <Platform />
          <Demo />
          <IntelligenceSpotlight />
          <AnalyticsSpotlight />
          <Protocol />
          <CTA />
        </section>
      </div>
    </div>
  )
}
