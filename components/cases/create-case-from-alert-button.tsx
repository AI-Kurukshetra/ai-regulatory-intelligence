'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { priorityFromAlertSeverity } from '@/lib/cases/transitions'

type CreateCaseFromAlertButtonProps = {
  alertId: string
  title: string
  description: string | null
  severity: string
}

export function CreateCaseFromAlertButton({
  alertId,
  title,
  description,
  severity
}: CreateCaseFromAlertButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function createCase() {
    setErrorMessage(null)

    startTransition(async () => {
      const response = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `Investigation: ${title}`,
          priority: priorityFromAlertSeverity(severity),
          description: description ?? `Case created from alert ${alertId}.`,
          alert_ids: [alertId]
        })
      })

      const payload = (await response.json()) as {
        data?: { id: string }
        error?: { message?: string }
      }

      if (!response.ok || !payload.data?.id) {
        setErrorMessage(payload.error?.message ?? 'Could not create a case from this alert.')
        return
      }

      router.push(`/cases/${payload.data.id}`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="ui-button-primary rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={createCase}
        type="button"
      >
        {isPending ? 'Creating case...' : 'Create case'}
      </button>
      {errorMessage ? <p className="text-xs text-[var(--danger-text)]">{errorMessage}</p> : null}
    </div>
  )
}
