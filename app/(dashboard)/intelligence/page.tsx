import Link from 'next/link'
import { DocumentIngestForm } from '@/components/intelligence/document-ingest-form'
import { RiskBadge } from '@/components/transactions/risk-badge'
import { StatusBadge } from '@/components/transactions/status-badge'
import { readOnlyRoles } from '@/lib/auth/roles'
import { requirePageAuth } from '@/lib/auth/page-context'
import { getRegulatorySummary, listRegulatoryDocuments } from '@/lib/regulatory/queries'
import {
  RegulatoryDocumentListQuerySchema,
  type RegulatoryImpactLevel
} from '@/lib/regulatory/schema'
import { formatDateTime, formatLabel } from '@/lib/utils/formatters'

export const dynamic = 'force-dynamic'

type IntelligencePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const impactOptions: Array<{ value: '' | RegulatoryImpactLevel; label: string }> = [
  { value: '', label: 'All impact levels' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

export default async function IntelligencePage({ searchParams }: IntelligencePageProps) {
  const { supabase, profile } = await requirePageAuth([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])

  const resolvedSearchParams = await searchParams
  const parsedQuery = RegulatoryDocumentListQuerySchema.safeParse({
    limit: getSingleValue(resolvedSearchParams.limit),
    offset: getSingleValue(resolvedSearchParams.offset),
    q: getSingleValue(resolvedSearchParams.q),
    impact_level: getSingleValue(resolvedSearchParams.impact_level),
    document_type: getSingleValue(resolvedSearchParams.document_type),
    requires_attention: getSingleValue(resolvedSearchParams.requires_attention)
  })

  const query = parsedQuery.success ? parsedQuery.data : RegulatoryDocumentListQuerySchema.parse({})

  const [{ data: documents, error: documentsError }, { data: summary, error: summaryError }] =
    await Promise.all([
      listRegulatoryDocuments(supabase, profile.organization_id, query),
      getRegulatorySummary(supabase, profile.organization_id)
    ])

  const canMutate = !readOnlyRoles.includes(profile.role as (typeof readOnlyRoles)[number])

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-[32px] p-6 md:p-8">
        <p className="ui-kicker">Rapid MVP intelligence</p>
        <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Regulatory Intelligence</h1>
            <p className="ui-copy mt-3 text-sm leading-8 md:text-base">
              Ingest regulatory content, analyze it with AI, search the resulting summaries, and surface high-impact
              updates that need compliance attention.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--glass-border)] bg-[var(--glass-soft)] px-5 py-4 text-sm text-[var(--text-secondary)]">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Organization scope</p>
            <p className="mt-2 font-mono text-xs md:text-sm">{profile.organization_id}</p>
          </div>
        </div>
      </header>

      {!parsedQuery.success ? (
        <div className="glass-card rounded-[28px] border border-yellow-500/20 p-4 text-sm text-yellow-100">
          Some intelligence filters were invalid and were reset to safe defaults.
        </div>
      ) : null}

      {documentsError ? (
        <div className="glass-card rounded-[28px] border border-red-500/20 p-4 text-sm text-red-100">
          Regulatory intelligence records could not be loaded right now.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Documents</p>
          <p className="mt-3 font-mono text-3xl">{summary?.total ?? 0}</p>
        </div>
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Attention required</p>
          <p className="mt-3 font-mono text-3xl text-red-300">{summary?.attentionRequired ?? 0}</p>
        </div>
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">High impact</p>
          <p className="mt-3 font-mono text-3xl text-orange-300">{summary?.highImpact ?? 0}</p>
        </div>
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Critical</p>
          <p className="mt-3 font-mono text-3xl text-red-300">{summary?.critical ?? 0}</p>
        </div>
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Fallback analyses</p>
          <p className="mt-3 font-mono text-3xl text-violet-200">{summary?.fallback ?? 0}</p>
        </div>
      </div>

      {summaryError ? (
        <div className="glass-card rounded-[28px] p-4 text-sm text-[var(--text-secondary)]">
          Intelligence summary counters are temporarily unavailable, but document-level insights can still render.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <form action="/intelligence" className="glass-card rounded-[28px] p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_auto_auto] lg:items-end">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Search updates
                </span>
                <input
                  className="ui-input px-4 py-3 text-sm"
                  defaultValue={query.q ?? ''}
                  name="q"
                  placeholder="Search title, source, summary, or content"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Impact
                </span>
                <select className="ui-select px-4 py-3 text-sm" defaultValue={query.impact_level ?? ''} name="impact_level">
                  {impactOptions.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Attention
                </span>
                <select
                  className="ui-select px-4 py-3 text-sm"
                  defaultValue={
                    query.requires_attention === undefined ? '' : query.requires_attention ? 'true' : 'false'
                  }
                  name="requires_attention"
                >
                  <option value="">All updates</option>
                  <option value="true">Needs attention</option>
                  <option value="false">Informational</option>
                </select>
              </label>

              <button className="ui-button-primary px-5 py-3 text-sm font-medium" type="submit">
                Apply
              </button>

              <Link className="ui-button-secondary px-5 py-3 text-sm" href="/intelligence">
                Reset
              </Link>
            </div>
          </form>

          {documents.length === 0 ? (
            <div className="glass-card rounded-[28px] p-8 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">No regulatory updates yet</p>
              <h2 className="mt-3 text-2xl font-semibold">Ingest the first document to generate intelligence</h2>
              <p className="ui-copy mt-3 text-sm leading-7">
                Paste a regulation, guidance memo, or enforcement summary and the platform will store it, summarize it,
                and flag any high-impact updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <Link
                  key={document.id}
                  className="glass-card block rounded-[28px] p-5 transition hover:translate-y-[-1px]"
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
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          {document.source} · {document.jurisdiction} · {formatLabel(document.document_type)}
                        </p>
                        <h2 className="mt-2 text-xl font-semibold">{document.title}</h2>
                      </div>

                      <p className="ui-copy text-sm leading-7">
                        {document.summary ?? 'No AI summary is available yet for this regulatory update.'}
                      </p>

                      {document.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {document.tags.slice(0, 5).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-48 text-right text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      <p>{document.analysis_model ?? 'Unknown model'}</p>
                      <p className="mt-2">{formatDateTime(document.analyzed_at ?? document.created_at)}</p>
                      {document.effective_at ? <p className="mt-2">Effective {formatDateTime(document.effective_at)}</p> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {canMutate ? (
            <DocumentIngestForm />
          ) : (
            <div className="glass-card rounded-[28px] p-6">
              <p className="ui-kicker">Read-only access</p>
              <h2 className="mt-2 text-2xl font-semibold">You can review intelligence but not ingest new documents</h2>
              <p className="ui-copy mt-3 text-sm leading-7">
                Ask an admin, compliance officer, or analyst to upload regulatory content if you need to analyze a new
                update.
              </p>
            </div>
          )}

          <section className="glass-card rounded-[28px] p-6">
            <p className="ui-kicker">Demo path</p>
            <h2 className="mt-2 text-2xl font-semibold">Fastest walkthrough</h2>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <li>1. Paste a short regulatory update into the ingestion form.</li>
              <li>2. Let the AI summarize obligations, impacted areas, and actions.</li>
              <li>3. Filter the list for high-impact or attention-required updates.</li>
              <li>4. Open a detail view to review full content and action items.</li>
            </ol>
          </section>
        </div>
      </div>
    </section>
  )
}
