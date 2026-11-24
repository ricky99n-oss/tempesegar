import { env } from '@/lib/env';
import { errorResponse, AppError } from '@/lib/errors';
import { requireAdmin } from '@/lib/auth';
import { z } from 'zod';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    z.string().uuid().parse(id);
    const { DB, MEDIA } = await env();
    const publicRef = await DB.prepare(
      `SELECT 1 AS ok FROM product_media pm JOIN products p ON p.id=pm.product_id WHERE pm.media_id=? AND p.status='published' UNION SELECT 1 FROM settings WHERE json_extract(data,'$.logo_id')=? UNION SELECT 1 FROM featured f JOIN products p ON f.product_id=p.id WHERE json_extract(f.data,'$.image_id')=? AND json_extract(f.data,'$.enabled')=1 AND p.status='published' LIMIT 1`,
    )
      .bind(id, id, id)
      .first();
    if (!publicRef) await requireAdmin();
    const record = await DB.prepare('SELECT storage_path FROM media WHERE id=?')
      .bind(id)
      .first<{ storage_path: string }>();
    if (!record) throw new AppError(404, 'NOT_FOUND', 'Gambar tidak ditemukan.');
    const object = await MEDIA.get(record.storage_path);
    if (!object) throw new AppError(404, 'NOT_FOUND', 'Gambar tidak ditemukan.');
    // Recheck publication on every request; previously published draft media is
    // never served from a long-lived shared browser/CDN cache.
    return new Response(object.body, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private,max-age=0,must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
