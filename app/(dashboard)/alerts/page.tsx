import { LiveAlertFeed } from '@/components/alerts/live-alert-feed'
import { getAlertSummary, listAlerts } from '@/lib/alerts/queries'
import { requirePageAuth } from '@/lib/auth/page-context'

export const dynamic = 'force-dynamic'

export default async function AlertsPage() {
  const { supabase, profile } = await requirePageAuth([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])

  const [{ data: alerts, error: alertsError }, { data: summary, error: summaryError }] =
    await Promise.all([
      listAlerts(supabase, profile.organization_id, { limit: 25, offset: 0 }),
      getAlertSummary(supabase, profile.organization_id)
    ])

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-2xl p-6">
        <p className="ui-kicker">Realtime triage</p>
        <h1 className="mt-2 text-3xl font-semibold">Live Alert Feed</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Alerts created by the scoring worker stream into the dashboard in real time through Supabase Realtime.
          Analysts can review, assign context, and open a case directly from the feed without losing pace.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total alerts</p>
          <p className="mt-3 font-mono text-3xl">{summary?.total ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">New</p>
          <p className="mt-3 font-mono text-3xl text-cyan-200">{summary?.newCount ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">In review</p>
          <p className="mt-3 font-mono text-3xl text-violet-200">{summary?.inReview ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Critical</p>
          <p className="mt-3 font-mono text-3xl text-red-300">{summary?.critical ?? 0}</p>
        </div>
      </div>

      {alertsError ? (
        <div className="glass-card rounded-2xl border border-red-500/20 p-4 text-sm text-red-100">
          Initial alerts could not be loaded, although new realtime events may still appear once the connection is live.
        </div>
      ) : null}

      {summaryError ? (
        <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
          Summary counters are temporarily unavailable, but the live alert feed itself can still operate.
        </div>
      ) : null}

      <LiveAlertFeed
        canCreateCase={profile.role === 'admin' || profile.role === 'compliance_officer' || profile.role === 'analyst'}
        initialAlerts={alerts}
        organizationId={profile.organization_id}
      />
    </section>
  )
}
