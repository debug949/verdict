import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verdict',
  description: 'Know what you\'re merging before you merge it.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
