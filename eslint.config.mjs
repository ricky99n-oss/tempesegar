import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
export default defineConfig([
  ...next,
  // Uploaded media is already decoded, resized, and encoded as WebP at ingress.
  { rules: { '@next/next/no-img-element': 'off' } },
  globalIgnores(['.next/**', '.open-next/**', '.wrangler/**', 'next-env.d.ts']),
]);
