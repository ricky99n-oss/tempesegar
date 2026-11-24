import { randomBytes, pbkdf2Sync, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
// Explicitly local, disposable test identity. This script has no remote mode.
const salt = randomBytes(32).toString('hex');
const password = process.env.E2E_PASSWORD;
if (!password || password.length < 16)
  throw new Error('Set E2E_PASSWORD (16+ characters) for local tests.');
const hashed = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
await mkdir('.wrangler/test', { recursive: true });
const path = resolve('.wrangler/test/admin.sql');
await writeFile(
  path,
  `DELETE FROM rate_limits; INSERT INTO admin_users(id,email,password_hash,salt) VALUES('${randomUUID()}','local-test@example.invalid','${hashed}','${salt}') ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash,salt=excluded.salt,is_active=1;`,
);
try {
  const r = spawnSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'd1',
      'execute',
      'tempe-segar-db',
      '--local',
      '--file',
      path,
    ],
    { stdio: 'inherit' },
  );
  process.exitCode = r.status ?? 1;
} finally {
  await rm(path, { force: true });
}
