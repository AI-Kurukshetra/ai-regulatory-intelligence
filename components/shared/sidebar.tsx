import Link from 'next/link'

const links = [
  { href: '/overview', label: 'Overview' },
  { href: '/transactions', label: 'Transactions' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/cases', label: 'Cases' },
  { href: '/reports', label: 'Reports' }
]

export function Sidebar() {
  return (
    <aside className="border-r border-white/10 bg-[#0A1628]/80 p-4">
      <div className="mb-6 rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-3">
        <p className="text-xs uppercase tracking-widest text-cyan-300">AML Platform</p>
        <p className="mt-1 text-sm font-medium">AI Regulatory Intelligence</p>
      </div>
      <nav className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            className="block rounded-md px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
            href={link.href}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <form action="/api/auth/signout" className="mt-8" method="post">
        <button
          className="w-full rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
          type="submit"
        >
          Sign out
        </button>
      </form>
    </aside>
  )
}
