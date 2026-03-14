'use client'

import { useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type TransactionFiltersProps = {
  initialStatus?: string
  initialRiskLevel?: string
  initialLimit?: number
}

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'failed', label: 'Failed' }
]

const riskLevelOptions = [
  { value: '', label: 'All risk levels' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'unknown', label: 'Unscored' }
]

const limitOptions = [25, 50, 100]

export function TransactionFilters({
  initialStatus = '',
  initialRiskLevel = '',
  initialLimit = 25
}: TransactionFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState(initialStatus)
  const [riskLevel, setRiskLevel] = useState(initialRiskLevel)
  const [limit, setLimit] = useState(String(initialLimit))

  const baseQuery = useMemo(() => searchParams.toString(), [searchParams])

  function updateUrl(nextStatus: string, nextRiskLevel: string, nextLimit: string) {
    const params = new URLSearchParams(baseQuery)

    if (nextStatus) {
      params.set('status', nextStatus)
    } else {
      params.delete('status')
    }

    if (nextRiskLevel) {
      params.set('risk_level', nextRiskLevel)
    } else {
      params.delete('risk_level')
    }

    if (nextLimit && nextLimit !== '25') {
      params.set('limit', nextLimit)
    } else {
      params.delete('limit')
    }

    params.delete('offset')

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  function onApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(() => {
      updateUrl(status, riskLevel, limit)
    })
  }

  function onReset() {
    setStatus('')
    setRiskLevel('')
    setLimit('25')

    startTransition(() => {
      router.replace(pathname)
    })
  }

  return (
    <form className="glass-card rounded-[28px] p-4" onSubmit={onApply}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]" htmlFor="status">
            Status
          </label>
          <select
            className="ui-select px-3 py-2.5 text-sm"
            id="status"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label
            className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]"
            htmlFor="risk-level"
          >
            Risk level
          </label>
          <select
            className="ui-select px-3 py-2.5 text-sm"
            id="risk-level"
            onChange={(event) => setRiskLevel(event.target.value)}
            value={riskLevel}
          >
            {riskLevelOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full lg:w-36">
          <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]" htmlFor="limit">
            Rows
          </label>
          <select
            className="ui-select px-3 py-2.5 text-sm"
            id="limit"
            onChange={(event) => setLimit(event.target.value)}
            value={limit}
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 lg:pb-0.5">
          <button
            className="ui-button-primary px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            type="submit"
          >
            {isPending ? 'Updating...' : 'Apply filters'}
          </button>
          <button
            className="ui-button-secondary px-4 py-2.5 text-sm"
            onClick={onReset}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  )
}
