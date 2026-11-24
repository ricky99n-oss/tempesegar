import { CatalogPage, catalogMetadata } from '@/components/catalog-page';
export const dynamic = 'force-dynamic';
export const metadata = catalogMetadata('id');
export default function Page() {
  return <CatalogPage locale="id" />;
}
