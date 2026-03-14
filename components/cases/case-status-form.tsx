'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CaseStatus } from '@/lib/cases/schema'

const statusOptions: CaseStatus[] = ['open', 'in_progress', 'pending_sar', 'sar_filed', 'closed']

type CaseStatusFormProps = {
  caseId: string
  currentStatus: CaseStatus
}

export function CaseStatusForm({ caseId, currentStatus }: CaseStatusFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState<CaseStatus>(currentStatus)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateStatus() {
    setMessage(null)

    startTransition(async () => {
      const response = await fetch(`/api/v1/cases/${caseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status
        })
      })

      const payload = (await response.json()) as {
        error?: { message?: string }
      }

      if (!response.ok) {
        setMessage(payload.error?.message ?? 'Could not update case status.')
        return
      }

      setMessage('Case status updated.')
      router.refresh()
    })
  }

  return (
    <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Case status</p>
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center">
        <select
          className="ui-select px-3 py-2 text-sm"
          onChange={(event) => setStatus(event.target.value as CaseStatus)}
          value={status}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <button
          className="ui-button-secondary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || status === currentStatus}
          onClick={updateStatus}
          type="button"
        >
          {isPending ? 'Saving...' : 'Update status'}
        </button>
      </div>
      {message ? <p className="mt-3 text-xs text-[var(--text-secondary)]">{message}</p> : null}
    </div>
  )
}
