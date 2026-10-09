// Synthetic, real HTTP and real file-backed SQLite. No live credentials or members.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync, copyFileSync, chmodSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { RegisterDatabase, createBackup, verifyBackup } from '../homelab/storage.mjs';
import { createApplicationServer, readConfiguration } from '../homelab/server.mjs';
const C = globalThis.Invictus;
const origin = 'https://invictus.layer-8-labs.com';
const issuer = 'https://synthetic-homelab.cloudflareaccess.com';
const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...await crypto.subtle.exportKey('jwk', keys.publicKey), kid: 'homelab-test', alg: 'RS256' };
const b64 = x => Buffer.from(JSON.stringify(x)).toString('base64url');
const roleMap = { 'admin@example.invalid': 'admin', 'registrar@example.invalid': 'registrar', 'treasurer@example.invalid': 'treasurer', 'viewer@example.invalid': 'viewer' };
const config = { ACCESS_ISSUER: issuer, ACCESS_AUD: 'test', OFFICER_ROLES: roleMap };
const access = { ...config, OFFICER_ROLES: JSON.stringify(roleMap) };
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (String(url) === issuer + '/cdn-cgi/access/certs') return Response.json({ keys: [jwk] });
  throw Error('Unexpected outbound request from test.');
};
test.after(() => { globalThis.fetch = originalFetch; });
async function token(role = 'admin', overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64({ alg: 'RS256', kid: jwk.kid }) + '.' + b64({ sub: 'test-' + role, email: role + '@example.invalid', iss: issuer, aud: ['test'], iat: now, exp: now + 600, ...overrides });
  return body + '.' + Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(body))).toString('base64url');
}
const admin = await token(), viewer = await token('viewer'), treasurer = await token('treasurer');
async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'invictus-host-'));
  const assets = join(dir, 'assets'); mkdirSync(assets);
  for (const name of ['index.html', 'ui.js', 'core.js', 'styles.css', 'online.css']) writeFileSync(join(assets, name), 'synthetic ' + name);
  writeFileSync(join(assets, 'private.json'), 'MUST_NOT_BE_SERVED');
  const filename = join(dir, 'data', 'register.sqlite');
  const database = new RegisterDatabase(filename);
  const server = createApplicationServer({ origin, access, database, assetsDirectory: assets });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const f = { dir, filename, assets, database, server, port: server.address().port };
  t.after(async () => { await close(f.server); try { f.database.close(); } catch {} rmSync(dir, { recursive: true, force: true }); });
  return f;
}
function close(server) { return new Promise(resolve => { if (!server.listening) { resolve(); return; } server.close(resolve); server.closeAllConnections(); }); }
function request(f, path, { method = 'GET', payload, login = admin, version = 1, headers = {}, chunks } = {}) {
  return new Promise((resolve, reject) => {
    const body = payload === undefined ? undefined : JSON.stringify(payload);
    const req = http.request({ hostname: '127.0.0.1', port: f.port, path, method,
      headers: { Host: new URL(origin).host, ...(login ? { 'Cf-Access-Jwt-Assertion': login } : {}), ...(body || chunks ? { 'Content-Type': 'application/json', Origin: origin, 'X-Invictus-Request': '1', 'If-Match': `"${version}"` } : {}), ...headers } }, res => {
      const data = []; res.on('data', b => data.push(b)); res.on('end', () => { const text = Buffer.concat(data).toString(); let json; try { json = JSON.parse(text); } catch {} resolve({ status: res.statusCode, headers: res.headers, text, json }); });
    });
    req.on('error', reject); req.setTimeout(5000, () => req.destroy(Error('Request timed out')));
    if (chunks) for (const chunk of chunks) req.write(chunk);
    req.end(body);
  });
}
async function seed(f) { const r = await request(f, '/api/register', { method: 'POST', payload: { register: C.demo(), reference: 'Synthetic fixture' }, headers: { 'If-None-Match': '*' } }); assert.equal(r.status, 201, r.text); return r; }
const change = notes => ({ changes: { notes }, reason: 'Synthetic test reference' });

test('private startup configuration requires HTTPS, issuer, audience and officer map', () => {
  const dir = mkdtempSync(join(tmpdir(), 'invictus-config-')), file = join(dir, 'access.json');
  try {
    writeFileSync(file, JSON.stringify(config));
    const source = { PUBLIC_ORIGIN: origin, ACCESS_CONFIG_FILE: file };
    assert.equal(readConfiguration(source).origin, origin);
    for (const PUBLIC_ORIGIN of ['', 'http://invictus.layer-8-labs.com', origin + '/extra', origin + '?x=1', 'https://u:p@invictus.layer-8-labs.com']) assert.throws(() => readConfiguration({ ...source, PUBLIC_ORIGIN }));
    assert.throws(() => readConfiguration({ ...source, ACCESS_CONFIG_FILE: '' }));
    for (const bad of [{ ...config, ACCESS_ISSUER: 'https://attacker.invalid' }, { ...config, OFFICER_ROLES: [] }, { ...config, OFFICER_ROLES: { 'someone@example.invalid': 'viewer' } }]) { writeFileSync(file, JSON.stringify(bad)); assert.throws(() => readConfiguration(source)); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('database rejects volatile memory and fails on edited migration without corrupting data', async t => {
  assert.throws(() => new RegisterDatabase(':memory:'));
  const f = await fixture(t); await seed(f); await close(f.server); f.database.close();
  const migrations = join(f.dir, 'migrations'); mkdirSync(migrations);
  copyFileSync(new URL('../migrations/0001_online.sql', import.meta.url), join(migrations, '0001_online.sql'));
  writeFileSync(join(migrations, '0001_online.sql'), readFileSync(join(migrations, '0001_online.sql'), 'utf8') + '\n-- drift\n');
  assert.throws(() => new RegisterDatabase(f.filename, migrations), /migration changed/);
  f.database = new RegisterDatabase(f.filename); assert.equal((await f.database.prepare('SELECT version FROM register_state').first()).version, 1);
});
test('minimal health response contains no records and is not an auth bypass', async t => {
  const f = await fixture(t); const r = await request(f, '/healthz', { login: '' });
  assert.deepEqual(r.json, { status: 'ok' });
  for (const p of ['/', '/api/session', '/api/register', '/ui.js']) assert.equal((await request(f, p, { login: '' })).status, 401);
});
test('proxy preserves approved host and rejects forged forwarded host/origin combinations', async t => {
  const f = await fixture(t); await seed(f);
  assert.equal((await request(f, '/api/register', { headers: { Host: 'wrong.example.invalid', 'X-Forwarded-Host': 'invictus.layer-8-labs.com' } })).status, 421);
  assert.equal((await request(f, '/api/members/DEMO0', { method: 'PATCH', payload: change('bad'), headers: { Origin: 'https://attacker.invalid', 'X-Forwarded-Host': 'attacker.invalid', 'X-Forwarded-Proto': 'https' } })).status, 403);
  assert.equal((await request(f, '/api/register', { headers: { Host: 'invictus.layer-8-labs.com:443' } })).status, 200);
});
test('ordinary identity header and forged/expired signed assertions are rejected', async t => {
  const f = await fixture(t);
  assert.equal((await request(f, '/api/register', { login: '', headers: { 'Cf-Access-Authenticated-User-Email': 'admin@example.invalid' } })).status, 401);
  assert.equal((await request(f, '/api/register', { login: 'a.b.c' })).status, 401);
  assert.equal((await request(f, '/api/register', { login: await token('admin', { exp: 1 }) })).status, 401);
  assert.equal((await request(f, '/api/register', { login: await token('stranger') })).status, 403);
});
test('authenticated assets are allowlisted, HEAD is bodyless, private paths cannot be served', async t => {
  const f = await fixture(t); assert.equal((await request(f, '/')).text, 'synthetic index.html');
  assert.equal((await request(f, '/', { method: 'HEAD' })).text, '');
  for (const p of ['/private.json', '/data/register.sqlite', '/run/secrets/invictus_access', '/server/auth.mjs', '/.git/config', '/%2e%2e/private.json']) assert.notEqual((await request(f, p)).status, 200);
  assert.equal((await request(f, '//attacker.invalid/')).status, 400);
});
test('real HTTP seed, read, update and server/storage restart preserve the shared register and audit', async t => {
  const f = await fixture(t); await seed(f);
  const saved = await request(f, '/api/members/DEMO0', { method: 'PATCH', payload: change('Persisted across restart') });
  assert.equal(saved.status, 200, saved.text); assert.equal(saved.json.version, 2);
  await close(f.server); f.database.close();
  f.database = new RegisterDatabase(f.filename); f.server = createApplicationServer({ origin, access, database: f.database, assetsDirectory: f.assets });
  f.server.listen(0, '127.0.0.1'); await once(f.server, 'listening'); f.port = f.server.address().port;
  const reread = await request(f, '/api/register', { login: viewer });
  assert.equal(reread.json.register.members[0].notes, 'Persisted across restart');
  assert.equal(reread.json.version, 2); assert.equal((await request(f, '/api/audit')).json.events.length, 2);
  assert.equal(statSync(f.filename).mode & 0o777, 0o600);
});
test('role boundaries work through actual HTTP, not only UI buttons', async t => {
  const f = await fixture(t); await seed(f);
  assert.equal((await request(f, '/api/members/DEMO0', { method: 'PATCH', login: viewer, payload: change('unauthorised') })).status, 403);
  assert.equal((await request(f, '/api/members/DEMO0', { method: 'PATCH', login: treasurer, payload: { changes: { memberStatus: 'ceased' }, reason: 'invalid role' } })).status, 403);
  assert.equal((await request(f, '/api/members/DEMO0', { method: 'PATCH', login: treasurer, payload: { changes: { balance: null, financeStatus: 'reconcile' }, reason: 'Amount not established' } })).status, 200);
  assert.equal((await request(f, '/api/register')).json.register.members[0].balance, null);
});
test('two real HTTP writers at the same version cannot overwrite one another', async t => {
  const f = await fixture(t); await seed(f);
  const results = await Promise.all(['A', 'B'].map(notes => request(f, '/api/members/DEMO0', { method: 'PATCH', payload: change(notes) })));
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]);
  assert.equal((await f.database.prepare('SELECT COUNT(*) AS n FROM register_audit').first()).n, 2);
});
test('migrations and trigger writes remain atomic on failure', async t => {
  const f = await fixture(t); await seed(f);
  f.database.db.exec("CREATE TRIGGER fail_test BEFORE INSERT ON register_audit WHEN NEW.version=2 BEGIN SELECT RAISE(ABORT,'test'); END;");
  assert.equal((await request(f, '/api/members/DEMO0', { method: 'PATCH', payload: change('must roll back') })).status, 500);
  assert.equal((await request(f, '/api/register')).json.version, 1);
});
test('oversized declared and streamed bodies fail without saving', async t => {
  const f = await fixture(t); await seed(f);
  assert.equal((await request(f, '/api/members/DEMO0', { method: 'PATCH', payload: change('small'), headers: { 'Content-Length': '1500001' } })).status, 413);
  assert.equal((await request(f, '/api/members/DEMO0', { method: 'PATCH', chunks: ['a'.repeat(800000), 'b'.repeat(800000)] })).status, 413);
  assert.equal((await request(f, '/api/register')).json.version, 1);
});
test('consistent backup includes committed WAL, source history and audit; restore opens independently', async t => {
  const f = await fixture(t); await seed(f);
  await request(f, '/api/members/DEMO0', { method: 'PATCH', payload: change('Backup value') });
  const directory = join(f.dir, 'backups'); const filename = await createBackup(f.database, directory);
  assert.equal(verifyBackup(filename).version, 2); assert.equal(statSync(filename).mode & 0o777, 0o600);
  const restoredFile = join(f.dir, 'restored', 'register.sqlite'); mkdirSync(join(f.dir, 'restored')); copyFileSync(filename, restoredFile);
  const restored = new RegisterDatabase(restoredFile);
  try { const row = await restored.prepare('SELECT * FROM register_state').first(); assert.equal(JSON.parse(row.data).members[0].notes, 'Backup value'); assert.equal((await restored.prepare('SELECT COUNT(*) AS n FROM register_audit').first()).n, 2); }
  finally { restored.close(); }
});
test('backup retention removes only this app owned snapshots and not unrelated files', async t => {
  const f = await fixture(t); const directory = join(f.dir, 'backups'); mkdirSync(directory);
  writeFileSync(join(directory, 'other.sqlite'), 'untouched');
  for (let i = 0; i < 4; i++) { await createBackup(f.database, directory, 2); await new Promise(r => setTimeout(r, 3)); }
  assert.equal(readdirSync(directory).filter(x => x.startsWith('invictus-')).length, 2);
  assert.equal(readFileSync(join(directory, 'other.sqlite'), 'utf8'), 'untouched');
});
test('backup failure leaves live register untouched', async t => {
  const f = await fixture(t); await seed(f); const notDirectory = join(f.dir, 'file'); writeFileSync(notDirectory, 'x');
  await assert.rejects(createBackup(f.database, notDirectory));
  assert.equal((await request(f, '/api/register')).json.version, 1);
});
