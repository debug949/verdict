# Verdict — TODO & Project State

## Status snapshot — 2026-06-08

| Item | Status |
|------|--------|
| GitHub App created & installed | ✅ Done |
| Webhook signature verification | ✅ Done |
| Pipeline end-to-end verified | ✅ Done |
| Real Verdict review posted on real PR | ✅ Done |
| Landing page deployed | ✅ Done |
| Real screenshots on landing page | ⬜ Pending |
| Vercel Pro (full `after()` window) | ⬜ Optional |

---

## Key URLs

| Resource | URL |
|----------|-----|
| **Deployed app** | https://verdict-inky.vercel.app |
| **Test PR (first verified Verdict review)** | https://github.com/debug949/verdict-test/pull/1 |
| **GitHub App install page** | https://github.com/apps/verdict-diff |
| **Vercel project** | https://vercel.com/debug949s-projects/verdict |

---

## Immediate TODOs

### 1. Real screenshots for landing page
`src/app/page.tsx` has four `screenshot-placeholder` divs with dashed borders.
Replace with actual screenshots from the test PR above.

**Screenshots needed (save to `screenshots/`):**
- `pr-comment.png` — the full Verdict review comment body on the PR
- `inline-comment.png` — inline annotation on `payment/config.js`
- `check-run.png` — the GitHub check run showing `failure` conclusion
- `score-breakdown.png` — the 🔴 CRITICAL / 16/100 / Grade F score header

After saving, update `page.tsx` to use Next.js `<Image>` components instead of the placeholder divs.
Redeploy with `vercel --prod`.

**Rule:** Update `screenshots/` and the README screenshot section every time the comment format or landing page is redesigned. Portfolio stays current.

---

## Next session checklist

**Start with an audit before writing any code:**

1. Read `src/lib/pipeline.ts`, `src/lib/github/comment.ts`, `src/lib/analysis/secret-scanner.ts`, `src/lib/analysis/dep-auditor.ts`, `src/lib/risk/scorer.ts`
2. List highest-impact improvements ranked by value (e.g. false-positive rate, UX, reliability, performance)
3. Get approval on the list before touching any file

**Known areas to investigate (do not fix blindly — audit first):**

- `comment.ts` — inline comment `line` field vs `position` field in GitHub Reviews API response; comments are posting but worth verifying line numbers are correct in the UI
- `dep-auditor.ts` — OSV.dev query currently fires for every newly-added package; check if batch endpoint would be faster
- `secret-scanner.ts` — regex patterns cover AWS/GitHub/Stripe/OpenAI/DB URLs; consider adding Twilio, Slack, SendGrid
- `scorer.ts` — diminishing returns curve; verify the math produces sensible scores across edge cases (0 findings, 50 findings)
- `pipeline.ts` — `after()` on Vercel Hobby has a tight execution window; consider adding a timeout guard so partial results are posted rather than nothing

---

## Environment variables (all set in Vercel)

| Variable | Notes |
|----------|-------|
| `GITHUB_APP_ID` | `3990249` |
| `GITHUB_APP_PRIVATE_KEY` | Base64-encoded PEM — 2240 chars |
| `GITHUB_WEBHOOK_SECRET` | 64-char hex string |
| `NEXT_PUBLIC_APP_URL` | `https://verdict-inky.vercel.app` |

⚠️ All four were originally set via PowerShell pipe which prepended a UTF-8 BOM (U+FEFF).
All four have been re-set via the Vercel REST API using a Node.js script to avoid the BOM.
If any env var is ever updated, use the REST API script pattern — never pipe values through PowerShell.

---

## Architecture notes (for future sessions)

```
src/
  app/
    api/webhooks/github/route.ts   — webhook entry point, calls after()
    r/[owner]/[repo]/[prNumber]/   — stub report page (full dashboard TBD)
    page.tsx                       — landing page
    layout.tsx                     — root layout, imports globals.css
    globals.css                    — all styles, CSS custom props, animations
  lib/
    github/
      app.ts        — JWT creation, installation token exchange
      diff.ts       — fetchPRFiles (GitHub REST API)
      comment.ts    — postVerdictReview, postCheckRun
      webhook.ts    — HMAC-SHA256 signature verification
    analysis/
      zone-classifier.ts  — classifies files into AUTH/PAYMENT/ADMIN/API/DATA/CONFIG/TEST/GENERAL
      secret-scanner.ts   — regex patterns over added lines
      dep-auditor.ts      — OSV.dev CVE lookup for newly-added packages
    risk/
      scorer.ts           — zone-weighted trust score (0–100, A–F)
    verdict/
      comment.ts          — formatVerdictComment (markdown)
      types.ts            — shared TypeScript interfaces
    pipeline.ts           — orchestrates phases 1–4
```

No database. No queue. No external state. Purely webhook-driven.
`after()` from `next/server` lets the pipeline run after the 200 response is sent to GitHub.
