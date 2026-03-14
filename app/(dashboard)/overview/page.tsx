import Link from 'next/link'
import { LiveAlertFeed } from '@/components/alerts/live-alert-feed'
import { RiskBadge } from '@/components/transactions/risk-badge'
import { StatusBadge } from '@/components/transactions/status-badge'
import { getAlertSummary, listAlerts } from '@/lib/alerts/queries'
import { requirePageAuth } from '@/lib/auth/page-context'
import { getRegulatorySummary, listRegulatoryDocuments } from '@/lib/regulatory/queries'
import { getTransactionSummary } from '@/lib/transactions/queries'
import { formatDateTime, formatLabel } from '@/lib/utils/formatters'

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
    { data: alerts, error: alertsError },
    { data: intelligenceSummary, error: intelligenceSummaryError },
    { data: intelligenceDocuments, error: intelligenceDocumentsError }
  ] = await Promise.all([
    getTransactionSummary(supabase, profile.organization_id),
    getAlertSummary(supabase, profile.organization_id),
    listAlerts(supabase, profile.organization_id, { limit: 10, offset: 0 }),
    getRegulatorySummary(supabase, profile.organization_id),
    listRegulatoryDocuments(supabase, profile.organization_id, { limit: 4, offset: 0 })
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

      <SummaryGrid
        title="Regulatory Intelligence"
        cards={[
          {
            label: 'Documents',
            value: intelligenceSummary?.total ?? 0
          },
          {
            label: 'Attention required',
            value: intelligenceSummary?.attentionRequired ?? 0,
            tone: 'danger'
          },
          {
            label: 'High impact',
            value: intelligenceSummary?.highImpact ?? 0,
            tone: 'danger'
          },
          {
            label: 'Fallback analyses',
            value: intelligenceSummary?.fallback ?? 0,
            tone: 'accent'
          }
        ]}
      />

      {alertsError ? (
        <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
          Initial alert data could not be loaded for the live feed. New realtime events may still appear after the
          websocket connects.
        </div>
      ) : null}

      {intelligenceSummaryError ? (
        <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
          Regulatory-intelligence counters are temporarily unavailable, but the intelligence workspace is still
          available.
        </div>
      ) : null}

      <section className="glass-card rounded-2xl p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Regulatory intelligence</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">Latest analyzed updates</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
              Track incoming guidance, summarize obligations, and surface the updates that need human review before
              they turn into operational surprises.
            </p>
          </div>
          <Link className="ui-button-secondary px-4 py-3 text-sm" href="/intelligence">
            Open intelligence workspace
          </Link>
        </div>

        {intelligenceDocumentsError ? (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-100">
            Recent regulatory documents could not be loaded right now.
          </div>
        ) : intelligenceDocuments.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
            No regulatory documents have been ingested yet. Use the intelligence workspace to add the first update and
            generate AI analysis.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {intelligenceDocuments.map((document) => (
              <Link
                key={document.id}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                href={`/intelligence/${document.id}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {document.impact_level ? <RiskBadge level={document.impact_level} /> : null}
                      <StatusBadge status={document.analysis_status} />
                      {document.requires_attention ? (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-200">
                          Attention required
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {document.source} · {document.jurisdiction} · {formatLabel(document.document_type)}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-100">{document.title}</h3>
                    </div>

                    <p className="text-sm leading-7 text-slate-300">
                      {document.summary ?? 'No summary is available yet for this document.'}
                    </p>
                  </div>

                  <div className="min-w-44 text-right text-xs uppercase tracking-[0.16em] text-slate-500">
                    <p>{document.analysis_model ?? 'Unknown model'}</p>
                    <p className="mt-2">{formatDateTime(document.analyzed_at ?? document.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <LiveAlertFeed
        canCreateCase={profile.role === 'admin' || profile.role === 'compliance_officer' || profile.role === 'analyst'}
        initialAlerts={alerts ?? []}
        organizationId={profile.organization_id}
      />
    </section>
  )
}
