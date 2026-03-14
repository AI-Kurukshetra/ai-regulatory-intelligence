import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const protectedPaths = ['/overview', '/transactions', '/alerts', '/cases', '/reports']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isProtected = protectedPaths.some((prefix) => path.startsWith(prefix))

  if (!isProtected) {
    return NextResponse.next()
  }

  const response = await updateSession(request)

  const hasAuthCookie = request.cookies.getAll().some((cookie) =>
    cookie.name.includes('sb-') && cookie.name.includes('auth-token')
  )

  if (!hasAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ['/overview/:path*', '/transactions/:path*', '/alerts/:path*', '/cases/:path*', '/reports/:path*']
}
