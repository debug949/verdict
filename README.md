# Verdict

> Know what you're merging before you merge it.

Verdict is a GitHub App that analyses every pull request and posts a risk verdict as a PR review. It scans for leaked secrets, audits newly-added npm packages against [OSV.dev](https://osv.dev), classifies changed files by security zone, and produces a trust score (0–100) with an A–F grade.

![Verdict comment screenshot](screenshots/verdict-comment.png)

---

## How it works

```
PR opened / synchronised
        │
        ▼
  Webhook (POST /api/webhooks/github)
        │   returns 200 immediately
        │
        ▼  (runs via next/server `after()`)
  Pipeline
  ├── fetchPRFiles        — GitHub API: list changed files + diffs
  ├── classifyFiles       — zone-classify each file (AUTH / PAYMENT / API / …)
  ├── scanSecrets         — regex-based credential detection (added lines only)
  ├── auditDependencies   — OSV.dev CVE lookup for new npm packages
  ├── calculateTrustScore — zone-weighted score with diminishing returns
  └── postVerdictReview   — GitHub PR review (summary + inline comments)
      postCheckRun        — GitHub check run (shows in status bar)
```

---

## Setup

### 1. Create a GitHub App

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
2. Fill in:
   - **App name**: `Verdict` (or any unique name)
   - **Homepage URL**: your Vercel deployment URL (e.g. `https://getverdict.dev`)
   - **Webhook URL**: `https://<your-domain>/api/webhooks/github`
   - **Webhook secret**: generate one — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. **Repository permissions**:
   - Pull requests → **Read & write** (to post review comments)
   - Checks → **Read & write** (to post check runs)
   - Contents → **Read** (to read diffs)
4. **Subscribe to events**: `Pull request`, `Installation`, `Installation repositories`
5. Click **Create GitHub App**

### 2. Generate a private key

On the app settings page, scroll to **Private keys** → **Generate a private key**. A `.pem` file will download.

Encode it for the environment variable:
```bash
base64 -i your-app.private-key.pem | tr -d '\n'
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

```env
GITHUB_APP_ID=          # numeric ID shown on the app settings page
GITHUB_APP_PRIVATE_KEY= # base64-encoded PEM from step 2
GITHUB_WEBHOOK_SECRET=  # the secret from step 1
NEXT_PUBLIC_APP_URL=https://<your-domain>
```

### 4. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add the four environment variables in the Vercel project dashboard under **Settings → Environment Variables**.

> **Note:** `after()` (used to run analysis after the 200 response) requires **Vercel Pro** for the full `maxDuration: 60` window. On Hobby the callback is killed with the response — analysis will fail silently on slow PRs. Upgrade to Pro for production use.

### 5. Install the app on a repo

Go to **GitHub → Settings → Developer settings → GitHub Apps → [your app] → Install App**. Choose the repos you want Verdict to watch.

### 6. Open a PR

Open or push to an existing PR on an installed repo. Within a few seconds you'll see:
- A **Verdict review comment** on the PR with trust score, zone table, and risk factors
- A **Verdict check run** in the PR status bar

---

## Local development

```bash
npm install
npm run dev
```

To test the webhook locally, use [smee.io](https://smee.io) or [ngrok](https://ngrok.com) to forward GitHub events to `localhost:3000/api/webhooks/github`.

```bash
npx smee-client --url https://smee.io/<your-channel> --target http://localhost:3000/api/webhooks/github
```

---

## Project structure

```
src/
├── app/
│   ├── api/webhooks/github/route.ts   — webhook handler
│   ├── r/[owner]/[repo]/[prNumber]/   — report page (stub)
│   ├── layout.tsx
│   └── page.tsx
└── lib/
    ├── github/
    │   ├── app.ts       — JWT + installation token
    │   ├── comment.ts   — post PR review + check run
    │   ├── diff.ts      — fetch PR files, parse unified diff
    │   └── webhook.ts   — HMAC-SHA256 signature verification
    ├── analysis/
    │   ├── zone-classifier.ts  — classify files into security zones
    │   ├── secret-scanner.ts   — regex credential detection
    │   └── dep-auditor.ts      — OSV.dev CVE lookup
    ├── risk/scorer.ts          — zone-weighted trust score
    ├── verdict/
    │   ├── comment.ts          — format PR review markdown
    │   └── types.ts            — shared TypeScript types
    └── pipeline.ts             — orchestrate the full analysis
```

---

## Screenshots

> **Reminder:** update `screenshots/` whenever the comment format or landing page is redesigned so the portfolio stays current.

Add screenshots to the `screenshots/` folder and reference them in this README.

---

## Environment variables reference

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | Numeric GitHub App ID |
| `GITHUB_APP_PRIVATE_KEY` | Base64-encoded RSA private key PEM |
| `GITHUB_WEBHOOK_SECRET` | HMAC-SHA256 webhook secret |
| `NEXT_PUBLIC_APP_URL` | Public deployment URL (no trailing slash) |
