# Verdict — Merge Risk Engine

> Know what you're merging. Before you merge it.

Verdict is a **GitHub App** that runs a security risk pipeline on every pull request and posts a trust score directly to the PR — before code reaches `main`. It is not an AI code review tool. It is a **deterministic risk engine**: every score is reproducible, every finding is traceable to a specific line in the diff.

**Live demo:** [`verdict-inky.vercel.app`](https://verdict-inky.vercel.app)  
**Test PR:** [`debug949/verdict-test #1`](https://github.com/debug949/verdict-test/pull/1) — real output from a real Verdict analysis  
**Report page:** [`/r/debug949/verdict-test/1`](https://verdict-inky.vercel.app/r/debug949/verdict-test/1)

<img src="./public/screenshots/hero.png" alt="Verdict landing page — Know what you're merging" width="100%">

---

## What Verdict does

Three orthogonal signals are combined into a single 0–100 trust score with an A–F grade:

| Signal | How | Where |
|--------|-----|--------|
| **Secret scanning** | Regex patterns over added lines only | AWS keys, GitHub PATs, Stripe secrets, OpenAI keys, DB URLs, generic API keys |
| **Dependency CVEs** | OSV.dev batch query for newly-added npm packages | Zero requests for unchanged deps |
| **Zone-weighted risk** | Each changed file is classified into a security zone with a score multiplier | AUTH/PAYMENT (2.5×) → TEST (0.3×) |

A secret in `payment/checkout.ts` (PAYMENT zone, 2.5×) penalises the score 2.5× harder than the same secret in a test fixture (TEST zone, 0.3×). Context changes risk.

<img src="./public/screenshots/hero-card.png" alt="Verdict hero card — 0/100 CRITICAL, real findings" width="600">

---

## How it works

```
PR opened / synchronised
       │
       ▼
 Webhook  POST /api/webhooks/github
       │   → 200 returned immediately to GitHub
       │
       ▼   (runs via next/server after())
 Pipeline
 ├── fetchPRFiles        GitHub API — changed files + unified diffs
 ├── classifyFiles       Zone-classify each file (AUTH / PAYMENT / API / …)
 ├── scanSecrets         Regex credential detection — added lines only
 ├── auditDependencies   OSV.dev CVE lookup for newly-added npm packages
 ├── calculateTrustScore Zone-weighted score with diminishing returns
 ├── postVerdictReview   GitHub PR review — summary + inline comments on flagged lines
 ├── postCheckRun        GitHub check run — shows in PR status bar (pass/fail)
 └── saveReport          Persist StoredReport to Upstash Redis (30-day TTL)
```

The pipeline runs **after** the 200 response is sent to GitHub, so webhook delivery never times out regardless of analysis duration.

<img src="./public/screenshots/how-it-works.png" alt="How Verdict works — three steps" width="100%">

---

## Security zones

Every changed file is classified into a zone. Zone multipliers are applied to finding penalties — the same secret scores differently depending on where it lives.

| Zone | Multiplier | Matches |
|------|-----------|---------|
| AUTH | **2.5×** | `auth/`, `session/`, `jwt/`, `oauth/`, `middleware/`, `guard/` |
| PAYMENT | **2.5×** | `payment/`, `billing/`, `checkout/`, `stripe/`, `invoice/` |
| ADMIN | **2.0×** | `admin/`, `management/`, `backoffice/` |
| API | **1.5×** | `app/api/`, `pages/api/`, `routes/`, `controllers/` |
| DATA | **1.5×** | `models/`, `prisma/`, `db/`, `migrations/` |
| CONFIG | **1.3×** | `.env*`, `config/`, `settings/`, `*.config.*` |
| GENERAL | **1.0×** | Everything else |
| TEST | **0.3×** | `*.test.*`, `*.spec.*`, `__tests__/`, `fixtures/` |

Classification uses the file path only — no AST parsing, no heuristics. Matches are deterministic and fast.

---

## Report page

Every analysis is persisted to Upstash Redis and viewable at:

```
https://<your-domain>/r/<owner>/<repo>/<pr-number>
```

The report page shows the full structured output: trust score ring, risk narrative, zone breakdown with impact labels, all findings with file/line references, risk distribution chart, and per-file stats. The report is server-rendered from the stored `StoredReport` — no client-side fetching.

<img src="./public/screenshots/report-overview.png" alt="Verdict report page — full overview" width="100%">

<img src="./public/screenshots/report-hero.png" alt="Verdict report — score ring, 0/100, Grade F, CRITICAL" width="100%">

Reports expire after 30 days. If a report is not found (analysis still running, expired, or KV not configured), the page shows a graceful not-found state.

---

## Zone breakdown

<img src="./public/screenshots/report-zones.png" alt="Verdict zone breakdown — PAYMENT 2.5×" width="100%">

---

## Real output

The test PR [`debug949/verdict-test #1`](https://github.com/debug949/verdict-test/pull/1) contains:
- `payment/config.js` — hardcoded AWS access key (`AKIA****`) and API key (`api_****`)
- `package.json` — adds `lodash@4.17.20` (5 CVEs) and `express@4.18.2` (2 CVEs)

**Result:** Score 0/100 · Grade F · CRITICAL · 2 secrets · 7 CVEs · 9 findings total

The PAYMENT zone multiplier (2.5×) applied to the secrets drives the score to zero.

<img src="./public/screenshots/report-findings.png" alt="Verdict findings — CRITICAL AWS key, HIGH API key" width="100%">

---

## GitHub integration

<img src="./public/screenshots/showcase.png" alt="Verdict — GitHub PR review and report page side by side" width="100%">

---

## Setup

### 1. Create a GitHub App

1. **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set:
   - **Homepage URL**: your deployment URL (`https://getverdict.dev`)
   - **Webhook URL**: `https://<your-domain>/api/webhooks/github`
   - **Webhook secret**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Repository permissions**: Pull requests → Read & write · Checks → Read & write · Contents → Read
4. **Subscribe to events**: Pull request · Installation · Installation repositories
5. **Create GitHub App**

### 2. Generate a private key

App settings page → **Private keys** → **Generate a private key**. Encode the downloaded `.pem`:

```bash
base64 -i your-app.private-key.pem | tr -d '\n'
```

### 3. Provision Upstash Redis

1. [console.upstash.com](https://console.upstash.com) → **Create Database** (Regional, free tier)
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from the **REST API** tab

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

```env
GITHUB_APP_ID=              # numeric ID from app settings page
GITHUB_APP_PRIVATE_KEY=     # base64-encoded PEM from step 2
GITHUB_WEBHOOK_SECRET=      # secret from step 1
NEXT_PUBLIC_APP_URL=        # https://your-domain (no trailing slash)
UPSTASH_REDIS_REST_URL=     # https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=   # token from Upstash dashboard
```

> **Vercel env vars:** Do not set `GITHUB_APP_PRIVATE_KEY` via `echo "..." | vercel env add` in PowerShell — PowerShell 5.1 prepends a UTF-8 BOM that corrupts the value. Use `vercel env add` interactively (type the value at the prompt) or use the Vercel dashboard.

### 5. Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

> **Vercel Pro required** for the full `maxDuration` window on `after()`. On Hobby, the serverless function may be killed before the pipeline completes on larger PRs. Upgrade to Pro for production use.

### 6. Install the GitHub App

**GitHub → Settings → Developer settings → GitHub Apps → [your app] → Install App** → choose repos.

### 7. Open a PR

Push to a watched repo. Within seconds:
- A **Verdict review comment** appears on the PR with score, narrative, zone table, and risk factors
- A **Verdict check run** appears in the PR status checks
- A **full report** is available at `https://your-domain/r/<owner>/<repo>/<pr-number>`

---

## Local development

```bash
npm install
npm run dev
```

To receive GitHub webhooks locally, use [smee.io](https://smee.io) or [ngrok](https://ngrok.com):

```bash
npx smee-client --url https://smee.io/<channel> --target http://localhost:3000/api/webhooks/github
```

---

## Project structure

```
src/
├── app/
│   ├── api/webhooks/github/route.ts        Webhook handler — HMAC verify, event dispatch
│   ├── r/[owner]/[repo]/[prNumber]/
│   │   ├── page.tsx                         Full report page (server component)
│   │   └── not-found.tsx                    Graceful not-found state
│   ├── layout.tsx
│   └── page.tsx                             Landing page
│
└── lib/
    ├── github/
    │   ├── app.ts          RS256 JWT → installation access token exchange
    │   ├── comment.ts      Post PR review + inline comments + check run
    │   ├── diff.ts         Fetch PR files, parse unified diff, extract added lines
    │   └── webhook.ts      HMAC-SHA256 signature verification (timing-safe)
    ├── analysis/
    │   ├── zone-classifier.ts   File path → SecurityZone (8 zones, priority-ordered rules)
    │   ├── secret-scanner.ts    Regex credential detection over added lines
    │   └── dep-auditor.ts       OSV.dev batch CVE lookup for new npm packages
    ├── risk/
    │   └── scorer.ts            Zone-weighted trust score + blast radius estimation
    ├── store/
    │   └── report.ts            saveReport() / loadReport() — Upstash Redis abstraction
    ├── verdict/
    │   ├── comment.ts           Format PR review markdown + inline finding comments
    │   └── types.ts             Shared TypeScript types (StoredReport, Finding, ZoneImpact, …)
    └── pipeline.ts              Orchestrate full analysis — Phases 1–5
```

---

## Architecture notes

**Failure isolation.** `saveReport()` returns `boolean` (never throws). `loadReport()` returns `StoredReport | null` (never throws). A KV failure never breaks PR reviews or check runs — those complete in Phase 4 before Phase 5 (persistence) runs.

**Schema versioning.** `StoredReport` carries `schemaVersion: 1`. `loadReport()` returns `null` if the version doesn't match, so stale reports from old deploys show a not-found page rather than crashing.

**Zone classification.** All patterns require a normalised path (leading `/` prepended) so `payment/config.js` at repo root classifies as PAYMENT, not GENERAL.

**Secret scanning scope.** Only added lines (`+` in the diff) are scanned. Unchanged secrets that already exist in the codebase are not re-reported on every PR.

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_APP_ID` | Yes | Numeric GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | Yes | Base64-encoded RSA private key PEM |
| `GITHUB_WEBHOOK_SECRET` | Yes | HMAC-SHA256 webhook secret |
| `NEXT_PUBLIC_APP_URL` | Yes | Public deployment URL — no trailing slash |
| `UPSTASH_REDIS_REST_URL` | Recommended | Upstash Redis REST URL — reports degrade gracefully without it |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Upstash Redis REST token |
