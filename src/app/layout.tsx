import type { Metadata } from 'next'
import { Inter, Fustat, Instrument_Serif } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

const fustat = Fustat({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-fustat',
  display: 'swap',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Verdict — Know what you're merging",
  description:
    'Verdict analyses every pull request for secrets, CVEs, and zone-weighted risk before you merge. Free GitHub App.',
  openGraph: {
    title: "Verdict — Know what you're merging",
    description: 'Automatic PR security analysis. Secrets, CVEs, zone-weighted trust score.',
    url: 'https://verdict-inky.vercel.app',
    siteName: 'Verdict',
    images: [{ url: '/screenshots/hero.png', width: 1280, height: 900, alt: 'Verdict — Merge Risk Engine' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Verdict — Know what you're merging",
    description: 'Automatic PR security analysis. Secrets, CVEs, zone-weighted trust score.',
    images: ['/screenshots/hero.png'],
  },
}

// Injected before React hydrates — prevents flash of wrong theme
const themeScript = `
  try {
    var t = localStorage.getItem('verdict-theme');
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fustat.variable} ${instrumentSerif.variable}`}>
      <head>
        {/* Anti-FOUC: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
