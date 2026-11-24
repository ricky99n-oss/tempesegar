'use client';
import { useState } from 'react';
import { Languages, RefreshCw, LockKeyhole } from 'lucide-react';
import type { EntityType, Translation } from '@/lib/types';
import type { Entity } from '@/lib/db';
import { sourceFields } from '@/lib/translation-fields';
import { api, Checkbox, TextArea } from './admin-fields';
const labels: Record<string, string> = {
  name: 'Nama',
  short_description: 'Deskripsi singkat',
  description: 'Deskripsi lengkap',
  unit_label: 'Satuan jual',
  title: 'Judul',
  subtitle: 'Subjudul',
  cta: 'Label tombol',
};
const statuses = {
  missing: 'Belum diterjemahkan',
  pending: 'Sedang diterjemahkan',
  ready: 'Siap ditampilkan',
  failed: 'Terjemahan gagal',
  needs_review: 'Perlu ditinjau setelah sumber berubah',
};
export function TranslationEditor({
  type,
  value,
  onChange,
}: {
  type: EntityType;
  value: Entity;
  onChange: (p: Entity) => void;
}) {
  const [locale, setLocale] = useState<'ko' | 'en'>('ko'),
    [fields, setFields] = useState<Record<string, string>>({ ...value.translations.ko?.fields }),
    [locked, setLocked] = useState(value.translations.ko?.is_locked ?? true),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const t: Translation | undefined = value.translations[locale];
  const sources = sourceFields(type, value);
  function switchLocale(l: 'ko' | 'en') {
    setLocale(l);
    setFields({ ...value.translations[l]?.fields });
    setLocked(value.translations[l]?.is_locked ?? true);
    setNotice('');
  }
  async function retry() {
    setBusy(true);
    try {
      const next = await api<Entity>(`${type}/${value.id}/translate`, 'POST', {});
      onChange(next);
      setFields({ ...next.translations[locale]?.fields });
      setLocked(next.translations[locale]?.is_locked ?? false);
      setNotice('Status terjemahan diperbarui.');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Terjemahan gagal.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="form-section">
      <h2>
        <Languages size={19} />
        Terjemahan konten tersimpan
      </h2>
      <p className="form-help" style={{ marginBottom: 15 }}>
        Simpan perubahan sumber Indonesia terlebih dahulu. Koreksi di bawah berlaku pada revisi
        sumber terakhir yang tersimpan.
      </p>
      <div className="translation-tabs">
        <button
          type="button"
          className={locale === 'ko' ? 'active' : ''}
          onClick={() => switchLocale('ko')}
        >
          한국어
        </button>
        <button
          type="button"
          className={locale === 'en' ? 'active' : ''}
          onClick={() => switchLocale('en')}
        >
          English
        </button>
      </div>
      <div className="translation-status">
        <strong>{statuses[t?.status || 'missing']}</strong>
        <br />
        {t?.error ||
          `Revisi sumber ${value.source_revision} · ${t?.origin === 'manual' ? 'Koreksi manual' : 'Terjemahan otomatis'}`}
        {t?.is_locked && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <LockKeyhole size={13} />
            Dikunci dari penimpaan otomatis
          </span>
        )}
      </div>
      {Object.entries(sources)
        .filter(([, v]) => v)
        .map(([key, source]) => (
          <TextArea
            key={key}
            label={labels[key] || (key.startsWith('alt:') ? 'Alt text gambar' : key)}
            value={fields[key] || ''}
            maxLength={
              key === 'name'
                ? 120
                : key === 'unit_label'
                  ? 80
                  : key === 'short_description' || key === 'subtitle'
                    ? 240
                    : key === 'cta'
                      ? 60
                      : key.startsWith('alt:')
                        ? 160
                        : 5000
            }
            placeholder={source}
            onChange={(e) => setFields((v) => ({ ...v, [key]: e.target.value }))}
          />
        ))}
      <Checkbox
        label="Kunci koreksi manual dari terjemahan otomatis"
        checked={locked}
        onChange={setLocked}
      />
      <div className="form-actions">
        <button
          className="button button-primary"
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNotice('');
            try {
              const next = await api<Entity>(`${type}/${value.id}/translations`, 'PATCH', {
                locale,
                fields,
                is_locked: locked,
                revision: value.revision,
              });
              onChange(next);
              setNotice('Koreksi terjemahan disimpan.');
            } catch (e) {
              setNotice(e instanceof Error ? e.message : 'Gagal menyimpan.');
            } finally {
              setBusy(false);
            }
          }}
        >
          Simpan / setujui koreksi
        </button>
        <button type="button" className="button button-outline" disabled={busy} onClick={retry}>
          <RefreshCw size={16} />
          Coba terjemahan lagi
        </button>
      </div>
      <p className="form-help">
        Retry hanya memproses bahasa yang tidak dikunci. Untuk mengganti koreksi manual dengan hasil
        mesin, matikan kunci, simpan, lalu coba terjemahan lagi.
      </p>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
