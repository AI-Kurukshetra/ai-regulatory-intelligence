import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Regulatory Intelligence',
  description: 'AML and compliance intelligence platform'
}

const themeInitScript = `
(() => {
  try {
    const key = 'aml-theme';
    const stored = window.localStorage.getItem(key);
    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    const theme = stored === 'light' || stored === 'dark' ? stored : preferred;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
