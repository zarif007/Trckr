'use client'

import Hero from './components/landing-page/Hero'
import Features from './components/landing-page/Features'
import Examples from './components/landing-page/Examples'
import Protocol from './components/landing-page/Protocol'
import CTA from './components/landing-page/CTA'
import Demo from './components/landing-page/Demo'

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-background selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <div className="relative max-w-full mx-auto px-0 py-0 space-y-24 z-20">
        <Hero />

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
