export default function AuthLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
      {children}
    </main>
  )
}
