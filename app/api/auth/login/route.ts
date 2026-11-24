import { z } from 'zod';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { body, errorResponse, json, sameOrigin, AppError } from '@/lib/errors';
import { constantEqual, hash, limit, passwordHash, requestIP } from '@/lib/auth';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await limit(`login:${requestIP(req)}`, 10, 900);
    const { email, password } = z
      .object({ email: z.string().email().max(254), password: z.string().min(1).max(256) })
      .parse(await body(req));
    await limit(`login-email:${email.toLowerCase()}`, 10, 900);
    const { DB } = await env();
    const a = await DB.prepare(
      'SELECT * FROM admin_users WHERE email=? COLLATE NOCASE AND is_active=1',
    )
      .bind(email)
      .first<{ id: string; password_hash: string; salt: string }>();
    const computed = await passwordHash(password, a?.salt || 'constant-time-dummy-salt');
    if (!a || !constantEqual(computed, a.password_hash))
      throw new AppError(401, 'LOGIN_FAILED', 'Email atau password tidak cocok.');
    const token = crypto.randomUUID() + crypto.randomUUID();
    await DB.batch([
      DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),
      DB.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(
        await hash(token),
        a.id,
        Date.now() + 8 * 3600000,
      ),
    ]);
    (await cookies()).set('ts_session', token, {
      httpOnly: true,
      secure: new URL(req.url).protocol === 'https:',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 3600,
    });
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
