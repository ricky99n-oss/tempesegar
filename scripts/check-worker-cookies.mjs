import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:8791';
const server = spawn(
  process.execPath,
  ['node_modules/wrangler/bin/wrangler.js', 'dev', '--ip', '127.0.0.1', '--port', '8791'],
  { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: 'true' } },
);
let output = '';
server.stdout.on('data', (chunk) => {
  output += chunk;
});
server.stderr.on('data', (chunk) => {
  output += chunk;
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error('Worker preview exited before verification.');
    try {
      const r = await fetch(base, { signal: AbortSignal.timeout(1500) });
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.equal(ready, true, 'Worker preview did not become ready.');
  for (const path of ['/', '/ko', '/en']) {
    const response = await fetch(base + path, {
      headers: { Cookie: 'regression_cookie=present' },
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200, `Public route with cookie: ${path}`);
  }
  const session = await fetch(base + '/api/admin/session', {
    headers: { Cookie: 'ts_session=untrusted-test-session' },
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(session.status, 401, 'Invalid session must be rejected, without a Worker error.');
  const admin = await fetch(base + '/admin', {
    headers: { Cookie: 'ts_session=untrusted-test-session' },
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(
    [302, 303, 307].includes(admin.status),
    'Invalid admin session must redirect to login.',
  );
  console.log(
    'Workers cookie regression verified: public routes 200, invalid admin session 401, dashboard redirects to login.',
  );
} catch (error) {
  // These requests use fixed non-secret cookies; never run this probe with real credentials.
  console.error(error.message);
  if (output.includes('Cannot read properties of undefined'))
    console.error('Worker adapter failed while reading a request with cookies.');
  process.exitCode = 1;
} finally {
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const kill = spawn('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
      kill.once('exit', resolve);
      kill.once('error', resolve);
    });
  } else server.kill('SIGTERM');
}
