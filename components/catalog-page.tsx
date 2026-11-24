import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Catalog from './catalog';
import { catalog } from '@/lib/db';
import { demoCatalog } from '@/lib/demo';
import type { Locale } from '@/lib/types';
export const descriptions = {
  id: 'Pilih produk tempe dan pesan langsung melalui WhatsApp atau LINE. Harga dalam Won Korea.',
  ko: '템페 상품을 고르고 WhatsApp 또는 LINE으로 직접 주문하세요. 가격은 한국 원화로 표시됩니다.',
  en: 'Browse tempe products and order directly via WhatsApp or LINE. All prices in Korean Won.',
};
export function catalogMetadata(locale: Locale): Metadata {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://tempe-segar.ricky99n.workers.dev';
  const path = locale === 'id' ? '/' : `/${locale}`;
  return {
    title: 'Tempe Segar',
    description: descriptions[locale],
    alternates: {
      canonical: base + path,
      languages: { id: base + '/', ko: base + '/ko', en: base + '/en', 'x-default': base + '/' },
    },
    openGraph: {
      title: 'Tempe Segar',
      description: descriptions[locale],
      url: base + path,
      siteName: 'Tempe Segar',
      locale: locale === 'id' ? 'id_ID' : locale === 'ko' ? 'ko_KR' : 'en_US',
      type: 'website',
      images: [{ url: base + '/opengraph-image.svg', width: 1200, height: 630 }],
    },
  };
}
export async function CatalogPage({ locale }: { locale: Locale }) {
  const host = (await headers()).get('host') || '';
  const demo = process.env.DEMO_MODE === 'true' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const data = demo ? demoCatalog() : await catalog();
  return <Catalog data={data} locale={locale} />;
}
