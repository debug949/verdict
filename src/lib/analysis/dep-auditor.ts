import type { Finding, ZonedFile } from '@/lib/verdict/types'

// ─── OSV.dev types ────────────────────────────────────────────────────────

interface OSVSeverity {
  type: string
  score: string
}

interface OSVVulnerability {
  id: string
  aliases?: string[]
  summary?: string
  severity?: OSVSeverity[]
}

interface OSVQueryResponse {
  vulns?: OSVVulnerability[]
}

// ─── Package extraction ───────────────────────────────────────────────────

/**
 * Parse added lines in package.json diff files to find newly introduced packages.
 * Returns a map of { packageName → versionString }.
 *
 * We only look at added lines — we don't want to re-flag packages that existed
 * before this PR. A package bumped from 1.0.0 to 1.0.1 counts as newly added
 * if the new version has a CVE the old version didn't.
 */
export function extractNewPackages(files: ZonedFile[]): Map<string, string> {
  const packages = new Map<string, string>()

  for (const file of files) {
    if (
      !file.filename.endsWith('package.json') ||
      file.filename.includes('node_modules')
    ) continue

    for (const { content } of file.addedLines) {
      // Match: "package-name": "1.2.3" or "package-name": "^1.2.3"
      // Handles scoped packages (@org/pkg) and most semver formats
      const match = content.match(
        /"(@?[a-z0-9][a-z0-9-._/@]*)"\s*:\s*"([~^]?[\d][^"]+)"/i
      )
      if (!match) continue

      const [, name, version] = match

      // Strip semver range characters to get the base version for OSV lookup
      const cleanVersion = version.replace(/^[~^>=<]/, '').trim()
      if (!cleanVersion || cleanVersion.startsWith('workspace')) continue

      packages.set(name, cleanVersion)
    }
  }

  return packages
}

// ─── OSV.dev queries ──────────────────────────────────────────────────────

async function queryOSV(
  name: string,
  version: string
): Promise<OSVVulnerability[]> {
  try {
    const response = await fetch('https://api.osv.dev/v1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package: { name, ecosystem: 'npm' },
        version,
      }),
      signal: AbortSignal.timeout(8000), // 8s timeout per package
    })

    if (!response.ok) return []
    const data = (await response.json()) as OSVQueryResponse
    return data.vulns ?? []
  } catch {
    // OSV.dev is down or slow — fail silently rather than blocking the analysis
    return []
  }
}

function getCVSS(vuln: OSVVulnerability): number | null {
  const cvss = vuln.severity?.find((s) => s.type === 'CVSS_V3')
  return cvss ? parseFloat(cvss.score) : null
}

function cvssToSeverity(score: number | null): Finding['severity'] {
  if (!score) return 'medium'
  if (score >= 9.0) return 'critical'
  if (score >= 7.0) return 'high'
  if (score >= 4.0) return 'medium'
  return 'low'
}

// ─── Main export ──────────────────────────────────────────────────────────

/**
 * Audit newly added npm packages against the OSV.dev vulnerability database.
 *
 * Runs queries in batches of 5 to avoid hammering OSV.dev.
 * Failures are swallowed — a slow OSV API should not block the verdict.
 */
export async function auditDependencies(files: ZonedFile[]): Promise<Finding[]> {
  const newPackages = extractNewPackages(files)
  if (newPackages.size === 0) return []

  const findings: Finding[] = []
  const entries = [...newPackages.entries()]

  // Batch requests — 5 parallel, sequential batches
  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5)

    const results = await Promise.all(
      batch.map(async ([name, version]) => ({
        name,
        version,
        vulns: await queryOSV(name, version),
      }))
    )

    for (const { name, version, vulns } of results) {
      for (const vuln of vulns) {
        const cvss = getCVSS(vuln)
        const cveId = vuln.aliases?.find((a) => a.startsWith('CVE-')) ?? vuln.id

        findings.push({
          type: 'cve',
          severity: cvssToSeverity(cvss),
          // Zone context for CVEs requires import graph analysis (v2)
          // For MVP: mark as GENERAL and let the scorer apply base penalty
          zone: 'GENERAL',
          file: 'package.json',
          title: `${cveId} in \`${name}@${version}\``,
          description:
            vuln.summary
              ? `${vuln.summary} (${cveId})`
              : `Known vulnerability in \`${name}@${version}\`. Check the OSV advisory for details.`,
          fix: `Update \`${name}\` to a patched version. See https://osv.dev/vulnerability/${vuln.id}`,
          preview: cvss ? `CVSS ${cvss.toFixed(1)}` : undefined,
        })
      }
    }
  }

  return findings
}
