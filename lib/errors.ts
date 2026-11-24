import { ZodError } from 'zod';
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export function errorResponse(e: unknown) {
  if (e instanceof ZodError)
    return json(
      {
        code: 'VALIDATION',
        message: 'Periksa kembali isian Anda.',
        fieldErrors: e.flatten().fieldErrors,
      },
      422,
    );
  if (e instanceof AppError)
    return json({ code: e.code, message: e.message, ...e.extra }, e.status);
  if (e instanceof Error && /UNIQUE constraint/i.test(e.message))
    return json({ code: 'DUPLICATE', message: 'SKU atau slug sudah dipakai.' }, 409);
  console.error('Request failed', e instanceof Error ? e.name : 'UnknownError');
  return json(
    { code: 'SERVER_ERROR', message: 'Permintaan belum dapat diproses. Silakan coba lagi.' },
    500,
  );
}
export async function body(req: Request) {
  if (Number(req.headers.get('content-length') || 0) > 100000)
    throw new AppError(413, 'TOO_LARGE', 'Data terlalu besar.');
  const raw = await req.text();
  if (raw.length > 100000) throw new AppError(413, 'TOO_LARGE', 'Data terlalu besar.');
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'Data JSON tidak valid.');
  }
}
export function sameOrigin(req: Request) {
  if (req.headers.get('origin') !== new URL(req.url).origin)
    throw new AppError(403, 'ORIGIN', 'Asal permintaan tidak diizinkan.');
}
