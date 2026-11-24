import { z } from 'zod';
import { env } from '@/lib/env';
import { requireAdmin, limit } from '@/lib/auth';
import { body, sameOrigin, json, errorResponse, AppError } from '@/lib/errors';
import {
  entities,
  entity,
  settings,
  storeEntity,
  saveTranslation,
  verifyMedia,
  type Entity,
} from '@/lib/db';
import { sourceHash, translateEntity, sourceFields } from '@/lib/translation';
import { categorySchema, featuredSchema, productSchema, settingsSchema } from '@/lib/validation';
import { uploadMedia, deleteUnusedMedia } from '@/lib/media';
import type { EntityType, Product } from '@/lib/types';
type Context = { params: Promise<{ path: string[] }> };
async function handle(req: Request, context: Context) {
  try {
    const admin = await requireAdmin();
    const { path } = await context.params;
    const [resource, id, action] = path;
    if (req.method !== 'GET') {
      sameOrigin(req);
      await limit(`admin:${admin.id}`, 120);
    }
    if (resource === 'session' && req.method === 'GET') return json(admin);
    const { DB } = await env();
    if (resource === 'media') {
      if (req.method === 'POST') {
        await limit(`upload:${admin.id}`, 20);
        if (Number(req.headers.get('content-length') || 0) > 5 * 1024 * 1024 + 65536)
          throw new AppError(413, 'TOO_LARGE', 'Maksimal 5 MB per gambar.');
        const form = await req.formData();
        const file = form.get('file');
        if (!(file instanceof File)) throw new AppError(422, 'INVALID_FILE', 'Pilih gambar.');
        return json(await uploadMedia(file, admin.id), 201);
      }
      if (req.method === 'DELETE' && id) {
        z.string().uuid().parse(id);
        await deleteUnusedMedia(id);
        return json({ ok: true });
      }
    }
    if (resource === 'maintenance' && req.method === 'POST') {
      const rows = await DB.prepare(
        'SELECT id FROM media WHERE created_at<? AND NOT EXISTS(SELECT 1 FROM product_media WHERE media_id=media.id)',
      )
        .bind(Date.now() - 86400000)
        .all<{ id: string }>();
      let removed = 0;
      for (const m of rows.results) {
        try {
          await deleteUnusedMedia(m.id);
          removed++;
        } catch (e) {
          if (!(e instanceof AppError) || e.code !== 'MEDIA_IN_USE') throw e;
        }
      }
      await DB.batch([
        DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(Date.now()),
        DB.prepare('DELETE FROM translation_attempts WHERE started_at<?').bind(
          Date.now() - 7 * 86400000,
        ),
      ]);
      return json({ removed });
    }
    if (resource === 'settings') {
      if (req.method === 'GET') return json(await settings());
      if (req.method === 'PATCH') {
        const s = settingsSchema.parse(await body(req));
        if (s.logo_id) await verifyMedia([s.logo_id]);
        const next = { ...s, revision: s.revision + 1 };
        const result = await DB.prepare(
          "UPDATE settings SET data=?,revision=?,logo_id=? WHERE id='1' AND revision=?",
        )
          .bind(JSON.stringify(next), next.revision, s.logo_id, s.revision)
          .run();
        if (!result.meta.changes)
          throw new AppError(409, 'EDIT_CONFLICT', 'Pengaturan berubah. Muat ulang.');
        return json(next);
      }
    }
    if (!['products', 'categories', 'featured'].includes(resource))
      throw new AppError(404, 'NOT_FOUND', 'Endpoint tidak ditemukan.');
    const type = resource as EntityType;
    const key = type === 'featured' ? '1' : id;
    if (key && type !== 'featured') z.string().uuid().parse(key);
    if (req.method === 'GET') return json(key ? await entity(type, key) : await entities(type));
    if (action === 'translate' && req.method === 'POST' && key) {
      await limit(`translate:${admin.id}`, 10);
      await translateEntity(type, key, true);
      return json(await entity(type, key));
    }
    if (action === 'translations' && req.method === 'PATCH' && key) {
      const input = z
        .object({
          locale: z.enum(['ko', 'en']),
          fields: z.record(z.string(), z.string().max(5000)),
          is_locked: z.boolean(),
          revision: z.number().int().positive(),
        })
        .parse(await body(req));
      const current = await entity(type, key);
      if (!current) throw new AppError(404, 'NOT_FOUND', 'Data tidak ditemukan.');
      if (current.revision !== input.revision)
        throw new AppError(409, 'EDIT_CONFLICT', 'Data berubah. Muat ulang.');
      const source = sourceFields(type, current);
      for (const [field, value] of Object.entries(input.fields)) {
        if (
          !(field in source) ||
          value.length >
            (field === 'name'
              ? 120
              : field === 'unit_label'
                ? 80
                : field === 'short_description' || field === 'subtitle'
                  ? 240
                  : field === 'cta'
                    ? 60
                    : field.startsWith('alt:')
                      ? 160
                      : 5000)
        )
          throw new AppError(422, 'TRANSLATION_FIELDS', 'Periksa field dan panjang terjemahan.');
      }
      if (Object.entries(source).some(([k, v]) => v && !input.fields[k]?.trim()))
        throw new AppError(
          422,
          'TRANSLATION_FIELDS',
          'Lengkapi semua field terjemahan sumber yang terisi.',
        );
      const next = { ...current, revision: current.revision + 1 };
      await storeEntity(type, next, current.revision);
      await saveTranslation(type, key, input.locale, {
        fields: input.fields,
        is_locked: input.is_locked,
        source_revision: current.source_revision,
        source_hash: current.source_hash,
        origin: 'manual',
        status: 'ready',
      });
      return json(await entity(type, key));
    }
    if (req.method === 'DELETE' && key && type !== 'featured') {
      const current = await entity(type, key);
      if (!current) throw new AppError(404, 'NOT_FOUND', 'Data tidak ditemukan.');
      const input = z.object({ confirmName: z.string() }).parse(await body(req));
      const name =
        type === 'products'
          ? (current as Product).name_id
          : (current as { name_id: string }).name_id;
      if (input.confirmName !== name)
        throw new AppError(422, 'CONFIRM_DELETE', 'Ketik nama yang tepat untuk menghapus.');
      const cmds = [
        DB.prepare(`DELETE FROM ${type} WHERE id=? AND revision=?`).bind(key, current.revision),
        DB.prepare(
          `DELETE FROM translations WHERE entity_type=? AND entity_id=? AND NOT EXISTS(SELECT 1 FROM ${type} WHERE id=?)`,
        ).bind(type, key, key),
      ];
      const [result] = await DB.batch(cmds);
      if (!result.meta.changes)
        throw new AppError(409, 'EDIT_CONFLICT', 'Data berubah. Muat ulang.');
      if (type === 'products')
        for (const img of (current as Product).images) {
          try {
            await deleteUnusedMedia(img.id);
          } catch {
            /* Shared media is kept; orphan cleanup can be retried. */
          }
        }
      return json({ ok: true });
    }
    if (req.method === 'POST' || req.method === 'PATCH') {
      const data = await body(req);
      const parsed =
        type === 'products'
          ? productSchema.parse(data)
          : type === 'categories'
            ? categorySchema.parse(data)
            : featuredSchema.parse(data);
      const creating = req.method === 'POST';
      if (creating && type === 'featured')
        throw new AppError(405, 'METHOD', 'Gunakan PATCH untuk slot unggulan.');
      const entityId = creating ? crypto.randomUUID() : key;
      if (!entityId) throw new AppError(400, 'ID_REQUIRED', 'ID diperlukan.');
      const current = creating ? null : await entity(type, entityId);
      if (!current && type !== 'featured' && !creating)
        throw new AppError(404, 'NOT_FOUND', 'Data tidak ditemukan.');
      if (parsed.revision !== (current?.revision || 0))
        throw new AppError(409, 'EDIT_CONFLICT', 'Data berubah. Muat ulang sebelum menyimpan.');
      if (type === 'products') {
        const p = parsed as z.infer<typeof productSchema>;
        await verifyMedia(p.images.map((i) => i.id));
        if (p.category_id && !(await entity('categories', p.category_id)))
          throw new AppError(422, 'CATEGORY', 'Kategori tidak tersedia.');
        // Dimensions and URLs are sourced from trusted media metadata.
        for (const image of p.images) {
          const stored = await DB.prepare('SELECT width,height FROM media WHERE id=?')
            .bind(image.id)
            .first<{ width: number; height: number }>();
          image.width = stored!.width;
          image.height = stored!.height;
          image.url = `/media/${image.id}`;
        }
      }
      if (type === 'featured') {
        const f = parsed as z.infer<typeof featuredSchema>;
        if (f.product_id && !(await entity('products', f.product_id)))
          throw new AppError(422, 'PRODUCT', 'Produk tidak tersedia.');
        if (f.image_id) await verifyMedia([f.image_id]);
      }
      const next = {
        ...parsed,
        id: entityId,
        created_at:
          current && 'created_at' in current ? current.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        revision: parsed.revision + 1,
        source_revision: current?.source_revision || 0,
        source_hash: '',
        translations: current?.translations || {},
      } as Entity;
      next.source_hash = await sourceHash(type, next);
      const changed = next.source_hash !== current?.source_hash;
      if (changed) next.source_revision++;
      await storeEntity(type, next, parsed.revision);
      if (changed) {
        try {
          await limit(`translate:${admin.id}`, 10);
        } catch (e) {
          if (e instanceof AppError && e.status === 429)
            return json(
              {
                ...(await entity(type, entityId)),
                warning: 'Sumber tersimpan. Batas terjemahan tercapai; coba terjemahan lagi nanti.',
              },
              creating ? 201 : 200,
            );
          throw e;
        }
        await translateEntity(type, entityId);
      }
      return json(await entity(type, entityId), creating ? 201 : 200);
    }
    throw new AppError(405, 'METHOD', 'Metode tidak diizinkan.');
  } catch (e) {
    return errorResponse(e);
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
