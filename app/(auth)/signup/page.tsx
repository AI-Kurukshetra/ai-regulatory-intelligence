'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          organization_name: organizationName
        }
      }
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage('Account created. Check your email to verify, then sign in.')
    setLoading(false)
  }

  return (
    <section className="glass-card w-full max-w-md rounded-2xl p-8">
      <h1 className="mb-2 text-2xl font-semibold">Create account</h1>
      <p className="mb-6 text-sm text-slate-400">
        Create your admin account. Your organization and profile will be provisioned automatically.
      </p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-400"
          type="text"
          placeholder="Organization name"
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          required
        />
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
          placeholder="Choose a strong password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        <button
          className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-400 disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>

      {message ? <p className="mt-4 text-sm text-slate-300">{message}</p> : null}
      <p className="mt-6 text-sm text-slate-400">
        Already have an account?{' '}
        <Link className="text-cyan-300 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </section>
  )
}

