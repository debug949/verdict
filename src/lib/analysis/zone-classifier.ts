import type { SecurityZone, DiffFile, ZonedFile } from '@/lib/verdict/types'
import { extractAddedLines } from '@/lib/github/diff'

type ZoneRule = {
  zone: SecurityZone
  patterns: RegExp[]
}

/**
 * Zone rules in priority order — first match wins.
 * TEST comes first so test files are never misclassified as AUTH.
 * PAYMENT/AUTH come before API/DATA to catch specialised files correctly.
 *
 * Patterns are intentionally broad to handle non-standard project structures.
 * False negatives (classifying auth code as GENERAL) are acceptable.
 * False positives (classifying non-auth code as AUTH) are not — they erode trust.
 */
const ZONE_RULES: ZoneRule[] = [
  {
    zone: 'TEST',
    patterns: [
      /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/i,
      /\/(__tests__|__mocks__|fixtures?|e2e|cypress|playwright)\//i,
      /\/tests?\//i,
    ],
  },
  {
    zone: 'PAYMENT',
    patterns: [
      /\/(payment|payments|billing|checkout|stripe|invoice|subscription|commerce)\//i,
      /\/(payment|billing|stripe|checkout|invoice)\.[^/]+$/i,
    ],
  },
  {
    zone: 'AUTH',
    patterns: [
      /\/(auth|authentication|authorization)\//i,
      /\/(session|sessions|jwt|oauth|token|tokens)\//i,
      /\/(middleware|middlewares|guards?)\//i,
      // Common file names regardless of directory
      /\/(auth|session|jwt|oauth|guard|middleware|protect)\.[^/]+$/i,
      /\/middleware\.[^/]+$/i,  // Next.js root middleware file
    ],
  },
  {
    zone: 'ADMIN',
    patterns: [
      /\/(admin|management|backoffice|back-office)\//i,
      /\/admin\.[^/]+$/i,
    ],
  },
  {
    zone: 'API',
    patterns: [
      /\/pages\/api\//i,         // Next.js Pages Router
      /\/app\/api\//i,           // Next.js App Router
      /\/(routes?|controllers?|handlers?|endpoints?)\//i,
      /\/api\//i,
    ],
  },
  {
    zone: 'DATA',
    patterns: [
      /\/(models?|schemas?|entities|repositories?)\//i,
      /\/(prisma|database|db|migrations?|seeds?)\//i,
      /\.(prisma)$/i,
      /\/db\.[^/]+$/i,
    ],
  },
  {
    zone: 'CONFIG',
    patterns: [
      /\.env(\.|$)/i,                         // .env, .env.local, .env.production
      /\/(config|configuration|settings?)\//i,
      /(next|vite|webpack|rollup|tsconfig|eslint|prettier)\.config\./i,
      /\/(vercel\.json|docker-compose\.yml|\.github\/)/i,
    ],
  },
]

/**
 * Classify a single file path into a security zone.
 * Returns 'GENERAL' if no rule matches.
 */
export function classifyFile(filename: string): SecurityZone {
  // Normalise: prepend '/' so patterns like /\/(payment)\// also match
  // root-level directories (e.g. "payment/config.js" → "/payment/config.js").
  const normalised = filename.startsWith('/') ? filename : `/${filename}`
  for (const rule of ZONE_RULES) {
    if (rule.patterns.some((p) => p.test(normalised))) {
      return rule.zone
    }
  }
  return 'GENERAL'
}

/**
 * Classify all diff files and extract their added lines in one pass.
 */
export function classifyFiles(files: DiffFile[]): ZonedFile[] {
  return files.map((file) => ({
    ...file,
    zone: classifyFile(file.filename),
    addedLines: extractAddedLines(file.patch),
  }))
}

// ─── Display helpers ──────────────────────────────────────────────────────

export const ZONE_EMOJI: Record<SecurityZone, string> = {
  AUTH: '🔴',
  PAYMENT: '🔴',
  ADMIN: '🟠',
  API: '🟠',
  DATA: '🟡',
  CONFIG: '🟡',
  TEST: '⚪',
  GENERAL: '⚪',
}

export const ZONE_LABEL: Record<SecurityZone, string> = {
  AUTH: 'Authentication',
  PAYMENT: 'Payment processing',
  ADMIN: 'Admin',
  API: 'API surface',
  DATA: 'Data access',
  CONFIG: 'Configuration',
  TEST: 'Tests',
  GENERAL: 'General',
}

/**
 * Zone-based multiplier applied to finding penalties.
 * A secret in AUTH zone is 2.5× worse than a secret in GENERAL zone.
 * A secret in TEST zone is barely penalised — rarely production risk.
 */
export const ZONE_MULTIPLIER: Record<SecurityZone, number> = {
  AUTH: 2.5,
  PAYMENT: 2.5,
  ADMIN: 2.0,
  API: 1.5,
  DATA: 1.5,
  CONFIG: 1.3,
  GENERAL: 1.0,
  TEST: 0.3,
}
