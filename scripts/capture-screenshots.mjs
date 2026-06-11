/**
 * Captures light + dark screenshots for all tab showcase panels.
 * Run: node scripts/capture-screenshots.mjs
 * Requires: dev server running on port 3002  (npm run dev -- --port 3002)
 *           AND: npx playwright install chromium  (once)
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'public', 'screenshots');

const BASE = process.env.BASE_URL || 'http://localhost:3002';
const REPORT_PATH = '/r/debug949/verdict-test/1';

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
    // Apply all CSS custom property overrides so React inline vars also update
    const darkVars = {
      '--bg': '#040410', '--surface': '#0a0a1e', '--surface2': '#0e0e26',
      '--border': '#15152d', '--border2': '#1d1d3a',
      '--text': '#f0f0ff', '--fg': '#e8e8f8',
      '--muted': '#45455f', '--muted2': '#7e7ea8',
      '--accent': '#e8304a', '--accent2': '#f87171',
      '--lp-bg': '#0c0c12', '--lp-surface': '#111118',
      '--lp-text': '#e8e8f4', '--lp-text-muted': '#9898b8',
    };
    const lightVars = {
      '--bg': '#fafafa', '--surface': '#f2f3f5', '--surface2': '#e8e9ec',
      '--border': '#e0e1e8', '--border2': '#d0d1d8',
      '--text': '#1a1a2e', '--fg': '#2d2d3e',
      '--muted': '#9090a8', '--muted2': '#6b7080',
      '--accent': '#e8304a', '--accent2': '#c01f35',
      '--lp-bg': '#F3F4ED', '--lp-surface': '#ffffff',
      '--lp-text': '#1a1a1a', '--lp-text-muted': '#666666',
    };
    const vars = d ? darkVars : lightVars;
    for (const [k, v] of Object.entries(vars)) {
      el.style.setProperty(k, v);
    }
  }, dark);
  await page.waitForTimeout(500);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const dark of [false, true]) {
    const suffix = dark ? 'dark' : 'light';
    console.log(`\n── Capturing ${suffix.toUpperCase()} mode ──`);

    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await ctx.newPage();

    // ─── Landing page tabs ─────────────────────────────────────────
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
    await applyTheme(page, dark);

    // PR Review tab (already first / active)
    await page.waitForSelector('.lp-stage', { timeout: 10000 });
    const stage = page.locator('.lp-stage');
    await stage.screenshot({ path: path.join(OUT, `showcase-${suffix}.png`) });
    console.log(`  ✓ showcase-${suffix}.png`);

    // Click Report tab
    await page.click('button:has-text("Report")');
    await page.waitForTimeout(800);
    await stage.screenshot({ path: path.join(OUT, `report-${suffix}.png`) });
    console.log(`  ✓ report-${suffix}.png`);

    // Click Findings tab
    await page.click('button:has-text("Findings")');
    await page.waitForTimeout(800);
    await stage.screenshot({ path: path.join(OUT, `findings-${suffix}.png`) });
    console.log(`  ✓ findings-${suffix}.png`);

    // Click Risk Model tab
    await page.click('button:has-text("Risk Model")');
    await page.waitForTimeout(800);
    await stage.screenshot({ path: path.join(OUT, `zones-${suffix}.png`) });
    console.log(`  ✓ zones-${suffix}.png`);

    // ─── Report page ──────────────────────────────────────────────
    await page.goto(BASE + REPORT_PATH, { waitUntil: 'networkidle', timeout: 30000 });
    await applyTheme(page, dark);

    // Hero / overview
    await page.screenshot({
      path: path.join(OUT, `report-overview-${suffix}.png`),
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
    console.log(`  ✓ report-overview-${suffix}.png`);

    await ctx.close();
  }

  await browser.close();
  console.log('\n✅ All screenshots saved to public/screenshots/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
