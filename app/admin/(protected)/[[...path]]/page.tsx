import { notFound } from 'next/navigation';
import { entities, settings } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { redirect } from 'next/navigation';
import { Admin } from '@/components/admin';
import type { Product, Category, Featured } from '@/lib/types';
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AppError && e.status === 401) redirect('/admin/login');
    throw e;
  }
  const { path = [] } = await params;
  const valid =
    path.length === 0 ||
    (['products', 'categories', 'featured', 'settings'].includes(path[0]) &&
      (path.length === 1 ||
        (path[0] === 'products' &&
          ((path[1] === 'new' && path.length === 2) ||
            (path.length === 3 && path[2] === 'edit')))));
  if (!valid) notFound();
  const [products, categories, featured, store] = await Promise.all([
    entities<Product>('products'),
    entities<Category>('categories'),
    entities<Featured>('featured'),
    settings(),
  ]);
  if (path[0] === 'products' && path.length === 3 && !products.some((p) => p.id === path[1]))
    notFound();
  // Each server request provides one clock value for a consistent dashboard render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return (
    <Admin
      path={path}
      products={products}
      categories={categories}
      featured={featured[0] || null}
      settings={store}
      now={now}
    />
  );
}
