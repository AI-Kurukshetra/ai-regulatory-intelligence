'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type CaseNoteFormProps = {
  caseId: string
}

export function CaseNoteForm({ caseId }: CaseNoteFormProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submitNote() {
    setMessage(null)

    startTransition(async () => {
      const response = await fetch(`/api/v1/cases/${caseId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note
        })
      })

      const payload = (await response.json()) as {
        error?: { message?: string }
      }

      if (!response.ok) {
        setMessage(payload.error?.message ?? 'Could not save the note.')
        return
      }

      setNote('')
      setMessage('Note added to the case.')
      router.refresh()
    })
  }

  return (
    <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-soft)] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Investigator note</p>
      <textarea
        className="ui-textarea mt-3 min-h-28 px-4 py-3 text-sm"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Add factual notes, next steps, or review findings."
        value={note}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--text-muted)]">Keep notes factual and reviewable.</p>
        <button
          className="ui-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending || note.trim().length < 3}
          onClick={submitNote}
          type="button"
        >
          {isPending ? 'Saving...' : 'Add note'}
        </button>
      </div>
      {message ? <p className="mt-3 text-xs text-[var(--text-secondary)]">{message}</p> : null}
    </div>
  )
}
