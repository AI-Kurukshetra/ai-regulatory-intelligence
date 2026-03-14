import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#050B18',
          secondary: '#0A1628',
          tertiary: '#0F1F3D'
        },
        risk: {
          critical: '#EF4444',
          high: '#F97316',
          medium: '#EAB308',
          low: '#22C55E',
          unknown: '#6B7280'
        }
      }
    }
  },
  plugins: []
}

export default config
