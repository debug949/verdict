'use client'

import { motion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const

function GithubIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

export function HeroContent() {
  return (
    <>
      <motion.div
        className="lp-badge"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <span className="lp-badge-dot" />
        GitHub App · Live on Vercel
      </motion.div>

      <motion.h1
        className="lp-h1"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: EASE }}
      >
        Know what you&apos;re merging.
      </motion.h1>

      <motion.p
        className="lp-h1-gradient"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, delay: 0.07, ease: EASE }}
      >
        Before you merge it.
      </motion.p>

      <motion.p
        className="lp-stamp"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.25, ease: EASE }}
      >
        Deterministic&nbsp;·&nbsp;Not AI&nbsp;·&nbsp;Open Source
      </motion.p>

      <motion.p
        className="lp-sub"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
      >
        Verdict analyses pull requests, finds credential leaks, checks dependencies
        for CVEs, applies zone-aware risk weighting, and posts a trust score directly on GitHub.
      </motion.p>

      <motion.div
        className="lp-actions"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.45, ease: EASE }}
      >
        <a
          href="https://github.com/apps/verdict-diff"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-btn-primary"
        >
          <span className="lp-btn-glint" aria-hidden="true" />
          <span className="lp-btn-content">
            <GithubIcon size={15} />
            Install GitHub App
          </span>
        </a>
        <a
          href="https://verdict-vihan.vercel.app/r/debug949/verdict-test/1"
          target="_blank"
          rel="noopener noreferrer"
          className="lp-btn-secondary"
        >
          View Live Report ↗
        </a>
      </motion.div>
    </>
  )
}
