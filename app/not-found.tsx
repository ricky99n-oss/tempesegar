import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="error-page">
      <h1>Halaman tidak ditemukan.</h1>
      <Link className="button button-primary" href="/">
        Kembali ke katalog
      </Link>
    </main>
  );
}
