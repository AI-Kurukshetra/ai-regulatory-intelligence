import Link from 'next/link'
import { getCaseSummary, listCases } from '@/lib/cases/queries'
import { CaseListQuerySchema } from '@/lib/cases/schema'
import { requirePageAuth } from '@/lib/auth/page-context'
import { RiskBadge } from '@/components/transactions/risk-badge'
import { StatusBadge } from '@/components/transactions/status-badge'
import { formatDateTime } from '@/lib/utils/formatters'

export const dynamic = 'force-dynamic'

type CasesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const { supabase, profile } = await requirePageAuth([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])

  const resolvedSearchParams = await searchParams
  const parsedQuery = CaseListQuerySchema.safeParse({
    limit: getSingleValue(resolvedSearchParams.limit),
    offset: getSingleValue(resolvedSearchParams.offset),
    status: getSingleValue(resolvedSearchParams.status),
    priority: getSingleValue(resolvedSearchParams.priority)
  })

  const query = parsedQuery.success ? parsedQuery.data : CaseListQuerySchema.parse({})

  const [{ data: cases, error: casesError }, { data: summary, error: summaryError }] = await Promise.all([
    listCases(supabase, profile.organization_id, query),
    getCaseSummary(supabase, profile.organization_id)
  ])

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Phase 3</p>
        <h1 className="mt-2 text-3xl font-semibold">Compliance Operations</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Cases now turn the alert stream into an investigation workflow. Analysts can review linked alerts,
          collaborate with notes, and move matters toward SAR drafting without leaving the protected dashboard.
        </p>
      </header>

      {!parsedQuery.success ? (
        <div className="glass-card rounded-2xl border border-yellow-500/20 p-4 text-sm text-yellow-100">
          Some case filters were invalid and were reset to safe defaults.
        </div>
      ) : null}

      {casesError ? (
        <div className="glass-card rounded-2xl border border-red-500/20 p-4 text-sm text-red-100">
          Cases could not be loaded right now. Alert-to-case creation APIs may still be available.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total cases</p>
          <p className="mt-3 font-mono text-3xl">{summary?.total ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Open</p>
          <p className="mt-3 font-mono text-3xl text-cyan-200">{summary?.open ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">In progress</p>
          <p className="mt-3 font-mono text-3xl text-orange-200">{summary?.inProgress ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending SAR</p>
          <p className="mt-3 font-mono text-3xl text-red-300">{summary?.pendingSar ?? 0}</p>
        </div>
      </div>

      {summaryError ? (
        <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
          Case summary counters are temporarily unavailable, but the individual case list can still render.
        </div>
      ) : null}

      {cases.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">No cases yet</p>
          <h2 className="mt-3 text-xl font-semibold">Create the first investigation from an alert</h2>
          <p className="mt-2 text-sm text-slate-300">
            Use the live alert feed in Overview or Alerts to convert suspicious activity into a tracked case.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.map((caseItem) => (
            <Link
              key={caseItem.id}
              className="glass-card block rounded-2xl p-5 transition hover:bg-white/[0.04]"
              href={`/cases/${caseItem.id}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                    {caseItem.case_number}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-100">{caseItem.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                    {caseItem.description ?? 'No case description provided yet.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <RiskBadge level={caseItem.priority} />
                  <StatusBadge status={caseItem.status} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>Created {formatDateTime(caseItem.created_at)}</span>
                <span>Updated {formatDateTime(caseItem.updated_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
