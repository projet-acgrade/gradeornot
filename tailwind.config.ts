import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        gold: {
          300: '#FFD580',
          400: '#F5B731',
          500: '#D4981A',
        },
        vault: {
          900: '#0A0A0B',
          800: '#111113',
          700: '#18181C',
          600: '#22222A',
          500: '#2E2E38',
          400: '#3A3A47',
        },
      },
    },
  },
  plugins: [],
}
export default config
