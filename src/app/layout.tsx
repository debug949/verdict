import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Verdict — Know what you\'re merging',
  description: 'Verdict analyses every pull request for secrets, CVEs, and zone-weighted risk before you merge. Free GitHub App.',
  openGraph: {
    title: 'Verdict — Know what you\'re merging',
    description: 'Automatic PR security analysis. Secrets, CVEs, zone-weighted trust score.',
    url: 'https://verdict-inky.vercel.app',
    siteName: 'Verdict',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
