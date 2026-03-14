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
      <div className="glass-card rounded-[28px] p-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--text-muted)]">No transactions yet</p>
        <h2 className="mt-3 text-xl font-semibold">Your transaction queue is clear</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Ingest a transaction through{' '}
          <code className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-soft)] px-2 py-1">
            POST /api/v1/transactions
          </code>{' '}
          and it will appear here for scoring review.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden rounded-[28px]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--glass-border)]">
          <thead className="bg-[var(--glass-soft)]">
            <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
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
          <tbody className="divide-y divide-[var(--glass-border)]/60">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className={cn(
                  'border-l-2 transition hover:bg-[var(--glass-soft)]',
                  rowAccentClass(transaction.risk_level)
                )}
              >
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1">
                    <p className="font-mono text-sm text-[var(--accent-primary)]">
                      {transaction.external_tx_id ?? formatCompactId(transaction.id)}
                    </p>
                    <p className="font-mono text-xs text-[var(--text-muted)]">
                      {formatCompactId(transaction.id, 6, 6)}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="space-y-1 text-sm text-[var(--text-secondary)]">
                    <p className="font-mono text-xs text-[var(--text-secondary)]">
                      {transaction.from_account_id ? formatCompactId(transaction.from_account_id, 6, 6) : 'External origin'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">to</p>
                    <p className="font-mono text-xs text-[var(--text-secondary)]">
                      {transaction.to_account_id ? formatCompactId(transaction.to_account_id, 6, 6) : 'External destination'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {transaction.counterparty_country ?? 'No corridor provided'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {transaction.counterparty_name ?? 'No counterparty name'}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="font-mono text-sm text-[var(--accent-primary)]">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{transaction.currency}</p>
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="text-sm text-[var(--text-secondary)]">{transaction.transaction_type}</p>
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
                  <p className="text-sm text-[var(--text-secondary)]">{formatDateTime(transaction.created_at)}</p>
                </td>
                <td className="px-4 py-3 text-right align-top">
                  <Link className="ui-button-secondary px-3 py-1.5 text-sm" href={`/transactions/${transaction.id}`}>
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
