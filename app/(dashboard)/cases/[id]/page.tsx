import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { CaseNoteForm } from '@/components/cases/case-note-form'
import { CaseStatusForm } from '@/components/cases/case-status-form'
import { GenerateSarDraftButton } from '@/components/reports/generate-sar-draft-button'
import { RiskBadge } from '@/components/transactions/risk-badge'
import { StatusBadge } from '@/components/transactions/status-badge'
import { readOnlyRoles } from '@/lib/auth/roles'
import { requirePageAuth } from '@/lib/auth/page-context'
import { getCaseDetail } from '@/lib/cases/queries'
import { formatCompactId, formatCurrency, formatDateTime, formatLabel } from '@/lib/utils/formatters'

export const dynamic = 'force-dynamic'

type CaseDetailPageProps = {
  params: Promise<{ id: string }>
}

const ParamsSchema = z.object({
  id: z.string().uuid()
})

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { supabase, profile } = await requirePageAuth([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])

  const resolvedParams = await params
  const parsedParams = ParamsSchema.safeParse(resolvedParams)

  if (!parsedParams.success) {
    notFound()
  }

  const { data: caseDetail, error } = await getCaseDetail(
    supabase,
    profile.organization_id,
    parsedParams.data.id
  )

  if (error || !caseDetail) {
    notFound()
  }

  const canMutate = !readOnlyRoles.includes(profile.role as (typeof readOnlyRoles)[number])
  const latestReport = caseDetail.reports[0] ?? null

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-2xl p-6">
        <Link className="text-sm text-cyan-300 hover:underline" href="/cases">
          Back to cases
        </Link>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
              {caseDetail.case_number}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{caseDetail.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {caseDetail.description ?? 'No case description provided yet.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RiskBadge level={caseDetail.priority} />
            <StatusBadge status={caseDetail.status} />
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Linked alerts</p>
          <p className="mt-3 font-mono text-3xl">{caseDetail.alerts.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Linked transactions</p>
          <p className="mt-3 font-mono text-3xl">{caseDetail.transactions.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reports</p>
          <p className="mt-3 font-mono text-3xl">{caseDetail.reports.length}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Updated</p>
          <p className="mt-3 text-sm text-slate-100">{formatDateTime(caseDetail.updated_at)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Linked alerts</p>
                <h2 className="mt-2 text-xl font-semibold">Alert context</h2>
              </div>
            </div>

            {caseDetail.alerts.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300">
                No alerts are linked to this case yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {caseDetail.alerts.map((alert) => (
                  <article
                    key={alert.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-lg font-medium text-slate-100">{alert.title}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {alert.description ?? 'No alert description provided.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <RiskBadge level={alert.severity} />
                        <StatusBadge status={alert.status} />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <span>{formatLabel(alert.alert_type)}</span>
                      <span>{formatDateTime(alert.created_at)}</span>
                      {alert.transaction_id ? (
                        <Link className="text-cyan-300 hover:underline" href={`/transactions/${alert.transaction_id}`}>
                          Transaction
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="glass-card rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Linked transactions</p>
            <h2 className="mt-2 text-xl font-semibold">Underlying activity</h2>

            {caseDetail.transactions.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300">
                No transactions are linked to this case through its alerts yet.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {caseDetail.transactions.map((transaction) => (
                  <Link
                    key={transaction.id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.05] lg:flex-row lg:items-center lg:justify-between"
                    href={`/transactions/${transaction.id}`}
                  >
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                        {transaction.external_tx_id ?? formatCompactId(transaction.id)}
                      </p>
                      <p className="mt-2 text-base text-slate-100">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <RiskBadge level={transaction.risk_level} score={transaction.risk_score} />
                      <StatusBadge status={transaction.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {canMutate ? <CaseStatusForm caseId={caseDetail.id} currentStatus={caseDetail.status as never} /> : null}

          <section className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">SAR workflow</p>
                <h2 className="mt-2 text-xl font-semibold">Draft narrative</h2>
              </div>
              {canMutate ? <GenerateSarDraftButton caseId={caseDetail.id} /> : null}
            </div>

            {latestReport ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={latestReport.status} />
                </div>
                <p className="text-sm leading-7 text-slate-200 whitespace-pre-line">{latestReport.narrative}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>{latestReport.generated_by_model ?? 'Unknown model'}</span>
                  <span>{formatDateTime(latestReport.updated_at)}</span>
                  <Link className="text-cyan-300 hover:underline" href="/reports">
                    View all reports
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300">
                No SAR draft has been generated yet for this case.
              </div>
            )}
          </section>

          {canMutate ? <CaseNoteForm caseId={caseDetail.id} /> : null}

          <section className="glass-card rounded-2xl p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Investigator notes</p>
            <h2 className="mt-2 text-xl font-semibold">Case timeline</h2>

            {caseDetail.notes.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300">
                No investigator notes have been added yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {caseDetail.notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <span>{note.author?.full_name ?? 'Analyst'}</span>
                      <span>{note.author?.role ?? 'unknown role'}</span>
                      <span>{formatDateTime(note.created_at)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-200">{note.note}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}
