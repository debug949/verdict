// ─── Security zones ────────────────────────────────────────────────────────

export type SecurityZone =
  | 'AUTH'      // authentication, sessions, middleware, guards
  | 'PAYMENT'   // billing, checkout, stripe
  | 'ADMIN'     // admin routes and dashboards
  | 'API'       // API route handlers, controllers
  | 'DATA'      // database models, queries, migrations
  | 'CONFIG'    // env files, build config
  | 'TEST'      // test files, fixtures, mocks
  | 'GENERAL'   // everything else

// ─── Findings ─────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export type FindingType =
  | 'secret'             // credential or API key in diff
  | 'cve'                // known CVE in new dependency
  | 'unprotected-route'  // new API route without auth pattern (future)
  | 'auth-removed'       // auth check deleted (future)

export interface Finding {
  type: FindingType
  severity: Severity
  zone: SecurityZone
  file: string
  lineNumber?: number
  title: string
  description: string
  fix?: string
  /** Redacted preview shown in comment — e.g. "AKIA****" */
  preview?: string
}

// ─── Diff parsing ─────────────────────────────────────────────────────────

export interface AddedLine {
  lineNumber: number  // line number in the new file
  content: string     // raw content (leading '+' stripped)
}

export interface DiffFile {
  filename: string
  previousFilename?: string
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied'
  additions: number
  deletions: number
  patch?: string
}

export interface ZonedFile extends DiffFile {
  zone: SecurityZone
  addedLines: AddedLine[]
}

// ─── Zone impact ──────────────────────────────────────────────────────────

export interface ZoneImpact {
  zone: SecurityZone
  files: string[]
  /** Heuristic impact level — no import graph in MVP */
  estimatedImpact: 'low' | 'medium' | 'high'
}

// ─── Trust score ──────────────────────────────────────────────────────────

export interface TrustScore {
  score: number               // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

// ─── Pipeline ─────────────────────────────────────────────────────────────

export interface PRContext {
  installationId: number
  owner: string
  repo: string
  prNumber: number
  headSha: string
  prTitle: string
  prAuthor: string
}

export interface AnalysisResult {
  context: PRContext
  zoneImpacts: ZoneImpact[]
  findings: Finding[]
  trustScore: TrustScore
  secretsFound: number
  cvesFound: number
}

// ─── Persisted report ─────────────────────────────────────────────────────

/**
 * The complete analysis result stored in KV at the end of each pipeline run.
 * Read by the report page at /r/[owner]/[repo]/[prNumber].
 *
 * schemaVersion lets the report page detect stale data from old deploys.
 * If a stored record has a different schemaVersion, loadReport() returns null
 * and the report page shows a "not found" state rather than crashing.
 *
 * Typical serialised size: 3–10 KB. KV value limit is 512 KB — no risk.
 * TTL: 30 days (set in saveReport).
 */
export interface StoredReport {
  schemaVersion: 1

  // ── Identity ──────────────────────────────────────────────────────────
  owner:      string
  repo:       string
  prNumber:   number
  headSha:    string
  prTitle:    string
  prAuthor:   string
  analyzedAt: string   // ISO 8601 — e.g. "2026-06-08T14:32:00.000Z"

  // ── Narrative ─────────────────────────────────────────────────────────
  /** Pre-rendered plain-English narrative from buildNarrative(). Same text
   *  that appears in the GitHub PR review comment, stored so the report page
   *  never needs to regenerate or diverge from it. */
  narrative: string

  // ── Score ─────────────────────────────────────────────────────────────
  trustScore: TrustScore   // { score, grade, riskLevel }

  // ── Counts ────────────────────────────────────────────────────────────
  secretsFound:  number
  cvesFound:     number
  filesAnalyzed: number   // rawFiles.length
  linesScanned:  number   // total added lines across all non-removed files

  // ── Findings (full structured objects) ────────────────────────────────
  findings: Finding[]

  // ── Zone breakdown ────────────────────────────────────────────────────
  zoneImpacts: ZoneImpact[]

  // ── Per-file stats (for Files Analyzed table) ─────────────────────────
  fileStats: {
    filename:  string
    zone:      SecurityZone
    status:    DiffFile['status']
    additions: number
    deletions: number
  }[]
}

// ─── GitHub webhook event payloads ────────────────────────────────────────

export interface GitHubAccount {
  login: string
  type: 'User' | 'Organization' | 'Bot'
  avatar_url: string
}

export interface GitHubInstallation {
  id: number
  account: GitHubAccount
}

export interface GitHubRepository {
  id: number
  full_name: string
  private: boolean
  default_branch: string
}

export interface GitHubPullRequest {
  number: number
  title: string
  state: 'open' | 'closed'
  head: { sha: string; ref: string }
  base: { ref: string }
  user: { login: string }
  additions: number
  deletions: number
  changed_files: number
}

export interface InstallationEvent {
  action: 'created' | 'deleted' | 'suspend' | 'unsuspend'
  installation: GitHubInstallation
  repositories?: GitHubRepository[]
}

export interface InstallationRepositoriesEvent {
  action: 'added' | 'removed'
  installation: GitHubInstallation
  repositories_added: GitHubRepository[]
  repositories_removed: GitHubRepository[]
}

export interface PullRequestEvent {
  action: 'opened' | 'closed' | 'synchronize' | 'reopened' | 'edited'
  number: number
  pull_request: GitHubPullRequest
  repository: GitHubRepository
  installation?: { id: number }
}
