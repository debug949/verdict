import type { AnalysisResult, ZoneImpact, Finding } from '@/lib/verdict/types'
import { ZONE_EMOJI, ZONE_LABEL } from '@/lib/analysis/zone-classifier'

// ─── Risk narrative ───────────────────────────────────────────────────────

/**
 * Generate a plain-English risk narrative for the PR.
 * Template-based in MVP — reads naturally and has zero latency.
 * V2: replace with a single Groq call using this structured data as input.
 *
 * The narrative answers: "What does this PR do to your security posture?"
 * Not: "What problems did we find?"
 */
export function buildNarrative(result: AnalysisResult): string {
  const { findings, zoneImpacts } = result

  const authZone = zoneImpacts.find((z) => z.zone === 'AUTH')
  const paymentZone = zoneImpacts.find((z) => z.zone === 'PAYMENT')
  const secrets = findings.filter((f) => f.type === 'secret')
  const cves = findings.filter((f) => f.type === 'cve')

  const clauses: string[] = []

  if (authZone) {
    const fileCount = authZone.files.length
    clauses.push(
      `This PR modifies ${fileCount} authentication ${fileCount === 1 ? 'file' : 'files'}`
    )
  }

  if (paymentZone) {
    const intro = clauses.length > 0 ? 'and touches' : 'This PR touches'
    clauses.push(`${intro} payment processing code`)
  }

  if (secrets.length > 0) {
    const inZone = secrets[0].zone !== 'GENERAL' ? ` in your ${secrets[0].zone} layer` : ''
    clauses.push(`A credential was found in the diff${inZone}`)
  }

  if (cves.length > 0) {
    const intro = clauses.length > 0 ? 'One newly added' : 'This PR adds a'
    const plural = cves.length > 1 ? `${cves.length} newly added dependencies have known CVEs` : `${intro} dependency with a known CVE`
    clauses.push(cves.length > 1 ? plural : plural)
  }

  if (clauses.length === 0) {
    const { score } = result.trustScore
    if (score >= 90) return 'No significant security risks detected in this PR.'
    return 'Minor risk indicators detected. Review the findings below before merging.'
  }

  return clauses.join('. ') + '.'
}

// ─── Zone table ───────────────────────────────────────────────────────────

const IMPACT_LABEL: Record<ZoneImpact['estimatedImpact'], string> = {
  low: 'Limited impact',
  medium: 'Moderate impact',
  high: 'Broad impact',
}

function buildZoneTable(zoneImpacts: ZoneImpact[]): string {
  const significant = zoneImpacts.filter(
    (z) => z.zone !== 'GENERAL' && z.zone !== 'TEST'
  )
  if (significant.length === 0) return ''

  const rows = significant.map((z) => {
    const emoji = ZONE_EMOJI[z.zone]
    const label = ZONE_LABEL[z.zone]
    // Show file basenames only — full paths are noisy in a comment
    const files = z.files
      .slice(0, 3)
      .map((f) => `\`${f.split('/').pop()}\``)
      .join(', ')
    const more = z.files.length > 3 ? ` +${z.files.length - 3} more` : ''
    return `| ${emoji} **${label}** | ${files}${more} | ${IMPACT_LABEL[z.estimatedImpact]} |`
  })

  return [
    '| Zone | Files | Impact |',
    '|------|-------|--------|',
    ...rows,
  ].join('\n')
}

// ─── Risk factors ─────────────────────────────────────────────────────────

function buildRiskFactors(result: AnalysisResult): string {
  const factors: string[] = []

  // Zone-level structural factors (most important — go first)
  const authFiles = result.zoneImpacts.find((z) => z.zone === 'AUTH')?.files ?? []
  if (authFiles.length > 0) {
    const names = authFiles.map((f) => `\`${f.split('/').pop()}\``).join(', ')
    factors.push(`Authentication ${authFiles.length === 1 ? 'file' : 'files'} modified: ${names}`)
  }

  const payFiles = result.zoneImpacts.find((z) => z.zone === 'PAYMENT')?.files ?? []
  if (payFiles.length > 0) {
    factors.push(`Payment code modified: ${payFiles.map((f) => `\`${f.split('/').pop()}\``).join(', ')}`)
  }

  // Finding-level factors
  for (const f of result.findings.filter((f) => f.type === 'secret')) {
    factors.push(
      `${f.title} in \`${f.file.split('/').pop()}\`` +
        (f.preview ? ` — \`${f.preview}\`` : '')
    )
  }

  for (const f of result.findings.filter((f) => f.type === 'unprotected-route')) {
    factors.push(`New API route without authentication: \`${f.file.split('/').pop()}\``)
  }

  for (const f of result.findings.filter((f) => f.type === 'cve')) {
    factors.push(`${f.title}${f.preview ? ` (${f.preview})` : ''}`)
  }

  if (factors.length === 0) return '_No significant risk factors._'
  return factors.map((f) => `- ${f}`).join('\n')
}

// ─── Finding count summary ────────────────────────────────────────────────

function buildFindingSummary(findings: Finding[]): string {
  const counts = [
    findings.filter((f) => f.type === 'secret').length,
    findings.filter((f) => f.type === 'cve').length,
    findings.filter((f) => f.type === 'unprotected-route').length,
  ]

  const labels = ['secret', 'CVE', 'unprotected route']

  const parts = counts
    .map((n, i) => (n > 0 ? `${n} ${labels[i]}${n !== 1 ? 's' : ''}` : null))
    .filter(Boolean)

  if (parts.length === 0) return 'No findings — clean PR.'
  return parts.join(' · ') + ' — see inline comments for details.'
}

// ─── Grade display ────────────────────────────────────────────────────────

const GRADE_ICON: Record<string, string> = {
  A: '🟢',
  B: '🟡',
  C: '🟡',
  D: '🔴',
  F: '🔴',
}

// ─── Main export ──────────────────────────────────────────────────────────

/**
 * Format the complete Verdict PR comment.
 *
 * Structure (intentional):
 *   1. Verdict header — score + grade immediately visible
 *   2. Risk narrative — one paragraph answering "what does this PR do?"
 *   3. Zone table — which security zones are affected
 *   4. Risk factors — specific issues, highest severity first
 *   5. Finding summary — count + pointer to inline comments
 *   6. Footer — attribution + full report link
 *
 * This order is different from CodeRabbit/Qodo which lead with line-level
 * suggestions. Verdict leads with the architectural risk picture.
 */
export function formatVerdictComment(
  result: AnalysisResult,
  appUrl: string
): string {
  const { trustScore, findings, context } = result
  const { score, grade, riskLevel } = trustScore

  const icon = GRADE_ICON[grade] ?? '⚪'
  const riskLabel = riskLevel.toUpperCase().replace('-', ' ')

  const narrative = buildNarrative(result)
  const zoneTable = buildZoneTable(result.zoneImpacts)
  const riskFactors = buildRiskFactors(result)
  const findingSummary = buildFindingSummary(findings)

  const reportUrl = `${appUrl}/r/${context.owner}/${context.repo}/${context.prNumber}`

  let comment = `## ${icon} Verdict: ${riskLabel} — ${score}/100 — Grade ${grade}\n\n`
  comment += `${narrative}\n`

  if (zoneTable) {
    comment += `\n---\n\n### Security zones affected\n\n${zoneTable}\n`
  }

  comment += `\n### Risk factors\n\n${riskFactors}\n`
  comment += `\n### Findings\n\n${findingSummary}\n`
  comment += `\n---\n*[Verdict](${appUrl}) · Trust score ${score}/100 · [Full report](${reportUrl})*`

  return comment
}

// ─── Inline finding comment ───────────────────────────────────────────────

const SEVERITY_ICON: Record<Finding['severity'], string> = {
  critical: '🚨',
  high: '⚠️',
  medium: '🔶',
  low: 'ℹ️',
}

/**
 * Format an inline comment for a single finding.
 * Posted directly on the flagged line in the PR diff.
 */
export function formatFindingComment(finding: Finding): string {
  const icon = SEVERITY_ICON[finding.severity]
  const severity = finding.severity.toUpperCase()

  let body = `${icon} **Verdict [${severity}]: ${finding.title}**\n\n`
  body += `${finding.description}\n`

  if (finding.preview) {
    body += `\n**Detected:** \`${finding.preview}\`\n`
  }

  if (finding.fix) {
    body += `\n**Fix:** ${finding.fix}`
  }

  return body
}
