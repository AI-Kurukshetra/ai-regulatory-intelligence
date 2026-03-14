'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type DocumentIngestFormProps = {
  className?: string
}

export function DocumentIngestForm({ className }: DocumentIngestFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    title: '',
    source: '',
    source_url: '',
    jurisdiction: 'US',
    document_type: 'guidance',
    published_at: '',
    effective_at: '',
    content: ''
  })

  function updateField(field: keyof typeof formState, value: string) {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value
    }))
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    startTransition(async () => {
      const response = await fetch('/api/v1/regulatory-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formState)
      })

      const payload = (await response.json()) as {
        data?: { id?: string }
        meta?: { used_fallback?: boolean }
        error?: { message?: string }
      }

      if (!response.ok || !payload.data?.id) {
        setMessage(payload.error?.message ?? 'Could not ingest the regulatory document.')
        return
      }

      setMessage(
        payload.meta?.used_fallback
          ? 'Document stored and analyzed with the fallback model.'
          : 'Document stored and analyzed successfully.'
      )

      router.push(`/intelligence/${payload.data.id}`)
      router.refresh()
    })
  }

  return (
    <section className={`glass-card rounded-[28px] p-6 ${className ?? ''}`.trim()}>
      <p className="ui-kicker">Rapid ingestion</p>
      <h2 className="mt-2 text-2xl font-semibold">Add a regulatory update</h2>
      <p className="ui-copy mt-2 text-sm leading-7">
        Paste a regulation, guidance note, or enforcement summary and the platform will store it and generate AI
        intelligence automatically.
      </p>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="ui-input px-4 py-3 text-sm"
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Document title"
            required
            value={formState.title}
          />
          <input
            className="ui-input px-4 py-3 text-sm"
            onChange={(event) => updateField('source', event.target.value)}
            placeholder="Source authority"
            required
            value={formState.source}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <input
            className="ui-input px-4 py-3 text-sm"
            onChange={(event) => updateField('jurisdiction', event.target.value)}
            placeholder="Jurisdiction"
            value={formState.jurisdiction}
          />
          <select
            className="ui-select px-4 py-3 text-sm"
            onChange={(event) => updateField('document_type', event.target.value)}
            value={formState.document_type}
          >
            <option value="guidance">Guidance</option>
            <option value="rule">Rule</option>
            <option value="enforcement">Enforcement</option>
            <option value="notice">Notice</option>
            <option value="policy">Policy</option>
            <option value="other">Other</option>
          </select>
          <input
            className="ui-input px-4 py-3 text-sm"
            onChange={(event) => updateField('source_url', event.target.value)}
            placeholder="Optional source URL"
            value={formState.source_url}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm text-[var(--text-secondary)]">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Published date
            </span>
            <input
              className="ui-input px-4 py-3 text-sm"
              onChange={(event) => updateField('published_at', event.target.value)}
              type="date"
              value={formState.published_at}
            />
          </label>

          <label className="block text-sm text-[var(--text-secondary)]">
            <span className="mb-2 block text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Effective date
            </span>
            <input
              className="ui-input px-4 py-3 text-sm"
              onChange={(event) => updateField('effective_at', event.target.value)}
              type="date"
              value={formState.effective_at}
            />
          </label>
        </div>

        <textarea
          className="ui-textarea min-h-64 px-4 py-3 text-sm"
          onChange={(event) => updateField('content', event.target.value)}
          placeholder="Paste the regulatory text, memo, enforcement summary, or guidance content here."
          required
          value={formState.content}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            Best results come from a few paragraphs or more of actual regulatory text.
          </p>
          <button
            className="ui-button-primary px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending || formState.content.trim().length < 80 || formState.title.trim().length < 5}
            type="submit"
          >
            {isPending ? 'Analyzing...' : 'Ingest and analyze'}
          </button>
        </div>
      </form>

      {message ? (
        <p className="mt-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {message}
        </p>
      ) : null}
    </section>
  )
}
