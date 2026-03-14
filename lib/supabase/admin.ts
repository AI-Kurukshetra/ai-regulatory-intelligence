import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type AdminClient = SupabaseClient<Database, 'public'>

let cachedSupabaseAdmin: AdminClient | null = null

function createSupabaseAdmin(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database, 'public'>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export function getSupabaseAdmin(): AdminClient {
  if (!cachedSupabaseAdmin) {
    cachedSupabaseAdmin = createSupabaseAdmin()
  }

  return cachedSupabaseAdmin
}

export const supabaseAdmin = new Proxy({} as AdminClient, {
  get(_target, property) {
    const client = getSupabaseAdmin()
    const value = Reflect.get(client, property)

    return typeof value === 'function' ? value.bind(client) : value
  }
}) as AdminClient
