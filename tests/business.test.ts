import { describe, it, expect } from 'vitest';
import {
  activeWindow,
  price,
  won,
  orderMessage,
  channelURL,
  validLineURL,
  translated,
} from '../lib/business';
import { productSchema, settingsSchema } from '../lib/validation';
import { demoCatalog } from '../lib/demo';
import { imageSignature } from '../lib/media';
import { seoulInput, seoulUTC } from '../lib/time';
import { sourceFields } from '../lib/translation-fields';
const data = demoCatalog(),
  p = data.products[0];
describe('Won and promotion boundaries', () => {
  it('uses start inclusive and end exclusive', () => {
    const s = '2026-11-24T00:00:00Z',
      e = '2026-11-25T00:00:00Z';
    const sale = { ...p, sale_price_krw: 4000, sale_starts_at: s, sale_ends_at: e };
    expect(price(sale, Date.parse(s) - 1)).toBe(5000);
    expect(price(sale, Date.parse(s))).toBe(4000);
    expect(price(sale, Date.parse(e))).toBe(5000);
    expect(activeWindow(null, null, 0)).toBe(true);
  });
  it('rejects invalid sale prices and formats integer KRW', () => {
    expect(price({ ...p, sale_price_krw: 6000 })).toBe(5000);
    expect(price({ ...p, sale_price_krw: 2.5 })).toBe(5000);
    expect(won(10000)).toBe('₩10,000');
  });
  it('roundtrips Seoul time independently of system timezone', () => {
    expect(seoulInput('2026-11-24T00:00:00Z')).toBe('2026-11-24T09:00');
    expect(seoulUTC('2026-11-24T09:00')).toBe('2026-11-24T00:00:00.000Z');
  });
});
describe('chat links', () => {
  it('encodes Korean, punctuation, emoji and product URL', () => {
    const product = {
      ...p,
      translations: {
        ko: {
          ...p.translations.ko!,
          fields: { ...p.translations.ko!.fields, name: '템페 & 콩 🫘 + ?' },
        },
      },
    };
    const message = orderMessage(product, 2, 'ko', 5000, 'https://example.com');
    const url = channelURL(data.settings, 'whatsapp', message);
    expect(new URL(url).hostname).toBe('wa.me');
    expect(new URL(url).pathname).toBe('/821065653524');
    expect(new URL(url).searchParams.get('text')).toBe(message);
    expect(message).toContain('₩10,000');
    expect(message).toContain('/ko?product=');
  });
  it('uses LINE OA official scheme without text parameter', () => {
    const s = { ...data.settings, line_enabled: true, line_official_id: '@tempe' };
    const url = channelURL(s, 'line', '안녕 & 🫘');
    expect(url).toBe(
      'https://line.me/R/oaMessage/%40tempe/?%EC%95%88%EB%85%95%20%26%20%F0%9F%AB%98',
    );
  });
  it('does not append parameters to a LINE shared link', () => {
    const s = {
      ...data.settings,
      line_enabled: true,
      line_mode: 'shared_link' as const,
      line_url: 'https://lin.ee/abc',
    };
    expect(channelURL(s, 'line', 'hello')).toBe(s.line_url);
  });
  it('rejects invalid quantities and channels', () => {
    for (const q of [0, 100, 1.5, -1])
      expect(() => orderMessage(p, q, 'id', 5000, 'https://example.com')).toThrow();
    expect(() => channelURL(data.settings, 'line', 'hi')).toThrow();
    for (const url of [
      'http://line.me/',
      'https://line.me.evil.com',
      'javascript:alert(1)',
      'https://evil.com',
      'https://user:password@line.me/',
    ])
      expect(validLineURL(url)).toBe(false);
  });
});
describe('source and server input validation', () => {
  it('does not change translation source on price edits or image reordering without text changes', () => {
    const p2 = {
      ...p,
      images: [...p.images, { id: 'new', url: '/media/new', width: 1, height: 1, alt_id: '' }],
    };
    expect(sourceFields('products', p2)).toEqual(
      sourceFields('products', { ...p2, price_krw: 9000, images: [...p2.images].reverse() }),
    );
    expect(sourceFields('products', p2)).toEqual(sourceFields('products', p));
  });
  it('falls back to Indonesian on stale or locked-needs-review translations', () => {
    expect(translated({ ...p, source_revision: 2 }, 'name', p.name_id, 'ko')).toEqual({
      text: p.name_id,
      lang: 'id',
    });
    expect(
      translated(
        { ...p, translations: { ko: { ...p.translations.ko!, status: 'needs_review' } } },
        'name',
        p.name_id,
        'ko',
      ).lang,
    ).toBe('id');
  });
  it('rejects unpublished images, invalid sale dates and fractional prices', () => {
    const v = { ...p, images: [] };
    expect(productSchema.safeParse(v).success).toBe(false);
    expect(productSchema.safeParse({ ...v, status: 'draft' }).success).toBe(true);
    expect(productSchema.safeParse({ ...v, status: 'draft', price_krw: 3.5 }).success).toBe(false);
    expect(
      productSchema.safeParse({
        ...v,
        status: 'draft',
        sale_starts_at: '2026-11-25T00:00:00Z',
        sale_ends_at: '2026-11-24T00:00:00Z',
      }).success,
    ).toBe(false);
    expect(settingsSchema.safeParse({ ...data.settings, line_enabled: true }).success).toBe(false);
  });
  it('requires valid image magic bytes', () => {
    expect(imageSignature(new Uint8Array([255, 216, 255, 0]))).toBe('jpeg');
    expect(imageSignature(new TextEncoder().encode('<svg/>'))).toBe(null);
    expect(imageSignature(new TextEncoder().encode('<html>evil</html>'))).toBe(null);
  });
});
