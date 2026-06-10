#!/usr/bin/env node
/**
 * trigger-test-pr.mjs
 *
 * Pushes a traceable empty commit to debug949/verdict-test PR #1
 * (branch: feature/add-payment-integration) to fire the GitHub webhook
 * and trigger a fresh Verdict analysis.
 *
 * Requires: gh CLI authenticated with write access to debug949/verdict-test
 *
 * Usage: node scripts/trigger-test-pr.mjs
 */

import { execFileSync, execSync } from 'node:child_process'

const REPO  = 'debug949/verdict-test'
const BRANCH = 'feature/add-payment-integration'

function gh(...args) {
  return execFileSync('gh', args, { encoding: 'utf8' }).trim()
}

// Get current tree SHA for the branch tip
console.log(`Fetching current commit on ${BRANCH}...`)
const branchInfo = JSON.parse(
  gh('api', `repos/${REPO}/branches/${BRANCH}`)
)
const parentSha = branchInfo.commit.sha
const treeSha   = branchInfo.commit.commit.tree.sha
console.log(`  parent SHA: ${parentSha.slice(0, 7)}`)

// Create an empty commit (same tree, new message with timestamp)
const message = `chore: trigger Verdict E2E test [${new Date().toISOString()}]`
console.log(`Creating empty commit: "${message}"`)

const newCommit = JSON.parse(
  gh('api', `repos/${REPO}/git/commits`,
    '--method', 'POST',
    '--field', `message=${message}`,
    '--field', `tree=${treeSha}`,
    '--field', `parents[]=${parentSha}`,
  )
)
const newSha = newCommit.sha
console.log(`  new commit: ${newSha.slice(0, 7)}`)

// Advance the branch ref
console.log(`Advancing ${BRANCH} to ${newSha.slice(0, 7)}...`)
gh('api', `repos/${REPO}/git/refs/heads/${BRANCH}`,
  '--method', 'PATCH',
  '--field', `sha=${newSha}`,
  '--field', 'force=false',
)

console.log('\n✓ Push complete. GitHub webhook will fire in ~2s.')
console.log(`  PR:     https://github.com/${REPO}/pull/1`)
console.log(`  Report: https://verdict-inky.vercel.app/r/debug949/verdict-test/1`)
console.log('\nWatch Vercel logs for: [pipeline] report persisted=true')
