'use client';
import { usePathname } from 'next/navigation';
import { messages } from '@/lib/i18n';
export default function ErrorPage({ reset }: { reset: () => void }) {
  const path = usePathname();
  const t = messages[path === '/ko' ? 'ko' : path === '/en' ? 'en' : 'id'];
  return (
    <main className="error-page">
      <h1>{t.error}</h1>
      <p>{t.contactText} +821065653524</p>
      <button className="button button-primary" onClick={reset}>
        {t.retry}
      </button>
    </main>
  );
}
