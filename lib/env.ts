import { getCloudflareContext } from '@opennextjs/cloudflare';
export type Env = {
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: ImagesBinding;
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  GOOGLE_CLOUD_PROJECT?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  DEMO_MODE?: string;
};
export async function env(): Promise<Env> {
  return (await getCloudflareContext({ async: true })).env as unknown as Env;
}
