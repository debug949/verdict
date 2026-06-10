import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { loadReport } from '@/lib/store/report'
import type { StoredReport, Finding, ZoneImpact, SecurityZone } from '@/lib/verdict/types'
import { ZONE_LABEL, ZONE_MULTIPLIER } from '@/lib/analysis/zone-classifier'

// ─── Metadata ─────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ owner: string; repo: string; prNumber: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo, prNumber } = await params
  return {
    title: `Verdict — ${owner}/${repo} #${prNumber}`,
    description: `Security analysis report for pull request #${prNumber} in ${owner}/${repo}.`,
  }
}

// ─── Display helpers ──────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  A: '#22c55e', B: '#84cc16', C: '#eab308', D: '#f97316', F: '#ef4444',
}

const RISK_COLOR: Record<string, string> = {
  low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
}

const SEVERITY_ORDER: Finding['severity'][] = ['critical', 'high', 'medium', 'low']

const SEVERITY_COLOR: Record<Finding['severity'], string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#94a3b8',
}

const SEVERITY_BG: Record<Finding['severity'], string> = {
  critical: 'rgba(239,68,68,0.10)',
  high:     'rgba(249,115,22,0.10)',
  medium:   'rgba(234,179,8,0.10)',
  low:      'rgba(148,163,184,0.08)',
}

const ZONE_MULT_COLOR: Record<SecurityZone, string> = {
  AUTH:    '#ef4444', PAYMENT: '#ef4444',
  ADMIN:   '#f97316', API: '#f97316',
  DATA:    '#eab308', CONFIG: '#eab308',
  TEST:    '#94a3b8', GENERAL: '#94a3b8',
}

function gradeDesc(grade: string): string {
  return { A: 'Excellent', B: 'Good', C: 'Fair', D: 'Poor', F: 'Critical' }[grade] ?? ''
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const color = GRADE_COLOR[grade] ?? '#ef4444'
  // SVG ring: r=40, circumference=251.3
  const pct = score / 100
  const circ = 251.3
  const dash = pct * circ
  return (
    <div className="score-ring-wrap" aria-label={`Score ${score} out of 100, Grade ${grade}`}>
      <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border2)" strokeWidth="8"/>
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="score-ring-inner">
        <span className="score-ring-num" style={{ color }}>{score}</span>
        <span className="score-ring-denom">/100</span>
      </div>
    </div>
  )
}

function Badge({
  label, color, bg, border,
}: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: '99px',
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em',
      fontFamily: 'var(--font-mono)',
      color, background: bg, border: `1px solid ${border}`,
    }}>
      {label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rpt-section-label" aria-hidden="true">{children}</div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rpt-card ${className}`}>{children}</div>
}

// ─── Sections ─────────────────────────────────────────────────────────────

function HeroPanel({ report }: { report: StoredReport }) {
  const { trustScore, prTitle, prAuthor, analyzedAt, filesAnalyzed,
          secretsFound, cvesFound, owner, repo, prNumber } = report
  const { score, grade, riskLevel } = trustScore
  const gradeColor = GRADE_COLOR[grade] ?? '#ef4444'
  const riskColor  = RISK_COLOR[riskLevel] ?? '#ef4444'
  const totalFindings = secretsFound + cvesFound

  return (
    <section className="rpt-hero">
      <div className="rpt-hero-left">
        <ScoreRing score={score} grade={grade} />
        <div className="rpt-hero-score-labels">
          <div className="rpt-hero-grade" style={{ color: gradeColor }}>
            Grade {grade} <span className="rpt-hero-grade-desc">{gradeDesc(grade)}</span>
          </div>
          <div className="rpt-hero-risk" style={{ color: riskColor }}>
            {riskLevel.toUpperCase()} RISK
          </div>
        </div>
      </div>

      <div className="rpt-hero-right">
        <div className="rpt-hero-meta-top">
          <a
            href={`https://github.com/${owner}/${repo}/pull/${prNumber}`}
            target="_blank" rel="noopener noreferrer"
            className="rpt-pr-link"
          >
            {owner}/{repo} #{prNumber}
          </a>
          <span className="rpt-hero-time" title={formatDate(analyzedAt)}>
            {relativeTime(analyzedAt)}
          </span>
        </div>

        <h1 className="rpt-hero-title">{prTitle || `PR #${prNumber}`}</h1>

        <div className="rpt-hero-byline">
          by <strong>@{prAuthor}</strong>
        </div>

        <div className="rpt-hero-stats">
          <span className="rpt-stat">
            <span className="rpt-stat-val">{filesAnalyzed}</span>
            <span className="rpt-stat-lbl">files</span>
          </span>
          <span className="rpt-stat-div" aria-hidden="true">·</span>
          <span className="rpt-stat">
            <span className="rpt-stat-val" style={{ color: secretsFound > 0 ? '#ef4444' : 'inherit' }}>
              {secretsFound}
            </span>
            <span className="rpt-stat-lbl">secret{secretsFound !== 1 ? 's' : ''}</span>
          </span>
          <span className="rpt-stat-div" aria-hidden="true">·</span>
          <span className="rpt-stat">
            <span className="rpt-stat-val" style={{ color: cvesFound > 0 ? '#f97316' : 'inherit' }}>
              {cvesFound}
            </span>
            <span className="rpt-stat-lbl">CVE{cvesFound !== 1 ? 's' : ''}</span>
          </span>
          <span className="rpt-stat-div" aria-hidden="true">·</span>
          <span className="rpt-stat">
            <span className="rpt-stat-val">{totalFindings}</span>
            <span className="rpt-stat-lbl">finding{totalFindings !== 1 ? 's' : ''}</span>
          </span>
        </div>
      </div>
    </section>
  )
}

function ZoneBreakdown({ report }: { report: StoredReport }) {
  const { zoneImpacts, fileStats } = report
  if (zoneImpacts.length === 0) return null

  // Build zone → additions/deletions from fileStats
  const zoneAdditions = new Map<string, number>()
  for (const f of fileStats) {
    zoneAdditions.set(f.zone, (zoneAdditions.get(f.zone) ?? 0) + f.additions)
  }

  const sorted = [...zoneImpacts].sort((a, b) => {
    return (ZONE_MULTIPLIER[b.zone] ?? 1) - (ZONE_MULTIPLIER[a.zone] ?? 1)
  })

  return (
    <section className="rpt-section">
      <SectionLabel>⬡ Zone Breakdown</SectionLabel>
      <h2 className="rpt-section-h2">Security zones affected</h2>
      <div className="rpt-zones-list">
        {sorted.map((zi) => {
          const mult = ZONE_MULTIPLIER[zi.zone] ?? 1
          const color = ZONE_MULT_COLOR[zi.zone]
          const addedLines = zoneAdditions.get(zi.zone) ?? 0
          return (
            <div key={zi.zone} className="rpt-zone-row">
              <div className="rpt-zone-row-left">
                <span className="rpt-zone-name" style={{ color }}>{zi.zone}</span>
                <span className="rpt-zone-label">{ZONE_LABEL[zi.zone]}</span>
              </div>
              <div className="rpt-zone-row-center">
                <div className="rpt-zone-files">
                  {zi.files.slice(0, 4).map((f) => (
                    <code key={f} className="rpt-file-chip">{f.split('/').pop()}</code>
                  ))}
                  {zi.files.length > 4 && (
                    <span className="rpt-file-more">+{zi.files.length - 4} more</span>
                  )}
                </div>
              </div>
              <div className="rpt-zone-row-right">
                <Badge
                  label={`${mult}×`}
                  color={color}
                  bg={`${color}18`}
                  border={`${color}40`}
                />
                {addedLines > 0 && (
                  <span className="rpt-zone-lines">+{addedLines} lines</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FindingsSection({ report }: { report: StoredReport }) {
  const { findings } = report

  if (findings.length === 0) {
    return (
      <section className="rpt-section">
        <SectionLabel>⬡ Findings</SectionLabel>
        <h2 className="rpt-section-h2">No findings</h2>
        <p className="rpt-empty">No secrets or CVEs were detected in this PR.</p>
      </section>
    )
  }

  const secrets = findings.filter((f) => f.type === 'secret')
  const cves    = findings.filter((f) => f.type === 'cve')
  const other   = findings.filter((f) => f.type !== 'secret' && f.type !== 'cve')

  return (
    <section className="rpt-section">
      <SectionLabel>⬡ Findings</SectionLabel>
      <h2 className="rpt-section-h2">
        {findings.length} finding{findings.length !== 1 ? 's' : ''} detected
      </h2>

      {secrets.length > 0 && (
        <div className="rpt-finding-group">
          <h3 className="rpt-finding-group-title">
            🔑 Secrets &amp; Credentials
            <span className="rpt-finding-count">{secrets.length}</span>
          </h3>
          <div className="rpt-finding-list">
            {secrets.map((f, i) => (
              <FindingCard key={i} finding={f} />
            ))}
          </div>
        </div>
      )}

      {cves.length > 0 && (
        <div className="rpt-finding-group">
          <h3 className="rpt-finding-group-title">
            📦 Dependency CVEs
            <span className="rpt-finding-count">{cves.length}</span>
          </h3>
          <div className="rpt-finding-list">
            {cves.map((f, i) => (
              <FindingCard key={i} finding={f} />
            ))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div className="rpt-finding-group">
          <h3 className="rpt-finding-group-title">
            ⚠️ Other Findings
            <span className="rpt-finding-count">{other.length}</span>
          </h3>
          <div className="rpt-finding-list">
            {other.map((f, i) => (
              <FindingCard key={i} finding={f} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function FindingCard({ finding: f }: { finding: Finding }) {
  const color  = SEVERITY_COLOR[f.severity]
  const bg     = SEVERITY_BG[f.severity]
  const border = `${color}30`

  return (
    <div className="rpt-finding-card" style={{ borderLeft: `3px solid ${color}`, background: bg }}>
      <div className="rpt-finding-header">
        <Badge
          label={f.severity.toUpperCase()}
          color={color} bg={`${color}18`} border={`${color}40`}
        />
        <span className="rpt-finding-title">{f.title}</span>
        {f.preview && (
          <code className="rpt-finding-preview" style={{ color }}>{f.preview}</code>
        )}
      </div>

      <p className="rpt-finding-desc">{f.description}</p>

      <div className="rpt-finding-meta">
        {f.file && (
          <span className="rpt-finding-loc">
            <code>{f.file}{f.lineNumber ? `:${f.lineNumber}` : ''}</code>
          </span>
        )}
        <Badge
          label={f.zone}
          color={ZONE_MULT_COLOR[f.zone]}
          bg="transparent"
          border={`${ZONE_MULT_COLOR[f.zone]}40`}
        />
      </div>

      {f.fix && (
        <div className="rpt-finding-fix">
          <span className="rpt-finding-fix-label">Fix:</span> {f.fix}
        </div>
      )}
    </div>
  )
}

function RiskDistribution({ report }: { report: StoredReport }) {
  const { findings } = report
  if (findings.length === 0) return null

  const counts = Object.fromEntries(
    SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length])
  ) as Record<Finding['severity'], number>

  const max = Math.max(...Object.values(counts), 1)

  return (
    <section className="rpt-section">
      <SectionLabel>⬡ Risk Distribution</SectionLabel>
      <h2 className="rpt-section-h2">Findings by severity</h2>
      <div className="rpt-dist-grid">
        {SEVERITY_ORDER.map((sev) => {
          const count = counts[sev]
          const color = SEVERITY_COLOR[sev]
          const barPct = Math.round((count / max) * 100)
          return (
            <div key={sev} className="rpt-dist-row">
              <span className="rpt-dist-label" style={{ color }}>{sev.toUpperCase()}</span>
              <div className="rpt-dist-bar-track">
                <div
                  className="rpt-dist-bar-fill"
                  style={{ width: `${barPct}%`, background: color }}
                  aria-label={`${count} ${sev} findings`}
                />
              </div>
              <span className="rpt-dist-count" style={{ color }}>{count}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FilesAnalyzed({ report }: { report: StoredReport }) {
  const { fileStats, linesScanned } = report
  if (fileStats.length === 0) return null

  // Sort: highest-multiplier zone first, then alpha
  const sorted = [...fileStats].sort((a, b) => {
    const md = (ZONE_MULTIPLIER[b.zone] ?? 1) - (ZONE_MULTIPLIER[a.zone] ?? 1)
    if (md !== 0) return md
    return a.filename.localeCompare(b.filename)
  })

  return (
    <section className="rpt-section">
      <SectionLabel>⬡ Files Analyzed</SectionLabel>
      <h2 className="rpt-section-h2">
        {fileStats.length} file{fileStats.length !== 1 ? 's' : ''} ·{' '}
        <span style={{ color: 'var(--muted2)' }}>{linesScanned} added lines scanned</span>
      </h2>
      <div className="rpt-files-table">
        <div className="rpt-files-header">
          <span>File</span>
          <span>Zone</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Changes</span>
        </div>
        {sorted.map((f) => {
          const zoneColor = ZONE_MULT_COLOR[f.zone]
          return (
            <div key={f.filename} className="rpt-files-row">
              <code className="rpt-files-name">{f.filename}</code>
              <span className="rpt-files-zone" style={{ color: zoneColor }}>{f.zone}</span>
              <span className={`rpt-files-status rpt-status-${f.status}`}>{f.status}</span>
              <span className="rpt-files-changes">
                {f.additions > 0 && <span style={{ color: '#22c55e' }}>+{f.additions}</span>}
                {f.deletions > 0 && <span style={{ color: '#ef4444', marginLeft: '4px' }}>−{f.deletions}</span>}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ReportFooter({
  report,
}: { report: StoredReport }) {
  const { owner, repo, prNumber, analyzedAt } = report
  return (
    <footer className="rpt-footer">
      <span>
        Verdict · analysed {formatDate(analyzedAt)}
      </span>
      <div className="footer-links">
        <a
          href={`https://github.com/${owner}/${repo}/pull/${prNumber}`}
          target="_blank" rel="noopener noreferrer"
        >
          View PR on GitHub
        </a>
        <a href="/">Verdict home</a>
        <a
          href="https://github.com/apps/verdict-diff"
          target="_blank" rel="noopener noreferrer"
        >
          Install Verdict
        </a>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function ReportPage({ params }: Props) {
  const { owner, repo, prNumber: prNumberStr } = await params
  const prNumber = parseInt(prNumberStr, 10)

  if (isNaN(prNumber)) notFound()

  const report = await loadReport(owner, repo, prNumber)

  if (!report) notFound()

  const { trustScore } = report
  const gradeColor = GRADE_COLOR[trustScore.grade] ?? '#ef4444'

  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <span className="nav-logo-icon">▲</span>
          Verdict
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--muted2)',
          }}>
            {owner}/{repo} · PR #{prNumber}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700,
            color: gradeColor, padding: '2px 10px',
            background: `${gradeColor}15`,
            border: `1px solid ${gradeColor}40`,
            borderRadius: '99px',
          }}>
            {trustScore.score}/100 · Grade {trustScore.grade}
          </span>
        </div>
      </nav>

      {/* ── Report ──────────────────────────────────────────────── */}
      <div className="rpt-root">
        <HeroPanel report={report} />
        <div className="rpt-divider" />
        <ZoneBreakdown report={report} />
        <div className="rpt-divider" />
        <FindingsSection report={report} />
        <div className="rpt-divider" />
        <RiskDistribution report={report} />
        <div className="rpt-divider" />
        <FilesAnalyzed report={report} />
      </div>

      <ReportFooter report={report} />
    </>
  )
}
