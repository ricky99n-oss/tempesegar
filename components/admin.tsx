'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Package,
  FilePenLine,
  AlertCircle,
  Languages,
  Tag,
  Star,
  Save,
} from 'lucide-react';
import type { Product, Category, Featured, Settings, Media } from '@/lib/types';
import { price, won } from '@/lib/business';
import { seoulInput, seoulUTC } from '@/lib/time';
import {
  api,
  ApiError,
  Checkbox,
  DeleteButton,
  Field,
  TextArea,
  type FieldErrors,
} from './admin-fields';
import { ProductEditor } from './product-editor';
import { TranslationEditor } from './translation-editor';
import { MediaEditor } from './media-editor';
type Props = {
  path: string[];
  products: Product[];
  categories: Category[];
  featured: Featured | null;
  settings: Settings;
  now: number;
};
export function Admin(props: Props) {
  const { path, products, categories } = props;
  const [search, setSearch] = useState(''),
    [status, setStatus] = useState(''),
    [stock, setStock] = useState(''),
    [sort, setSort] = useState('recommended');
  const router = useRouter();
  if (path[0] === 'products' && path.length > 1)
    return (
      <ProductEditor
        key={path[1]}
        product={products.find((p) => p.id === path[1])}
        categories={categories}
      />
    );
  if (path[0] === 'categories') return <Categories categories={categories} />;
  if (path[0] === 'featured')
    return <FeaturedEditor products={products} initial={props.featured} />;
  if (path[0] === 'settings') return <SettingsEditor initial={props.settings} />;
  if (path[0] === 'products') {
    const filtered = products
      .filter(
        (p) =>
          `${p.name_id} ${p.sku}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()) &&
          (!status || p.status === status) &&
          (!stock || p.availability === stock),
      )
      .sort((a, b) =>
        sort === 'price_asc'
          ? price(a, props.now) - price(b, props.now)
          : sort === 'price_desc'
            ? price(b, props.now) - price(a, props.now)
            : sort === 'newest'
              ? b.created_at.localeCompare(a.created_at)
              : Number(b.is_recommended) - Number(a.is_recommended) || a.sort_order - b.sort_order,
      );
    return (
      <>
        <div className="admin-page-title">
          <div>
            <h1>Produk</h1>
            <p>Kelola {products.length} produk di etalase Anda.</p>
          </div>
          <Link className="button button-primary" href="/admin/products/new">
            <Plus size={18} />
            Tambah produk
          </Link>
        </div>
        <div className="admin-search">
          <Search size={18} />
          <input
            aria-label="Cari produk admin"
            placeholder="Cari nama atau SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div
          className="select-tools"
          style={{ marginBottom: 20, justifyContent: 'flex-start', flexWrap: 'wrap' }}
        >
          <select
            aria-label="Filter publikasi"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Semua status</option>
            <option value="published">Terbit</option>
            <option value="draft">Draft</option>
            <option value="archived">Arsip</option>
          </select>
          <select aria-label="Filter stok" value={stock} onChange={(e) => setStock(e.target.value)}>
            <option value="">Semua ketersediaan</option>
            <option value="available">Tersedia</option>
            <option value="preorder">Preorder</option>
            <option value="out_of_stock">Habis</option>
          </select>
          <select aria-label="Urutan admin" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recommended">Rekomendasi</option>
            <option value="newest">Terbaru</option>
            <option value="price_asc">Harga terendah</option>
            <option value="price_desc">Harga tertinggi</option>
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>PRODUK</th>
                <th>HARGA</th>
                <th>STATUS</th>
                <th>TERJEMAHAN</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product-name">
                      {p.images[0] ? (
                        <img src={p.images[0].url} alt="" width="48" height="48" />
                      ) : (
                        <Package size={30} />
                      )}
                      <div>
                        <strong>{p.name_id}</strong>
                        <small>
                          {p.sku} ·{' '}
                          {
                            { available: 'Tersedia', preorder: 'Preorder', out_of_stock: 'Habis' }[
                              p.availability
                            ]
                          }
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>{won(price(p, props.now))}</td>
                  <td>
                    <span className={`status-pill ${p.status}`}>
                      {{ published: 'Terbit', draft: 'Draft', archived: 'Arsip' }[p.status]}
                    </span>
                  </td>
                  <td>
                    {['ko', 'en'].map((l) => (
                      <span
                        key={l}
                        className={`status-pill ${p.translations[l as 'ko' | 'en']?.status === 'ready' ? '' : 'draft'}`}
                        style={{ marginRight: 4 }}
                      >
                        {l.toUpperCase()} ·{' '}
                        {p.translations[l as 'ko' | 'en']?.status === 'ready' ? 'Siap' : 'Periksa'}
                      </span>
                    ))}
                  </td>
                  <td>
                    <Link className="table-action" href={`/admin/products/${p.id}/edit`}>
                      Edit
                    </Link>
                    {p.status !== 'archived' && (
                      <button
                        className="table-action"
                        onClick={async () => {
                          try {
                            await api(`products/${p.id}`, 'PATCH', { ...p, status: 'archived' });
                            router.refresh();
                          } catch (e) {
                            window.alert(e instanceof Error ? e.message : 'Gagal mengarsipkan.');
                          }
                        }}
                      >
                        Arsip
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div className="admin-empty">Belum ada produk yang sesuai.</div>}
        </div>
      </>
    );
  }
  const now = props.now;
  const published = products.filter((p) => p.status === 'published').length;
  const needs = products.filter((p) =>
    (['ko', 'en'] as const).some(
      (l) => !p.translations[l] || p.translations[l]?.status !== 'ready',
    ),
  ).length;
  const stats = [
    ['Produk terbit', published, Package],
    ['Draft produk', products.filter((p) => p.status === 'draft').length, FilePenLine],
    ['Produk habis', products.filter((p) => p.availability === 'out_of_stock').length, AlertCircle],
    ['Promo aktif', products.filter((p) => price(p, now) < p.price_krw).length, Tag],
    ['Terjemahan perlu diperiksa', needs, Languages],
    ['Kategori aktif', categories.filter((c) => c.is_active).length, Star],
  ] as const;
  return (
    <>
      <div className="admin-page-title">
        <div>
          <h1>Selamat datang di ruang toko.</h1>
          <p>Kelola etalase Tempe Segar dari satu tempat.</p>
        </div>
        <Link className="button button-primary" href="/admin/products/new">
          <Plus size={17} />
          Tambah produk
        </Link>
      </div>
      <div className="stats-grid">
        {stats.map(([label, value, Icon]) => (
          <article className="stat-card" key={label}>
            <span>
              {label}
              <Icon size={18} />
            </span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <section className="admin-panel">
        <h2>Mulai dari produk Anda</h2>
        <p>
          Masukkan nama, foto asli, satuan, serta harga Won yang sebenarnya. Terbitkan produk
          setelah informasinya siap. Pengunjung memilih jumlah dan kanal chat; penyelesaian pesanan
          tetap berlangsung melalui WhatsApp atau LINE.
        </p>
        <Link className="button button-outline" href="/admin/products">
          Kelola produk
        </Link>
      </section>
      <section className="admin-panel">
        <h2>Bahasa & kanal pemesanan</h2>
        <p>
          Indonesia menjadi sumber konten. Terjemahan otomatis memerlukan konfigurasi Google Cloud;
          hasil dapat dikoreksi dan dikunci. LINE baru aktif setelah Anda memasukkan ID Official
          Account atau tautan resmi toko.
        </p>
        <Link className="button button-outline" href="/admin/settings">
          Pengaturan toko
        </Link>
      </section>
    </>
  );
}
const emptyCategory: Category = {
  id: '',
  name_id: '',
  slug: '',
  sort_order: 0,
  is_active: true,
  revision: 0,
  source_revision: 0,
  source_hash: '',
  translations: {},
};
function Categories({ categories }: { categories: Category[] }) {
  const [c, setC] = useState<Category>({ ...emptyCategory }),
    [stored, setStored] = useState<Category | null>(null),
    [busy, setBusy] = useState(false),
    [errors, setErrors] = useState<FieldErrors>({}),
    [notice, setNotice] = useState('');
  const router = useRouter();
  return (
    <>
      <div className="admin-page-title">
        <div>
          <h1>Kategori</h1>
          <p>Susun kategori yang tampil sebagai chip di katalog.</p>
        </div>
        <button
          className="button button-outline"
          onClick={() => {
            setC({ ...emptyCategory });
            setStored(null);
            setNotice('');
            setErrors({});
          }}
        >
          <Plus size={17} />
          Kategori baru
        </button>
      </div>
      <div className="admin-form-layout">
        <div>
          <form
            className="form-section"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setNotice('');
              setErrors({});
              try {
                const next = await api<Category>(
                  c.id ? `categories/${c.id}` : 'categories',
                  c.id ? 'PATCH' : 'POST',
                  c,
                );
                setC(next);
                setStored(next);
                setNotice('Kategori disimpan.');
                router.refresh();
              } catch (e) {
                if (e instanceof ApiError) setErrors(e.fields);
                setNotice(e instanceof Error ? e.message : 'Gagal menyimpan.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>{c.id ? 'Edit kategori' : 'Tambah kategori'}</h2>
            <Field
              label="Nama (Indonesia)"
              value={c.name_id}
              maxLength={120}
              minLength={2}
              required
              onChange={(e) => setC((v) => ({ ...v, name_id: e.target.value }))}
              error={errors.name_id}
            />
            <Field
              label="Slug"
              value={c.slug}
              required
              pattern="[a-z0-9-]+"
              onChange={(e) => setC((v) => ({ ...v, slug: e.target.value }))}
              error={errors.slug}
            />
            <Field
              label="Urutan"
              type="number"
              min={0}
              max={100000}
              value={c.sort_order}
              onChange={(e) => setC((v) => ({ ...v, sort_order: Number(e.target.value) }))}
              error={errors.sort_order}
            />
            <Checkbox
              label="Kategori aktif"
              checked={c.is_active}
              onChange={(v) => setC((c) => ({ ...c, is_active: v }))}
            />
            <div className="form-actions">
              <button className="button button-primary" disabled={busy}>
                <Save size={17} />
                Simpan kategori
              </button>
            </div>
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
          </form>
          {stored && (
            <TranslationEditor
              key={`${stored.id}:${stored.revision}`}
              type="categories"
              value={stored}
              onChange={(v) => {
                const next = v as Category;
                setStored(next);
                setC((c) => ({ ...c, revision: next.revision, translations: next.translations }));
                router.refresh();
              }}
            />
          )}
        </div>
        <div>
          {categories.map((cat) => (
            <section key={cat.id} className="form-section">
              <h2>{cat.name_id}</h2>
              <p className="form-help">
                {cat.is_active ? 'Aktif' : 'Nonaktif'} · {cat.slug}
              </p>
              <div className="form-actions">
                <button
                  className="table-action"
                  onClick={() => {
                    setC(cat);
                    setStored(cat);
                    setNotice('');
                    setErrors({});
                  }}
                >
                  Edit kategori
                </button>
                <DeleteButton
                  name={cat.name_id}
                  onDelete={async (confirmName) => {
                    await api(`categories/${cat.id}`, 'DELETE', { confirmName });
                    if (c.id === cat.id) {
                      setC({ ...emptyCategory });
                      setStored(null);
                    }
                    router.refresh();
                  }}
                />
              </div>
            </section>
          ))}
          {!categories.length && <p className="admin-empty">Belum ada kategori.</p>}
        </div>
      </div>
    </>
  );
}
const emptyFeatured: Featured = {
  id: '1',
  enabled: false,
  mode: 'promo',
  product_id: null,
  title_id: 'Promo Hari Ini',
  subtitle_id: '',
  cta_id: 'Pesan sekarang',
  image_id: null,
  starts_at: null,
  ends_at: null,
  revision: 0,
  source_revision: 0,
  source_hash: '',
  translations: {},
};
function FeaturedEditor({ products, initial }: { products: Product[]; initial: Featured | null }) {
  const [f, setF] = useState(initial || emptyFeatured),
    [stored, setStored] = useState(initial),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [errors, setErrors] = useState<FieldErrors>({}),
    [images, setImages] = useState<Media[]>(
      initial?.image_id
        ? [
            {
              id: initial.image_id,
              url: `/media/${initial.image_id}`,
              alt_id: '',
              width: 600,
              height: 600,
            },
          ]
        : [],
    );
  const router = useRouter();
  function patch<K extends keyof Featured>(k: K, v: Featured[K]) {
    setF((f) => ({ ...f, [k]: v }));
  }
  return (
    <>
      <div className="admin-page-title">
        <div>
          <h1>Satu spot unggulan</h1>
          <p>Atur promo atau pilihan terlaris di depan katalog.</p>
        </div>
      </div>
      <form
        className="form-section"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErrors({});
          setNotice('');
          try {
            const next = await api<Featured>('featured', 'PATCH', {
              ...f,
              image_id: images[0]?.id || null,
            });
            setF(next);
            setStored(next);
            setNotice('Spot unggulan disimpan.');
            router.refresh();
          } catch (e) {
            if (e instanceof ApiError) setErrors(e.fields);
            setNotice(e instanceof Error ? e.message : 'Gagal menyimpan.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Checkbox
          label="Aktifkan spot unggulan"
          checked={f.enabled}
          onChange={(v) => patch('enabled', v)}
        />
        <div className="field-row">
          <label className="field">
            <span>Mode</span>
            <select
              value={f.mode}
              onChange={(e) => patch('mode', e.target.value as Featured['mode'])}
            >
              <option value="promo">Promo Hari Ini</option>
              <option value="best_seller">Produk Terlaris (editorial)</option>
            </select>
          </label>
          <label className="field">
            <span>Produk pilihan</span>
            <select
              value={f.product_id || ''}
              onChange={(e) => patch('product_id', e.target.value || null)}
            >
              <option value="">Pilih produk</option>
              {products.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name_id} ({p.status})
                </option>
              ))}
            </select>
          </label>
        </div>
        <Field
          label="Judul (Indonesia)"
          maxLength={120}
          value={f.title_id}
          onChange={(e) => patch('title_id', e.target.value)}
          error={errors.title_id}
        />
        <TextArea
          label="Subjudul (Indonesia)"
          maxLength={240}
          value={f.subtitle_id}
          onChange={(e) => patch('subtitle_id', e.target.value)}
          error={errors.subtitle_id}
        />
        <Field
          label="Label tombol (Indonesia)"
          maxLength={60}
          value={f.cta_id}
          onChange={(e) => patch('cta_id', e.target.value)}
          error={errors.cta_id}
        />
        <div className="field-row">
          <Field
            label="Mulai (Asia/Seoul)"
            type="datetime-local"
            value={seoulInput(f.starts_at)}
            onChange={(e) => patch('starts_at', seoulUTC(e.target.value))}
            error={errors.starts_at}
          />
          <Field
            label="Selesai (Asia/Seoul)"
            type="datetime-local"
            value={seoulInput(f.ends_at)}
            onChange={(e) => patch('ends_at', seoulUTC(e.target.value))}
            error={errors.ends_at}
          />
        </div>
        <p className="form-help">
          Jika produk tidak terbit, habis, atau jadwal tidak aktif, spot disembunyikan. Jadwal
          banner tidak memperpanjang diskon produk. Terlaris merupakan pilihan editorial Anda.
        </p>
        <h2 style={{ marginTop: 25 }}>Gambar spot, opsional</h2>
        <MediaEditor images={images} onChange={setImages} max={1} onBusy={setBusy} />
        <div className="form-actions">
          <button className="button button-primary" disabled={busy}>
            <Save size={17} />
            Simpan spot
          </button>
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </form>
      {stored && (
        <TranslationEditor
          key={stored.revision}
          type="featured"
          value={stored}
          onChange={(v) => {
            const next = v as Featured;
            setStored(next);
            setF((f) => ({ ...f, revision: next.revision, translations: next.translations }));
            router.refresh();
          }}
        />
      )}
    </>
  );
}
function SettingsEditor({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [errors, setErrors] = useState<FieldErrors>({}),
    [logo, setLogo] = useState<Media[]>(
      initial.logo_id
        ? [
            {
              id: initial.logo_id,
              url: `/media/${initial.logo_id}`,
              alt_id: 'Logo toko',
              width: 600,
              height: 600,
            },
          ]
        : [],
    );
  const router = useRouter();
  function patch<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((s) => ({ ...s, [k]: v }));
  }
  return (
    <>
      <div className="admin-page-title">
        <div>
          <h1>Pengaturan toko</h1>
          <p>Kontak, kanal pemesanan, dan teks publik.</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setNotice('');
          setErrors({});
          try {
            const next = await api<Settings>('settings', 'PATCH', {
              ...s,
              logo_id: logo[0]?.id || null,
            });
            setS(next);
            setNotice('Pengaturan disimpan.');
            router.refresh();
          } catch (e) {
            if (e instanceof ApiError) setErrors(e.fields);
            setNotice(e instanceof Error ? e.message : 'Gagal menyimpan.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="admin-form-layout">
          <div>
            <section className="form-section">
              <h2>Identitas toko</h2>
              <Field
                label="Nama toko"
                value={s.store_name}
                minLength={2}
                maxLength={80}
                required
                onChange={(e) => patch('store_name', e.target.value)}
                error={errors.store_name}
              />
              <Field
                label="Kontak tampilan"
                value={s.contact_display}
                maxLength={30}
                required
                onChange={(e) => patch('contact_display', e.target.value)}
                error={errors.contact_display}
              />
              <TextArea
                label="Teks publik Indonesia"
                maxLength={500}
                value={s.about_id}
                onChange={(e) => patch('about_id', e.target.value)}
                error={errors.about_id}
              />
              <TextArea
                label="Teks publik 한국어"
                maxLength={500}
                value={s.about_ko}
                onChange={(e) => patch('about_ko', e.target.value)}
                error={errors.about_ko}
              />
              <TextArea
                label="Teks publik English"
                maxLength={500}
                value={s.about_en}
                onChange={(e) => patch('about_en', e.target.value)}
                error={errors.about_en}
              />
              <h2 style={{ marginTop: 25 }}>Logo / foto toko, opsional</h2>
              <MediaEditor images={logo} onChange={setLogo} max={1} onBusy={setBusy} />
            </section>
            <section className="form-section">
              <h2>LINE</h2>
              <Checkbox
                label="Aktifkan kanal LINE"
                checked={s.line_enabled}
                onChange={(v) => patch('line_enabled', v)}
              />
              {errors.line_enabled && (
                <p className="field-error">{errors.line_enabled.join(' ')}</p>
              )}
              <label className="field">
                <span>Mode LINE</span>
                <select
                  value={s.line_mode}
                  onChange={(e) => patch('line_mode', e.target.value as Settings['line_mode'])}
                >
                  <option value="official_account">Official Account</option>
                  <option value="shared_link">Tautan toko yang dibagikan</option>
                </select>
              </label>
              <Field
                label="LINE Official Account ID"
                value={s.line_official_id}
                maxLength={100}
                placeholder="@id-toko"
                onChange={(e) => patch('line_official_id', e.target.value)}
                error={errors.line_official_id}
              />
              <Field
                label="Tautan LINE resmi"
                type="url"
                value={s.line_url}
                maxLength={500}
                placeholder="https://lin.ee/…"
                onChange={(e) => patch('line_url', e.target.value)}
                error={errors.line_url}
              />
              <p className="form-help">
                Gunakan ID akun sebenarnya atau tautan HTTPS dari line.me / lin.ee. Nomor telepon
                tidak digunakan untuk menebak ID. Mode tautan toko menyediakan salin pesan untuk
                ditempel manual.
              </p>
            </section>
          </div>
          <aside>
            <section className="form-section">
              <h2>WhatsApp</h2>
              <Checkbox
                label="Aktifkan WhatsApp"
                checked={s.whatsapp_enabled}
                onChange={(v) => patch('whatsapp_enabled', v)}
              />
              <Field
                label="Nomor click-to-chat"
                value={s.whatsapp_number}
                inputMode="numeric"
                pattern="[0-9]{8,15}"
                required
                onChange={(e) => patch('whatsapp_number', e.target.value)}
                help="Kode negara + nomor, tanpa tanda + atau spasi. Uji nomor ini di aplikasi WhatsApp."
                error={errors.whatsapp_number}
              />
              <button
                className="button button-primary full-width"
                style={{ marginTop: 20 }}
                disabled={busy}
              >
                <Save size={17} />
                Simpan pengaturan
              </button>
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
            </section>
            <section className="form-section">
              <h2>Konfigurasi layanan</h2>
              <p className="form-help">
                Database: Cloudflare D1. Gambar: R2 & Images. Kredensial Google Cloud dikelola lewat
                secret Worker; rahasia tidak diisi melalui formulir publik ini.
              </p>
            </section>
          </aside>
        </div>
      </form>
      <section className="admin-panel">
        <h2>Pemeliharaan gambar</h2>
        <p>
          Bersihkan upload yang tidak dipakai dan berumur lebih dari 24 jam. Gambar yang
          direferensikan produk, logo, atau spot tetap disimpan.
        </p>
        <button
          className="button button-outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api<{ removed: number }>('maintenance', 'POST', {});
              setNotice(`${r.removed} gambar tidak terpakai dibersihkan.`);
            } catch (e) {
              setNotice(e instanceof Error ? e.message : 'Gagal membersihkan.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Bersihkan gambar tidak terpakai
        </button>
      </section>
    </>
  );
}
