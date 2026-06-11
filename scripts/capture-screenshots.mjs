/**
 * Capture README screenshots from the live dev server (redesigned site).
 * Run: node scripts/capture-screenshots.mjs
 * Requires: dev server running on port 3002
 */

import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '../public/screenshots')
mkdirSync(OUT, { recursive: true })

const BASE   = 'http://localhost:3002'
const REPORT = 'https://verdict-inky.vercel.app/r/debug949/verdict-test/1'

async function shot(page, name, opts = {}) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, ...opts })
  console.log(`  ✓  ${name}.png`)
}

async function main() {
  console.log('\n▲ Verdict screenshot capture (redesign)\n')

  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()

  // ── Landing page ────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)   // let motion animations settle

  // 1. hero.png — full viewport
  await shot(page, 'hero', { fullPage: false })

  // 2. hero-card.png — tab showcase stage close-up
  const stage = await page.locator('.lp-stage').boundingBox()
  if (stage) {
    await page.screenshot({
      path: join(OUT, 'hero-card.png'),
      clip: {
        x: Math.max(0, stage.x - 2),
        y: Math.max(0, stage.y - 2),
        width:  stage.width  + 4,
        height: stage.height + 4,
      },
    })
    console.log('  ✓  hero-card.png')
  }

  // 3. how-it-works.png — hero text + badge area
  const heroInner = await page.locator('.lp-hero-inner').boundingBox()
  if (heroInner) {
    await page.screenshot({
      path: join(OUT, 'how-it-works.png'),
      clip: {
        x: 0,
        y: Math.max(0, heroInner.y - 20),
        width:  1280,
        height: Math.min(580, heroInner.height),
      },
    })
    console.log('  ✓  how-it-works.png')
  }

  // 4. showcase.png — PR Review tab of the tab showcase
  // Make sure PR Review tab is active (it's the default), then capture stage
  await page.locator('.lp-tab-btn').first().click()
  await page.waitForTimeout(500)
  const showcaseStage = await page.locator('.lp-stage').boundingBox()
  const tabBar = await page.locator('.lp-tab-bar').boundingBox()
  if (showcaseStage && tabBar) {
    await page.screenshot({
      path: join(OUT, 'showcase.png'),
      clip: {
        x: Math.max(0, tabBar.x - 8),
        y: Math.max(0, tabBar.y - 8),
        width:  tabBar.width + 16,
        height: (showcaseStage.y + showcaseStage.height) - tabBar.y + 16,
      },
    })
    console.log('  ✓  showcase.png')
  }

  // ── Report page ─────────────────────────────────────────────────
  await page.goto(REPORT, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // 5. report-overview.png — full viewport
  await shot(page, 'report-overview', { fullPage: false })

  // 6. report-hero.png — score ring + stats
  const rptHero = await page.locator('.rpt-hero').boundingBox()
  if (rptHero) {
    await page.screenshot({
      path: join(OUT, 'report-hero.png'),
      clip: { x: 0, y: rptHero.y - 8, width: 1280, height: rptHero.height + 24 },
    })
    console.log('  ✓  report-hero.png')
  }

  // 7. report-zones.png — zone breakdown
  const zones = await page.locator('.rpt-zones-list').boundingBox()
  if (zones) {
    await page.screenshot({
      path: join(OUT, 'report-zones.png'),
      clip: { x: 0, y: zones.y - 60, width: 1280, height: zones.height + 80 },
    })
    console.log('  ✓  report-zones.png')
  }

  // 8. report-findings.png — findings list
  const firstFinding = await page.locator('.rpt-finding-card').first()
  await firstFinding.scrollIntoViewIfNeeded()
  await page.evaluate(() => window.scrollBy(0, -120))
  await page.waitForTimeout(300)
  await shot(page, 'report-findings', { fullPage: false })

  await browser.close()
  console.log('\n✅ Done — 8 screenshots saved to public/screenshots/\n')
}

main().catch(e => { console.error(e); process.exit(1) })
