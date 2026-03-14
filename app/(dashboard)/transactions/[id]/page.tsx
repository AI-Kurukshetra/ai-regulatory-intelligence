import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { RiskBadge } from '@/components/transactions/risk-badge'
import { StatusBadge } from '@/components/transactions/status-badge'
import { requirePageAuth } from '@/lib/auth/page-context'
import { getTransactionDetail } from '@/lib/transactions/queries'
import { formatCompactId, formatCurrency, formatDateTime, formatLabel } from '@/lib/utils/formatters'

export const dynamic = 'force-dynamic'

type TransactionDetailPageProps = {
  params: Promise<{ id: string }>
}

const ParamsSchema = z.object({
  id: z.string().uuid()
})

export default async function TransactionDetailPage({ params }: TransactionDetailPageProps) {
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

  const { data: transaction, error } = await getTransactionDetail(
    supabase,
    profile.organization_id,
    parsedParams.data.id
  )

  if (error || !transaction) {
    notFound()
  }

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-2xl p-6">
        <Link className="text-sm text-cyan-300 hover:underline" href="/transactions">
          Back to transactions
        </Link>
        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transaction detail</p>
            <h1 className="mt-2 text-3xl font-semibold">
              {transaction.external_tx_id ?? formatCompactId(transaction.id)}
            </h1>
            <p className="mt-2 font-mono text-sm text-slate-400">{transaction.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RiskBadge level={transaction.risk_level} score={transaction.risk_score} />
            <StatusBadge status={transaction.status} />
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount</p>
          <p className="mt-3 font-mono text-2xl text-cyan-300">
            {formatCurrency(transaction.amount, transaction.currency)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transaction type</p>
          <p className="mt-3 text-lg text-slate-100">{formatLabel(transaction.transaction_type)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Created</p>
          <p className="mt-3 text-lg text-slate-100">{formatDateTime(transaction.created_at)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Scored at</p>
          <p className="mt-3 text-lg text-slate-100">{formatDateTime(transaction.scored_at)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4 md:col-span-2 xl:col-span-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Screening state</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={transaction.status} />
            <StatusBadge status={transaction.screening_status} />
          </div>
          <p className="mt-3 text-sm text-slate-300">
            Screened at: <span className="text-slate-100">{formatDateTime(transaction.screened_at)}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card rounded-2xl p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Screening explanation</p>
          <p className="mt-4 text-sm leading-7 text-slate-200">
            {transaction.risk_explanation ??
              'This transaction has been ingested, but the scoring worker has not written an explanation yet.'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Route metadata</p>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">From account</dt>
              <dd className="mt-1 font-mono text-slate-100">
                {transaction.from_account_id ? formatCompactId(transaction.from_account_id, 8, 8) : 'External origin'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">To account</dt>
              <dd className="mt-1 font-mono text-slate-100">
                {transaction.to_account_id ? formatCompactId(transaction.to_account_id, 8, 8) : 'External destination'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Counterparty country</dt>
              <dd className="mt-1 text-slate-100">{transaction.counterparty_country ?? 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Counterparty name</dt>
              <dd className="mt-1 text-slate-100">{transaction.counterparty_name ?? 'Not provided'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Sanctions screening</p>
            <h2 className="mt-2 text-xl font-semibold">OFAC screening output</h2>
          </div>
          <p className="font-mono text-sm text-slate-400">{transaction.sanctions_hits.length} hit(s)</p>
        </div>

        {transaction.sanctions_hits.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300">
            No sanctions hits are currently linked to this transaction. If the transaction had no counterparty name,
            screening may have been skipped.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {transaction.sanctions_hits.map((hit) => (
              <article
                key={hit.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.05]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-medium text-slate-100">
                      {hit.watchlist_entry?.entity_name ?? 'Watchlist entry'}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">{hit.rationale ?? 'No rationale provided.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={hit.hit_status} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>{hit.watchlist_entry?.source ?? 'OFAC'}</span>
                  <span>{hit.watchlist_entry?.list_name ?? 'OFAC_SDN'}</span>
                  <span>Score {hit.match_score}</span>
                  <span>{formatDateTime(hit.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Linked alerts</p>
            <h2 className="mt-2 text-xl font-semibold">Escalation output</h2>
          </div>
          <p className="font-mono text-sm text-slate-400">{transaction.alerts.length} alert(s)</p>
        </div>

        {transaction.alerts.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm text-slate-300">
            No alerts were created for this transaction. Either the score stayed below the manual-review threshold or
            the worker has not processed the queue yet.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {transaction.alerts.map((alert) => (
              <article
                key={alert.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.05]"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-lg font-medium text-slate-100">{alert.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{alert.description ?? 'No description provided.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <RiskBadge level={alert.severity} />
                    <StatusBadge status={alert.status} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <span>{formatLabel(alert.alert_type)}</span>
                  <span>{formatDateTime(alert.created_at)}</span>
                  <span className="font-mono">{formatCompactId(alert.id, 8, 4)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
