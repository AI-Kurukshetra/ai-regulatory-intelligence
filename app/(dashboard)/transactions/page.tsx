import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { requirePageAuth } from '@/lib/auth/page-context'
import {
  TransactionListQuerySchema,
  getTransactionSummary,
  listTransactions
} from '@/lib/transactions/queries'

export const dynamic = 'force-dynamic'

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const { supabase, profile } = await requirePageAuth([
    'admin',
    'compliance_officer',
    'analyst',
    'auditor',
    'readonly'
  ])

  const resolvedSearchParams = await searchParams
  const parsedQuery = TransactionListQuerySchema.safeParse({
    limit: getSingleValue(resolvedSearchParams.limit),
    offset: getSingleValue(resolvedSearchParams.offset),
    status: getSingleValue(resolvedSearchParams.status),
    risk_level: getSingleValue(resolvedSearchParams.risk_level)
  })

  const query = parsedQuery.success ? parsedQuery.data : TransactionListQuerySchema.parse({})

  const [{ data: transactions, error: listError }, { data: summary, error: summaryError }] =
    await Promise.all([
      listTransactions(supabase, profile.organization_id, query),
      getTransactionSummary(supabase, profile.organization_id)
    ])

  return (
    <section className="space-y-6">
      <header className="glass-card rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Phase 2</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Transaction Monitor</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Incoming transactions are stored with idempotency, queued for deterministic scoring, and surfaced here
              for analyst review. This page is the operating surface for the Transaction Core sprint.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
            Worker path: <code className="font-mono">/api/internal/jobs/process</code>
          </div>
        </div>
      </header>

      {!parsedQuery.success ? (
        <div className="glass-card rounded-2xl border border-yellow-500/20 p-4 text-sm text-yellow-100">
          Some filters were invalid and were reset to safe defaults.
        </div>
      ) : null}

      {listError ? (
        <div className="glass-card rounded-2xl border border-red-500/20 p-4 text-sm text-red-100">
          Transactions could not be loaded right now. The API route is still available, but the dashboard list needs a
          retry.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total transactions</p>
          <p className="mt-3 font-mono text-3xl">{summary?.total ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pending scoring</p>
          <p className="mt-3 font-mono text-3xl">{summary?.pending ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Flagged</p>
          <p className="mt-3 font-mono text-3xl text-red-300">{summary?.flagged ?? 0}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">High risk</p>
          <p className="mt-3 font-mono text-3xl text-orange-300">{summary?.highRisk ?? 0}</p>
        </div>
      </div>

      {summaryError ? (
        <div className="glass-card rounded-2xl border border-white/10 p-4 text-sm text-slate-300">
          Summary counters are temporarily unavailable, but transaction detail queries still work.
        </div>
      ) : null}

      <TransactionFilters
        initialLimit={query.limit}
        initialRiskLevel={query.risk_level ?? ''}
        initialStatus={query.status ?? ''}
      />

      <div className="flex items-center justify-between text-sm text-slate-400">
        <p>
          Showing <span className="font-mono text-slate-200">{transactions.length}</span> transaction
          {transactions.length === 1 ? '' : 's'} in the current view.
        </p>
        <p>Transactions move from pending to flagged/completed when the worker consumes queued jobs.</p>
      </div>

      <TransactionTable transactions={transactions} />
    </section>
  )
}
