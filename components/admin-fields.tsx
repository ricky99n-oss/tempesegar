'use client';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Trash2, X } from 'lucide-react';
export type FieldErrors = Record<string, string[] | undefined>;
export function Field({
  label,
  error,
  help,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string[]; help?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        {...props}
        aria-invalid={!!error}
        aria-describedby={error && props.name ? `${props.name}-error` : undefined}
      />
      {help && <small>{help}</small>}
      {error && (
        <span id={`${props.name}-error`} className="field-error">
          {error.join(' ')}
        </span>
      )}
    </label>
  );
}
export function TextArea({
  label,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string[] }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea {...props} aria-invalid={!!error} />
      {error && <span className="field-error">{error.join(' ')}</span>}
    </label>
  );
}
export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
export class ApiError extends Error {
  constructor(
    message: string,
    public fields: FieldErrors = {},
  ) {
    super(message);
  }
}
export async function api<T>(path: string, method = 'GET', data?: unknown): Promise<T> {
  const r = await fetch(`/api/admin/${path}`, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: 'no-store',
  });
  const result = (await r.json()) as T & { message?: string; fieldErrors?: FieldErrors };
  if (!r.ok) {
    // Clear the stale application state on session expiry from this non-component helper.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (r.status === 401) window.location.assign('/admin/login');
    throw new ApiError(result.message || 'Permintaan gagal.', result.fieldErrors);
  }
  return result;
}
export function DeleteButton({
  name,
  onDelete,
  label = 'Hapus permanen',
}: {
  name: string;
  onDelete: (confirmName: string) => Promise<void>;
  label?: string;
}) {
  const [open, setOpen] = useState(false),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        setError('');
        setConfirm('');
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="table-action danger">
          <Trash2 size={15} />
          {label}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="product-dialog delete-confirm">
          <Dialog.Close className="dialog-close" aria-label="Tutup">
            <X />
          </Dialog.Close>
          <Dialog.Title>Hapus {name}?</Dialog.Title>
          <Dialog.Description>
            Data ini akan dihapus permanen. Untuk menyembunyikan produk dari katalog, gunakan status
            Arsip. Ketik <strong>{name}</strong> untuk mengonfirmasi.
          </Dialog.Description>
          <Field
            label="Nama untuk konfirmasi"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <div className="form-actions">
            <button
              className="button button-danger"
              disabled={confirm !== name || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDelete(confirm);
                  setOpen(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Gagal menghapus.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Menghapus…' : 'Hapus permanen'}
            </button>
            <Dialog.Close className="button button-outline">Batal</Dialog.Close>
          </div>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
