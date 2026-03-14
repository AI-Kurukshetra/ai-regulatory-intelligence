'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Completing secure sign-in...')

  useEffect(() => {
    let cancelled = false

    const completeSignIn = async () => {
      const supabase = createClient()
      const currentUrl = new URL(window.location.href)
      const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''))
      const code = currentUrl.searchParams.get('code')
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const callbackError =
        currentUrl.searchParams.get('error_description') ?? hashParams.get('error_description')

      if (callbackError) {
        throw new Error(callbackError)
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (error) {
          throw error
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (error) {
          throw error
        }
      }

      const {
        data: { session },
        error
      } = await supabase.auth.getSession()

      if (error || !session) {
        throw error ?? new Error('No session returned after auth callback')
      }

      if (!cancelled) {
        router.replace('/overview')
      }
    }

    completeSignIn().catch((error) => {
      console.error('Auth callback failed:', error)

      if (!cancelled) {
        setMessage('Sign-in failed. Redirecting back to login...')
        router.replace('/login?error=auth_callback_failed')
      }
    })

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
      <section className="glass-card w-full max-w-md rounded-2xl p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Auth Callback</p>
        <h1 className="mt-3 text-2xl font-semibold">Finalizing your session</h1>
        <p className="mt-3 text-sm text-slate-300">{message}</p>
      </section>
    </main>
  )
}
