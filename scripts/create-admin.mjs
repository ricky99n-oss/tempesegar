import { randomBytes, pbkdf2Sync, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
const args = process.argv.slice(2),
  remote = args.includes('--remote');
const email = args[args.indexOf('--email') + 1];
if (!args.includes('--email') || !email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error('Usage: npm run admin:create -- --email owner@example.com --local|--remote');
  process.exit(1);
}
if (!remote && !args.includes('--local')) throw new Error('Choose --local or --remote explicitly.');
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
process.stdout.write('Password baru (minimal 16 karakter, input disembunyikan): ');
muted = true;
const password = await rl.question('');
muted = false;
process.stdout.write('\n');
rl.close();
if (password.length < 16 || password.length > 256)
  throw new Error('Password harus 16–256 karakter.');
const salt = randomBytes(32).toString('hex'),
  passwordHash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
const quote = (s) => `'${s.replaceAll("'", "''")}'`;
await mkdir('.wrangler/bootstrap', { recursive: true });
const path = resolve('.wrangler/bootstrap', randomUUID() + '.sql');
await writeFile(
  path,
  `INSERT INTO admin_users(id,email,password_hash,salt) VALUES(${[randomUUID(), email.toLowerCase(), passwordHash, salt].map(quote).join(',')});`,
);
try {
  const r = spawnSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'd1',
      'execute',
      'tempe-segar-db',
      remote ? '--remote' : '--local',
      '--file',
      path,
    ],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) process.exitCode = 1;
  else console.log('Admin dibuat. Tidak ada registrasi publik.');
} finally {
  await rm(path, { force: true });
}
