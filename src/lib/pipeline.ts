import { getInstallationToken } from '@/lib/github/app'
import { fetchPRFiles } from '@/lib/github/diff'
import { postVerdictReview, postCheckRun } from '@/lib/github/comment'
import { classifyFiles } from '@/lib/analysis/zone-classifier'
import { scanSecrets } from '@/lib/analysis/secret-scanner'
import { auditDependencies } from '@/lib/analysis/dep-auditor'
import { calculateTrustScore, estimateBlastRadius } from '@/lib/risk/scorer'
import { formatVerdictComment, buildNarrative } from '@/lib/verdict/comment'
import { saveReport } from '@/lib/store/report'
import type {
  PRContext,
  AnalysisResult,
  ZoneImpact,
  SecurityZone,
  StoredReport,
} from '@/lib/verdict/types'

/**
 * Run the full Verdict analysis pipeline for a pull request.
 *
 * Phase 1 — Context building:
 *   Fetch diff → classify files into security zones → build zone impact map
 *
 * Phase 2 — Scanning (zone-aware):
 *   Secret scanner + dep auditor run with zone context from Phase 1
 *
 * Phase 3 — Risk aggregation:
 *   Zone-weighted trust score + verdict comment + GitHub check run
 *
 * This function is called from the webhook handler AFTER the 200 response
 * is sent to GitHub. It must not throw — all errors are caught and logged.
 */
export async function analyzePullRequest(context: PRContext): Promise<void> {
  const { installationId, owner, repo, prNumber, headSha } = context
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://getverdict.dev'

  console.log(
    `[pipeline] start owner=${owner} repo=${repo} pr=#${prNumber} sha=${headSha.slice(0, 7)}`
  )

  try {
    // ── Phase 1: Context ────────────────────────────────────────────────

    const token = await getInstallationToken(installationId)

    const rawFiles = await fetchPRFiles(token, owner, repo, prNumber)
    console.log(`[pipeline] fetched ${rawFiles.length} changed files`)

    // Classify every file into a security zone and extract its added lines
    const zonedFiles = classifyFiles(rawFiles)

    // Build zone impact summary (which zones were touched, how many files each)
    const zoneFileMap = new Map<SecurityZone, string[]>()
    for (const file of zonedFiles) {
      const existing = zoneFileMap.get(file.zone) ?? []
      zoneFileMap.set(file.zone, [...existing, file.filename])
    }

    const zoneImpacts: ZoneImpact[] = [...zoneFileMap.entries()]
      .filter(([zone]) => zone !== 'GENERAL') // don't surface general zone
      .map(([zone, files]) => ({
        zone,
        files,
        estimatedImpact: estimateBlastRadius(zone, files.length),
      }))

    const zonesHit = [...zoneFileMap.keys()].filter((z) => z !== 'GENERAL')
    console.log(`[pipeline] zones affected: ${zonesHit.join(', ') || 'none'}`)

    // ── Phase 2: Scanning ───────────────────────────────────────────────

    // Run scanners in parallel — they're independent and both need zonedFiles
    const [secretFindings, cveFindings] = await Promise.all([
      Promise.resolve(scanSecrets(zonedFiles)),
      auditDependencies(zonedFiles),
    ])

    const allFindings = [...secretFindings, ...cveFindings]

    console.log(
      `[pipeline] findings: total=${allFindings.length} secrets=${secretFindings.length} cves=${cveFindings.length}`
    )

    // ── Phase 3: Risk aggregation ───────────────────────────────────────

    const trustScore = calculateTrustScore(allFindings)
    console.log(
      `[pipeline] trust score: ${trustScore.score}/100 grade=${trustScore.grade} risk=${trustScore.riskLevel}`
    )

    const result: AnalysisResult = {
      context,
      zoneImpacts,
      findings: allFindings,
      trustScore,
      secretsFound: secretFindings.length,
      cvesFound: cveFindings.length,
    }

    // ── Phase 4: Post to GitHub ─────────────────────────────────────────

    const verdictComment = formatVerdictComment(result, appUrl)

    const [reviewId, checkRunId] = await Promise.all([
      postVerdictReview(token, owner, repo, prNumber, verdictComment, allFindings),
      postCheckRun(
        token, owner, repo, headSha,
        trustScore.score, trustScore.grade, trustScore.riskLevel,
        allFindings.length
      ),
    ])

    console.log(
      `[pipeline] done review=${reviewId} check_run=${checkRunId}`
    )

    // ── Phase 5: Persist report ─────────────────────────────────────────
    // Build StoredReport from the data already in scope and write to KV.
    // saveReport() NEVER throws — a storage failure must not affect the
    // review or check run that were already successfully posted above.

    const linesScanned = zonedFiles.reduce(
      (sum, f) => sum + f.addedLines.length,
      0
    )

    const storedReport: StoredReport = {
      schemaVersion: 1,
      owner,
      repo,
      prNumber,
      headSha,
      prTitle:      context.prTitle,
      prAuthor:     context.prAuthor,
      analyzedAt:   new Date().toISOString(),
      narrative:    buildNarrative(result),
      trustScore,
      secretsFound: secretFindings.length,
      cvesFound:    cveFindings.length,
      filesAnalyzed: rawFiles.length,
      linesScanned,
      findings:     allFindings,
      zoneImpacts,
      fileStats:    zonedFiles.map((f) => ({
        filename:  f.filename,
        zone:      f.zone,
        status:    f.status,
        additions: f.additions,
        deletions: f.deletions,
      })),
    }

    const persisted = await saveReport(storedReport)
    console.log(`[pipeline] report persisted=${persisted}`)

  } catch (error) {
    // Never propagate — we already sent 200 to GitHub.
    // A thrown error here would be swallowed anyway since we're in after().
    // Log on separate lines so Vercel's truncation doesn't eat the message.
    console.error(
      `[pipeline] analysis failed for ${owner}/${repo}#${prNumber}:`,
      error instanceof Error ? error.message : error
    )
  }
}
