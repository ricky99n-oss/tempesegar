import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://tempe-segar.ricky99n.workers.dev';
  return ['', '/ko', '/en'].map((path) => ({
    url: base + (path || '/'),
    alternates: { languages: { id: base + '/', ko: base + '/ko', en: base + '/en' } },
  }));
}
