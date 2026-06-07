import type { DiffFile, AddedLine } from '@/lib/verdict/types'

interface GitHubPRFile {
  filename: string
  previous_filename?: string
  status: string
  additions: number
  deletions: number
  patch?: string
}

/**
 * Fetch the list of changed files for a pull request from the GitHub API.
 * Uses per_page=100 — PRs with 100+ files will be partially analysed.
 * Good enough for MVP: very large PRs should be reviewed manually anyway.
 */
export async function fetchPRFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<DiffFile[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Verdict/0.1',
      },
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`fetchPRFiles failed: ${response.status} ${response.statusText}\n${body}`)
  }

  const files = (await response.json()) as GitHubPRFile[]

  return files.map((f) => ({
    filename: f.filename,
    previousFilename: f.previous_filename,
    status: f.status as DiffFile['status'],
    additions: f.additions,
    deletions: f.deletions,
    patch: f.patch,
  }))
}

/**
 * Extract added lines from a unified diff patch, tracking accurate new-file
 * line numbers from hunk headers.
 *
 * Unified diff format:
 *   @@ -old_start,old_count +new_start,new_count @@ optional context
 *   (space) context line — advances new-file counter
 *   -       removed line — does NOT advance new-file counter
 *   +       added line   — advances new-file counter; this is what we want
 *
 * Why accurate line numbers matter: GitHub's inline comment API requires
 * the exact line number in the new file. Wrong numbers → comment rejected.
 */
export function extractAddedLines(patch: string | undefined): AddedLine[] {
  if (!patch) return []

  const lines = patch.split('\n')
  const result: AddedLine[] = []
  let newFileLine = 0

  for (const line of lines) {
    // Hunk header: @@ -old +new @@ — resets line counter
    const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) {
      newFileLine = parseInt(hunk[1], 10) - 1
      continue
    }

    if (line.startsWith('+') && !line.startsWith('+++')) {
      // Added line
      newFileLine++
      result.push({ lineNumber: newFileLine, content: line.slice(1) })
    } else if (line.startsWith(' ')) {
      // Context line — advances new-file counter but is not an added line
      newFileLine++
    }
    // Lines starting with '-' are removed — don't advance new-file counter
  }

  return result
}
