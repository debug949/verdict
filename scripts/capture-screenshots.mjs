/**
 * Captures light + dark screenshots for all 4 tab showcase panels.
 * Each screenshot is taken from the ACTUAL SOURCE PAGE — not from within
 * the landing page tab showcase (which would create a circular dependency).
 *
 * Tab mapping:
 *   showcase  (PR Review)  → landing page hero area, no tab stage
 *   report    (Report)     → report page, top / hero section
 *   findings  (Findings)   → report page, findings section (scrolled)
 *   zones     (Risk Model) → report page, zones/breakdown section (scrolled)
 *
 * Run:  node scripts/capture-screenshots.mjs
 * Env:  BASE_URL (default: http://localhost:3002)
 * Req:  npx playwright install chromium  (once)
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'public', 'screenshots');

const BASE = process.env.BASE_URL || 'http://localhost:3002';
const REPORT = '/r/debug949/verdict-test/1';

async function applyTheme(page, dark) {
  await page.evaluate((d) => {
    const el = document.documentElement;
    if (d) {
      el.setAttribute('data-theme', 'dark');
      localStorage.setItem('verdict-theme', 'dark');
    } else {
      el.removeAttribute('data-theme');
      localStorage.setItem('verdict-theme', 'light');
    }
    const darkVars = {
      '--bg': '#040410', '--surface': '#0a0a1e', '--surface2': '#0e0e26',
      '--border': '#15152d', '--border2': '#1d1d3a',
      '--text': '#f0f0ff', '--fg': '#e8e8f8',
      '--muted': '#45455f', '--muted2': '#7e7ea8',
      '--accent': '#e8304a', '--accent2': '#f87171',
      '--lp-bg': '#0c0c12', '--lp-surface': '#111118',
      '--lp-text': '#e8e8f4', '--lp-text-muted': '#9898b8',
      '--lp-btn-bg': '#f0f0ff', '--lp-btn-text': '#0c0c12',
      '--lp-tab-active-bg': '#1e1e2e', '--lp-tab-active-text': '#e8e8f4',
      '--lp-stage-bg': '#111118',
    };
    const lightVars = {
      '--bg': '#fafafa', '--surface': '#f2f3f5', '--surface2': '#e8e9ec',
      '--border': '#e0e1e8', '--border2': '#d0d1d8',
      '--text': '#1a1a2e', '--fg': '#2d2d3e',
      '--muted': '#9090a8', '--muted2': '#6b7080',
      '--accent': '#e8304a', '--accent2': '#c01f35',
      '--lp-bg': '#F3F4ED', '--lp-surface': '#ffffff',
      '--lp-text': '#1a1a1a', '--lp-text-muted': '#666666',
      '--lp-btn-bg': '#1a1a1a', '--lp-btn-text': '#ffffff',
      '--lp-tab-active-bg': '#ffffff', '--lp-tab-active-text': '#1a1a1a',
      '--lp-stage-bg': '#e5e6df',
    };
    const vars = d ? darkVars : lightVars;
    for (const [k, v] of Object.entries(vars)) {
      el.style.setProperty(k, v);
    }
  }, dark);
  await page.waitForTimeout(600);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const dark of [false, true]) {
    const suffix = dark ? 'dark' : 'light';
    console.log(`\n── Capturing ${suffix.toUpperCase()} mode ──`);

    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();

    // ── showcase (PR Review tab): landing page HERO, no stage visible ─────
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await applyTheme(page, dark);
    // Hide the tab stage so we capture the landing page hero content only
    await page.evaluate(() => {
      const stage = document.querySelector('.lp-showcase');
      if (stage) stage.style.visibility = 'hidden';
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, `showcase-${suffix}.png`),
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    console.log(`  ✓ showcase-${suffix}.png  (landing hero, stage hidden)`);

    // ── report page: hero/overview section ────────────────────────────────
    await page.goto(BASE + REPORT, { waitUntil: 'networkidle', timeout: 30000 });
    await applyTheme(page, dark);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, `report-${suffix}.png`),
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    console.log(`  ✓ report-${suffix}.png  (report page top)`);

    // Full overview alias (used by layout.tsx OG image — keep in sync)
    fs.copyFileSync(
      path.join(OUT, `report-${suffix}.png`),
      path.join(OUT, `report-overview-${suffix}.png`),
    );
    console.log(`  ✓ report-overview-${suffix}.png  (copy of report)`);

    // ── findings section ──────────────────────────────────────────────────
    await page.evaluate(() => {
      // Scroll to the findings section
      const el = document.querySelector('.rpt-finding-list') ||
                 document.querySelector('.rpt-finding-group') ||
                 document.querySelector('.rpt-section');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollBy(0, 700);
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, `findings-${suffix}.png`),
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    console.log(`  ✓ findings-${suffix}.png  (report findings section)`);

    // ── zones/risk-model section ──────────────────────────────────────────
    await page.evaluate(() => {
      const el = document.querySelector('.rpt-zones-list') ||
                 document.querySelector('.rpt-zone-row');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      else window.scrollBy(0, -300);
    });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, `zones-${suffix}.png`),
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    console.log(`  ✓ zones-${suffix}.png  (report zones section)`);

    await ctx.close();
  }

  await browser.close();
  console.log('\n✅ All screenshots saved to public/screenshots/');
  console.log('   All images sourced from actual pages — no circular dependency.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
