import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base = 'https://tempe-segar.ricky99n.workers.dev';
for (const path of ['/', '/ko', '/en', '/admin/login', '/api/catalog', '/sitemap.xml']) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  if (path === '/api/catalog') {
    const data = await response.json();
    assert.equal(data.demo, false);
  }
}
const blocked = await fetch(base + '/api/admin/settings', {
  method: 'PATCH',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: '{}',
});
assert.equal(blocked.status, 401);
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await mkdir('docs/previews', { recursive: true });
try {
  for (const [path, locale] of [
    ['/', 'id'],
    ['/ko', 'ko'],
    ['/en', 'en'],
  ]) {
    await page.goto(base + path);
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), base + path);
    assert.equal(await page.locator('.demo-notice').count(), 0);
  }
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + '/');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    if (width === 1440 || width === 375)
      await page.screenshot({ path: `docs/previews/production-${width}.png`, fullPage: true });
  }
  await page.getByRole('combobox', { name: 'Bahasa', exact: true }).selectOption('ko');
  await page.waitForURL(base + '/ko');
  await page.waitForFunction(() => document.documentElement.lang === 'ko');
  await page.goto(base + '/admin');
  await page.waitForURL(base + '/admin/login');
  assert.deepEqual(errors, []);
  console.log(
    'Production verified: SSR locales, canonical URLs, five widths, locale navigation, protected admin, and no demo mode or browser errors.',
  );
} finally {
  await browser.close();
}
