'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { cn } from '@/lib/utils/cn'

const links = [
  { href: '/overview', label: 'Overview', short: 'OV' },
  { href: '/transactions', label: 'Transactions', short: 'TX' },
  { href: '/alerts', label: 'Alerts', short: 'AL' },
  { href: '/intelligence', label: 'Intelligence', short: 'IN' },
  { href: '/cases', label: 'Cases', short: 'CS' },
  { href: '/reports', label: 'Reports', short: 'RP' }
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="relative overflow-hidden border-b border-[var(--glass-border)] bg-[var(--sidebar-bg)] backdrop-blur-2xl md:min-h-screen md:border-b-0 md:border-r">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.08),transparent_22%)]" />

      <div className="relative flex h-full flex-col gap-6 p-4 md:p-6">
        <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="ui-kicker">AML Platform</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">AI Regulatory Intelligence</p>
            </div>
            <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Live
            </span>
          </div>

          <p className="ui-copy mt-3 text-sm leading-7">
            Faster triage for transactions, alerts, investigations, and regulatory reporting.
          </p>

          <div className="mt-4 md:hidden">
            <ThemeToggle className="w-full justify-center" />
          </div>
        </div>

        <nav className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)

            return (
              <Link
                key={link.href}
                className={cn(
                  'group flex items-center gap-3 rounded-[24px] border px-4 py-3 text-sm transition',
                  isActive
                    ? 'border-[var(--glass-border-strong)] bg-[var(--glass-soft)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]'
                    : 'border-transparent bg-transparent text-[var(--text-secondary)] hover:border-[var(--glass-border)] hover:bg-[var(--glass-soft)] hover:text-[var(--text-primary)]'
                )}
                href={link.href}
              >
                <span
                  className={cn(
                    'inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-[10px] font-semibold uppercase tracking-[0.18em]',
                    isActive
                      ? 'border-[var(--glass-border-strong)] bg-[var(--accent-primary)] text-[var(--accent-primary-text)]'
                      : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-muted)]'
                  )}
                >
                  {link.short}
                </span>
                <span className="font-medium">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="hidden rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-soft)] p-5 md:block">
          <p className="ui-kicker">Mission focus</p>
          <h2 className="mt-3 text-lg font-semibold">Keep analysts on the signal</h2>
          <p className="ui-copy mt-2 text-sm leading-7">
            Use Overview for queue pressure, Intelligence for regulatory updates, Alerts for live triage, Cases for
            investigation, and Reports for SAR drafting.
          </p>
        </div>

        <form action="/api/auth/signout" className="mt-auto" method="post">
          <button className="ui-button-secondary w-full px-4 py-3 text-sm font-medium" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
