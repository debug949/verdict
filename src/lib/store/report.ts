import { Redis } from '@upstash/redis'
import type { StoredReport } from '@/lib/verdict/types'

// ─── Client ───────────────────────────────────────────────────────────────

/**
 * Lazily initialise the Redis client so that import-time failures (missing
 * env vars) are caught at call-time and handled gracefully rather than
 * crashing the whole module at startup.
 *
 * Only this file imports @upstash/redis — all callers use saveReport() and
 * loadReport() and never touch the client directly. Swapping the backend
 * (Upstash → Postgres, KV → anything) only requires editing this file.
 */
function getClient(): Redis | null {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null

  try {
    return new Redis({ url, token })
  } catch {
    return null
  }
}

// ─── Key format ───────────────────────────────────────────────────────────

/**
 * "verdict:v1:{owner}/{repo}/{prNumber}"
 *
 * Examples:
 *   verdict:v1:debug949/verdict-test/1
 *   verdict:v1:acme/api/42
 *
 * The "verdict:v1:" prefix:
 *   - Namespaces keys so the Redis instance can be shared with other projects
 *   - "v1" lets us expire all old-schema keys by bumping to "v2" in a future
 *     migration without a full DB wipe
 */
function reportKey(owner: string, repo: string, prNumber: number): string {
  return `verdict:v1:${owner}/${repo}/${prNumber}`
}

// ─── TTL ──────────────────────────────────────────────────────────────────

/** 30 days in seconds */
const REPORT_TTL_SECONDS = 30 * 24 * 60 * 60   // 2_592_000

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Persist a completed analysis report to Redis.
 *
 * Returns true on success, false on any failure.
 *
 * GUARANTEE: this function NEVER throws.
 * A KV failure must not prevent the PR review or check run from being posted —
 * those are already complete by the time Phase 5 runs in the pipeline.
 */
export async function saveReport(report: StoredReport): Promise<boolean> {
  const client = getClient()

  if (!client) {
    // KV not configured — expected during local dev without .env.local
    console.warn('[store] saveReport skipped: UPSTASH_REDIS_REST_URL/TOKEN not set')
    return false
  }

  try {
    await client.set(
      reportKey(report.owner, report.repo, report.prNumber),
      report,
      { ex: REPORT_TTL_SECONDS }
    )
    return true
  } catch (error) {
    console.error(
      '[store] saveReport failed:',
      error instanceof Error ? error.message : String(error)
    )
    return false
  }
}

/**
 * Load a stored report from Redis by owner/repo/prNumber.
 *
 * Returns null when:
 *   - KV is not configured (env vars absent)
 *   - The report has never been stored (analysis hasn't run yet)
 *   - The TTL has expired (after 30 days)
 *   - The stored record has a mismatched schemaVersion (stale old-deploy data)
 *   - Any network/Redis error occurs
 *
 * GUARANTEE: this function NEVER throws.
 * The report page must handle null gracefully (show not-found state).
 */
export async function loadReport(
  owner:    string,
  repo:     string,
  prNumber: number
): Promise<StoredReport | null> {
  const client = getClient()

  if (!client) {
    console.warn('[store] loadReport skipped: UPSTASH_REDIS_REST_URL/TOKEN not set')
    return null
  }

  try {
    const data = await client.get<StoredReport>(
      reportKey(owner, repo, prNumber)
    )

    if (!data) return null

    // Reject stale data from an old schema version
    if (data.schemaVersion !== 1) {
      console.warn(
        `[store] loadReport: schema mismatch (got ${data.schemaVersion}, expected 1) — returning null`
      )
      return null
    }

    return data
  } catch (error) {
    console.error(
      '[store] loadReport failed:',
      error instanceof Error ? error.message : String(error)
    )
    return null
  }
}
