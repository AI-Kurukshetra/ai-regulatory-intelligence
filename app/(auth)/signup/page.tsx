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
    <section className="glass-card w-full max-w-md rounded-[32px] p-8 md:p-10">
      <p className="ui-kicker">Get started</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your workspace</h1>
      <p className="ui-copy mt-3 text-sm leading-7">
        Create your admin account. Your organization and profile will be provisioned automatically.
      </p>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          className="ui-input px-4 py-3 text-sm"
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
        />
        <input
          className="ui-input px-4 py-3 text-sm"
          type="text"
          placeholder="Organization name"
          value={organizationName}
          onChange={(event) => setOrganizationName(event.target.value)}
          required
        />
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
          placeholder="Choose a strong password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
        <button
          className="ui-button-primary w-full px-4 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Creating...' : 'Create account'}
        </button>
      </form>

      {message ? (
        <p className="mt-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-soft)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {message}
        </p>
      ) : null}
      <p className="ui-copy mt-6 text-sm">
        Already have an account?{' '}
        <Link className="ui-link font-medium hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </section>
  )
}
