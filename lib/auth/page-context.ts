import { redirect } from 'next/navigation'
import { requireAuthContext, requireRoleContext, type AuthContext } from '@/lib/auth/context'
import type { AppRole } from '@/lib/auth/roles'

export async function requirePageAuth(
  allowedRoles?: readonly AppRole[]
): Promise<AuthContext> {
  const auth = allowedRoles
    ? await requireRoleContext(allowedRoles)
    : await requireAuthContext()

  if ('response' in auth) {
    const errorCode = auth.response.headers.get('x-error-code')

    if (errorCode === 'UNAUTHORIZED') {
      redirect('/login')
    }

    if (errorCode === 'PROFILE_MISSING') {
      redirect('/signup')
    }

    redirect('/login?error=forbidden')
  }

  return auth.data
}
