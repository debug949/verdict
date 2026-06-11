'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { TypingMessages } from '@/components/TypingMessages'

type TabKey = 'pr-review' | 'report' | 'findings' | 'risk-model'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'pr-review',   label: 'PR Review'  },
  { key: 'report',      label: 'Report'     },
  { key: 'findings',    label: 'Findings'   },
  { key: 'risk-model',  label: 'Risk Model' },
]

const SCREENSHOTS: Record<TabKey, { light: string; dark: string; alt: string }> = {
  'pr-review':  {
    light: '/screenshots/showcase-light.png',
    dark:  '/screenshots/showcase-dark.png',
    alt:   'Verdict — GitHub PR review comment',
  },
  'report':     {
    light: '/screenshots/report-light.png',
    dark:  '/screenshots/report-dark.png',
    alt:   'Verdict — full report page overview',
  },
  'findings':   {
    light: '/screenshots/findings-light.png',
    dark:  '/screenshots/findings-dark.png',
    alt:   'Verdict — CRITICAL and HIGH findings',
  },
  'risk-model': {
    light: '/screenshots/zones-light.png',
    dark:  '/screenshots/zones-dark.png',
    alt:   'Verdict — zone breakdown, PAYMENT 2.5×',
  },
}

const CYCLE_MS = 4000

function useIsDark() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('verdict-theme')
    setIsDark(saved === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark')

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return isDark
}

export function TabShowcase() {
  const [active, setActive]           = useState<TabKey>('pr-review')
  const [progressKey, setProgressKey] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resumeRef   = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const isDark      = useIsDark()

  const advance = useCallback(() => {
    setActive(prev => {
      const idx = TABS.findIndex(t => t.key === prev)
      return TABS[(idx + 1) % TABS.length].key
    })
    setProgressKey(k => k + 1)
  }, [])

  const startCycle = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(advance, CYCLE_MS)
  }, [advance])

  useEffect(() => {
    startCycle()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (resumeRef.current)   clearTimeout(resumeRef.current)
    }
  }, [startCycle])

  function handleClick(key: TabKey) {
    if (key === active) return
    setActive(key)
    setProgressKey(k => k + 1)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (resumeRef.current)   clearTimeout(resumeRef.current)
    resumeRef.current = setTimeout(startCycle, 8000)
  }

  return (
    <div className="lp-showcase">
      {/* Tab bar */}
      <div className="lp-tab-bar" role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={active === tab.key}
            className={`lp-tab-btn${active === tab.key ? ' active' : ''}`}
            onClick={() => handleClick(tab.key)}
          >
            {tab.label}
            {active === tab.key && (
              <span
                key={progressKey}
                className="lp-tab-progress"
                style={{ animationDuration: `${CYCLE_MS}ms` }}
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      {/* Screenshot stage */}
      <div className="lp-stage">
        <TypingMessages />
        {TABS.map(tab => {
          const screen = SCREENSHOTS[tab.key]
          const src = isDark ? screen.dark : screen.light
          return (
            <div
              key={tab.key}
              role="tabpanel"
              className={`lp-tab-panel${active === tab.key ? ' active' : ''}`}
              aria-hidden={active !== tab.key}
            >
              <Image
                src={src}
                alt={screen.alt}
                fill
                className="lp-screenshot"
                priority={tab.key === 'pr-review'}
                sizes="(max-width: 768px) 100vw, 1120px"
              />
              <TabOverlay tabKey={tab.key} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TabOverlay({ tabKey }: { tabKey: TabKey }) {
  if (tabKey === 'pr-review') {
    return (
      <div className="lp-overlay lp-overlay-bl">
        <div className="lp-ov-header">
          <span className="lp-ov-dot" style={{ background: '#ef4444' }} />
          <span className="lp-ov-title">PR Analysis</span>
        </div>
        <div className="lp-ov-score-row">
          <div className="lp-ov-score">
            <span className="lp-ov-score-num">0</span>
            <span className="lp-ov-score-denom">/100</span>
          </div>
          <div>
            <div className="lp-ov-critical">🔴 CRITICAL</div>
            <div className="lp-ov-grade">Grade F · Trust score</div>
          </div>
        </div>
        <div className="lp-ov-divider" />
        <div className="lp-ov-stats">
          <span className="lp-ov-stat-red">2 secrets</span>
          <span className="lp-ov-sep">·</span>
          <span className="lp-ov-stat-orange">7 CVEs</span>
          <span className="lp-ov-sep">·</span>
          <span className="lp-ov-stat-gray">9 findings</span>
        </div>
        <div className="lp-ov-zone-chip">PAYMENT 2.5×</div>
      </div>
    )
  }

  if (tabKey === 'report') {
    return (
      <div className="lp-overlay lp-overlay-br">
        <div className="lp-ov-header">
          <span className="lp-ov-dot" style={{ background: '#e8304a' }} />
          <span className="lp-ov-title">Risk Narrative</span>
        </div>
        <p className="lp-ov-narrative">
          This PR touches payment processing code. A credential was found in the diff
          in your <strong>PAYMENT</strong> layer.
        </p>
        <div className="lp-ov-divider" />
        <div className="lp-ov-meta-row">
          <span>3 files analysed</span>
          <span className="lp-ov-sep">·</span>
          <span>9 findings total</span>
        </div>
      </div>
    )
  }

  if (tabKey === 'findings') {
    return (
      <div className="lp-overlay lp-overlay-bl">
        <div className="lp-ov-header">
          <span className="lp-ov-dot" style={{ background: '#ef4444' }} />
          <span className="lp-ov-title">Findings</span>
        </div>
        <div className="lp-ov-finding">
          <span className="lp-ov-sev sev-critical">CRITICAL</span>
          <div className="lp-ov-find-detail">
            <code className="lp-ov-find-code">AKIA****</code>
            <span className="lp-ov-find-loc">payment/config.js:5 · AWS key</span>
          </div>
        </div>
        <div className="lp-ov-finding">
          <span className="lp-ov-sev sev-high">HIGH</span>
          <div className="lp-ov-find-detail">
            <code className="lp-ov-find-code">api_****</code>
            <span className="lp-ov-find-loc">Hardcoded API key</span>
          </div>
        </div>
        <div className="lp-ov-finding">
          <span className="lp-ov-sev sev-cve">CVE</span>
          <div className="lp-ov-find-detail">
            <code className="lp-ov-find-code">CVE-2020-28500</code>
            <span className="lp-ov-find-loc">lodash@4.17.20</span>
          </div>
        </div>
        <div className="lp-ov-more">+6 more CVEs in newly-added packages</div>
      </div>
    )
  }

  return (
    <div className="lp-overlay lp-overlay-br">
      <div className="lp-ov-header">
        <span className="lp-ov-dot" style={{ background: '#e8304a' }} />
        <span className="lp-ov-title">Zone Multipliers</span>
      </div>
      <div className="lp-ov-zone-grid">
        <div className="lp-ov-zone-row">
          <span className="lp-ov-zone-name">PAYMENT</span>
          <span className="lp-ov-zone-mult mult-crit">2.5×</span>
        </div>
        <div className="lp-ov-zone-row">
          <span className="lp-ov-zone-name">AUTH</span>
          <span className="lp-ov-zone-mult mult-crit">2.5×</span>
        </div>
        <div className="lp-ov-zone-row">
          <span className="lp-ov-zone-name">DATA</span>
          <span className="lp-ov-zone-mult mult-high">1.5×</span>
        </div>
        <div className="lp-ov-zone-row">
          <span className="lp-ov-zone-name">CONFIG</span>
          <span className="lp-ov-zone-mult mult-med">1.3×</span>
        </div>
      </div>
      <div className="lp-ov-divider" />
      <div className="lp-ov-zone-total">8 zones classified per PR</div>
    </div>
  )
}
