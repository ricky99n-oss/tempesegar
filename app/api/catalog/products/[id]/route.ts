import { entity } from '@/lib/db';
import { errorResponse, json, AppError } from '@/lib/errors';
import { z } from 'zod';
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    z.string().uuid().parse(id);
    const p = await entity('products', id, true);
    if (!p) throw new AppError(404, 'NOT_FOUND', 'Produk tidak tersedia.');
    return json(p);
  } catch (e) {
    return errorResponse(e);
  }
}
