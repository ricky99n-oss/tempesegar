import { cookies } from 'next/headers';
import { hash } from '@/lib/auth';
import { env } from '@/lib/env';
import { sameOrigin, errorResponse, json } from '@/lib/errors';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const c = await cookies();
    const token = c.get('ts_session')?.value;
    if (token) {
      const { DB } = await env();
      await DB.prepare('DELETE FROM sessions WHERE token_hash=?')
        .bind(await hash(token))
        .run();
    }
    c.delete('ts_session');
    return json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
