import { test, expect } from '@playwright/test';
import { demoCatalog } from '../../lib/demo';
test('public catalog has Indonesian default, locale routes and blocks admin mutations', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.getByRole('heading', { name: 'Katalog produk.' })).toBeVisible();
  await page.goto('/ko');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.getByRole('heading', { name: '상품 목록.' })).toBeVisible();
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  for (const path of [
    'products',
    'categories',
    'featured',
    'settings',
    'media',
    'products/00000000-0000-4000-8000-000000000001/translate',
  ]) {
    const r = await request.post('/api/admin/' + path, {
      data: {},
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(r.status()).toBe(401);
  }
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});

test('admin category, manual translations, featured slot and LINE settings persist', async ({
  page,
  request,
}) => {
  test.skip(!process.env.E2E_PASSWORD, 'Requires explicitly prepared local test identity.');
  const headers = { Origin: 'http://localhost:3000' };
  const login = await request.post('/api/auth/login', {
    headers,
    data: { email: 'local-test@example.invalid', password: process.env.E2E_PASSWORD },
  });
  expect(login.status()).toBe(200);
  const suffix = Date.now().toString();
  const catResponse = await request.post('/api/admin/categories', {
    headers,
    data: {
      name_id: `Kategori uji ${suffix}`,
      slug: `category-${suffix}`,
      sort_order: 1,
      is_active: true,
      revision: 0,
    },
  });
  expect(catResponse.status()).toBe(201);
  const category = await catResponse.json();
  await page.goto('/');
  const image = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 80;
      c.height = 80;
      return c.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
  const invalid = await request.post('/api/admin/media', {
    headers,
    multipart: {
      file: {
        name: 'invalid.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      },
    },
  });
  expect(invalid.status()).toBe(422);
  const mediaResponse = await request.post('/api/admin/media', {
    headers,
    multipart: { file: { name: 'fixture.png', mimeType: 'image/png', buffer: image } },
  });
  expect(mediaResponse.status()).toBe(201);
  const media = await mediaResponse.json();
  const productResponse = await request.post('/api/admin/products', {
    headers,
    data: {
      ...demoCatalog().products[0],
      id: undefined,
      sku: `API-${suffix}`,
      slug: `api-${suffix}`,
      name_id: `Produk API ${suffix}`,
      images: [{ ...media, alt_id: 'Foto uji lokal' }],
      category_id: category.id,
      revision: 0,
    },
  });
  expect(productResponse.status()).toBe(201);
  let product = await productResponse.json();
  const translation = {
    locale: 'ko',
    fields: {
      name: '수동 템페',
      short_description: '테스트',
      description: '테스트 상품',
      unit_label: '500 g',
      [`alt:${media.id}`]: '테스트 이미지',
    },
    is_locked: true,
    revision: product.revision,
  };
  const manual = await request.patch(`/api/admin/products/${product.id}/translations`, {
    headers,
    data: translation,
  });
  expect(manual.status()).toBe(200);
  product = await manual.json();
  expect(product.translations.ko.is_locked).toBe(true);
  const sourceEdit = await request.patch(`/api/admin/products/${product.id}`, {
    headers,
    data: { ...product, name_id: `Revisi API ${suffix}` },
  });
  expect(sourceEdit.status()).toBe(200);
  product = await sourceEdit.json();
  expect(product.translations.ko.status).toBe('needs_review');
  expect(product.translations.ko.fields.name).toBe('수동 템페');
  const publicProduct = await (await request.get(`/api/catalog/products/${product.id}`)).json();
  expect(publicProduct.translations.ko).toBeUndefined();
  const existingSpot = await (await request.get('/api/admin/featured')).json();
  const featured = await request.patch('/api/admin/featured', {
    headers,
    data: {
      enabled: true,
      mode: 'best_seller',
      product_id: product.id,
      title_id: 'Pilihan uji',
      subtitle_id: 'Uji lokal',
      cta_id: 'Lihat',
      image_id: null,
      starts_at: null,
      ends_at: null,
      revision: existingSpot?.revision || 0,
    },
  });
  expect(featured.status()).toBe(200);
  const publicCatalog = await (await request.get('/api/catalog')).json();
  expect(publicCatalog.featured.product_id).toBe(product.id);
  const settings = await (await request.get('/api/admin/settings')).json();
  const badLine = await request.patch('/api/admin/settings', {
    headers,
    data: {
      ...settings,
      line_enabled: true,
      line_mode: 'shared_link',
      line_url: 'https://line.me.evil.example',
    },
  });
  expect(badLine.status()).toBe(422);
  const saved = await request.patch('/api/admin/settings', {
    headers,
    data: {
      ...settings,
      line_enabled: true,
      line_mode: 'official_account',
      line_official_id: '@local-test',
    },
  });
  expect(saved.status()).toBe(200);
  const updatedSettings = await saved.json();
  const line = await request.post('/api/order-link', {
    headers,
    data: {
      productId: product.id,
      quantity: 1,
      locale: 'ko',
      channel: 'line',
      expectedUnitPriceKrw: 5000,
    },
  });
  expect(line.status()).toBe(200);
  expect((await line.json()).url).toContain('/oaMessage/%40local-test/?');
  expect(
    (
      await request.patch('/api/admin/settings', {
        headers,
        data: { ...settings, revision: updatedSettings.revision },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.delete(`/api/admin/categories/${category.id}`, {
        headers,
        data: { confirmName: category.name_id },
      })
    ).status(),
  ).toBe(200);
  expect((await (await request.get(`/api/admin/products/${product.id}`)).json()).category_id).toBe(
    null,
  );
  expect((await request.delete(`/api/admin/media/${media.id}`, { headers })).status()).toBe(409);
  expect(
    (
      await request.delete(`/api/admin/products/${product.id}`, {
        headers,
        data: { confirmName: product.name_id },
      })
    ).status(),
  ).toBe(200);
  expect((await (await request.get('/api/catalog')).json()).featured).toBe(null);
});
test('admin creates product with validated image, translations, revisions and order links', async ({
  page,
  request,
}) => {
  test.skip(!process.env.E2E_PASSWORD, 'Requires explicitly prepared local test identity.');
  const suffix = Date.now().toString();
  await page.goto('/admin/login');
  await page.getByLabel('Email admin').fill('local-test@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Masuk ke dashboard' }).click();
  await expect(page).toHaveURL('/admin');
  await page.getByRole('link', { name: 'Tambah produk' }).click();
  await page.getByLabel('Nama produk (Indonesia)').fill(`Tempe Uji ${suffix}`);
  await page.getByLabel('SKU / kode produk').fill(`TEST-${suffix}`);
  await page.getByLabel('Slug internal stabil').fill(`tempe-uji-${suffix}`);
  await page.getByLabel('Deskripsi singkat', { exact: true }).fill('Deskripsi uji.');
  await page.getByLabel('Harga normal (₩)').fill('5000');
  const png = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 400;
      c.height = 400;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#e5ead9';
      ctx.fillRect(0, 0, 400, 400);
      return c.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
  await page
    .getByLabel('Upload gambar')
    .setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Foto utama', { exact: true })).toBeVisible();
  await page.getByLabel('Status produk').selectOption('published');
  await page.getByRole('button', { name: 'Simpan produk' }).click();
  await expect(page).toHaveURL(/\/admin\/products\/.+\/edit/);
  await expect(page.getByText('Produk disimpan.', { exact: false })).toBeVisible();
  const id = page.url().split('/').at(-2)!;
  await expect(
    page.getByText('Konfigurasi terjemahan belum tersedia.', { exact: false }),
  ).toBeVisible();
  const current = await (await page.request.get(`/api/admin/products/${id}`)).json();
  const stale = await page.request.patch(`/api/admin/products/${id}`, {
    headers: { Origin: 'http://localhost:3000' },
    data: { ...current, revision: 0 },
  });
  expect(stale.status()).toBe(409);
  const revised = await page.request.patch(`/api/admin/products/${id}`, {
    headers: { Origin: 'http://localhost:3000' },
    data: { ...current, price_krw: 6000 },
  });
  expect(revised.ok()).toBeTruthy();
  const updated = await revised.json();
  expect(updated.source_revision).toBe(current.source_revision);
  const conflict = await request.post('/api/order-link', {
    headers: { Origin: 'http://localhost:3000' },
    data: {
      productId: id,
      quantity: 2,
      locale: 'ko',
      channel: 'whatsapp',
      expectedUnitPriceKrw: 5000,
    },
  });
  expect(conflict.status()).toBe(409);
  const order = await request.post('/api/order-link', {
    headers: { Origin: 'http://localhost:3000' },
    data: {
      productId: id,
      quantity: 2,
      locale: 'ko',
      channel: 'whatsapp',
      expectedUnitPriceKrw: 6000,
    },
  });
  expect(order.status()).toBe(200);
  const result = await order.json();
  expect(new URL(result.url).hostname).toBe('wa.me');
  expect(result.message).toContain('₩12,000');
  expect(result.message).toContain('안녕하세요');
  await page.goto(`/?product=${id}&order=1`);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pesan lewat LINE' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const archive = await page.request.patch(`/api/admin/products/${id}`, {
    headers: { Origin: 'http://localhost:3000' },
    data: { ...updated, status: 'archived' },
  });
  expect(archive.ok()).toBeTruthy();
  expect((await request.get(`/api/catalog/products/${id}`)).status()).toBe(404);
  expect((await request.get(`/media/${updated.images[0].id}`)).status()).toBe(401);
  await page.request.delete(`/api/admin/products/${id}`, {
    headers: { Origin: 'http://localhost:3000' },
    data: { confirmName: current.name_id },
  });
});
