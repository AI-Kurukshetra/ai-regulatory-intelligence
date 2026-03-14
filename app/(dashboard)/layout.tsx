import { Sidebar } from '@/components/shared/sidebar'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { requirePageAuth } from '@/lib/auth/page-context'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requirePageAuth()

  return (
    <div className="min-h-screen md:grid md:grid-cols-[300px_1fr]">
      <Sidebar />
      <div className="relative flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--glass-border)] bg-[var(--header-bg)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <p className="ui-kicker">Operations cockpit</p>
              <h1 className="mt-2 text-xl font-semibold md:text-2xl">
                Monitor risk, investigations, and reporting from one focused workspace.
              </h1>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <div className="hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-soft)] px-4 py-3 text-right shadow-[var(--shadow-soft)] md:block">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{profile.role}</p>
                <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  {user.email ?? 'Unknown user'}
                </p>
              </div>
              <ThemeToggle className="hidden md:flex" />
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
