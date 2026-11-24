import { catalog } from '@/lib/db';
import { errorResponse, json } from '@/lib/errors';
import { productName, price } from '@/lib/business';
export async function GET(req: Request) {
  try {
    const data = await catalog();
    const q = new URL(req.url).searchParams;
    const locale = q.get('locale') === 'ko' ? 'ko' : q.get('locale') === 'en' ? 'en' : 'id';
    const search = (q.get('q') || '').normalize('NFKC').toLocaleLowerCase();
    let products = data.products.filter(
      (p) =>
        (!search ||
          `${productName(p, locale).text} ${p.name_id} ${p.sku}`
            .normalize('NFKC')
            .toLocaleLowerCase()
            .includes(search)) &&
        (!q.get('category') || p.category_id === q.get('category')) &&
        (!q.get('availability') || p.availability === q.get('availability')),
    );
    const sort = q.get('sort');
    products.sort((a, b) =>
      sort === 'price_asc'
        ? price(a, data.now) - price(b, data.now)
        : sort === 'price_desc'
          ? price(b, data.now) - price(a, data.now)
          : sort === 'newest'
            ? b.created_at.localeCompare(a.created_at)
            : Number(b.is_recommended) - Number(a.is_recommended) ||
              a.sort_order - b.sort_order ||
              a.id.localeCompare(b.id),
    );
    const offset = Math.max(0, Math.min(100000, Number(q.get('cursor')) || 0));
    const limit = Math.max(1, Math.min(48, Number(q.get('limit')) || 24));
    return json({
      ...data,
      products: products.slice(offset, offset + limit),
      total: products.length,
      nextCursor: offset + limit < products.length ? offset + limit : null,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
