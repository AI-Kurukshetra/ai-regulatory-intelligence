import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RiskBadge } from '@/components/transactions/risk-badge'
import { StatusBadge } from '@/components/transactions/status-badge'
import { requirePageAuth } from '@/lib/auth/page-context'
import { getRegulatoryDocumentDetail } from '@/lib/regulatory/queries'
import { RegulatoryDocumentIdParamsSchema } from '@/lib/regulatory/schema'
import { formatDateTime, formatLabel } from '@/lib/utils/formatters'

export const dynamic = 'force-dynamic'

type IntelligenceDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function IntelligenceDetailPage({ params }: IntelligenceDetailPageProps) {
  const { supabase, profile } = await requirePageAuth([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])

  const resolvedParams = await params
  const parsedParams = RegulatoryDocumentIdParamsSchema.safeParse(resolvedParams)

  if (!parsedParams.success) {
    notFound()
  }

  const { data: document, error } = await getRegulatoryDocumentDetail(
    supabase,
    profile.organization_id,
    parsedParams.data.id
  )

  if (error || !document) {
    notFound()
  }

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-[32px] p-6 md:p-8">
        <Link className="ui-link text-sm font-medium hover:underline" href="/intelligence">
          Back to intelligence
        </Link>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {document.source} · {document.jurisdiction} · {formatLabel(document.document_type)}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">{document.title}</h1>
            <p className="ui-copy mt-4 text-sm leading-8 md:text-base">
              {document.summary ?? 'No summary is available for this regulatory document.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {document.impact_level ? <RiskBadge level={document.impact_level} /> : null}
            <StatusBadge status={document.analysis_status} />
            {document.requires_attention ? (
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-200">
                Attention required
              </span>
            ) : null}
          </div>
        </div>
      </header>

      {document.requires_attention ? (
        <div className="glass-card rounded-[28px] border border-red-500/25 p-5 text-sm text-red-100">
          <p className="ui-kicker text-red-200">Immediate review</p>
          <p className="mt-2 leading-7">
            {document.attention_reason ?? 'This update has been flagged for compliance review because it may affect controls or obligations.'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Change type</p>
          <p className="mt-3 text-lg text-[var(--text-primary)]">{document.change_type ?? 'Not classified'}</p>
        </div>
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Analyzed</p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{formatDateTime(document.analyzed_at)}</p>
        </div>
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Published</p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{formatDateTime(document.published_at)}</p>
        </div>
        <div className="glass-card rounded-[28px] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Effective</p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{formatDateTime(document.effective_at)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="glass-card rounded-[28px] p-6">
            <p className="ui-kicker">Key points</p>
            <div className="mt-4 space-y-3">
              {document.key_points.map((point) => (
                <div
                  key={point}
                  className="rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-soft)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]"
                >
                  {point}
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-[28px] p-6">
            <p className="ui-kicker">Recommended actions</p>
            <div className="mt-4 space-y-3">
              {document.action_items.map((actionItem) => (
                <div
                  key={actionItem}
                  className="rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-soft)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]"
                >
                  {actionItem}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="glass-card rounded-[28px] p-6">
            <p className="ui-kicker">Affected areas</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {document.affected_areas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-soft)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                >
                  {area}
                </span>
              ))}
            </div>

            {document.tags.length > 0 ? (
              <>
                <p className="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Tags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {document.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-soft)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            ) : null}

            {document.source_url ? (
              <div className="mt-6">
                <a
                  className="ui-link text-sm font-medium hover:underline"
                  href={document.source_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open original source
                </a>
              </div>
            ) : null}
          </section>

          <section className="glass-card rounded-[28px] p-6">
            <p className="ui-kicker">Stored document text</p>
            <div className="mt-4 rounded-[22px] border border-[var(--glass-border)] bg-[var(--glass-soft)] p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{document.content}</p>
            </div>
          </section>
        </div>
      </div>
    </section>
  )
}
