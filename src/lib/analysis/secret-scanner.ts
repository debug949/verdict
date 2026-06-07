import type { Finding, ZonedFile } from '@/lib/verdict/types'

type SecretRule = {
  id: string
  name: string
  /** Applied to the full line content */
  pattern: RegExp
  baseSeverity: Finding['severity']
}

/**
 * Secret detection rules — ordered by specificity.
 * Each rule matches a specific credential type. We use regex, not entropy,
 * to keep false positive rate at zero. Entropy sounds clever; it generates
 * constant noise on base64 images, UUIDs, and minified code.
 */
const SECRET_RULES: SecretRule[] = [
  {
    id: 'aws-access-key',
    name: 'AWS access key',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    baseSeverity: 'critical',
  },
  {
    id: 'aws-secret-key',
    name: 'AWS secret key',
    pattern: /aws[_.-]?secret[_.-]?(?:access[_.-]?)?key\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/i,
    baseSeverity: 'critical',
  },
  {
    id: 'github-pat',
    name: 'GitHub personal access token',
    pattern: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{36,255}\b/,
    baseSeverity: 'critical',
  },
  {
    id: 'private-key-header',
    name: 'Private key',
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
    baseSeverity: 'critical',
  },
  {
    id: 'stripe-secret',
    name: 'Stripe secret key',
    pattern: /\bsk_live_[A-Za-z0-9]{24,}\b/,
    baseSeverity: 'critical',
  },
  {
    id: 'stripe-restricted',
    name: 'Stripe restricted key',
    pattern: /\brk_live_[A-Za-z0-9]{24,}\b/,
    baseSeverity: 'high',
  },
  {
    id: 'groq-key',
    name: 'Groq API key',
    pattern: /\bgsk_[A-Za-z0-9]{50,}\b/,
    baseSeverity: 'high',
  },
  {
    id: 'openai-key',
    name: 'OpenAI API key',
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/,
    baseSeverity: 'high',
  },
  {
    id: 'database-url-with-creds',
    name: 'Database URL with credentials',
    // Matches postgresql://user:password@host/db (not postgresql://user@host)
    pattern: /(?:postgresql|mysql|mongodb(?:\+srv)?|redis(?:s)?):\/\/[^:@\s]+:[^@\s]+@[^/\s'"]+/i,
    baseSeverity: 'critical',
  },
  {
    id: 'hardcoded-api-key',
    name: 'Hardcoded API key',
    // Matches: apiKey: "abc123...", api_key = "xyz...", SECRET: "..."
    // Excludes process.env and env() references (those are fine)
    pattern: /(?:api[_-]?key|api[_-]?secret|client[_-]?secret|access[_-]?token)\s*[:=]\s*['"]([A-Za-z0-9_\-]{20,})['"](?!\s*\|\|)/i,
    baseSeverity: 'high',
  },
]

/**
 * Scan zone-classified files for secrets in added lines only.
 *
 * Only scans added lines — we won't re-flag secrets that existed before this PR.
 * Skips TEST zone entirely — test fixtures legitimately contain fake credentials.
 *
 * Zone context affects the severity label in the finding description
 * (actual score penalty is applied later in the scorer, not here).
 */
export function scanSecrets(files: ZonedFile[]): Finding[] {
  const findings: Finding[] = []

  for (const file of files) {
    // Skip test files — fake credentials in fixtures are expected and fine
    if (file.zone === 'TEST') continue

    // Skip removed files — we only care about what's being introduced
    if (file.status === 'removed') continue

    for (const line of file.addedLines) {
      for (const rule of SECRET_RULES) {
        const match = line.content.match(rule.pattern)
        if (!match) continue

        // Build a safe preview: first 4 chars of the matched string + ****
        const matched = match[0]
        const preview =
          matched.length > 8
            ? `${matched.slice(0, 4)}${'*'.repeat(4)}`
            : '*'.repeat(8)

        findings.push({
          type: 'secret',
          severity: rule.baseSeverity,
          zone: file.zone,
          file: file.filename,
          lineNumber: line.lineNumber,
          title: `${rule.name} detected`,
          description:
            `A ${rule.name.toLowerCase()} was found in \`${file.filename}\`` +
            (file.zone !== 'GENERAL'
              ? ` — a **${file.zone} zone** file`
              : '') +
            `. Rotate this credential immediately and remove it from git history.`,
          fix:
            'Store credentials in environment variables only. ' +
            'Run `git filter-repo` or contact GitHub support to purge from history.',
          preview,
        })

        // One finding per line per file — don't pile on with every matching rule
        break
      }
    }
  }

  return findings
}
