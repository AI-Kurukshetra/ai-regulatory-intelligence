import { Sidebar } from '@/components/shared/sidebar'
import { requirePageAuth } from '@/lib/auth/page-context'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  await requirePageAuth()

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      <Sidebar />
      <main className="p-6">{children}</main>
    </div>
  )
}
