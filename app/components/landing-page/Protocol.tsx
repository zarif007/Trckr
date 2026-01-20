'use client'

import { Button } from '@/components/ui/button'

export default function Protocol() {
  return (
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
            <div className="text-[40px] font-black text-primary/10 transition-colors">
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
  )
}
