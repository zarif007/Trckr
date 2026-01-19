'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Demo() {
  const demoPrompt =
    'Track daily water intake: log cups, set daily target 8 cups, reminders at 9:00 AM and 3:00 PM, weekly summary.'

  const generatedBoard = {
    title: 'Daily Water Tracker',
    fields: ['date', 'cups', 'notes'],
    views: ['Daily Log', 'Weekly Summary'],
    reminders: ['09:00 AM', '03:00 PM'],
    suggestions: ['Daily goal: 8 cups', 'Enable streaks'],
  }

  return (
    <div
      id="demo"
      className="mt-8 p-8 rounded-3xl bg-secondary/30 border border-border/50 hover:bg-secondary/40 transition-all"
    >
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            The Experience
          </h3>
          <p className="text-muted-foreground text-sm font-medium">
            Natural language in. Structured interface out.
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">
              INPUT
            </label>
            <div className="p-4 rounded-xl bg-background border border-border/50 font-mono text-sm text-foreground shadow-sm">
              {demoPrompt}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 ml-1">
              OUTPUT
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-background border border-border/50 shadow-sm space-y-4 transition-all hover:border-primary/30">
                <h4 className="font-bold text-foreground">
                  {generatedBoard.title}
                </h4>
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    SCEMA
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedBoard.fields.map((f) => (
                      <Badge
                        key={f}
                        variant="outline"
                        className="text-[10px] bg-secondary/50 border-border/50 py-0"
                      >
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-background border border-border/50 shadow-sm space-y-4 transition-all hover:border-primary/30">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    Views
                  </div>
                  <ul className="space-y-1.5">
                    {generatedBoard.views.map((v) => (
                      <li key={v} className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary/40" />
                        {v}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pt-3 border-t border-border/30">
                  <div className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest pb-2">
                    REMINERS
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {generatedBoard.reminders.map((r) => (
                      <Badge
                        key={r}
                        variant="secondary"
                        className="text-[10px] py-0 bg-primary/10 text-primary border-primary/20"
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
