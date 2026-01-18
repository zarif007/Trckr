import NavBar from './components/NavBar'
import Demo from './components/Demo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Home() {
  return (
    <div className="min-h-screen font-sans bg-background">
      <div className="relative max-w-6xl mx-auto px-4 py-10 space-y-14">
        <section className="rounded-md overflow-hidden relative">
          <Card className="overflow-hidden p-6 sm:p-10 rounded-md shadow-lg hover:shadow-xl transition-shadow border-border dark:border-border/80">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-card/80 backdrop-blur-lg border border-border dark:border-border/80 text-foreground text-xs font-semibold uppercase tracking-wide shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Modern AI trackers - Tables that breathes 
                </div>

                <div className="space-y-3">
                  <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight text-foreground">
                    Describe what you need. Trckr builds the board for you.
                  </h2>
                  <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
                    No templates to wrestle with. Just say what you want to
                    follow and get a ready-to-use tracker with fields, views,
                    reminders, and smart suggestions pre-filled.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <a href="#demo">
                      Try the guided demo <span aria-hidden>→</span>
                    </a>
                  </Button>
                  <Button size="lg" asChild variant="outline">
                    <a href="/tracker">
                      Get Started
                      <span aria-hidden>→</span>
                    </a>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-2">
                  <Card className="p-3 bg-card/80 backdrop-blur-lg border border-border dark:border-border/80">
                    <div className="font-semibold text-foreground">
                      One prompt
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Tell Trckr what you track, how often, and the goals you
                      care about.
                    </p>
                  </Card>
                  <Card className="p-3 bg-card/80 backdrop-blur-lg border border-border dark:border-border/80">
                    <div className="font-semibold text-foreground">
                      Built instantly
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Fields, views, reminders, and suggestions are generated
                      for you.
                    </p>
                  </Card>
                  <Card className="p-3 bg-card/80 backdrop-blur-lg border border-border dark:border-border/80">
                    <div className="font-semibold text-foreground">
                      Yours to tweak
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Edit anything before you start tracking — no rigid
                      template.
                    </p>
                  </Card>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-br from-purple-400/30 via-cyan-300/25 to-transparent dark:from-purple-500/20 dark:via-cyan-400/15" />
                <Card className="relative bg-card/80 backdrop-blur-lg border border-border dark:border-border/80 p-5 sm:p-6 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Prompt
                      </p>
                      <p className="font-semibold mt-1 text-foreground">
                        "Plan my workouts by day with sets, reps, weight, and a
                        weekly summary."
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs border-border dark:border-border/80"
                    >
                      Generated
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-3">
                    <Card className="p-3 bg-card/60 backdrop-blur-lg border border-border dark:border-border/80">
                      <div className="text-sm font-semibold text-foreground">
                        Fields
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['exercise', 'sets', 'reps', 'weight', 'notes'].map(
                          (f) => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="border-border dark:border-border/80"
                            >
                              {f}
                            </Badge>
                          )
                        )}
                      </div>
                    </Card>

                    <Card className="p-3 bg-card/60 backdrop-blur-lg border border-border dark:border-border/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Views
                        </div>
                        <ul className="mt-2 list-disc ml-5 text-muted-foreground text-sm space-y-1">
                          <li>Today board</li>
                          <li>Weekly summary</li>
                          <li>Personal bests</li>
                        </ul>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          Reminders
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {['7:00 AM warm-up', '6:00 PM workout'].map((r) => (
                            <Badge
                              key={r}
                              variant="outline"
                              className="border-border dark:border-border/80"
                            >
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>

                    <Card className="p-3 bg-card/60 backdrop-blur-lg border border-border dark:border-border/80">
                      <div className="text-sm font-semibold text-foreground">
                        Suggestions
                      </div>
                      <ul className="mt-2 list-disc ml-5 text-muted-foreground text-sm space-y-1">
                        <li>
                          Add a "PR this week" badge when you increase weight
                        </li>
                        <li>Auto-highlight missed days in red</li>
                        <li>Roll up weekly volume by muscle group</li>
                      </ul>
                    </Card>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </section>

        <section id="samples" className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              What you can build in seconds
            </h3>
            <p className="text-muted-foreground text-sm">
              Trckr handles personal habits, team rituals, and operational
              checklists.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <Card className="p-5 space-y-2 shadow-md hover:shadow-lg transition-shadow border-border dark:border-border/80">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs border-border dark:border-border/80"
                >
                  Wellness
                </Badge>
                <span className="text-muted-foreground text-xs">Daily</span>
              </div>
              <h4 className="font-semibold text-foreground">Hydration coach</h4>
              <p className="text-muted-foreground text-sm">
                Log each glass, set a daily target, and keep a streak without
                thinking.
              </p>
              <p className="text-muted-foreground text-xs">
                Fields: date, cups, notes • Views: daily log, weekly streak •
                Reminders: 9a, 3p
              </p>
            </Card>
            <Card className="p-5 space-y-2 shadow-md hover:shadow-lg transition-shadow border-border dark:border-border/80">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs border-border dark:border-border/80"
                >
                  Fitness
                </Badge>
                <span className="text-muted-foreground text-xs">Weekly</span>
              </div>
              <h4 className="font-semibold text-foreground">
                Strength tracker
              </h4>
              <p className="text-muted-foreground text-sm">
                Capture exercises, sets, and weights with PRs highlighted
                automatically.
              </p>
              <p className="text-muted-foreground text-xs">
                Fields: exercise, sets, weight • Views: today, PRs •
                Suggestions: deload weeks
              </p>
            </Card>
            <Card className="p-5 space-y-2 shadow-md hover:shadow-lg transition-shadow border-border dark:border-border/80">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs border-border dark:border-border/80"
                >
                  Money
                </Badge>
                <span className="text-muted-foreground text-xs">Monthly</span>
              </div>
              <h4 className="font-semibold text-foreground">
                Lightweight budget
              </h4>
              <p className="text-muted-foreground text-sm">
                Track expenses by category and get a monthly summary, no
                spreadsheet needed.
              </p>
              <p className="text-muted-foreground text-xs">
                Fields: date, category, amount • Views: monthly, category split
                • Alerts: over budget
              </p>
            </Card>
          </div>
        </section>

        <section id="how" className="space-y-5">
          <Card className="p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow border-border dark:border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  How Trckr works
                </h3>
                <p className="text-muted-foreground text-sm">
                  A guided flow that keeps you oriented and in control.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <a href="#samples">Skip to examples</a>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6">
              {[
                {
                  title: 'Tell us in plain English',
                  body: "Describe what you track, how often, who's involved, and any notifications you want.",
                },
                {
                  title: 'We generate the board',
                  body: 'Trckr proposes fields, views, reminders, and helpful suggestions tailored to your prompt.',
                },
                {
                  title: 'You refine, then track',
                  body: 'Adjust anything — add columns, rename fields, reorder views — then start logging.',
                },
              ].map((item, idx) => (
                <Card
                  key={item.title}
                  className="bg-card/80 backdrop-blur-lg border border-border dark:border-border/80 rounded-md p-4 sm:p-5 space-y-2"
                >
                  <div className="h-8 w-8 rounded-md bg-gray-50 dark:bg-black flex items-center justify-center font-semibold text-sm text-foreground">
                    {idx + 1}
                  </div>
                  <div className="font-semibold text-foreground">
                    {item.title}
                  </div>
                  <p className="text-muted-foreground text-sm">{item.body}</p>
                </Card>
              ))}
            </div>
          </Card>
        </section>

        <Demo />

        <section className="text-center py-8">
          <Button size="lg" asChild>
            <a href="/tracker">
              Get Started
              <span aria-hidden>→</span>
            </a>
          </Button>
          <p className="text-muted-foreground text-sm mt-3">
            Start building your first tracker in seconds
          </p>
        </section>
      </div>
    </div>
  )
}
