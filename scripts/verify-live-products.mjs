import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const base = 'https://tempe-segar.ricky99n.workers.dev';
const manifest = JSON.parse(await readFile('content/catalog-products.json', 'utf8'));
const catalog = await (await fetch(base + '/api/catalog')).json();
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  for (const [locale, path] of [
    ['id', '/'],
    ['ko', '/ko'],
    ['en', '/en'],
  ]) {
    await page.goto(base + path);
    assert.equal(await page.locator('.image-illustration-label').count(), 0);
    assert.equal(await page.locator('a[href="/admin"]').count(), 0);
    assert.doesNotMatch(
      await page.locator('body').innerText(),
      /Ilustrasi AI|AI illustration|AI 예시 이미지|Admin toko|Store admin/,
    );
    for (const entry of manifest.products) {
      const product = catalog.products.find((p) => p.sku === entry.sku);
      assert.ok(product, entry.sku);
      assert.equal(product.price_krw, entry.price_krw);
      assert.equal(product.unit_label_id, entry.unit_label_id);
      assert.equal(product.images[0].is_illustration, true);
      assert.equal(product.short_description_id, entry.short_description_id);
      assert.equal(product.description_id, entry.description_id);
      assert.equal(product.images[0].alt_id, entry.alt_id);
      for (const target of ['ko', 'en']) {
        const fields = product.translations[target].fields;
        for (const key of ['name', 'description', 'short_description', 'unit_label'])
          assert.equal(fields[key], entry[target][key]);
        assert.equal(fields[`alt:${product.images[0].id}`], entry[target].alt);
        assert.doesNotMatch(Object.values(fields).join(' '), /\bAI\b|AI로 생성|예시 이미지/);
      }
      const name = locale === 'id' ? entry.name_id : entry[locale].name;
      const card = page
        .locator('.product-card')
        .filter({ has: page.getByRole('heading', { name, exact: true }) });
      await card.waitFor();
      assert.equal(
        await card.locator('.card-price strong').textContent(),
        new Intl.NumberFormat('ko-KR', {
          style: 'currency',
          currency: 'KRW',
          maximumFractionDigits: 0,
        }).format(entry.price_krw),
      );
      await card.locator('img').evaluate(async (image) => {
        await image.decode();
        if (!image.naturalWidth) throw new Error('Image did not load.');
      });
    }
  }
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base + '/');
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `Overflow at ${width}`,
    );
    if (width === 1440 || width === 375)
      await page.screenshot({
        path: `docs/previews/production-products-${width}.png`,
        fullPage: true,
      });
  }
  const tempe = catalog.products.find((p) => p.sku === 'TMP-001');
  await page.goto(base + '/?product=' + tempe.id + '&order=1');
  await page.getByRole('heading', { name: 'Pilih cara pemesanan' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Pesan lewat LINE' }).isDisabled(), true);
  await page.getByLabel('Jumlah', { exact: true }).fill('2');
  assert.equal(await page.locator('.subtotal-row strong').textContent(), '₩20,000');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Buah', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 1);
  assert.equal(await page.locator('.product-card h3').textContent(), 'Pisang');
  assert.deepEqual(errors, []);
  console.log(
    'Four live products verified: three locales, loaded images, no image caption or public admin link, exact KRW prices, five responsive widths, category filter, quantity subtotal and order dialog.',
  );
} finally {
  await browser.close();
}
