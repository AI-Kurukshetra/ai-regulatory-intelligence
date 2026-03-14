import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

type BrowserClient = ReturnType<typeof createBrowserClient<Database, 'public'>>

export function createClient(): BrowserClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createBrowserClient<Database, 'public'>(supabaseUrl, supabaseAnonKey)
}
