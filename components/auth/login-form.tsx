'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type LoginFormProps = {
  initialError?: string
}

export function LoginForm({ initialError = '' }: LoginFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    router.replace('/overview')
    setLoading(false)
  }

  const onMagicLink = async () => {
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Magic link sent. Check your inbox.')
    setLoading(false)
  }

  return (
    <section className="glass-card w-full max-w-md rounded-[32px] p-8 md:p-10">
      <p className="ui-kicker">Welcome back</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to the command center</h1>
      <p className="ui-copy mt-3 text-sm leading-7">
        Use your credentials, or request a magic link for faster access.
      </p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          className="ui-input px-4 py-3 text-sm"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="ui-input px-4 py-3 text-sm"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button
          className="ui-button-primary w-full px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <button
          className="ui-button-secondary w-full px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading || !email}
          onClick={onMagicLink}
          type="button"
        >
          {loading ? 'Please wait...' : 'Send magic link instead'}
        </button>
      </form>
      {message || initialError ? (
        <p className="mt-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {message || initialError}
        </p>
      ) : null}
      <p className="ui-copy mt-6 text-sm">
        New here?{' '}
        <Link className="ui-link font-medium hover:underline" href="/signup">
          Create account
        </Link>
      </p>
    </section>
  )
}
