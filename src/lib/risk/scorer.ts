import type { Finding, SecurityZone, TrustScore, ZoneImpact } from '@/lib/verdict/types'
import { ZONE_MULTIPLIER } from '@/lib/analysis/zone-classifier'

// ─── Penalty table ────────────────────────────────────────────────────────

/**
 * Base penalties before zone multiplier is applied.
 * These are intentionally conservative — the zone multiplier does the heavy lifting.
 *
 * AUTH zone secret: -30 × 2.5 = -75 → score drops to 25 → grade F
 * TEST zone secret: -30 × 0.3 = -9  → score drops to 91 → grade A
 * Same pattern, totally different risk.
 */
const BASE_PENALTY: Record<Finding['type'], Partial<Record<Finding['severity'], number>> | number> = {
  secret: { critical: -30, high: -22, medium: -12, low: -5 },
  cve:    { critical: -25, high: -16, medium: -8,  low: -3 },
  // Flat penalties — these are structural risks, not code patterns
  'unprotected-route': -28,
  'auth-removed':      -40,
}

function getPenalty(finding: Finding): number {
  const rule = BASE_PENALTY[finding.type]

  if (typeof rule === 'number') {
    // Flat penalty (structural findings — no zone multiplier makes sense)
    return rule
  }

  const base = rule[finding.severity] ?? -5
  return base * ZONE_MULTIPLIER[finding.zone]
}

// ─── Scoring ──────────────────────────────────────────────────────────────

function getGrade(score: number): TrustScore['grade'] {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function getRiskLevel(score: number): TrustScore['riskLevel'] {
  if (score >= 75) return 'low'
  if (score >= 60) return 'medium'
  if (score >= 40) return 'high'
  return 'critical'
}

/**
 * Calculate the trust score from all findings.
 *
 * Applies diminishing returns on repeated findings of the same type in the
 * same zone — the 5th SQL injection in DATA zone shouldn't tank the score as
 * much as the first one. Second+ findings of the same (type, zone) pair get
 * 65% of the full penalty.
 */
export function calculateTrustScore(findings: Finding[]): TrustScore {
  let score = 100
  const seenTypeZone = new Map<string, number>()

  for (const finding of findings) {
    const key = `${finding.type}:${finding.zone}`
    const occurrences = seenTypeZone.get(key) ?? 0
    const penalty = getPenalty(finding)
    const diminishingFactor = occurrences === 0 ? 1 : 0.65

    score += penalty * diminishingFactor
    seenTypeZone.set(key, occurrences + 1)
  }

  const finalScore = Math.max(0, Math.round(score))

  return {
    score: finalScore,
    grade: getGrade(finalScore),
    riskLevel: getRiskLevel(finalScore),
  }
}

// ─── Blast radius heuristic ───────────────────────────────────────────────

/**
 * Estimate blast radius without an import graph.
 * MVP heuristic: zone + number of files changed.
 *
 * AUTH with 2+ files = high (middleware likely affects many routes)
 * PAYMENT with any files = at least medium
 * Everything else: based on file count
 */
export function estimateBlastRadius(
  zone: SecurityZone,
  fileCount: number
): ZoneImpact['estimatedImpact'] {
  if (zone === 'TEST' || zone === 'GENERAL') return 'low'
  if (zone === 'AUTH' && fileCount >= 2) return 'high'
  if (zone === 'AUTH' || zone === 'PAYMENT') return 'medium'
  if (fileCount >= 3) return 'medium'
  return 'low'
}
