'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Save, Package, LoaderCircle } from 'lucide-react';
import type { Product, Category } from '@/lib/types';
import {
  api,
  ApiError,
  Checkbox,
  DeleteButton,
  Field,
  TextArea,
  type FieldErrors,
} from './admin-fields';
import { MediaEditor } from './media-editor';
import { TranslationEditor } from './translation-editor';
import { seoulInput, seoulUTC } from '@/lib/time';
const blank: Product = {
  id: '',
  sku: '',
  slug: '',
  category_id: null,
  name_id: '',
  short_description_id: '',
  description_id: '',
  unit_label_id: '',
  price_krw: 0,
  sale_price_krw: null,
  sale_starts_at: null,
  sale_ends_at: null,
  availability: 'available',
  status: 'draft',
  is_recommended: false,
  is_best_seller: false,
  sort_order: 0,
  images: [],
  revision: 0,
  source_revision: 0,
  source_hash: '',
  created_at: '',
  updated_at: '',
  translations: {},
};
export function ProductEditor({
  product,
  categories,
}: {
  product?: Product;
  categories: Category[];
}) {
  const params = useSearchParams();
  const [p, setP] = useState<Product>(product || blank),
    [stored, setStored] = useState<Product | undefined>(product),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [errors, setErrors] = useState<FieldErrors>({}),
    [notice, setNotice] = useState(
      params.get('saved') === '1' ? 'Produk disimpan. Periksa status terjemahan di bawah.' : '',
    ),
    [success, setSuccess] = useState(params.get('saved') === '1');
  const router = useRouter();
  function patch<K extends keyof Product>(key: K, value: Product[K]) {
    setP((v) => ({ ...v, [key]: value }));
  }
  const f = (key: keyof Product, label: string, extra: Record<string, unknown> = {}) => (
    <Field
      label={label}
      name={key}
      value={String(p[key] ?? '')}
      onChange={(e) => patch(key, e.target.value as never)}
      error={errors[key]}
      {...extra}
    />
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setNotice('');
    setSuccess(false);
    try {
      const next = await api<Product & { warning?: string }>(
        p.id ? `products/${p.id}` : 'products',
        p.id ? 'PATCH' : 'POST',
        p,
      );
      setP(next);
      setStored(next);
      setSuccess(true);
      setNotice(next.warning || 'Produk disimpan. Periksa status terjemahan di bawah.');
      if (!p.id) router.replace(`/admin/products/${next.id}/edit?saved=1`);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fields);
      setNotice(e instanceof Error ? e.message : 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-title">
        <div>
          <h1>{p.id ? 'Edit produk' : 'Tambah produk'}</h1>
          <p>Isi sumber Indonesia. Harga selalu dalam Won Korea.</p>
        </div>
        <Link className="button button-outline" href="/admin/products">
          Daftar produk
        </Link>
      </div>
      <form onSubmit={save}>
        <div className="admin-form-layout">
          <div>
            <section className="form-section">
              <h2>
                <Package size={19} />
                Informasi produk
              </h2>
              {f('name_id', 'Nama produk (Indonesia)', {
                required: true,
                minLength: 2,
                maxLength: 120,
              })}
              <div className="field-row">
                {f('sku', 'SKU / kode produk', { required: true, maxLength: 40 })}
                {f('slug', 'Slug internal stabil', {
                  required: true,
                  maxLength: 140,
                  placeholder: 'tempe-segar-500-g',
                  pattern: '[a-z0-9-]+',
                })}
              </div>
              <label className="field">
                <span>Kategori</span>
                <select
                  value={p.category_id || ''}
                  onChange={(e) => patch('category_id', e.target.value || null)}
                >
                  <option value="">Tanpa kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_id}
                    </option>
                  ))}
                </select>
              </label>
              <TextArea
                label="Deskripsi singkat"
                name="short_description_id"
                maxLength={240}
                value={p.short_description_id}
                onChange={(e) => patch('short_description_id', e.target.value)}
                error={errors.short_description_id}
              />
              <TextArea
                label="Deskripsi lengkap"
                name="description_id"
                maxLength={5000}
                rows={6}
                value={p.description_id}
                onChange={(e) => patch('description_id', e.target.value)}
                error={errors.description_id}
              />
              {f('unit_label_id', 'Satuan jual', {
                maxLength: 80,
                placeholder: 'Contoh: 500 g / kemasan',
              })}
            </section>
            <section className="form-section">
              <h2>Foto produk</h2>
              <MediaEditor
                images={p.images}
                onChange={(v) => patch('images', v)}
                onBusy={setUploading}
              />
              {errors.images && <p className="field-error">{errors.images.join(' ')}</p>}
            </section>
            <section className="form-section">
              <h2>Harga & jadwal promo</h2>
              <div className="field-row">
                <Field
                  label="Harga normal (₩)"
                  name="price_krw"
                  type="number"
                  min={1}
                  max={100000000}
                  step={1}
                  required
                  value={p.price_krw || ''}
                  onChange={(e) => patch('price_krw', Number(e.target.value))}
                  error={errors.price_krw}
                />
                <Field
                  label="Harga promo (₩), opsional"
                  name="sale_price_krw"
                  type="number"
                  min={1}
                  max={100000000}
                  step={1}
                  value={p.sale_price_krw ?? ''}
                  onChange={(e) =>
                    patch('sale_price_krw', e.target.value === '' ? null : Number(e.target.value))
                  }
                  error={errors.sale_price_krw}
                />
              </div>
              <div className="field-row">
                <Field
                  label="Mulai promo (Asia/Seoul)"
                  type="datetime-local"
                  value={seoulInput(p.sale_starts_at)}
                  onChange={(e) => patch('sale_starts_at', seoulUTC(e.target.value))}
                  error={errors.sale_starts_at}
                />
                <Field
                  label="Selesai promo (Asia/Seoul)"
                  type="datetime-local"
                  value={seoulInput(p.sale_ends_at)}
                  onChange={(e) => patch('sale_ends_at', seoulUTC(e.target.value))}
                  error={errors.sale_ends_at}
                />
              </div>
              <p className="form-help">
                Harga promo harus lebih rendah dari harga normal. Batas waktu yang kosong tidak
                dibatasi. Jadwal ditampilkan dalam waktu Korea dan disimpan sebagai UTC.
              </p>
            </section>
          </div>
          <aside className="admin-form-aside">
            <section className="form-section">
              <h2>Publikasi</h2>
              <label className="field">
                <span>Status produk</span>
                <select
                  value={p.status}
                  onChange={(e) => patch('status', e.target.value as Product['status'])}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Terbit</option>
                  <option value="archived">Arsip</option>
                </select>
              </label>
              <label className="field">
                <span>Ketersediaan</span>
                <select
                  value={p.availability}
                  onChange={(e) => patch('availability', e.target.value as Product['availability'])}
                >
                  <option value="available">Tersedia</option>
                  <option value="preorder">Preorder</option>
                  <option value="out_of_stock">Habis</option>
                </select>
              </label>
              <Field
                label="Urutan tampil"
                type="number"
                min={0}
                max={100000}
                step={1}
                value={p.sort_order}
                onChange={(e) => patch('sort_order', Number(e.target.value))}
                error={errors.sort_order}
              />
              <Checkbox
                label="Produk rekomendasi"
                checked={p.is_recommended}
                onChange={(v) => patch('is_recommended', v)}
              />
              <Checkbox
                label="Label Terlaris (editorial)"
                checked={p.is_best_seller}
                onChange={(v) => patch('is_best_seller', v)}
              />
              <div className="form-actions">
                <button className="button button-primary full-width" disabled={busy || uploading}>
                  {busy ? <LoaderCircle size={17} className="spin" /> : <Save size={17} />}Simpan
                  produk
                </button>
              </div>
              <p className="form-help">
                Produk terbit wajib memiliki nama, SKU, harga valid, dan foto. Gunakan Arsip untuk
                menyembunyikan dari katalog.
              </p>
              {notice && (
                <p role="status" className={`notice ${success ? 'success' : ''}`}>
                  {notice}
                </p>
              )}
            </section>
            {p.id && (
              <section className="form-section danger-zone">
                <h2>Hapus produk</h2>
                <p>
                  Menghapus produk beserta relasi dan terjemahannya. Gambar yang dipakai bersama
                  tetap disimpan.
                </p>
                <DeleteButton
                  name={p.name_id}
                  onDelete={async (confirmName) => {
                    await api(`products/${p.id}`, 'DELETE', { confirmName });
                    router.push('/admin/products');
                    router.refresh();
                  }}
                />
              </section>
            )}
          </aside>
        </div>
      </form>
      {stored && (
        <TranslationEditor
          key={`${stored.id}:${stored.revision}`}
          type="products"
          value={stored}
          onChange={(v) => {
            const next = v as Product;
            setStored(next);
            setP((p) => ({ ...p, revision: next.revision, translations: next.translations }));
            router.refresh();
          }}
        />
      )}
    </>
  );
}
