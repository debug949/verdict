import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verdict — Know what you\'re merging',
}

// ── Static data ────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    num: '01',
    icon: '⬡',
    iconClass: 'hiw-icon-purple',
    title: 'PR opened or updated',
    desc: 'GitHub sends a webhook to Verdict the moment a pull request is created or synchronised. No polling, no delay.',
  },
  {
    num: '02',
    icon: '⬡',
    iconClass: 'hiw-icon-blue',
    title: 'Pipeline scans the diff',
    desc: 'Verdict fetches the diff, classifies each file into a security zone, runs regex secret scanning, and queries OSV.dev for CVEs in newly-added packages.',
  },
  {
    num: '03',
    icon: '⬡',
    iconClass: 'hiw-icon-green',
    title: 'Verdict posts to the PR',
    desc: 'A trust score (0–100, A–F) is calculated and posted as a PR review with inline comments and a GitHub check — all in seconds.',
  },
]

const ZONES = [
  { icon: '🔐', name: 'AUTH',    mult: '2.5×', cls: 'mult-critical', desc: 'Auth, sessions, JWT, OAuth' },
  { icon: '💳', name: 'PAYMENT', mult: '2.5×', cls: 'mult-critical', desc: 'Stripe, billing, checkout' },
  { icon: '🛡️', name: 'ADMIN',   mult: '2.0×', cls: 'mult-high',     desc: 'Admin panels, privileges' },
  { icon: '🔌', name: 'API',     mult: '1.8×', cls: 'mult-high',     desc: 'External API integrations' },
  { icon: '🗄️', name: 'DATA',    mult: '1.6×', cls: 'mult-med',      desc: 'Databases, user records' },
  { icon: '⚙️', name: 'CONFIG',  mult: '1.4×', cls: 'mult-low',      desc: 'Env vars, secrets config' },
  { icon: '🧪', name: 'TEST',    mult: '0.5×', cls: 'mult-base',     desc: 'Test files, fixtures' },
  { icon: '📄', name: 'GENERAL', mult: '1.0×', cls: 'mult-base',     desc: 'All other source files' },
]

const CATCHES = [
  {
    icon: '🔑',
    title: 'Credential leaks',
    desc: 'Detects hardcoded secrets in the diff before they ever hit main.',
    examples: ['AKIA…  AWS access key', 'sk_live_…  Stripe secret', 'ghp_…  GitHub PAT', 'Generic API keys & DB URLs'],
  },
  {
    icon: '📦',
    title: 'Dependency CVEs',
    desc: 'Queries OSV.dev for every newly-added npm package — zero network requests for unchanged deps.',
    examples: ['CVE-2020-28500  lodash', 'CVE-2022-24999  express', 'GHSA-…  any ecosystem'],
  },
  {
    icon: '🗺️',
    title: 'Zone-weighted risk',
    desc: 'The same secret in a PAYMENT file scores 2.5× higher than in a test fixture. Context matters.',
    examples: ['AUTH zone  login.ts', 'PAYMENT zone  checkout.js', 'ADMIN zone  admin/users.ts'],
  },
]

// ── Components ─────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="nav">
      <a href="/" className="nav-logo">
        <span className="nav-logo-icon">▲</span>
        Verdict
      </a>
      <ul className="nav-links">
        <li><a href="#how-it-works">How it works</a></li>
        <li><a href="#zones">Zones</a></li>
        <li>
          <a
            className="nav-cta"
            href="https://github.com/apps/verdict-diff"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon size={14} /> Add to GitHub
          </a>
        </li>
      </ul>
    </nav>
  )
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

function DemoVerdictCard() {
  return (
    <div className="demo-card">
      <div className="demo-card-inner">
        {/* Window chrome */}
        <div className="demo-card-header">
          <span className="demo-dot" />
          <span className="demo-dot" />
          <span className="demo-dot" />
          <span className="demo-title">verdict-diff[bot] · just now</span>
        </div>

        <div className="demo-body">
          <div className="gh-comment">
            <div className="gh-comment-header">
              <div className="gh-avatar">V</div>
              <span className="gh-commenter">
                <strong>verdict-diff</strong> bot left a review
              </span>
            </div>
            <div className="gh-comment-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span className="verdict-grade-badge grade-f">🔴 CRITICAL</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Grade F</span>
              </div>

              <div className="verdict-score-line">
                <span className="score-big">16</span>
                <span className="score-label">/ 100 trust score</span>
              </div>

              <ul className="verdict-risk-list">
                <li className="verdict-risk-item">
                  AWS access key detected in <code style={{fontSize:'0.65rem',color:'var(--muted2)'}}>payment/config.js</code> — <code style={{fontSize:'0.65rem',color:'var(--red)'}}>AKIA****</code>
                </li>
                <li className="verdict-risk-item">
                  Hardcoded API key — <code style={{fontSize:'0.65rem',color:'var(--red)'}}>api_****</code>
                </li>
                <li className="verdict-risk-item">
                  CVE-2020-28500 in <code style={{fontSize:'0.65rem',color:'var(--orange)'}}>lodash@4.17.20</code>
                </li>
                <li className="verdict-risk-item">
                  +6 more CVEs in newly-added packages
                </li>
              </ul>

              <div className="verdict-footer-line">
                Verdict · Trust score 16/100 · <span style={{color:'var(--accent2)'}}>Full report →</span>
              </div>
            </div>
          </div>

          {/* Inline comment chip */}
          <div style={{
            marginTop: '8px',
            padding: '8px 10px',
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.18)',
            borderRadius: '7px',
            fontSize: '0.67rem',
            color: 'var(--muted2)',
            fontFamily: 'var(--font-mono)',
          }}>
            <span style={{color:'var(--red)', fontWeight:700}}>⚠</span>
            {' '}payment/config.js:4 — AWS access key in PAYMENT zone (2.5× risk multiplier)
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Nav />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />

        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Pipeline verified · live on GitHub
            </div>

            <h1 className="hero-h1">
              Know what you&apos;re merging.<br />
              <em>Before you merge it.</em>
            </h1>

            <p className="hero-sub">
              Verdict is a GitHub App that analyses every pull request for leaked credentials,
              dependency CVEs, and zone-weighted risk — posting a trust score directly to the PR.
            </p>

            <div className="hero-actions">
              <a
                href="https://github.com/apps/verdict-diff"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <GithubIcon size={16} />
                Add to GitHub — it&apos;s free
              </a>
              <a href="#how-it-works" className="btn-secondary">
                See how it works ↓
              </a>
            </div>
          </div>

          <DemoVerdictCard />
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="stats-bar">
        <div className="stats-inner">
          <div className="stat-item">
            <h3>0ms</h3>
            <p>Added to build time</p>
          </div>
          <div className="stat-item">
            <h3>8</h3>
            <p>Security zones classified</p>
          </div>
          <div className="stat-item">
            <h3>12+</h3>
            <p>Secret patterns detected</p>
          </div>
          <div className="stat-item">
            <h3>OSV</h3>
            <p>CVE database powering audits</p>
          </div>
        </div>
      </div>

      {/* ── How it works ──────────────────────────────────────────── */}
      <section id="how-it-works">
        <div className="section-inner">
          <div className="section-label">⬡ Process</div>
          <h2 className="section-h2">Three steps from PR to verdict</h2>
          <p className="section-sub">
            No configuration required. Install the GitHub App and every new PR is analysed automatically.
          </p>

          <div className="hiw-steps">
            {HOW_IT_WORKS.map((step, i) => (
              <div className="hiw-step" key={step.num}>
                <div className="hiw-step-num">STEP {step.num}</div>
                <div className={`hiw-icon ${step.iconClass}`} aria-hidden="true">
                  {i === 0 ? '🔀' : i === 1 ? '🔍' : '✅'}
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Zones ─────────────────────────────────────────────────── */}
      <section id="zones">
        <div className="section-inner">
          <div className="section-label">⬡ Risk model</div>
          <h2 className="section-h2">Security zones amplify risk</h2>
          <p className="section-sub">
            A hardcoded secret in <code className="mono" style={{fontSize:'0.9em',color:'var(--accent2)'}}>payment/checkout.ts</code> is not the same risk as one in a test fixture.
            Verdict classifies every changed file into a zone and applies a weighted multiplier to the trust score.
          </p>

          <div className="zones-grid">
            {ZONES.map((z) => (
              <div className="zone-card" key={z.name}>
                <div className="zone-card-top">
                  <span className="zone-icon" aria-hidden="true">{z.icon}</span>
                  <span className={`zone-multiplier ${z.cls}`}>{z.mult}</span>
                </div>
                <h4>{z.name}</h4>
                <p>{z.desc}</p>
              </div>
            ))}
          </div>

          <p className="zones-note">
            Multipliers are applied to findings. A finding in AUTH/PAYMENT zone scores up to 2.5× higher.
          </p>
        </div>
      </section>

      <hr className="divider" />

      {/* ── What Verdict catches ──────────────────────────────────── */}
      <section>
        <div className="section-inner">
          <div className="section-label">⬡ Detection</div>
          <h2 className="section-h2">What Verdict catches</h2>
          <p className="section-sub">
            Three orthogonal signals combined into a single trust score. No false-positive noise —
            only patterns that matter.
          </p>

          <div className="catches-grid">
            {CATCHES.map((c) => (
              <div className="catch-card" key={c.title}>
                <div className="catch-card-icon" aria-hidden="true">{c.icon}</div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <ul className="catch-examples">
                  {c.examples.map((ex) => (
                    <li key={ex}>{ex}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Screenshots ───────────────────────────────────────────── */}
      <section>
        <div className="section-inner">
          <div className="section-label">⬡ Preview</div>
          <h2 className="section-h2">See it in action</h2>
          <p className="section-sub">
            Verdict posts directly to the PR — a summary comment and inline annotations on the exact lines where issues were found.
          </p>

          <div className="screenshots-grid">
            <div className="screenshot-placeholder">
              <span>🖼️</span>
              <span>PR review comment · coming soon</span>
            </div>
            <div className="screenshot-placeholder">
              <span>🖼️</span>
              <span>Inline secret annotation · coming soon</span>
            </div>
            <div className="screenshot-placeholder">
              <span>🖼️</span>
              <span>GitHub check run · coming soon</span>
            </div>
            <div className="screenshot-placeholder">
              <span>🖼️</span>
              <span>Trust score breakdown · coming soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <div className="cta-section">
        <div className="cta-glow" aria-hidden="true" />
        <h2>Start protecting your PRs today</h2>
        <p>
          Install Verdict on any repository in 30 seconds.
          No configuration, no secrets to manage on your end.
        </p>
        <div className="cta-actions">
          <a
            href="https://github.com/apps/verdict-diff"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <GithubIcon size={16} />
            Install Verdict on GitHub
          </a>
          <a
            href="https://github.com/debug949/verdict"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            View source →
          </a>
        </div>
        <p className="cta-meta">
          Free forever · No credit card · Open source
        </p>
      </div>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer>
        <span>
          Built by{' '}
          <a href="https://github.com/debug949" target="_blank" rel="noopener noreferrer">
            Vihan
          </a>
          {' '}· Portfolio project
        </span>
        <div className="footer-links">
          <a href="https://github.com/debug949/verdict" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="#how-it-works">Docs</a>
          <a href="https://github.com/apps/verdict-diff" target="_blank" rel="noopener noreferrer">
            Install
          </a>
        </div>
      </footer>
    </>
  )
}
