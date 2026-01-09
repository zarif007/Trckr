'use client'

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
    <div id="demo" className="mt-8 card p-5">
      <h3 className="text-lg sm:text-xl font-semibold">
        See a complete example
      </h3>
      <p className="muted text-sm mt-1">
        This is what happens when you describe a tracker to Trckr in plain
        language: on the left is the request, on the right is the board Trckr
        would suggest.
      </p>

      <div className="mt-4">
        <label className="block text-sm font-medium">
          1. What you tell Trckr
        </label>
        <pre
          className="mt-2 p-3 rounded-md"
          style={{ background: 'rgba(0,0,0,0.03)', overflowX: 'auto' }}
        >
          {demoPrompt}
        </pre>

        <div className="mt-4">
          <label className="block text-sm font-medium">
            2. What Trckr builds for you
          </label>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 card">
              <h4 className="font-semibold">{generatedBoard.title}</h4>
              <p className="muted text-xs mt-1">
                A simple table where each row is a day you log how much you
                drank.
              </p>
              <div className="mt-3">
                <div className="text-sm muted">Fields Trckr adds</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {generatedBoard.fields.map((f) => (
                    <span key={f} className="chip">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 card">
              <div>
                <div className="text-sm muted">Views & reminders</div>
                <ul className="mt-2 list-disc ml-5 text-sm">
                  {generatedBoard.views.map((v) => (
                    <li key={v} className="muted">
                      {v}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3">
                <div className="text-sm muted">Reminder times</div>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {generatedBoard.reminders.map((r) => (
                    <span key={r} className="chip">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <div className="text-sm muted">Helpful suggestions</div>
                <ul className="mt-2 list-disc ml-5 text-sm">
                  {generatedBoard.suggestions.map((s) => (
                    <li key={s} className="muted">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
