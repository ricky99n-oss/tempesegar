'use client';
import { useState } from 'react';
import { Upload, ChevronLeft, ChevronRight, Trash2, LoaderCircle } from 'lucide-react';
import type { Media } from '@/lib/types';
import { Field, Checkbox } from './admin-fields';
export function MediaEditor({
  images,
  onChange,
  onBusy,
  max = 8,
}: {
  images: Media[];
  onChange: (v: Media[]) => void;
  onBusy?: (v: boolean) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(''),
    [error, setError] = useState('');
  async function upload(files: FileList | null) {
    if (!files || busy) return;
    setError('');
    if (images.length + files.length > max) {
      setError(`Maksimal ${max} gambar.`);
      return;
    }
    setBusy(true);
    onBusy?.(true);
    const next = [...images];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          setError('Maksimal 5 MB per gambar.');
          break;
        }
        setProgress(`${i + 1}/${files.length}`);
        const form = new FormData();
        form.set('file', file);
        const r = await fetch('/api/admin/media', { method: 'POST', body: form });
        const result = (await r.json()) as Media & { message?: string };
        if (!r.ok) {
          // Reload the login boundary when the upload session expires.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          if (r.status === 401) window.location.assign('/admin/login');
          setError(result.message || 'Upload gagal.');
          break;
        }
        next.push(result);
        onChange([...next]);
      }
    } catch {
      setError('Upload gagal. Coba lagi.');
    } finally {
      setBusy(false);
      setProgress('');
      onBusy?.(false);
    }
  }
  function move(index: number, delta: number) {
    const next = [...images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  }
  return (
    <div>
      <label
        className="upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files);
        }}
      >
        {busy ? <LoaderCircle className="spin" size={27} /> : <Upload size={27} />}
        <span>{busy ? `Memproses gambar ${progress}…` : 'Pilih atau tarik gambar ke sini'}</span>
        <small>JPEG, PNG, WebP · maksimal 5 MB · {max} gambar</small>
        <input
          aria-label="Upload gambar"
          type="file"
          multiple={max > 1}
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || images.length >= max}
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      <p className="form-help" style={{ marginTop: 10 }}>
        Gambar pertama menjadi foto utama. Gunakan tombol kiri/kanan untuk mengurutkan. Gambar
        terhapus diterapkan saat formulir disimpan.
      </p>
      <div className="image-editor-grid">
        {images.map((img, i) => (
          <div
            className="image-editor-item"
            key={img.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = Number(e.dataTransfer.getData('text/plain'));
              if (Number.isInteger(from) && from >= 0 && from < images.length) {
                const next = [...images];
                const [moved] = next.splice(from, 1);
                next.splice(i, 0, moved);
                onChange(next);
              }
            }}
          >
            <img src={img.url} alt={img.alt_id || 'Preview gambar'} width="200" height="200" />
            {i === 0 && <span className="image-cover-label">Foto utama</span>}
            <Field
              label="Alt text (Indonesia)"
              maxLength={160}
              value={img.alt_id}
              onChange={(e) =>
                onChange(images.map((m, j) => (j === i ? { ...m, alt_id: e.target.value } : m)))
              }
            />
            <Checkbox
              label="Gambar referensi"
              checked={!!img.is_illustration}
              onChange={(value) =>
                onChange(images.map((m, j) => (i === j ? { ...m, is_illustration: value } : m)))
              }
            />
            <div className="image-actions">
              <button
                type="button"
                disabled={i === 0 || busy}
                aria-label="Pindah ke kiri"
                onClick={() => move(i, -1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                disabled={i === images.length - 1 || busy}
                aria-label="Pindah ke kanan"
                onClick={() => move(i, 1)}
              >
                <ChevronRight size={16} />
              </button>
              {i > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    const next = [...images];
                    next.splice(i, 1);
                    next.unshift(img);
                    onChange(next);
                  }}
                >
                  Utama
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                aria-label="Hapus gambar dari produk"
                onClick={() => onChange(images.filter((_, j) => i !== j))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
