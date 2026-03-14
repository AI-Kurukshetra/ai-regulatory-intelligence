import Link from 'next/link'
import { requirePageAuth } from '@/lib/auth/page-context'
import { listReports, getReportSummary } from '@/lib/reports/queries'
import { ReportListQuerySchema } from '@/lib/reports/schema'
import { StatusBadge } from '@/components/transactions/status-badge'
import { formatDateTime } from '@/lib/utils/formatters'

export const dynamic = 'force-dynamic'

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { supabase, profile } = await requirePageAuth([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])

  const resolvedSearchParams = await searchParams
  const parsedQuery = ReportListQuerySchema.safeParse({
    limit: getSingleValue(resolvedSearchParams.limit),
    offset: getSingleValue(resolvedSearchParams.offset),
    status: getSingleValue(resolvedSearchParams.status)
  })

  const query = parsedQuery.success ? parsedQuery.data : ReportListQuerySchema.parse({})

  const [{ data: reports, error: reportsError }, { data: summary, error: summaryError }] =
    await Promise.all([
      listReports(supabase, profile.organization_id, query),
      getReportSummary(supabase, profile.organization_id)
    ])

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Phase 3</p>
        <h1 className="mt-2 text-3xl font-semibold">Regulatory Reports</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          SAR drafts now persist as report records tied to their investigation cases. This page gives compliance teams
          a single place to review draft maturity before moving toward approval and submission.
        </p>
      </header>

      {!parsedQuery.success ? (
        <div className="glass-card rounded-2xl border border-yellow-500/20 p-4 text-sm text-yellow-100">
          Some report filters were invalid and were reset to safe defaults.
        </div>
      ) : null}

      {reportsError ? (
        <div className="glass-card rounded-2xl border border-red-500/20 p-4 text-sm text-red-100">
          Reports could not be loaded right now.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total reports</p>
          <p className="mt-3 font-mono text-3xl">{summary?.total ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Draft</p>
          <p className="mt-3 font-mono text-3xl text-cyan-200">{summary?.draft ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Review</p>
          <p className="mt-3 font-mono text-3xl text-orange-200">{summary?.review ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Submitted</p>
          <p className="mt-3 font-mono text-3xl text-green-200">{summary?.submitted ?? 0}</p>
        </div>
      </div>

      {summaryError ? (
        <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
          Report summary counters are temporarily unavailable, but individual report records can still render.
        </div>
      ) : null}

      {reports.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">No reports yet</p>
          <h2 className="mt-3 text-xl font-semibold">Generate the first SAR draft from a case</h2>
          <p className="mt-2 text-sm text-slate-300">
            Open a case and use the SAR draft action to create the first regulatory narrative.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <article key={report.id} className="glass-card rounded-2xl p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{report.report_type}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-100">
                    {report.case?.case_number ?? 'Unlinked case'}{report.case?.title ? ` · ${report.case.title}` : ''}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={report.status} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-300">
                {report.narrative?.slice(0, 360) ?? 'No narrative available.'}
                {report.narrative && report.narrative.length > 360 ? '…' : ''}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>{report.generated_by_model ?? 'Unknown model'}</span>
                <span>{formatDateTime(report.updated_at)}</span>
                {report.case ? (
                  <Link className="text-cyan-300 hover:underline" href={`/cases/${report.case.id}`}>
                    Open case
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
