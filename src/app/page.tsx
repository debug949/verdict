import type { Metadata } from 'next'
import { TabShowcase } from '@/components/TabShowcase'
import { ThemeToggle } from '@/components/ThemeToggle'
import { HeroContent } from '@/components/HeroContent'
import { VerdictCursor } from '@/components/VerdictCursor'

export const metadata: Metadata = {
  title: "Verdict — Know what you're merging",
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function Nav() {
  return (
    <div className="lp-nav-outer" aria-label="Site navigation">
      <nav className="lp-nav">
        <a href="/" className="lp-nav-logo">
          <span className="lp-nav-mark">◈</span>
          Verdict
        </a>

        <ul className="lp-nav-links">
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#zones">Zones</a></li>
          <li>
            <a
              href="https://verdict-vihan.vercel.app/r/debug949/verdict-test/1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Live report
            </a>
          </li>
        </ul>

        <div className="lp-nav-divider" aria-hidden="true" />

        <div className="lp-nav-actions">
          <ThemeToggle />
          <a
            href="https://github.com/debug949/verdict"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-nav-source"
          >
            <GithubIcon size={13} />
            Source
          </a>
          <a
            href="https://github.com/apps/verdict-diff"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-nav-install"
          >
            <GithubIcon size={13} />
            Install free
          </a>
        </div>
      </nav>
    </div>
  )
}

export default function Home() {
  return (
    <div className="lp-wrap">
      <VerdictCursor />
      <Nav />

      <section className="lp-hero">
        <div className="lp-hero-bg" aria-hidden="true">
          <div className="lp-glow-1" />
          <div className="lp-glow-2" />
          <div className="lp-glow-3" />
        </div>

        <div className="lp-hero-inner">
          <HeroContent />
          <TabShowcase />
        </div>
      </section>

      <footer className="lp-footer">
        <span>
          Built by{' '}
          <a href="https://github.com/debug949" target="_blank" rel="noopener noreferrer">
            Vihan
          </a>
          {' '}· Open source · MIT
        </span>
        <div className="lp-footer-links">
          <a href="https://github.com/debug949/verdict" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a
            href="https://verdict-vihan.vercel.app/r/debug949/verdict-test/1"
            target="_blank"
            rel="noopener noreferrer"
          >
            Live report
          </a>
          <a
            href="https://github.com/apps/verdict-diff"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install
          </a>
        </div>
      </footer>
    </div>
  )
}
