import type { Finding } from '@/lib/verdict/types'
import { formatFindingComment } from '@/lib/verdict/comment'

// ─── PR review ────────────────────────────────────────────────────────────

interface ReviewComment {
  path: string
  line: number
  side: 'RIGHT'  // RIGHT = new file, LEFT = old file. We always comment on added lines.
  body: string
}

/**
 * Post a PR review to GitHub with a summary comment and inline finding comments.
 *
 * Uses the "COMMENT" event (not APPROVE or REQUEST_CHANGES) so Verdict never
 * blocks a merge or approves without human review. It's informational only.
 *
 * Returns the GitHub review ID, or -1 if the post failed.
 */
export async function postVerdictReview(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  summaryBody: string,
  findings: Finding[]
): Promise<number> {
  // Build inline comments for findings that have a line number
  const comments: ReviewComment[] = findings
    .filter((f) => f.lineNumber !== undefined && f.file)
    .map((f) => ({
      path: f.file,
      line: f.lineNumber!,
      side: 'RIGHT' as const,
      body: formatFindingComment(f),
    }))

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Verdict/0.1',
      },
      body: JSON.stringify({
        body: summaryBody,
        event: 'COMMENT',
        comments,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error(`[github] PR review failed: ${response.status}`, error)
    return -1
  }

  const data = (await response.json()) as { id: number }
  console.log(`[github] posted review id=${data.id} inline_comments=${comments.length}`)
  return data.id
}

// ─── Check run ────────────────────────────────────────────────────────────

/**
 * Post a GitHub check run with the trust score and grade.
 * The check run shows in the PR status bar — it's the first thing reviewers see.
 *
 * Conclusion mapping:
 *   score ≥ 75 → success  (green check)
 *   score 40–74 → neutral (grey circle — doesn't block merge)
 *   score < 40  → failure (red X — can be set to block merge via branch protection)
 */
export async function postCheckRun(
  token: string,
  owner: string,
  repo: string,
  headSha: string,
  score: number,
  grade: string,
  riskLevel: string,
  findingCount: number
): Promise<number> {
  const conclusion =
    score >= 75 ? 'success' : score >= 40 ? 'neutral' : 'failure'

  const riskLabel = riskLevel.toUpperCase().replace('-', ' ')

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/check-runs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'Verdict/0.1',
      },
      body: JSON.stringify({
        name: 'Verdict',
        head_sha: headSha,
        status: 'completed',
        conclusion,
        output: {
          title: `${score}/100 · Grade ${grade} · ${riskLabel} RISK`,
          summary:
            findingCount === 0
              ? 'No security findings detected.'
              : `${findingCount} finding${findingCount !== 1 ? 's' : ''} detected. Review the Verdict comment for details.`,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    console.error(`[github] check run failed: ${response.status}`, error)
    return -1
  }

  const data = (await response.json()) as { id: number }
  console.log(`[github] posted check run id=${data.id} conclusion=${conclusion}`)
  return data.id
}
