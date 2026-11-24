import type { CatalogData, Product } from './types';
export function demoCatalog(): CatalogData {
  const names = [
    'Tempe Segar 500 g',
    'Tempe Segar 1 kg',
    'Paket Tempe 3 × 500 g',
    'Tempe Iris 500 g',
  ];
  const ko = [
    '신선한 템페 500 g',
    '신선한 템페 1 kg',
    '템페 세트 3 × 500 g',
    '슬라이스 템페 500 g',
  ];
  const en = [
    'Fresh Tempe 500 g',
    'Fresh Tempe 1 kg',
    'Tempe Bundle 3 × 500 g',
    'Sliced Tempe 500 g',
  ];
  const products: Product[] = names.map((name, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    sku: `TMP-00${i + 1}`,
    slug: `demo-${i + 1}`,
    category_id: null,
    name_id: name,
    short_description_id: 'Contoh tampilan produk. Foto ilustrasi dan harga demo.',
    description_id:
      'Produk contoh untuk pengujian antarmuka. Informasi ini bukan penawaran produk aktual toko.',
    unit_label_id: i === 1 ? '1 kg' : i === 2 ? '3 × 500 g' : '500 g',
    price_krw: [5000, 9000, 14000, 5500][i],
    sale_price_krw: null,
    sale_starts_at: null,
    sale_ends_at: null,
    availability: i === 2 ? 'preorder' : i === 3 ? 'out_of_stock' : 'available',
    status: 'published',
    is_recommended: i === 0,
    is_best_seller: false,
    sort_order: i,
    images: [
      {
        id: `demo-${i}`,
        url: '/demo-tempe.svg',
        alt_id: 'Ilustrasi demo tempe; bukan foto produk toko',
        width: 600,
        height: 600,
      },
    ],
    revision: 1,
    source_revision: 1,
    source_hash: 'demo',
    created_at: '2026-11-24T00:00:00Z',
    updated_at: '2026-11-24T00:00:00Z',
    translations: Object.fromEntries(
      (['ko', 'en'] as const).map((l) => [
        l,
        {
          fields: {
            name: (l === 'ko' ? ko : en)[i],
            short_description:
              l === 'ko' ? '데모 상품과 가격입니다.' : 'Illustrative demo product and price.',
            description:
              l === 'ko'
                ? '매장의 실제 상품이 아닌 데모입니다.'
                : 'Demo content, not an actual store offer.',
            unit_label: i === 1 ? '1 kg' : i === 2 ? '3 × 500 g' : '500 g',
          },
          source_revision: 1,
          source_hash: 'demo',
          status: 'ready',
          origin: 'manual',
          is_locked: true,
        },
      ]),
    ),
  }));
  return {
    products,
    categories: [],
    featured: {
      id: '1',
      enabled: true,
      mode: 'promo',
      product_id: products[0].id,
      title_id: 'Tempe sederhana, banyak cerita.',
      subtitle_id: 'Contoh spot unggulan. Produk dan harga pada mode ini hanya untuk demonstrasi.',
      cta_id: 'Lihat produk demo',
      image_id: null,
      starts_at: null,
      ends_at: null,
      revision: 1,
      source_revision: 1,
      source_hash: 'demo',
      translations: {},
    },
    settings: {
      store_name: 'Tempe Segar',
      contact_display: '+821065653524',
      whatsapp_number: '821065653524',
      whatsapp_enabled: true,
      line_enabled: false,
      line_mode: 'official_account',
      line_official_id: '',
      line_url: '',
      about_id: 'Tempe untuk meja makan Anda.',
      about_ko: '식탁을 위한 템페.',
      about_en: 'Tempe for your table.',
      logo_id: null,
      revision: 1,
    },
    now: Date.now(),
    demo: true,
  };
}
