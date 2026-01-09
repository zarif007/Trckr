import ThemeToggle from './components/ThemeToggle'
import Demo from './components/Demo'

export default function Home() {
  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: 'var(--background)' }}
    >
      <div className="relative max-w-6xl mx-auto px-4 py-10 space-y-14">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl glass flex items-center justify-center">
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                }}
              />
            </div>
            <div>
              <h1
                className="text-2xl font-extrabold"
                style={{ color: 'var(--foreground)' }}
              >
                Trckr
              </h1>
              <p className="muted text-sm">Track Anything</p>
            </div>
          </div>

          <nav className="flex items-center gap-3 sm:gap-5">
            <a className="muted hidden sm:inline text-sm" href="#how">
              How it works
            </a>
            <a className="muted hidden sm:inline text-sm" href="#samples">
              Examples
            </a>
            <ThemeToggle />
          </nav>
        </header>

        <section className="hero card overflow-hidden p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 glass text-xs font-semibold uppercase tracking-wide">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Modern AI trackers
              </div>

              <div className="space-y-3">
                <h2
                  className="text-3xl sm:text-4xl font-extrabold leading-tight"
                  style={{ color: 'var(--foreground)' }}
                >
                  Describe what you need. Trckr builds the board for you.
                </h2>
                <p className="muted text-base sm:text-lg leading-relaxed">
                  No templates to wrestle with. Just say what you want to follow
                  and get a ready-to-use tracker with fields, views, reminders,
                  and smart suggestions pre-filled.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  className="btn-primary inline-flex items-center gap-2"
                  href="#demo"
                >
                  Try the guided demo <span aria-hidden>→</span>
                </a>
                <a
                  className="inline-flex items-center gap-2 text-sm"
                  href="#demo"
                  style={{
                    background: 'var(--card)',
                    color: 'var(--foreground)',
                    padding: '0.5rem 1rem',
                    borderRadius: '10px',
                    fontWeight: 600,
                    border: '2px solid white',
                  }}
                >
                  Get Started <span aria-hidden>→</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm pt-2">
                <div className="glass p-3 rounded-lg">
                  <div className="font-semibold">One prompt</div>
                  <p className="muted mt-1">
                    Tell Trckr what you track, how often, and the goals you care
                    about.
                  </p>
                </div>
                <div className="glass p-3 rounded-lg">
                  <div className="font-semibold">Built instantly</div>
                  <p className="muted mt-1">
                    Fields, views, reminders, and suggestions are generated for
                    you.
                  </p>
                </div>
                <div className="glass p-3 rounded-lg">
                  <div className="font-semibold">Yours to tweak</div>
                  <p className="muted mt-1">
                    Edit anything before you start tracking — no rigid template.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 blur-3xl opacity-40 bg-gradient-to-br from-purple-400/30 via-cyan-300/25 to-transparent" />
              <div className="relative glass rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="muted text-xs uppercase tracking-wide">
                      Prompt
                    </p>
                    <p
                      className="font-semibold mt-1"
                      style={{ color: 'var(--foreground)' }}
                    >
                      “Plan my workouts by day with sets, reps, weight, and a
                      weekly summary.”
                    </p>
                  </div>
                  <span className="chip text-xs">Generated</span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="glass rounded-lg p-3">
                    <div className="text-sm font-semibold">Fields</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {['exercise', 'sets', 'reps', 'weight', 'notes'].map(
                        (f) => (
                          <span key={f} className="chip">
                            {f}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="glass rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm font-semibold">Views</div>
                      <ul className="mt-2 list-disc ml-5 muted text-sm space-y-1">
                        <li>Today board</li>
                        <li>Weekly summary</li>
                        <li>Personal bests</li>
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Reminders</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['7:00 AM warm-up', '6:00 PM workout'].map((r) => (
                          <span key={r} className="chip">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-lg p-3">
                    <div className="text-sm font-semibold">Suggestions</div>
                    <ul className="mt-2 list-disc ml-5 muted text-sm space-y-1">
                      <li>
                        Add a “PR this week” badge when you increase weight
                      </li>
                      <li>Auto-highlight missed days in red</li>
                      <li>Roll up weekly volume by muscle group</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="samples" className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">
              What you can build in seconds
            </h3>
            <p className="muted text-sm">
              Trckr handles personal habits, team rituals, and operational
              checklists.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 card space-y-2">
              <div className="flex items-center gap-2">
                <span className="chip text-xs">Wellness</span>
                <span className="muted text-xs">Daily</span>
              </div>
              <h4 className="font-semibold">Hydration coach</h4>
              <p className="muted text-sm">
                Log each glass, set a daily target, and keep a streak without
                thinking.
              </p>
              <p className="muted text-xs">
                Fields: date, cups, notes • Views: daily log, weekly streak •
                Reminders: 9a, 3p
              </p>
            </div>
            <div className="p-5 card space-y-2">
              <div className="flex items-center gap-2">
                <span className="chip text-xs">Fitness</span>
                <span className="muted text-xs">Weekly</span>
              </div>
              <h4 className="font-semibold">Strength tracker</h4>
              <p className="muted text-sm">
                Capture exercises, sets, and weights with PRs highlighted
                automatically.
              </p>
              <p className="muted text-xs">
                Fields: exercise, sets, weight • Views: today, PRs •
                Suggestions: deload weeks
              </p>
            </div>
            <div className="p-5 card space-y-2">
              <div className="flex items-center gap-2">
                <span className="chip text-xs">Money</span>
                <span className="muted text-xs">Monthly</span>
              </div>
              <h4 className="font-semibold">Lightweight budget</h4>
              <p className="muted text-sm">
                Track expenses by category and get a monthly summary, no
                spreadsheet needed.
              </p>
              <p className="muted text-xs">
                Fields: date, category, amount • Views: monthly, category split
                • Alerts: over budget
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="card p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">How Trckr works</h3>
              <p className="muted text-sm">
                A guided flow that keeps you oriented and in control.
              </p>
            </div>
            <a className="btn-ghost text-sm" href="#samples">
              Skip to examples
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                title: 'Tell us in plain English',
                body: 'Describe what you track, how often, who’s involved, and any notifications you want.',
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
              <div
                key={item.title}
                className="glass rounded-xl p-4 sm:p-5 space-y-2"
              >
                <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/10 flex items-center justify-center font-semibold text-sm">
                  {idx + 1}
                </div>
                <div className="font-semibold">{item.title}</div>
                <p className="muted text-sm">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <Demo />

        <section className="text-center py-8">
          <button
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '1rem',
              padding: '0.75rem 1.5rem',
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '2px solid white',
              cursor: 'pointer',
            }}
          >
            Get Started
            <span aria-hidden>→</span>
          </button>
          <p className="muted text-sm mt-3">
            Start building your first tracker in seconds
          </p>
        </section>
      </div>
    </div>
  )
}
