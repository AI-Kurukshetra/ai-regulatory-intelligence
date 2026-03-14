import Link from 'next/link'
import type { TransactionListItem } from '@/lib/transactions/queries'
import { cn } from '@/lib/utils/cn'
import { formatCompactId, formatCurrency, formatDateTime } from '@/lib/utils/formatters'
import { RiskBadge } from '@/components/transactions/risk-badge'
import { StatusBadge } from '@/components/transactions/status-badge'

type TransactionTableProps = {
  transactions: TransactionListItem[]
}

function rowAccentClass(riskLevel: string | null) {
  switch (riskLevel) {
    case 'critical':
      return 'border-l-red-400/80 bg-red-500/[0.03]'
    case 'high':
      return 'border-l-orange-400/80 bg-orange-500/[0.03]'
    case 'medium':
      return 'border-l-yellow-400/80 bg-yellow-500/[0.03]'
    case 'low':
      return 'border-l-emerald-400/80 bg-emerald-500/[0.03]'
    default:
      return 'border-l-transparent'
  }
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">No transactions yet</p>
        <h2 className="mt-3 text-xl font-semibold">Your transaction queue is clear</h2>
        <p className="mt-2 text-sm text-slate-400">
          Ingest a transaction through <code className="rounded bg-white/5 px-1.5 py-0.5">POST /api/v1/transactions</code>{' '}
          and it will appear here for scoring review.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/[0.03]">
            <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <th className="px-4 py-3 font-medium">Transaction</th>
              <th className="px-4 py-3 font-medium">Route</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className={cn(
                  'border-l-2 transition hover:bg-white/[0.05]',
                  rowAccentClass(transaction.risk_level)
                )}
              >
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1">
                    <p className="font-mono text-sm text-cyan-300">
                      {transaction.external_tx_id ?? formatCompactId(transaction.id)}
                    </p>
                    <p className="font-mono text-xs text-slate-500">{formatCompactId(transaction.id, 6, 6)}</p>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1 text-sm text-slate-200">
                    <p className="font-mono text-xs text-slate-300">
                      {transaction.from_account_id ? formatCompactId(transaction.from_account_id, 6, 6) : 'External origin'}
                    </p>
                    <p className="text-xs text-slate-500">to</p>
                    <p className="font-mono text-xs text-slate-300">
                      {transaction.to_account_id ? formatCompactId(transaction.to_account_id, 6, 6) : 'External destination'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {transaction.counterparty_country ?? 'No corridor provided'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {transaction.counterparty_name ?? 'No counterparty name'}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="font-mono text-sm text-cyan-300">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{transaction.currency}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm text-slate-200">{transaction.transaction_type}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <RiskBadge level={transaction.risk_level} score={transaction.risk_score} />
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-2">
                    <StatusBadge status={transaction.status} />
                    <StatusBadge status={transaction.screening_status} />
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm text-slate-200">{formatDateTime(transaction.created_at)}</p>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Link
                    className="inline-flex rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/10"
                    href={`/transactions/${transaction.id}`}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
