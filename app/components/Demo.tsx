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
    <Card id="demo" className="mt-8 p-5 shadow-md hover:shadow-lg transition-shadow border-border dark:border-border/80">
      <h3 className="text-lg sm:text-xl font-semibold text-foreground">
        See a complete example
      </h3>
      <p className="text-muted-foreground text-sm mt-1">
        This is what happens when you describe a tracker to Trckr in plain
        language: on the left is the request, on the right is the board Trckr
        would suggest.
      </p>

      <div className="mt-4">
        <label className="block text-sm font-medium text-foreground">
          1. What you tell Trckr
        </label>
        <pre className="mt-2 p-3 rounded-md bg-muted/50 dark:bg-muted/30 border border-border dark:border-border/80 overflow-x-auto text-sm text-foreground">
          {demoPrompt}
        </pre>

        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground">
            2. What Trckr builds for you
          </label>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-3 shadow-sm border-border dark:border-border/80">
              <h4 className="font-semibold text-foreground">{generatedBoard.title}</h4>
              <p className="text-muted-foreground text-xs mt-1">
                A simple table where each row is a day you log how much you
                drank.
              </p>
              <div className="mt-3">
                <div className="text-sm text-muted-foreground">Fields Trckr adds</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {generatedBoard.fields.map((f) => (
                    <Badge key={f} variant="outline" className="border-border dark:border-border/80">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-3 shadow-sm border-border dark:border-border/80">
              <div>
                <div className="text-sm text-muted-foreground">Views & reminders</div>
                <ul className="mt-2 list-disc ml-5 text-sm text-muted-foreground space-y-1">
                  {generatedBoard.views.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <div className="text-sm text-muted-foreground">Reminder times</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {generatedBoard.reminders.map((r) => (
                    <Badge key={r} variant="outline" className="border-border dark:border-border/80">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-sm text-muted-foreground">Helpful suggestions</div>
                <ul className="mt-2 list-disc ml-5 text-sm text-muted-foreground space-y-1">
                  {generatedBoard.suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Card>
  )
}
