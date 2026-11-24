import { entity, settings } from '@/lib/db';
import { errorResponse, json, body, sameOrigin, AppError } from '@/lib/errors';
import { orderSchema } from '@/lib/validation';
import { channelURL, orderMessage, price } from '@/lib/business';
import { limit, requestIP } from '@/lib/auth';
import type { Product } from '@/lib/types';
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await limit(`order:${requestIP(req)}`, 30);
    const input = orderSchema.parse(await body(req));
    const p = await entity<Product>('products', input.productId, true);
    if (!p || p.availability === 'out_of_stock')
      throw new AppError(404, 'UNAVAILABLE', 'Produk tidak tersedia untuk dipesan.');
    const unit = price(p);
    if (unit !== input.expectedUnitPriceKrw)
      throw new AppError(
        409,
        'PRICE_CHANGED',
        'Harga berubah. Tinjau kembali subtotal sebelum melanjutkan.',
        { unitPriceKrw: unit, subtotalKrw: unit * input.quantity, product: p },
      );
    const s = await settings();
    const message = orderMessage(p, input.quantity, input.locale, unit, new URL(req.url).origin);
    let url: string;
    try {
      url = channelURL(s, input.channel, message);
    } catch {
      throw new AppError(422, 'CHANNEL_UNAVAILABLE', 'Kanal belum tersedia.');
    }
    return json({ url, message, unitPriceKrw: unit, subtotalKrw: unit * input.quantity });
  } catch (e) {
    return errorResponse(e);
  }
}
