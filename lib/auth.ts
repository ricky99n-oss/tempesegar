import { cookies } from 'next/headers';
import { env } from './env';
import { AppError } from './errors';
export const hex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (v) => v.toString(16).padStart(2, '0')).join('');
export const hash = async (s: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
export async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return hex(
    await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
      key,
      256,
    ),
  );
}
export function constantEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export async function requireAdmin() {
  const token = (await cookies()).get('ts_session')?.value;
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan login terlebih dahulu.');
  const { DB } = await env();
  const user = await DB.prepare(
    'SELECT a.id,a.email FROM sessions s JOIN admin_users a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>? AND a.is_active=1',
  )
    .bind(await hash(token), Date.now())
    .first<{ id: string; email: string }>();
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Sesi berakhir. Silakan login kembali.');
  return user;
}
export async function limit(key: string, max: number, seconds = 60) {
  const { DB } = await env();
  const window = Math.floor(Date.now() / (seconds * 1000));
  const row = await DB.prepare(
    'INSERT INTO rate_limits(key,window,count,expires_at) VALUES(?,?,1,?) ON CONFLICT(key,window) DO UPDATE SET count=count+1 RETURNING count',
  )
    .bind(await hash(key), window, (window + 1) * seconds * 1000)
    .first<{ count: number }>();
  if ((row?.count || 0) > max)
    throw new AppError(429, 'RATE_LIMIT', 'Terlalu banyak permintaan. Coba lagi nanti.');
}
export const requestIP = (req: Request) => req.headers.get('cf-connecting-ip') || 'local';
