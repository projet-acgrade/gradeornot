import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GradeOrNot — TCG Grading ROI',
  description: 'Scan your TCG card. Know if grading is worth it.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
