import type { User } from '@supabase/supabase-js'
import { errorResponse } from '@/lib/api/response'
import { hasRole, type AppRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'

type ProfileContext = {
  id: string
  organization_id: string
  role: string
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

export type AuthContext = {
  supabase: ServerSupabaseClient
  user: User
  profile: ProfileContext
}

type AuthContextResult =
  | { data: AuthContext }
  | { response: ReturnType<typeof errorResponse> }

export async function requireAuthContext(): Promise<AuthContextResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      response: errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return {
      response: errorResponse(500, 'PROFILE_LOOKUP_FAILED', 'Failed to load user profile')
    }
  }

  if (!profile) {
    return {
      response: errorResponse(
        403,
        'PROFILE_MISSING',
        'No profile found for the authenticated user. Seed organization/profile first.'
      )
    }
  }

  return {
    data: {
      supabase,
      user,
      profile
    }
  }
}

export async function requireRoleContext(
  allowedRoles: readonly AppRole[]
): Promise<AuthContextResult> {
  const auth = await requireAuthContext()
  if ('response' in auth) {
    return auth
  }

  if (!hasRole(auth.data.profile.role, allowedRoles)) {
    return {
      response: errorResponse(
        403,
        'FORBIDDEN',
        `Role ${auth.data.profile.role} is not allowed to perform this action`
      )
    }
  }

  return auth
}
