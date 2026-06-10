#!/usr/bin/env node
/**
 * set-upstash-env.mjs
 *
 * Sets UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the Vercel
 * project (production environment) without PowerShell BOM corruption.
 *
 * PowerShell 5.1 adds a UTF-8 BOM (U+FEFF) when piping values to native
 * executables, which silently corrupts credentials. This script uses
 * Node.js child_process to pipe the values directly — no BOM.
 *
 * Usage:
 *   node scripts/set-upstash-env.mjs <UPSTASH_REDIS_REST_URL> <UPSTASH_REDIS_REST_TOKEN>
 *
 * Example:
 *   node scripts/set-upstash-env.mjs https://us1-xxx.upstash.io AQxxxxx...
 */

import { execFileSync } from 'node:child_process'

const [, , url, token] = process.argv

if (!url || !token) {
  console.error('Usage: node scripts/set-upstash-env.mjs <UPSTASH_REDIS_REST_URL> <UPSTASH_REDIS_REST_TOKEN>')
  console.error('')
  console.error('Get these values from: https://console.upstash.com → your database → REST API tab')
  process.exit(1)
}

if (!url.startsWith('https://')) {
  console.error('Error: UPSTASH_REDIS_REST_URL must start with https://')
  process.exit(1)
}

if (url.includes('﻿') || token.includes('﻿')) {
  console.error('Error: BOM character detected in arguments — paste values directly, do not pipe from PowerShell echo')
  process.exit(1)
}

function setEnvVar(name, value) {
  process.stdout.write(`  Setting ${name} ... `)
  try {
    execFileSync('vercel', ['env', 'add', name, 'production'], {
      input: value + '\n',
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
    })
    console.log('✓')
  } catch (err) {
    // vercel env add exits non-zero if the var already exists and user
    // hasn't confirmed overwrite — rerun with --force or remove first
    const output = (err.stdout ?? '') + (err.stderr ?? '')
    if (output.includes('already exists')) {
      console.log('already exists — removing and re-adding...')
      execFileSync('vercel', ['env', 'rm', name, 'production', '--yes'], {
        stdio: 'inherit',
        encoding: 'utf8',
      })
      execFileSync('vercel', ['env', 'add', name, 'production'], {
        input: value + '\n',
        stdio: ['pipe', 'inherit', 'inherit'],
        encoding: 'utf8',
      })
      console.log(`  ✓ ${name} replaced`)
    } else {
      console.error(`FAILED: ${output}`)
      process.exit(1)
    }
  }
}

console.log('\nSetting Upstash Redis env vars on Vercel (production)...\n')
setEnvVar('UPSTASH_REDIS_REST_URL', url)
setEnvVar('UPSTASH_REDIS_REST_TOKEN', token)

console.log('\n✓ Both env vars set. Next steps:')
console.log('  1. vercel env pull .env.local   ← pull to local for verification')
console.log('  2. vercel --prod                ← redeploy with new vars active')
