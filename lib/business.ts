import type { Locale, Product, Settings, Translation } from './types';
export const won = (value: number) =>
  new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
export function activeWindow(start: string | null, end: string | null, now = Date.now()) {
  return (!start || Date.parse(start) <= now) && (!end || now < Date.parse(end));
}
export function price(
  p: Pick<Product, 'price_krw' | 'sale_price_krw' | 'sale_starts_at' | 'sale_ends_at'>,
  now = Date.now(),
) {
  const sale = p.sale_price_krw;
  return sale !== null &&
    Number.isInteger(sale) &&
    sale > 0 &&
    sale < p.price_krw &&
    activeWindow(p.sale_starts_at, p.sale_ends_at, now)
    ? sale
    : p.price_krw;
}
export function translated(
  entity: { source_revision: number; translations: Partial<Record<'ko' | 'en', Translation>> },
  key: string,
  fallback: string,
  locale: Locale,
): { text: string; lang: Locale } {
  const t = locale === 'id' ? undefined : entity.translations[locale];
  return t?.status === 'ready' && t.source_revision === entity.source_revision && t.fields[key]
    ? { text: t.fields[key], lang: locale }
    : { text: fallback, lang: 'id' };
}
export const productName = (p: Product, locale: Locale) => translated(p, 'name', p.name_id, locale);
export function validLineURL(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === 'https:' &&
      ['line.me', 'lin.ee'].includes(u.hostname) &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === '443')
    );
  } catch {
    return false;
  }
}
export function lineAvailable(s: Settings) {
  return (
    s.line_enabled &&
    (s.line_mode === 'official_account'
      ? /^@?[a-zA-Z0-9._-]{2,100}$/.test(s.line_official_id)
      : validLineURL(s.line_url))
  );
}
export function orderMessage(
  p: Product,
  quantity: number,
  locale: Locale,
  unit: number,
  origin: string,
) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
    throw new Error('Jumlah harus 1–99.');
  const url = `${origin}${locale === 'id' ? '/' : `/${locale}`}?product=${encodeURIComponent(p.id)}`;
  const name = productName(p, locale).text;
  if (locale === 'ko')
    return `안녕하세요, Tempe Segar 상품을 주문하고 싶습니다.\n\n상품: ${name}\n상품 코드: ${p.sku}\n단가: ${won(unit)}\n수량: ${quantity}\n상품 소계: ${won(unit * quantity)}\n\n재고, 배송비 및 결제 방법을 확인해 주세요.\n상품 링크: ${url}`;
  if (locale === 'en')
    return `Hello Tempe Segar, I would like to order:\n\nProduct: ${name}\nProduct code: ${p.sku}\nUnit price: ${won(unit)}\nQuantity: ${quantity}\nProduct subtotal: ${won(unit * quantity)}\n\nPlease confirm availability, shipping fees, and payment options.\nProduct link: ${url}`;
  return `Halo Tempe Segar, saya ingin memesan:\n\nProduk: ${name}\nKode: ${p.sku}\nHarga satuan: ${won(unit)}\nJumlah: ${quantity}\nSubtotal produk: ${won(unit * quantity)}\n\nMohon konfirmasi ketersediaan, ongkir, dan cara pembayaran.\nTautan produk: ${url}`;
}
export function channelURL(s: Settings, channel: 'whatsapp' | 'line', message: string) {
  if (channel === 'whatsapp' && s.whatsapp_enabled && /^\d{8,15}$/.test(s.whatsapp_number))
    return `https://wa.me/${s.whatsapp_number}?text=${encodeURIComponent(message)}`;
  if (channel === 'line' && lineAvailable(s))
    return s.line_mode === 'official_account'
      ? `https://line.me/R/oaMessage/${encodeURIComponent(s.line_official_id)}/?${encodeURIComponent(message)}`
      : s.line_url;
  throw new Error('Kanal belum tersedia.');
}
