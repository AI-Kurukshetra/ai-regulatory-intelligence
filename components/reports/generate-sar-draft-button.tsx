'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type GenerateSarDraftButtonProps = {
  caseId: string
}

export function GenerateSarDraftButton({ caseId }: GenerateSarDraftButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function generateDraft() {
    setMessage(null)

    startTransition(async () => {
      const response = await fetch(`/api/v1/cases/${caseId}/sar-draft`, {
        method: 'POST'
      })

      const payload = (await response.json()) as {
        meta?: { used_fallback?: boolean }
        error?: { message?: string }
      }

      if (!response.ok) {
        setMessage(payload.error?.message ?? 'Could not generate the SAR draft.')
        return
      }

      setMessage(
        payload.meta?.used_fallback
          ? 'Draft generated with the manual fallback template because the AI response was unavailable.'
          : 'SAR draft generated successfully.'
      )
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className="ui-button-danger px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={generateDraft}
        type="button"
      >
        {isPending ? 'Generating...' : 'Generate SAR draft'}
      </button>
      {message ? <p className="text-xs text-[var(--text-secondary)]">{message}</p> : null}
    </div>
  )
}
