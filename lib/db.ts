import { env } from './env';
import { AppError } from './errors';
import type {
  Product,
  Category,
  Featured,
  Settings,
  CatalogData,
  EntityType,
  Translation,
} from './types';
import { activeWindow } from './business';
export type Entity = Product | Category | Featured;
export async function entities<T extends Entity>(
  type: EntityType,
  publicOnly = false,
): Promise<T[]> {
  const { DB } = await env();
  const query = `SELECT * FROM ${type}${publicOnly && type === 'products' ? " WHERE status='published'" : ''}`;
  const [rows, translations] = await Promise.all([
    DB.prepare(query).all<{
      id: string;
      data: string;
      category_id?: string;
      product_id?: string;
    }>(),
    DB.prepare('SELECT entity_id,locale,data FROM translations WHERE entity_type=?')
      .bind(type)
      .all<{ entity_id: string; locale: 'ko' | 'en'; data: string }>(),
  ]);
  return rows.results
    .map((r) => {
      const data = JSON.parse(r.data);
      delete data.mutation_id;
      if (type === 'products') data.category_id = r.category_id ?? null;
      if (type === 'featured') data.product_id = r.product_id ?? null;
      data.translations = Object.fromEntries(
        translations.results
          .filter((t) => t.entity_id === r.id)
          .map((t) => [t.locale, JSON.parse(t.data)]),
      );
      if (publicOnly)
        data.translations = Object.fromEntries(
          Object.entries(data.translations).filter(([, t]) => {
            const translation = t as Translation;
            return (
              translation.status === 'ready' && translation.source_revision === data.source_revision
            );
          }),
        );
      return data as T;
    })
    .filter((e) => !publicOnly || type !== 'categories' || (e as Category).is_active);
}
export async function entity<T extends Entity>(
  type: EntityType,
  id: string,
  publicOnly = false,
): Promise<T | null> {
  const { DB } = await env();
  const row = await DB.prepare(
    `SELECT * FROM ${type} WHERE id=?${publicOnly && type === 'products' ? " AND status='published'" : ''}`,
  )
    .bind(id)
    .first<{ data: string; category_id?: string; product_id?: string }>();
  if (!row) return null;
  const data = JSON.parse(row.data);
  delete data.mutation_id;
  if (type === 'products') data.category_id = row.category_id ?? null;
  if (type === 'featured') data.product_id = row.product_id ?? null;
  const ts = await DB.prepare(
    'SELECT locale,data FROM translations WHERE entity_type=? AND entity_id=?',
  )
    .bind(type, id)
    .all<{ locale: string; data: string }>();
  data.translations = Object.fromEntries(ts.results.map((t) => [t.locale, JSON.parse(t.data)]));
  if (publicOnly)
    data.translations = Object.fromEntries(
      Object.entries(data.translations).filter(([, t]) => {
        const translation = t as Translation;
        return (
          translation.status === 'ready' && translation.source_revision === data.source_revision
        );
      }),
    );
  return data;
}
export async function settings(): Promise<Settings> {
  const { DB } = await env();
  const row = await DB.prepare("SELECT data FROM settings WHERE id='1'").first<{ data: string }>();
  if (!row) throw new AppError(503, 'NOT_CONFIGURED', 'Database belum dikonfigurasi.');
  return JSON.parse(row.data);
}
export async function catalog(): Promise<CatalogData> {
  const [products, categories, spots, s] = await Promise.all([
    entities<Product>('products', true),
    entities<Category>('categories', true),
    entities<Featured>('featured', true),
    settings(),
  ]);
  const now = Date.now();
  let featured: Featured | null = spots[0] || null;
  const featuredId = featured?.product_id;
  if (
    featured &&
    (!featured.enabled ||
      !activeWindow(featured.starts_at, featured.ends_at, now) ||
      !products.some((p) => p.id === featuredId && p.availability !== 'out_of_stock'))
  )
    featured = null;
  // Explicit public serializer: never return auth, rate limit or provider records.
  return { products, categories, featured, settings: s, now, demo: false };
}
export async function storeEntity(type: EntityType, data: Entity, expected: number) {
  const { DB } = await env();
  const { translations: _, ...record } = data;
  void _;
  const mutationId = crypto.randomUUID();
  const stored = { ...record, mutation_id: mutationId };
  const extras =
    type === 'products' ? ['category_id'] : type === 'featured' ? ['product_id', 'image_id'] : [];
  const foreign =
    type === 'products'
      ? [(data as Product).category_id]
      : type === 'featured'
        ? [(data as Featured).product_id, (data as Featured).image_id]
        : [];
  const write =
    expected === 0
      ? DB.prepare(
          `INSERT INTO ${type}(id,data,revision${extras.length ? ',' + extras.join(',') : ''}) VALUES(?,?,?${extras.map(() => ',?').join('')})`,
        ).bind(data.id, JSON.stringify(stored), data.revision, ...foreign)
      : DB.prepare(
          `UPDATE ${type} SET data=?,revision=?${extras.map((c) => `,${c}=?`).join('')} WHERE id=? AND revision=?`,
        ).bind(JSON.stringify(stored), data.revision, ...foreign, data.id, expected);
  const commands = [write];
  if (type === 'products') {
    const guard =
      "EXISTS(SELECT 1 FROM products WHERE id=? AND json_extract(data,'$.mutation_id')=?)";
    commands.push(
      DB.prepare(`DELETE FROM product_media WHERE product_id=? AND ${guard}`).bind(
        data.id,
        data.id,
        mutationId,
      ),
    );
    for (const [index, image] of (data as Product).images.entries())
      commands.push(
        DB.prepare(
          `INSERT INTO product_media(product_id,media_id,sort_order) SELECT ?,?,? WHERE ${guard}`,
        ).bind(data.id, image.id, index, data.id, mutationId),
      );
  }
  const [result] = await DB.batch(commands);
  if (!result.meta.changes)
    throw new AppError(
      409,
      'EDIT_CONFLICT',
      'Data telah diubah. Muat ulang sebelum menyimpan kembali.',
    );
}
export async function saveTranslation(
  type: EntityType,
  id: string,
  locale: 'ko' | 'en',
  t: Translation,
) {
  const { DB } = await env();
  // Only a matching source revision may commit; an in-flight machine response
  // cannot overwrite a manual translation locked after that request started.
  await DB.prepare(
    `INSERT INTO translations(entity_type,entity_id,locale,data) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM ${type} WHERE id=? AND json_extract(data,'$.source_revision')=?) ON CONFLICT(entity_type,entity_id,locale) DO UPDATE SET data=excluded.data WHERE json_extract(translations.data,'$.is_locked')!=1 OR json_extract(excluded.data,'$.origin')='manual'`,
  )
    .bind(type, id, locale, JSON.stringify(t), id, t.source_revision)
    .run();
}
export async function markTranslationNeedsReview(
  type: EntityType,
  id: string,
  locale: 'ko' | 'en',
  sourceRevision: number,
) {
  const { DB } = await env();
  // Preserve the current fields atomically. A newly approved correction for
  // this source revision must never be replaced by an older locked snapshot.
  await DB.prepare(
    `UPDATE translations SET data=json_set(data,'$.status','needs_review','$.source_revision',?) WHERE entity_type=? AND entity_id=? AND locale=? AND json_extract(data,'$.is_locked')=1 AND json_extract(data,'$.source_revision')!=? AND EXISTS(SELECT 1 FROM ${type} WHERE id=? AND json_extract(data,'$.source_revision')=?)`,
  )
    .bind(sourceRevision, type, id, locale, sourceRevision, id, sourceRevision)
    .run();
}
export async function verifyMedia(ids: string[]) {
  if (!ids.length) return;
  const { DB } = await env();
  const rows = await DB.prepare(
    `SELECT id FROM media WHERE id IN (${ids.map(() => '?').join(',')})`,
  )
    .bind(...ids)
    .all();
  if (rows.results.length !== new Set(ids).size)
    throw new AppError(422, 'INVALID_MEDIA', 'Salah satu gambar tidak tersedia. Upload kembali.');
}
