import { env } from './env';
import { entity, saveTranslation, markTranslationNeedsReview, type Entity } from './db';
import { hash } from './auth';
import type { EntityType, Translation } from './types';
import { sourceFields } from './translation-fields';
export { sourceFields } from './translation-fields';
export const sourceHash = (type: EntityType, p: Entity) =>
  hash(JSON.stringify(sourceFields(type, p)));
let cachedToken: { value: string; until: number } | null = null;
const b64 = (s: string) => Buffer.from(s).toString('base64url');
async function accessToken() {
  if (cachedToken && cachedToken.until > Date.now()) return cachedToken.value;
  const e = await env();
  if (!e.GOOGLE_SERVICE_ACCOUNT_JSON || !e.GOOGLE_CLOUD_PROJECT)
    throw new Error('Konfigurasi terjemahan belum tersedia.');
  const sa = JSON.parse(e.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const claim = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-translation', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const pem = sa.private_key.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Buffer.from(pem, 'base64'),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(claim),
  );
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${claim}.${Buffer.from(signature).toString('base64url')}`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error('Autentikasi penyedia terjemahan gagal.');
  const j = (await r.json()) as { access_token: string };
  cachedToken = { value: j.access_token, until: Date.now() + 3300000 };
  return j.access_token;
}
export async function translateFields(target: 'ko' | 'en', fields: Record<string, string>) {
  const e = await env();
  const token = await accessToken();
  const entries = Object.entries(fields).filter(([, v]) => v.trim());
  if (!entries.length) return fields;
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(
      `https://translation.googleapis.com/v3/projects/${encodeURIComponent(e.GOOGLE_CLOUD_PROJECT!)}/locations/global:translateText`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLanguageCode: 'id',
          targetLanguageCode: target,
          mimeType: 'text/plain',
          contents: entries.map(([, v]) => v),
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!r.ok) {
      if (attempt === 0 && [429, 500, 502, 503, 504].includes(r.status)) continue;
      throw new Error('Penyedia terjemahan belum dapat memproses permintaan.');
    }
    const data = (await r.json()) as { translations: { translatedText: string }[] };
    if (
      data.translations?.length !== entries.length ||
      data.translations.some((t) => !t.translatedText?.trim())
    )
      throw new Error('Hasil terjemahan tidak lengkap.');
    return {
      ...Object.fromEntries(Object.keys(fields).map((k) => [k, ''])),
      ...Object.fromEntries(entries.map(([key], i) => [key, data.translations[i].translatedText])),
    };
  }
  throw new Error('Terjemahan gagal.');
}
export async function translateEntity(type: EntityType, id: string, force = false) {
  const p = await entity(type, id);
  if (!p) return;
  const { DB } = await env();
  await Promise.all(
    (['ko', 'en'] as const).map(async (locale) => {
      const old = p.translations[locale];
      if (old?.is_locked) {
        if (old.source_revision !== p.source_revision)
          await markTranslationNeedsReview(type, id, locale, p.source_revision);
        return;
      }
      if (!force && old?.status === 'ready' && old.source_hash === p.source_hash) return;
      const key = `${type}:${id}:${locale}:${p.source_hash}`;
      const acquired = await DB.prepare(
        "INSERT INTO translation_attempts(key,started_at,status) VALUES(?,?,'pending') ON CONFLICT(key) DO UPDATE SET started_at=excluded.started_at,status='pending' WHERE translation_attempts.status!='pending' OR translation_attempts.started_at<?",
      )
        .bind(key, Date.now(), Date.now() - 60000)
        .run();
      if (!acquired.meta.changes) return;
      const base: Translation = {
        fields: old?.fields || {},
        source_revision: p.source_revision,
        source_hash: p.source_hash,
        status: 'pending',
        origin: 'machine',
        is_locked: false,
      };
      await saveTranslation(type, id, locale, base);
      try {
        const fields = await translateFields(locale, sourceFields(type, p));
        await saveTranslation(type, id, locale, { ...base, fields, status: 'ready' });
        await DB.prepare("UPDATE translation_attempts SET status='ready' WHERE key=?")
          .bind(key)
          .run();
      } catch (e) {
        const message =
          e instanceof Error && e.message === 'Konfigurasi terjemahan belum tersedia.'
            ? e.message
            : 'Terjemahan gagal. Periksa konfigurasi atau coba lagi.';
        await saveTranslation(type, id, locale, { ...base, status: 'failed', error: message });
        await DB.prepare("UPDATE translation_attempts SET status='failed' WHERE key=?")
          .bind(key)
          .run();
      }
    }),
  );
}
