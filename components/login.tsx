'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LockKeyhole, LoaderCircle } from 'lucide-react';
import { Brand } from './brand';
export function Login() {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <main className="login-page">
      <div className="login-card">
        <Link href="/">
          <Brand />
        </Link>
        <h1>Selamat datang kembali.</h1>
        <p>Masuk untuk mengelola produk, gambar, dan isi toko Tempe Segar.</p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            const form = new FormData(e.currentTarget);
            try {
              const r = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
              });
              const result = (await r.json()) as { message?: string };
              if (!r.ok) {
                setError(result.message || 'Login gagal.');
                return;
              }
              router.replace('/admin');
              router.refresh();
            } catch {
              setError('Koneksi gagal. Coba lagi.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>Email admin</span>
            <input name="email" type="email" autoComplete="username" required maxLength={254} />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
            />
          </label>
          <button className="button button-primary" disabled={busy}>
            {busy ? <LoaderCircle size={18} className="spin" /> : <LockKeyhole size={18} />}Masuk ke
            dashboard
          </button>
          {error && (
            <p className="notice" role="alert">
              {error}
            </p>
          )}
        </form>
        <Link className="login-back" href="/">
          Kembali ke katalog
        </Link>
      </div>
    </main>
  );
}
