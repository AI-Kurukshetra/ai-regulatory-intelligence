import { LiveAlertFeed } from '@/components/alerts/live-alert-feed'
import { getAlertSummary, listAlerts } from '@/lib/alerts/queries'
import { requirePageAuth } from '@/lib/auth/page-context'
import { getTransactionSummary } from '@/lib/transactions/queries'

export const dynamic = 'force-dynamic'

type SummaryCard = {
  label: string
  value: number
  tone?: 'default' | 'accent' | 'danger'
}

function getCardToneClass(tone: SummaryCard['tone']) {
  switch (tone) {
    case 'accent':
      return 'text-cyan-200'
    case 'danger':
      return 'text-red-300'
    default:
      return 'text-slate-100'
  }
}

function SummaryGrid({
  title,
  cards
}: {
  title: string
  cards: SummaryCard[]
}) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{title}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
            <p className={`mt-3 font-mono text-3xl ${getCardToneClass(card.tone)}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default async function OverviewPage() {
  const { user, supabase, profile } = await requirePageAuth([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])

  const [
    { data: transactionSummary, error: transactionSummaryError },
    { data: alertSummary, error: alertSummaryError },
    { data: alerts, error: alertsError }
  ] = await Promise.all([
    getTransactionSummary(supabase, profile.organization_id),
    getAlertSummary(supabase, profile.organization_id),
    listAlerts(supabase, profile.organization_id, { limit: 10, offset: 0 })
  ])

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-2xl p-6">
        <p className="ui-kicker">Live operations snapshot</p>
        <h1 className="mt-2 text-3xl font-semibold">Regulatory Intelligence Overview</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Transaction ingestion, queue-backed processing, live alerts, case operations, and SAR drafting now share the
          same protected workspace. Use this page to spot pressure, review new escalations, and keep the team aligned.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-slate-500">
          <span>{user.email ?? 'unknown-user'}</span>
          <span>{profile.role}</span>
          <span>{profile.organization_id}</span>
        </div>
      </header>

      {transactionSummaryError ? (
        <div className="glass-card rounded-2xl border border-red-500/20 p-4 text-sm text-red-100">
          Transaction KPIs are temporarily unavailable, but transaction APIs and worker processing are still enabled.
        </div>
      ) : null}

      {alertSummaryError ? (
        <div className="glass-card rounded-2xl border border-red-500/20 p-4 text-sm text-red-100">
          Alert KPIs could not be loaded right now, although the live feed can still connect independently.
        </div>
      ) : null}

      <SummaryGrid
        title="Transactions"
        cards={[
          {
            label: 'Total transactions',
            value: transactionSummary?.total ?? 0
          },
          {
            label: 'Pending scoring',
            value: transactionSummary?.pending ?? 0,
            tone: 'accent'
          },
          {
            label: 'Flagged',
            value: transactionSummary?.flagged ?? 0,
            tone: 'danger'
          },
          {
            label: 'High risk',
            value: transactionSummary?.highRisk ?? 0,
            tone: 'danger'
          }
        ]}
      />

      <SummaryGrid
        title="Alerts"
        cards={[
          {
            label: 'Total alerts',
            value: alertSummary?.total ?? 0
          },
          {
            label: 'New',
            value: alertSummary?.newCount ?? 0,
            tone: 'accent'
          },
          {
            label: 'In review',
            value: alertSummary?.inReview ?? 0
          },
          {
            label: 'Critical',
            value: alertSummary?.critical ?? 0,
            tone: 'danger'
          }
        ]}
      />

      {alertsError ? (
        <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
          Initial alert data could not be loaded for the live feed. New realtime events may still appear after the
          websocket connects.
        </div>
      ) : null}

      <LiveAlertFeed
        canCreateCase={profile.role === 'admin' || profile.role === 'compliance_officer' || profile.role === 'analyst'}
        initialAlerts={alerts ?? []}
        organizationId={profile.organization_id}
      />
    </section>
  )
}
