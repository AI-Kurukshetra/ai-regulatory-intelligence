import { ThemeToggle } from '@/components/theme/theme-toggle'

export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 md:px-6">
      <div className="absolute right-4 top-4 z-20 md:right-6 md:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-card hidden flex-col rounded-[32px] p-8 lg:flex xl:p-10">
          <div className="max-w-xl">
            <p className="ui-kicker">AI-Powered RegTech</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Risk monitoring that feels fast enough for a live operations floor.
            </h1>
            <p className="ui-copy mt-4 text-base leading-8">
              Review transaction pressure, convert alerts into cases, and move investigations toward SAR drafting from
              one secure workspace.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-soft)] p-5">
              <p className="ui-kicker">Transaction Core</p>
              <h2 className="mt-3 text-xl font-semibold">Realtime queue visibility</h2>
              <p className="ui-copy mt-2 text-sm leading-7">
                Near real-time ingestion, rule scoring, sanctions screening, and alerting for analysts under pressure.
              </p>
            </article>
            <article className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-soft)] p-5">
              <p className="ui-kicker">Compliance Ops</p>
              <h2 className="mt-3 text-xl font-semibold">Case and SAR workflow</h2>
              <p className="ui-copy mt-2 text-sm leading-7">
                Turn alerts into investigations, capture notes, and draft regulatory narratives without leaving the app.
              </p>
            </article>
          </div>

          <div className="mt-auto flex flex-wrap gap-3 pt-8 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            <span className="rounded-full border border-[var(--glass-border)] px-3 py-1.5">Multi-tenant</span>
            <span className="rounded-full border border-[var(--glass-border)] px-3 py-1.5">Supabase auth</span>
            <span className="rounded-full border border-[var(--glass-border)] px-3 py-1.5">Queue-backed AI</span>
          </div>
        </section>

        <div className="flex items-center justify-center">{children}</div>
      </div>
    </main>
  )
}
