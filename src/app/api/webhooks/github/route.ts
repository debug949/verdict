import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/github/webhook'
import { analyzePullRequest } from '@/lib/pipeline'
import type { PullRequestEvent, InstallationEvent, InstallationRepositoriesEvent } from '@/lib/verdict/types'

/**
 * Vercel function timeout — 60 seconds.
 * Requires Vercel Pro. On Hobby, after() callbacks are killed with the response.
 * Set this in vercel.json too:
 *   { "functions": { "src/app/api/webhooks/github/route.ts": { "maxDuration": 60 } } }
 */
export const maxDuration = 60

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  const eventName = request.headers.get('x-github-event')
  const deliveryId = request.headers.get('x-github-delivery')

  // ── 1. Verify signature ─────────────────────────────────────────────────
  let valid: boolean
  try {
    valid = verifyWebhookSignature(rawBody, signature)
  } catch (err) {
    console.error('[webhook] signature check error:', err)
    return NextResponse.json({ error: 'Webhook config error' }, { status: 500 })
  }

  if (!valid) {
    console.warn(`[webhook] rejected delivery=${deliveryId} event=${eventName}`)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // ── 2. Parse payload ────────────────────────────────────────────────────
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── 3. Route event ──────────────────────────────────────────────────────
  switch (eventName) {
    case 'ping':
      console.log('[webhook] ping — configured correctly')
      break

    case 'installation': {
      const event = payload as InstallationEvent
      console.log(
        `[install] action=${event.action}`,
        `id=${event.installation.id}`,
        `account=${event.installation.account.login}`
      )
      if (event.action === 'created') {
        const repos = event.repositories ?? []
        console.log(`[install] repos: ${repos.map((r) => r.full_name).join(', ') || '(none)'}`)
      }
      break
    }

    case 'installation_repositories': {
      const event = payload as InstallationRepositoriesEvent
      const added = event.repositories_added.map((r) => r.full_name)
      const removed = event.repositories_removed.map((r) => r.full_name)
      if (added.length) console.log(`[install-repos] added: ${added.join(', ')}`)
      if (removed.length) console.log(`[install-repos] removed: ${removed.join(', ')}`)
      break
    }

    case 'pull_request': {
      const event = payload as PullRequestEvent
      const { action, pull_request: pr, repository, installation } = event

      const shouldAnalyze = ['opened', 'synchronize', 'reopened'].includes(action)

      console.log(
        `[pr] action=${action}`,
        `repo=${repository.full_name}`,
        `pr=#${pr.number}`,
        `sha=${pr.head.sha.slice(0, 7)}`,
        shouldAnalyze ? '→ queuing analysis' : '→ skipping'
      )

      if (shouldAnalyze) {
        if (!installation?.id) {
          console.error('[webhook] pull_request event missing installation.id — cannot get token')
          break
        }

        const context = {
          installationId: installation.id,
          owner: repository.full_name.split('/')[0],
          repo: repository.full_name.split('/')[1],
          prNumber: pr.number,
          headSha: pr.head.sha,
          prTitle: pr.title,
          prAuthor: pr.user.login,
        }

        // Return 200 to GitHub immediately.
        // after() continues the function after the response is flushed.
        // On Vercel Pro: runs up to maxDuration seconds.
        // On Vercel Hobby: killed with the response — upgrade to Pro for production.
        after(async () => {
          await analyzePullRequest(context)
        })
      }
      break
    }

    default:
      console.log(`[webhook] unhandled event=${eventName}`)
  }

  return NextResponse.json({ ok: true, delivery: deliveryId })
}
