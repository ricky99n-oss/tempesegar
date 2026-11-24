import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '@fontsource/noto-sans/latin-400.css';
import '@fontsource/noto-sans/latin-500.css';
import '@fontsource/noto-sans/latin-600.css';
import '@fontsource/noto-sans/latin-700.css';
import '@fontsource/noto-sans-kr/400.css';
import '@fontsource/noto-sans-kr/600.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'Tempe Segar',
  description: 'Katalog tempe. Pilih produk dan pesan langsung melalui WhatsApp atau LINE.',
  icons: { icon: '/icon.svg' },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get('x-tempe-locale') || 'id';
  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
