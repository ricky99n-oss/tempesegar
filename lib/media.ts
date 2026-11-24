import { env } from './env';
import { AppError } from './errors';
export function imageSignature(b: Uint8Array) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)) return 'png';
  if (
    String.fromCharCode(...b.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...b.slice(8, 12)) === 'WEBP'
  )
    return 'webp';
  return null;
}
export async function uploadMedia(file: File, adminId: string) {
  if (file.size > 5 * 1024 * 1024 || file.size < 12)
    throw new AppError(422, 'INVALID_IMAGE', 'Gambar harus JPEG, PNG, atau WebP, maksimal 5 MB.');
  const bytes = await file.arrayBuffer();
  if (!imageSignature(new Uint8Array(bytes)))
    throw new AppError(422, 'INVALID_IMAGE', 'Format gambar tidak diizinkan.');
  const e = await env();
  let width: number, height: number, response: Response;
  try {
    const info = await e.IMAGES.info(new Blob([bytes]).stream());
    if (!('width' in info) || !('height' in info)) throw new Error('Invalid');
    width = Number(info.width);
    height = Number(info.height);
    if (!width || !height || width * height > 25000000 || Math.max(width, height) > 10000)
      throw new Error('Dimensions');
    response = (
      await e.IMAGES.input(new Blob([bytes]).stream())
        .transform({
          width: Math.min(1200, width),
          height: Math.min(1200, height),
          fit: 'scale-down',
        })
        .output({ format: 'image/webp', quality: 85, anim: false })
    ).response();
    if (!response.ok) throw new Error('Decode');
  } catch (error) {
    console.error(
      'Image processing failed',
      error instanceof Error ? error.message.slice(0, 200) : 'Unknown image error',
    );
    throw new AppError(
      422,
      'IMAGE_PROCESSING',
      'Gambar tidak dapat diproses. Gunakan JPEG, PNG, atau WebP dengan maksimal 25 megapiksel.',
    );
  }
  const ratio = Math.min(1, 1200 / width, 1200 / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);
  const id = crypto.randomUUID(),
    path = `catalog/${id}.webp`;
  await e.MEDIA.put(path, await response.arrayBuffer(), {
    httpMetadata: { contentType: 'image/webp', cacheControl: 'public,max-age=31536000,immutable' },
  });
  try {
    await e.DB.prepare(
      'INSERT INTO media(id,storage_path,width,height,created_at,owner_id) VALUES(?,?,?,?,?,?)',
    )
      .bind(id, path, width, height, Date.now(), adminId)
      .run();
  } catch (error) {
    await e.MEDIA.delete(path);
    throw error;
  }
  return { id, url: `/media/${id}`, alt_id: '', width, height };
}
export async function deleteUnusedMedia(id: string) {
  const { DB, MEDIA } = await env();
  // Foreign keys protect product references; featured/logo references are checked
  // in the same atomic DELETE, so a failed check never removes the object.
  const deleted = await DB.prepare(
    `DELETE FROM media WHERE id=? AND NOT EXISTS(SELECT 1 FROM product_media WHERE media_id=?) AND NOT EXISTS(SELECT 1 FROM featured WHERE json_extract(data,'$.image_id')=?) AND NOT EXISTS(SELECT 1 FROM settings WHERE json_extract(data,'$.logo_id')=?) RETURNING storage_path`,
  )
    .bind(id, id, id, id)
    .first<{ storage_path: string }>();
  if (!deleted) throw new AppError(409, 'MEDIA_IN_USE', 'Gambar masih dipakai atau sudah dihapus.');
  await MEDIA.delete(deleted.storage_path);
}
