import { LoginForm } from '@/components/auth/login-form'

type LoginPageProps = {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const initialError =
    params.error === 'auth_callback_failed'
      ? 'Magic link sign-in could not be completed. Please try again.'
      : ''

  return <LoginForm initialError={initialError} />
}
