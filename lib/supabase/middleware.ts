import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/supabase'

export async function updateSession(request: NextRequest) {
  try {
    const response = NextResponse.next({
      request: {
        headers: request.headers
      }
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return response
    }

    type CookieToSet = {
      name: string
      value: string
      options?: Parameters<typeof response.cookies.set>[2]
    }

    const supabase = createServerClient<Database, 'public'>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        }
      }
    })

    await supabase.auth.getUser()
    return response
  } catch (error) {
    console.error('Supabase middleware session refresh failed:', error)
    return NextResponse.next({
      request: {
        headers: request.headers
      }
    })
  }
}
