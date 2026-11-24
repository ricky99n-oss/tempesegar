import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await mkdir('docs/previews', { recursive: true });
try {
  for (const [width, columns] of [
    [320, 1],
    [375, 2],
    [768, 3],
    [1024, 4],
    [1440, 4],
  ]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('http://localhost:3000/');
    await page.getByText('MODE DEMO', { exact: false }).waitFor();
    await page.locator('.product-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `overflow at ${width}`,
    );
    assert.equal(
      await page
        .locator('.product-grid')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length),
      columns,
    );
    if (width === 1440 || width === 375)
      await page.screenshot({ path: `docs/previews/demo-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Detail produk: Tempe Segar 500 g' }).click();
  await page.getByRole('dialog').waitFor();
  await page.getByLabel('Jumlah', { exact: true }).fill('3');
  await page.getByRole('dialog').getByRole('button', { name: 'Pesan', exact: true }).click();
  await page.getByRole('heading', { name: 'Pilih cara pemesanan' }).waitFor();
  assert.equal(await page.getByLabel('Jumlah', { exact: true }).inputValue(), '3');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  assert.equal(
    await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement)),
    true,
  );
  await page.getByRole('button', { name: 'Pesan lewat WhatsApp' }).click();
  await page.getByText('Pemesanan dinonaktifkan dalam mode demo.').waitFor();
  await page.screenshot({ path: 'docs/previews/demo-order.png', fullPage: true });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('combobox', { name: 'Bahasa', exact: true }).selectOption('ko');
  await page.waitForURL('**/ko');
  await page.waitForFunction(() => document.documentElement.lang === 'ko');
  await page.getByRole('textbox', { name: '상품명 또는 상품 코드 검색…' }).fill('신선한');
  await page.waitForURL(/q=/);
  await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 2);
  await page.reload();
  assert.equal(await page.locator('.product-card').count(), 2);
  assert.deepEqual(errors, []);
  console.log(
    'Demo verified: five widths, grid columns, keyboard trap, quantity preservation, locale navigation, Korean search and query persistence.',
  );
} finally {
  await browser.close();
}
