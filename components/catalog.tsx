'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search,
  SlidersHorizontal,
  Leaf,
  X,
  Minus,
  Plus,
  MessageCircle,
  Copy,
  Check,
  PackageOpen,
  Sprout,
  ImageOff,
  LoaderCircle,
} from 'lucide-react';
import { messages } from '@/lib/i18n';
import {
  activeWindow,
  lineAvailable,
  orderMessage,
  price,
  productName,
  translated,
  won,
} from '@/lib/business';
import type { CatalogData, Locale, Product } from '@/lib/types';
import { Brand } from './brand';
function ProductImage({
  p,
  locale,
  idx = 0,
  priority = false,
}: {
  p: Product;
  locale: Locale;
  idx?: number;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const image = p.images[idx] || p.images[0];
  const alt = image ? translated(p, `alt:${image.id}`, image.alt_id || p.name_id, locale) : null;
  return image && !failed ? (
    <>
      <img
        src={image.url}
        alt={alt?.text || p.name_id}
        width={image.width}
        height={image.height}
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setFailed(true)}
      />
    </>
  ) : (
    <span className="image-fallback">
      <ImageOff />
      <span>{messages[locale].imageFallback}</span>
    </span>
  );
}
export default function Catalog({ data, locale }: { data: CatalogData; locale: Locale }) {
  const t = messages[locale],
    router = useRouter(),
    params = useSearchParams(),
    pathname = usePathname();
  const [search, setSearch] = useState(params.get('q') || '');
  const [now, setNow] = useState(data.now);
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(0);
  const [current, setCurrent] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [link, setLink] = useState<{ url: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [missing, setMissing] = useState(false);
  const trigger = useRef<HTMLElement | null>(null),
    dialogTitle = useRef<HTMLHeadingElement | null>(null),
    previousSelection = useRef<string | null>(null);
  const selected = params.get('product'),
    ordering = params.get('order') === '1';
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function update(changes: Record<string, string | null>, replace = false) {
    const q = new URLSearchParams(params.toString());
    Object.entries(changes).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)));
    const url = `${pathname}${q.size ? '?' + q.toString() : ''}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }
  useEffect(() => {
    const timer = setInterval(() => setNow(data.now + Math.max(0, Date.now() - started)), 1000);
    const started = Date.now();
    return () => clearInterval(timer);
  }, [data.now]);
  // URL changes include Back/Forward and language navigation; synchronize the controlled input.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch(params.get('q') || '');
  }, [params]);
  useEffect(() => {
    if (search === (params.get('q') || '')) return;
    const timer = setTimeout(() => update({ q: search || null, limit: null }, true), 300);
    return () => clearTimeout(timer); /* URL owns filter state */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  /* eslint-disable react-hooks/set-state-in-effect -- Synchronize the URL-selected dialog with fresh server snapshots. */
  useEffect(() => {
    // Reset dialog-local state when its URL-selected product changes.
    if (previousSelection.current !== selected) {
      setQuantity(1);
      setImage(0);
      setNotice('');
      setLink(null);
      setCopied(false);
      setMissing(false);
      previousSelection.current = selected;
    }
    // Keep the loaded record in sync with the URL-selected product and server snapshots.
    const p = data.products.find((p) => p.id === selected) || null;
    setCurrent(p);
    if (!selected) return;
    if (data.demo) {
      setMissing(!p);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/catalog/products/${encodeURIComponent(selected)}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) {
          setCurrent(null);
          setMissing(true);
          return;
        }
        setCurrent(await r.json());
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setNotice(t.error);
      });
    return () => controller.abort();
  }, [selected, data.products, data.demo, t.error]);
  /* eslint-enable react-hooks/set-state-in-effect */
  const q = (params.get('q') || '').normalize('NFKC').toLocaleLowerCase();
  const cat = params.get('category'),
    stock = params.get('availability'),
    sort = params.get('sort') || 'recommended';
  const filtered = data.products
    .filter(
      (p) =>
        (!q ||
          `${productName(p, locale).text} ${p.name_id} ${p.sku}`
            .normalize('NFKC')
            .toLocaleLowerCase()
            .includes(q)) &&
        (!cat || p.category_id === cat) &&
        (!stock || p.availability === stock),
    )
    .sort((a, b) =>
      sort === 'price_asc'
        ? price(a, now) - price(b, now)
        : sort === 'price_desc'
          ? price(b, now) - price(a, now)
          : sort === 'newest'
            ? b.created_at.localeCompare(a.created_at)
            : Number(b.is_recommended) - Number(a.is_recommended) ||
              a.sort_order - b.sort_order ||
              a.id.localeCompare(b.id),
    );
  const limit = Math.max(24, Math.min(10000, Number(params.get('limit')) || 24));
  const spot = data.featured;
  const featuredProduct =
    spot && spot.enabled && activeWindow(spot.starts_at, spot.ends_at, now)
      ? data.products.find((p) => p.id === spot.product_id && p.availability !== 'out_of_stock')
      : null;
  function open(p: Product, order = false) {
    trigger.current = document.activeElement as HTMLElement;
    update({ product: p.id, order: order ? '1' : null });
  }
  async function order(channel: 'whatsapp' | 'line') {
    if (!current || busy) return;
    if (data.demo) {
      setNotice(t.demoOrder);
      return;
    }
    setBusy(true);
    setNotice('');
    setLink(null);
    try {
      const r = await fetch('/api/order-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: current.id,
          quantity,
          locale,
          channel,
          expectedUnitPriceKrw: price(current, now),
        }),
      });
      const result = (await r.json()) as {
        url: string;
        message: string;
        code?: string;
        product?: Product;
      };
      if (r.status === 409 && result.product) {
        setCurrent(result.product);
        setNow(Date.now());
        setNotice(t.priceChanged);
        return;
      }
      if (!r.ok) {
        setNotice(result.code === 'UNAVAILABLE' ? t.missing : t.error);
        return;
      }
      setLink(result);
      const opened = window.open(result.url, '_blank', 'noopener,noreferrer');
      void opened;
    } catch {
      setNotice(t.error);
    } finally {
      setBusy(false);
    }
  }
  const unit = current ? price(current, now) : 0;
  const draft = current
    ? orderMessage(
        current,
        quantity,
        locale,
        unit,
        typeof window === 'undefined' ? 'https://example.com' : window.location.origin,
      )
    : '';
  async function copy() {
    try {
      await navigator.clipboard.writeText(link?.message || draft);
      setCopied(true);
    } catch {
      setNotice(t.error);
    }
  }
  const about = data.settings[`about_${locale}`] || data.settings.about_id;
  return (
    <>
      {data.demo && (
        <div className="demo-notice" role="status">
          {t.demo}
        </div>
      )}
      <header className="site-header">
        <div className="header-inner">
          <a href={locale === 'id' ? '/' : `/${locale}`} aria-label="Tempe Segar">
            <Brand
              imageUrl={data.settings.logo_id ? `/media/${data.settings.logo_id}` : undefined}
            />
          </a>
          <div className="header-search">
            <Search size={19} />
            <input
              aria-label={t.search}
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                aria-label={t.reset}
                onClick={() => {
                  setSearch('');
                  update({ q: null });
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>
          <label className="language-switch">
            <span className="sr-only">{t.language}</span>
            <select
              value={locale}
              onChange={(e) => {
                const dest = e.target.value === 'id' ? '/' : `/${e.target.value}`;
                router.push(`${dest}${params.size ? '?' + params.toString() : ''}`, {
                  scroll: false,
                });
              }}
            >
              <option value="id">ID · Indonesia</option>
              <option value="ko">KR · 한국어</option>
              <option value="en">EN · English</option>
            </select>
          </label>
        </div>
      </header>
      <main className="catalog-main">
        <div className="intro-line">
          <span>
            <span className="little-leaf">
              <Leaf size={14} />
            </span>{' '}
            {t.tag}
          </span>
          <span className="intro-chat">
            <MessageCircle size={15} /> +821065653524
          </span>
        </div>
        {featuredProduct && spot ? (
          <section className="featured">
            <div className="featured-copy">
              <span className="eyebrow">
                <span className="tiny-dot" />
                {spot.mode === 'promo' ? t.promo : t.best}
              </span>
              <h1 lang={translated(spot, 'title', spot.title_id, locale).lang}>
                {translated(spot, 'title', spot.title_id, locale).text}
              </h1>
              <p lang={translated(spot, 'subtitle', spot.subtitle_id, locale).lang}>
                {translated(spot, 'subtitle', spot.subtitle_id, locale).text}
              </p>
              <div className="featured-bottom">
                <button
                  className="button button-light"
                  onClick={() => open(featuredProduct, true)}
                  lang={translated(spot, 'cta', spot.cta_id, locale).lang}
                >
                  {translated(spot, 'cta', spot.cta_id, locale).text || t.order}
                  <MessageCircle size={17} />
                </button>
                <span className="featured-price">
                  {won(price(featuredProduct, now))}
                  <small lang={productName(featuredProduct, locale).lang}>
                    {productName(featuredProduct, locale).text}
                  </small>
                </span>
              </div>
            </div>
            <div className="featured-image">
              {spot.image_id ? (
                <img src={`/media/${spot.image_id}`} alt={spot.title_id} width="600" height="600" />
              ) : (
                <ProductImage p={featuredProduct} locale={locale} priority />
              )}
              <span className="featured-stamp">
                <Sprout size={26} />
                <span>
                  tempe
                  <br />
                  segar.
                </span>
              </span>
            </div>
          </section>
        ) : (
          <section className="welcome">
            <div>
              <span className="eyebrow">{t.intro}</span>
              <h1>
                {t.catalog}
                <span className="green-period">.</span>
              </h1>
              <p>{t.subtitle}</p>
            </div>
            <div className="welcome-art" aria-hidden="true">
              <Sprout size={68} strokeWidth={1.3} />
              <span>tempe segar</span>
            </div>
          </section>
        )}
        <section className="catalog-section" aria-label={t.catalog}>
          <div className="section-title">
            <div>
              <span className="eyebrow muted">{t.filters}</span>
              <h2>{t.catalog}</h2>
            </div>
            <span className="product-total">
              {filtered.length} {t.products}
            </span>
          </div>
          <div className="catalog-tools">
            <div className="category-chips" aria-label={t.all}>
              <button
                className={!cat ? 'active' : ''}
                onClick={() => update({ category: null, limit: null })}
              >
                <Leaf size={15} />
                {t.all}
              </button>
              {data.categories
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((c) => (
                  <button
                    key={c.id}
                    className={cat === c.id ? 'active' : ''}
                    onClick={() => update({ category: c.id, limit: null })}
                    lang={translated(c, 'name', c.name_id, locale).lang}
                  >
                    {translated(c, 'name', c.name_id, locale).text}
                  </button>
                ))}
            </div>
            <div className="select-tools">
              <SlidersHorizontal size={16} />
              <select
                aria-label={t.stock}
                value={stock || ''}
                onChange={(e) => update({ availability: e.target.value || null, limit: null })}
              >
                <option value="">{t.allStock}</option>
                <option value="available">{t.available}</option>
                <option value="preorder">{t.preorder}</option>
                <option value="out_of_stock">{t.out_of_stock}</option>
              </select>
              <select
                aria-label={t.sort}
                value={sort}
                onChange={(e) =>
                  update({
                    sort: e.target.value === 'recommended' ? null : e.target.value,
                    limit: null,
                  })
                }
              >
                <option value="recommended">{t.recommended}</option>
                <option value="newest">{t.newest}</option>
                <option value="price_asc">{t.low}</option>
                <option value="price_desc">{t.high}</option>
              </select>
            </div>
          </div>
          <div className="product-grid">
            {filtered.slice(0, limit).map((p, i) => {
              const effective = price(p, now),
                name = productName(p, locale);
              return (
                <article className="product-card" key={p.id}>
                  <button
                    className={`product-image image-tone-${i % 4}`}
                    onClick={() => open(p)}
                    aria-label={`${t.details}: ${name.text}`}
                  >
                    <ProductImage p={p} locale={locale} priority={i < 4} />
                    {p.is_best_seller ? (
                      <span className="card-badge">{t.best}</span>
                    ) : p.is_recommended ? (
                      <span className="card-badge">{t.choice}</span>
                    ) : null}
                    {effective < p.price_krw && (
                      <span className="sale-badge">
                        −{Math.round((1 - effective / p.price_krw) * 100)}%
                      </span>
                    )}
                  </button>
                  <div className="product-content">
                    <span className={`stock stock-${p.availability}`}>
                      <i />
                      {t[p.availability]}
                    </span>
                    <h3>
                      <button onClick={() => open(p)} lang={name.lang}>
                        {name.text}
                      </button>
                    </h3>
                    <p
                      className="product-unit"
                      lang={translated(p, 'unit_label', p.unit_label_id, locale).lang}
                    >
                      {translated(p, 'unit_label', p.unit_label_id, locale).text || ' '}
                    </p>
                    <div className="card-price">
                      <strong>{won(effective)}</strong>
                      {effective < p.price_krw && <del>{won(p.price_krw)}</del>}
                    </div>
                    <button
                      className="card-order"
                      onClick={() => open(p, true)}
                      disabled={p.availability === 'out_of_stock'}
                    >
                      <MessageCircle size={16} />
                      {p.availability === 'out_of_stock' ? t.out_of_stock : t.order}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!filtered.length && (
            <div className="empty-state">
              <span className="empty-icon">
                <PackageOpen size={42} strokeWidth={1.3} />
              </span>
              <h3>{data.products.length ? t.noResults : t.empty}</h3>
              <p>{data.products.length ? t.noResultsText : t.emptyText}</p>
              {data.products.length ? (
                <button
                  className="button button-primary"
                  onClick={() => {
                    setSearch('');
                    router.push(pathname, { scroll: false });
                  }}
                >
                  {t.reset}
                </button>
              ) : (
                data.settings.whatsapp_enabled && (
                  <a
                    className="button button-primary"
                    href={`https://wa.me/${data.settings.whatsapp_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={18} />
                    {t.contactCTA}
                  </a>
                )
              )}
            </div>
          )}
          {filtered.length > limit && (
            <div className="load-more">
              <p>
                {Math.min(limit, filtered.length)} / {filtered.length} {t.productCount}
              </p>
              <button
                className="button button-outline"
                onClick={() => update({ limit: String(limit + 24) })}
              >
                {t.more}
                <Plus size={17} />
              </button>
            </div>
          )}
        </section>
        <aside className="contact-strip">
          <div className="contact-icon">
            <MessageCircle size={29} />
          </div>
          <div>
            <h3>{t.contact}</h3>
            <p>{t.contactText}</p>
          </div>
          {data.settings.whatsapp_enabled && (
            <a
              className="button button-outline"
              href={`https://wa.me/${data.settings.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.contactCTA}
              <MessageCircle size={17} />
            </a>
          )}
        </aside>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div>
            <a href={pathname}>
              <Brand
                small
                imageUrl={data.settings.logo_id ? `/media/${data.settings.logo_id}` : undefined}
              />
            </a>
            <p>{about || t.footer}</p>
          </div>
          <div className="footer-contact">
            <span>{data.settings.contact_display}</span>
            <p>
              © {new Date(data.now).getUTCFullYear()} {data.settings.store_name}
            </p>
          </div>
        </div>
      </footer>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) update({ product: null, order: null });
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className={`product-dialog ${ordering ? 'order-dialog' : ''}`}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              dialogTitle.current?.focus();
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              trigger.current?.focus();
            }}
          >
            <Dialog.Close className="dialog-close" aria-label={t.close}>
              <X size={22} />
            </Dialog.Close>
            <Dialog.Title
              ref={dialogTitle}
              tabIndex={-1}
              className={ordering ? 'dialog-heading' : 'sr-only'}
            >
              {ordering ? t.channel : t.details}
            </Dialog.Title>
            <Dialog.Description className="sr-only">{t.shipping}</Dialog.Description>
            {missing ? (
              <p className="notice" role="alert">
                {t.missing}
              </p>
            ) : current ? (
              <>
                {!ordering && (
                  <div className="detail-gallery">
                    <div className="detail-image">
                      <ProductImage p={current} locale={locale} idx={image} />
                    </div>
                    {current.images.length > 1 && (
                      <div className="gallery-thumbs">
                        {current.images.map((img, idx) => (
                          <button
                            key={img.id}
                            aria-label={`${t.gallery} ${idx + 1}`}
                            aria-pressed={image === idx}
                            onClick={() => setImage(idx)}
                          >
                            <img src={img.url} width="70" height="70" alt={img.alt_id} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="dialog-body">
                  <div className="detail-heading">
                    <div>
                      <span className={`stock stock-${current.availability}`}>
                        <i />
                        {t[current.availability]}
                      </span>
                      <h2 lang={productName(current, locale).lang}>
                        {productName(current, locale).text}
                      </h2>
                      <p
                        className="product-unit"
                        lang={translated(current, 'unit_label', current.unit_label_id, locale).lang}
                      >
                        {translated(current, 'unit_label', current.unit_label_id, locale).text}{' '}
                        <span>· {current.sku}</span>
                      </p>
                    </div>
                    {ordering && (
                      <div className="order-thumb">
                        <ProductImage p={current} locale={locale} />
                      </div>
                    )}
                  </div>
                  <div className="detail-price">
                    <strong>{won(unit)}</strong>
                    {unit < current.price_krw && <del>{won(current.price_krw)}</del>}
                  </div>
                  {!ordering && (
                    <p
                      className="detail-description"
                      lang={translated(current, 'description', current.description_id, locale).lang}
                    >
                      {translated(current, 'description', current.description_id, locale).text}
                    </p>
                  )}
                  {current.availability === 'preorder' && (
                    <p className="preorder-note">{t.preorderNote}</p>
                  )}
                  <div className="quantity-row">
                    <label htmlFor="quantity">{t.quantity}</label>
                    <div className="quantity-control">
                      <button
                        aria-label={t.minus}
                        disabled={quantity <= 1}
                        onClick={() => {
                          setQuantity((v) => v - 1);
                          setLink(null);
                        }}
                      >
                        <Minus size={17} />
                      </button>
                      <input
                        id="quantity"
                        type="number"
                        min="1"
                        max="99"
                        value={quantity}
                        onChange={(e) => {
                          setQuantity(
                            Math.min(99, Math.max(1, Math.floor(Number(e.target.value) || 1))),
                          );
                          setLink(null);
                        }}
                      />
                      <button
                        aria-label={t.plus}
                        disabled={quantity >= 99}
                        onClick={() => {
                          setQuantity((v) => v + 1);
                          setLink(null);
                        }}
                      >
                        <Plus size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="subtotal-row">
                    <span>{t.subtotal}</span>
                    <strong>{won(unit * quantity)}</strong>
                  </div>
                  <p className="shipping-note">{t.shipping}</p>
                  {ordering ? (
                    <>
                      <div className="channel-options">
                        <button
                          className="channel channel-wa"
                          disabled={
                            busy ||
                            !data.settings.whatsapp_enabled ||
                            current.availability === 'out_of_stock'
                          }
                          onClick={() => order('whatsapp')}
                        >
                          <span className="channel-icon">
                            <MessageCircle size={24} />
                          </span>
                          <span>
                            {t.wa}
                            <small>WhatsApp</small>
                          </span>
                          {busy && <LoaderCircle className="spin" size={18} />}
                        </button>
                        <button
                          className="channel channel-line"
                          disabled={
                            busy ||
                            !lineAvailable(data.settings) ||
                            current.availability === 'out_of_stock'
                          }
                          onClick={() => order('line')}
                        >
                          <span className="channel-icon line-icon">LINE</span>
                          <span>
                            {t.line}
                            <small>{lineAvailable(data.settings) ? 'LINE' : t.unavailable}</small>
                          </span>
                        </button>
                      </div>
                      {link && (
                        <div className="chat-fallback">
                          <p>{t.chatNote}</p>
                          <a
                            className="button button-primary"
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t.continue}
                            <MessageCircle size={17} />
                          </a>
                        </div>
                      )}
                      <button className="copy-button" onClick={copy}>
                        {copied ? <Check size={17} /> : <Copy size={17} />}{' '}
                        {copied ? t.copied : t.copy}
                      </button>
                      {link && (
                        <textarea
                          aria-label={t.copy}
                          readOnly
                          value={link.message}
                          className="message-preview"
                        />
                      )}
                    </>
                  ) : (
                    <button
                      className="button button-primary full-width"
                      disabled={current.availability === 'out_of_stock'}
                      onClick={() => update({ order: '1' })}
                    >
                      <MessageCircle size={19} />
                      {t.order}
                    </button>
                  )}
                  {notice && (
                    <p role="alert" className="notice">
                      {notice}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p>{t.loading}</p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
