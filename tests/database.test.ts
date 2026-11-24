import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { Product, Translation } from '../lib/types';
import { demoCatalog } from '../lib/demo';
let sqlite: DatabaseSync;
let sessionToken: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => (sessionToken ? { value: sessionToken } : undefined) }),
}));
const db = {
  prepare(sql: string) {
    let values: unknown[] = [];
    const statement = {
      bind(...args: unknown[]) {
        values = args;
        return statement;
      },
      async first() {
        return sqlite.prepare(sql).get(...(values as [])) || null;
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...(values as [])) };
      },
      async run() {
        const r = sqlite.prepare(sql).run(...(values as []));
        return { meta: { changes: Number(r.changes) } };
      },
    };
    return statement;
  },
  async batch(statements: { run: () => Promise<unknown> }[]) {
    sqlite.exec('BEGIN');
    try {
      const out = [];
      for (const s of statements) out.push(await s.run());
      sqlite.exec('COMMIT');
      return out;
    } catch (e) {
      sqlite.exec('ROLLBACK');
      throw e;
    }
  },
};
vi.mock('../lib/env', () => ({ env: async () => ({ DB: db }) }));
const { entity, entities, storeEntity, saveTranslation, markTranslationNeedsReview, catalog } =
  await import('../lib/db');
beforeEach(() => {
  sqlite?.close();
  sessionToken = undefined;
  sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync('migrations/0001_initial.sql', 'utf8'));
  sqlite.exec(readFileSync('migrations/0002_integrity.sql', 'utf8'));
});
const draft = (): Product => ({
  ...demoCatalog().products[0],
  status: 'draft',
  images: [],
  translations: {},
});
describe('D1 persistence and permission boundaries', () => {
  it('does not replace a fresh manual approval with an older needs-review snapshot', async () => {
    const p = draft();
    await storeEntity('products', p, 0);
    const manual: Translation = {
      fields: { name: 'Approved B' },
      source_revision: 2,
      source_hash: 'B',
      status: 'ready',
      origin: 'manual',
      is_locked: true,
    };
    await storeEntity('products', { ...p, revision: 2, source_revision: 2, source_hash: 'B' }, 1);
    await saveTranslation('products', p.id, 'ko', manual);
    await markTranslationNeedsReview('products', p.id, 'ko', 2);
    expect((await entity<Product>('products', p.id))?.translations.ko).toEqual(manual);
  });
  it('checks an active allowlisted admin and live session on every request', async () => {
    const { requireAdmin, hash } = await import('../lib/auth');
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
    sqlite
      .prepare('INSERT INTO admin_users(id,email,password_hash,salt) VALUES(?,?,?,?)')
      .run('admin-1', 'test@example.invalid', 'hash', 'salt');
    sessionToken = 'random-test-token';
    sqlite
      .prepare('INSERT INTO sessions VALUES(?,?,?)')
      .run(await hash(sessionToken), 'admin-1', Date.now() + 60000);
    expect((await requireAdmin()).id).toBe('admin-1');
    sqlite.exec("UPDATE admin_users SET is_active=0 WHERE id='admin-1'");
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
    sqlite.exec('UPDATE admin_users SET is_active=1; UPDATE sessions SET expires_at=0');
    await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
  });
  it('hides draft records in public listing and direct lookup', async () => {
    const p = draft();
    await storeEntity('products', p, 0);
    expect(await entities('products', true)).toHaveLength(0);
    expect(await entity('products', p.id, true)).toBe(null);
    expect(await entity('products', p.id)).not.toBe(null);
    expect((await catalog()).products).toHaveLength(0);
  });
  it('rejects conflicting edits without changing product or relations', async () => {
    const p = draft();
    await storeEntity('products', p, 0);
    await storeEntity('products', { ...p, revision: 2, name_id: 'New name' }, 1);
    await expect(
      storeEntity('products', { ...p, revision: 2, name_id: 'Old overwritten' }, 1),
    ).rejects.toThrow('Data telah diubah');
    expect((await entity<Product>('products', p.id))?.name_id).toBe('New name');
  });
  it('enforces unique SKU and price constraints at the database layer', async () => {
    const p = draft();
    await storeEntity('products', p, 0);
    await expect(storeEntity('products', { ...p, id: crypto.randomUUID() }, 0)).rejects.toThrow(
      'UNIQUE',
    );
    await expect(storeEntity('products', { ...p, price_krw: -1, revision: 2 }, 1)).rejects.toThrow(
      'CHECK',
    );
  });
  it('discards translation A when it finishes after source revision B', async () => {
    const p = draft();
    await storeEntity('products', p, 0);
    await storeEntity('products', { ...p, revision: 2, source_revision: 2, source_hash: 'B' }, 1);
    const base: Translation = {
      fields: { name: 'Old A' },
      source_revision: 1,
      source_hash: 'A',
      status: 'ready',
      origin: 'machine',
      is_locked: false,
    };
    await saveTranslation('products', p.id, 'ko', base);
    expect((await entity<Product>('products', p.id))?.translations.ko).toBeUndefined();
    await saveTranslation('products', p.id, 'ko', {
      ...base,
      source_revision: 2,
      source_hash: 'B',
      fields: { name: 'New B' },
    });
    await saveTranslation('products', p.id, 'ko', base);
    expect((await entity<Product>('products', p.id))?.translations.ko?.fields.name).toBe('New B');
  });
  it('protects a locked manual correction from an in-flight machine response', async () => {
    const p = draft();
    await storeEntity('products', p, 0);
    const manual: Translation = {
      fields: { name: 'Manual' },
      source_revision: 1,
      source_hash: 'demo',
      status: 'ready',
      origin: 'manual',
      is_locked: true,
    };
    await saveTranslation('products', p.id, 'ko', manual);
    await saveTranslation('products', p.id, 'ko', {
      ...manual,
      fields: { name: 'Machine' },
      origin: 'machine',
      is_locked: false,
    });
    expect((await entity<Product>('products', p.id))?.translations.ko?.fields.name).toBe('Manual');
  });
});
