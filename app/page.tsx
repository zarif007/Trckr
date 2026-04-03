"use client";

import Hero from "./components/landing-page/Hero";
import Platform from "./components/landing-page/Platform";
import Demo from "./components/landing-page/Demo";
import Protocol from "./components/landing-page/Protocol";
import CTA from "./components/landing-page/CTA";

export default function Home() {
  return (
    <div className="relative min-h-screen font-sans bg-background selection:bg-muted selection:text-foreground">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 sm:space-y-20 md:space-y-24 lg:space-y-28 py-16 sm:py-20">
        <Hero />

        {/* Divider */}
        <div className="h-px bg-border/20" />

        <Platform />

        {/* Divider */}
        <div className="h-px bg-border/20" />

        <Demo />

        {/* Divider */}
        <div className="h-px bg-border/20" />

        <Protocol />

        {/* Divider */}
        <div className="h-px bg-border/20" />

        <CTA />
      </div>
    </div>
  );
}
