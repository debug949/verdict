'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'verdict-theme'

const DARK_VARS: Record<string, string> = {
  /* Report page */
  '--bg':                 '#040410',
  '--surface':            '#0a0a1e',
  '--surface2':           '#0e0e26',
  '--border':             '#15152d',
  '--border2':            '#1d1d3a',
  '--text':               '#f0f0ff',
  '--fg':                 '#e8e8f8',
  '--muted':              '#45455f',
  '--muted2':             '#7e7ea8',
  '--accent':             '#e8304a',
  '--accent2':            '#f87171',
  '--accent-glow':        'rgba(232,48,74,0.45)',
  /* Landing page */
  '--lp-bg':              '#0c0c12',
  '--lp-surface':         '#111118',
  '--lp-text':            '#e8e8f4',
  '--lp-text-muted':      '#9898b8',
  '--lp-text-faint':      '#68687a',
  '--lp-border':          'rgba(255,255,255,0.07)',
  '--lp-border-strong':   'rgba(255,255,255,0.12)',
  '--lp-nav-bg':          'rgba(8,8,18,0.65)',
  '--lp-nav-border':      'rgba(255,255,255,0.08)',
  '--lp-badge-bg':        'rgba(255,255,255,0.06)',
  '--lp-badge-border':    'rgba(255,255,255,0.10)',
  '--lp-btn-bg':          '#f0f0ff',
  '--lp-btn-text':        '#0c0c12',
  '--lp-btn-sec-bg':      'rgba(255,255,255,0.07)',
  '--lp-btn-sec-text':    '#e8e8f4',
  '--lp-btn-sec-border':  'rgba(255,255,255,0.10)',
  '--lp-tab-bar-bg':      'rgba(255,255,255,0.05)',
  '--lp-tab-active-bg':   '#1e1e2e',
  '--lp-tab-active-text': '#e8e8f4',
  '--lp-tab-inactive':    '#68687a',
  '--lp-stage-bg':        '#111118',
  '--lp-stage-border':    'rgba(255,255,255,0.06)',
  '--lp-ov-bg':           'rgba(12,12,24,0.88)',
  '--lp-ov-border':       'rgba(255,255,255,0.10)',
  '--lp-ov-text':         '#9898b8',
  '--lp-ov-text-strong':  '#e8e8f4',
  '--lp-ov-divider':      'rgba(255,255,255,0.08)',
  '--lp-ov-zone-bg':      'rgba(255,255,255,0.04)',
  '--lp-toggle-bg':       'rgba(255,255,255,0.08)',
  '--lp-toggle-border':   'rgba(255,255,255,0.10)',
  '--lp-toggle-icon':     '#c8c8e8',
  '--lp-footer-text':     '#4a4a6a',
  '--lp-footer-link':     '#6a6a8a',
  '--lp-footer-border':   'rgba(255,255,255,0.06)',
  '--lp-glow-1':          'rgba(232,48,74,0.14)',
  '--lp-glow-2':          'rgba(232,48,74,0.18)',
  '--lp-glow-3':          'rgba(180,30,50,0.08)',
}

const LIGHT_VARS: Record<string, string> = {
  /* Report page */
  '--bg':                 '#fafafa',
  '--surface':            '#f2f3f5',
  '--surface2':           '#e8e9ec',
  '--border':             '#e0e1e8',
  '--border2':            '#d0d1d8',
  '--text':               '#1a1a2e',
  '--fg':                 '#2d2d3e',
  '--muted':              '#9090a8',
  '--muted2':             '#6b7080',
  '--accent':             '#e8304a',
  '--accent2':            '#c01f35',
  '--accent-glow':        'rgba(232,48,74,0.25)',
  /* Landing page */
  '--lp-bg':              '#F3F4ED',
  '--lp-surface':         '#ffffff',
  '--lp-text':            '#1a1a1a',
  '--lp-text-muted':      '#666666',
  '--lp-text-faint':      '#999999',
  '--lp-border':          'rgba(0,0,0,0.08)',
  '--lp-border-strong':   'rgba(0,0,0,0.13)',
  '--lp-nav-bg':          'rgba(243,244,237,0.45)',
  '--lp-nav-border':      'rgba(0,0,0,0.10)',
  '--lp-badge-bg':        'rgba(255,255,255,0.75)',
  '--lp-badge-border':    'rgba(0,0,0,0.09)',
  '--lp-btn-bg':          '#1a1a1a',
  '--lp-btn-text':        '#ffffff',
  '--lp-btn-sec-bg':      'rgba(255,255,255,0.75)',
  '--lp-btn-sec-text':    '#333333',
  '--lp-btn-sec-border':  'rgba(0,0,0,0.10)',
  '--lp-tab-bar-bg':      'rgba(0,0,0,0.05)',
  '--lp-tab-active-bg':   '#ffffff',
  '--lp-tab-active-text': '#1a1a1a',
  '--lp-tab-inactive':    '#888888',
  '--lp-stage-bg':        '#e5e6df',
  '--lp-stage-border':    'rgba(0,0,0,0.07)',
  '--lp-ov-bg':           'rgba(255,255,255,0.84)',
  '--lp-ov-border':       'rgba(255,255,255,0.92)',
  '--lp-ov-text':         '#555555',
  '--lp-ov-text-strong':  '#222222',
  '--lp-ov-divider':      'rgba(0,0,0,0.07)',
  '--lp-ov-zone-bg':      'rgba(0,0,0,0.03)',
  '--lp-toggle-bg':       'rgba(0,0,0,0.06)',
  '--lp-toggle-border':   'rgba(0,0,0,0.10)',
  '--lp-toggle-icon':     '#444444',
  '--lp-footer-text':     '#aaaaaa',
  '--lp-footer-link':     '#888888',
  '--lp-footer-border':   'rgba(0,0,0,0.07)',
  '--lp-glow-1':          'rgba(232,48,74,0.18)',
  '--lp-glow-2':          'rgba(232,48,74,0.10)',
  '--lp-glow-3':          'rgba(100,100,100,0.06)',
}

function applyVars(vars: Record<string, string>) {
  const el = document.documentElement
  for (const [k, v] of Object.entries(vars)) {
    el.style.setProperty(k, v)
  }
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const isDark = saved === 'dark'
    setMounted(true)
    setDark(isDark)
    // Sync inline vars with persisted state
    applyVars(isDark ? DARK_VARS : LIGHT_VARS)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    const vars = next ? DARK_VARS : LIGHT_VARS
    applyVars(vars)
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark')
      localStorage.setItem(STORAGE_KEY, 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
      localStorage.setItem(STORAGE_KEY, 'light')
    }
  }

  if (!mounted) {
    return <div className="lp-theme-toggle" aria-hidden="true" style={{ opacity: 0 }} />
  }

  return (
    <button
      onClick={toggle}
      className="lp-theme-toggle"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
