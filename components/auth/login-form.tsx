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
    <section className="glass-card w-full max-w-md rounded-2xl p-8">
      <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-slate-400">
        Use your credentials, or request a magic link.
      </p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button
          className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-400 disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <button
          className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-70"
          disabled={loading || !email}
          onClick={onMagicLink}
          type="button"
        >
          {loading ? 'Please wait...' : 'Send magic link instead'}
        </button>
      </form>
      {message || initialError ? (
        <p className="mt-4 text-sm text-slate-300">{message || initialError}</p>
      ) : null}
      <p className="mt-6 text-sm text-slate-400">
        New here?{' '}
        <Link className="text-cyan-300 hover:underline" href="/signup">
          Create account
        </Link>
      </p>
    </section>
  )
}
