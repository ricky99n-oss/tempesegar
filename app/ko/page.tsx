import { CatalogPage, catalogMetadata } from '@/components/catalog-page';
export const dynamic = 'force-dynamic';
export const metadata = catalogMetadata('ko');
export default function Page() {
  return <CatalogPage locale="ko" />;
}
