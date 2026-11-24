import { z } from 'zod';
import { validLineURL } from './business';
const date = z.string().datetime({ offset: true }).nullable();
const text = (n: number) => z.string().trim().max(n);
export const mediaSchema = z.object({
  id: z.string().uuid(),
  alt_id: text(160),
  width: z.number().int().positive().max(1200),
  height: z.number().int().positive().max(1200),
  url: z.string().regex(/^\/media\/[a-f0-9-]{36}$/),
  is_illustration: z.boolean().optional(),
});
export const productSchema = z
  .object({
    sku: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[A-Za-z0-9._-]+$/),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(140)
      .regex(/^[a-z0-9-]+$/),
    category_id: z.string().uuid().nullable(),
    name_id: text(120).min(2),
    short_description_id: text(240),
    description_id: text(5000),
    unit_label_id: text(80),
    price_krw: z.number().int().positive().max(100000000),
    sale_price_krw: z.number().int().positive().max(100000000).nullable(),
    sale_starts_at: date,
    sale_ends_at: date,
    availability: z.enum(['available', 'preorder', 'out_of_stock']),
    status: z.enum(['draft', 'published', 'archived']),
    is_recommended: z.boolean(),
    is_best_seller: z.boolean(),
    sort_order: z.number().int().min(0).max(100000),
    images: z.array(mediaSchema).max(8),
    revision: z.number().int().min(0),
  })
  .superRefine((p, c) => {
    if (p.sale_price_krw !== null && p.sale_price_krw >= p.price_krw)
      c.addIssue({
        code: 'custom',
        path: ['sale_price_krw'],
        message: 'Harga promo harus di bawah harga normal.',
      });
    if (
      p.sale_starts_at &&
      p.sale_ends_at &&
      Date.parse(p.sale_starts_at) >= Date.parse(p.sale_ends_at)
    )
      c.addIssue({
        code: 'custom',
        path: ['sale_ends_at'],
        message: 'Waktu selesai harus setelah mulai.',
      });
    if (p.status === 'published' && !p.images.length)
      c.addIssue({ code: 'custom', path: ['images'], message: 'Minimal satu foto untuk terbit.' });
    if (new Set(p.images.map((i) => i.id)).size !== p.images.length)
      c.addIssue({ code: 'custom', path: ['images'], message: 'Foto tidak boleh berulang.' });
  });
export const categorySchema = z.object({
  name_id: text(120).min(2),
  slug: z
    .string()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9-]+$/),
  sort_order: z.number().int().min(0).max(100000),
  is_active: z.boolean(),
  revision: z.number().int().min(0),
});
export const featuredSchema = z
  .object({
    enabled: z.boolean(),
    mode: z.enum(['promo', 'best_seller']),
    product_id: z.string().uuid().nullable(),
    title_id: text(120),
    subtitle_id: text(240),
    cta_id: text(60),
    image_id: z.string().uuid().nullable(),
    starts_at: date,
    ends_at: date,
    revision: z.number().int().min(0),
  })
  .superRefine((v, c) => {
    if (v.starts_at && v.ends_at && Date.parse(v.starts_at) >= Date.parse(v.ends_at))
      c.addIssue({
        code: 'custom',
        path: ['ends_at'],
        message: 'Waktu selesai harus setelah mulai.',
      });
  });
export const settingsSchema = z
  .object({
    store_name: text(80).min(2),
    contact_display: text(30).min(8),
    whatsapp_number: z.string().regex(/^\d{8,15}$/),
    whatsapp_enabled: z.boolean(),
    line_enabled: z.boolean(),
    line_mode: z.enum(['official_account', 'shared_link']),
    line_official_id: text(100),
    line_url: text(500),
    about_id: text(500),
    about_ko: text(500),
    about_en: text(500),
    logo_id: z.string().uuid().nullable(),
    revision: z.number().int().min(0),
  })
  .superRefine((s, c) => {
    if (s.line_url && !validLineURL(s.line_url))
      c.addIssue({
        code: 'custom',
        path: ['line_url'],
        message: 'Gunakan HTTPS dari line.me atau lin.ee.',
      });
    if (s.line_official_id && !/^@?[a-zA-Z0-9._-]{2,100}$/.test(s.line_official_id))
      c.addIssue({ code: 'custom', path: ['line_official_id'], message: 'ID LINE tidak valid.' });
    if (s.line_enabled && !(s.line_mode === 'official_account' ? s.line_official_id : s.line_url))
      c.addIssue({
        code: 'custom',
        path: ['line_enabled'],
        message: 'Lengkapi konfigurasi kanal sebelum diaktifkan.',
      });
  });
export const orderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  locale: z.enum(['id', 'ko', 'en']),
  channel: z.enum(['whatsapp', 'line']),
  expectedUnitPriceKrw: z.number().int().positive(),
});
