// Server-side runtime for home-lab Docker. Officers use HTTPS in their browsers only.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import worker from '../server/worker.mjs';
import { RegisterDatabase, createBackup } from './storage.mjs';

const MAX_BODY = 1500000;
const errorHeaders = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" };
const fail = (status, message) => Object.assign(new Error(message), { status });

export function readConfiguration(source = process.env) {
  let url;
  try { url = new URL(source.PUBLIC_ORIGIN || ''); } catch { throw new Error('PUBLIC_ORIGIN must be the approved HTTPS origin.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('PUBLIC_ORIGIN must be a single HTTPS origin.');
  if (!source.ACCESS_CONFIG_FILE) throw new Error('Mount the private Access configuration file before starting.');
  const raw = readFileSync(source.ACCESS_CONFIG_FILE);
  if (raw.length > 32000) throw new Error('Access configuration is too large.');
  let access;
  try { access = JSON.parse(raw); } catch { throw new Error('Access configuration is not valid JSON.'); }
  if (!access || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(access.ACCESS_ISSUER || '') ||
      typeof access.ACCESS_AUD !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(access.ACCESS_AUD)) throw new Error('A valid Access issuer and application audience are required.');
  const roles = access.OFFICER_ROLES;
  if (!roles || Array.isArray(roles) || typeof roles !== 'object' || !Object.values(roles).includes('admin') ||
      Object.entries(roles).some(([email, role]) => !/^\S+@\S+\.\S+$/.test(email) || email !== email.trim().toLowerCase() || !['admin', 'registrar', 'treasurer', 'viewer'].includes(role))) throw new Error('The private officer map must include an administrator and valid roles.');
  const port = Number(source.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid service port.');
  return { origin: url.origin, port, host: source.LISTEN_HOST || '0.0.0.0', database: source.DATABASE_FILE || '/data/register.sqlite', backupDirectory: source.BACKUP_DIRECTORY || '/backups', access: { ...access, OFFICER_ROLES: JSON.stringify(roles) } };
}

function readBody(request) {
  if (Number(request.headers['content-length'] || 0) > MAX_BODY) throw fail(413, 'Request exceeds the online size limit.');
  return new Promise((resolve, reject) => {
    const chunks = []; let bytes = 0, rejected = false;
    request.on('data', chunk => {
      if (rejected) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY) { rejected = true; chunks.length = 0; reject(fail(413, 'Request exceeds the online size limit.')); return; }
      chunks.push(chunk);
    });
    request.once('end', () => { if (!rejected) resolve(Buffer.concat(chunks)); });
    request.once('aborted', () => reject(fail(400, 'Request was interrupted.')));
    request.once('error', () => reject(fail(400, 'Request could not be read.')));
  });
}

export function createApplicationServer({ origin, access, database, assetsDirectory = new URL('../online-dist/', import.meta.url) }) {
  const approved = new URL(origin);
  if (approved.protocol !== 'https:' || approved.origin !== origin) throw new Error('Only the canonical HTTPS origin is permitted.');
  // Explicit asset names: neither the repository root nor the database can be served.
  const assets = new Map();
  for (const [name, type] of [['index.html', 'text/html; charset=utf-8'], ['ui.js', 'text/javascript'], ['core.js', 'text/javascript'], ['styles.css', 'text/css'], ['online.css', 'text/css']]) {
    const path = assetsDirectory instanceof URL ? new URL(name, assetsDirectory) : resolve(assetsDirectory, name);
    assets.set('/' + name, { bytes: readFileSync(path), type });
  }
  const env = { ...access, DB: database, ASSETS: { async fetch(request) {
    const key = new URL(request.url).pathname, asset = assets.get(key === '/' ? '/index.html' : key);
    return asset ? new Response(request.method === 'HEAD' ? null : asset.bytes, { headers: { 'Content-Type': asset.type } }) : new Response(null, { status: 404 });
  } } };
  const server = http.createServer({ maxHeaderSize: 24576, requestTimeout: 20000, headersTimeout: 15000, keepAliveTimeout: 5000 }, async (request, response) => {
    try {
      // Minimal container liveness only; no identity, configuration or membership data.
      if (request.url === '/healthz' && ['GET', 'HEAD'].includes(request.method)) {
        const healthy = database.db.prepare('SELECT 1 AS ok').get().ok === 1;
        response.writeHead(healthy ? 200 : 503, errorHeaders); response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ status: healthy ? 'ok' : 'unavailable' })); return;
      }
      const host = (request.headers.host || '').toLowerCase();
      if (host !== approved.host && !(approved.port === '' && host === approved.host + ':443')) throw fail(421, 'This hostname is not configured for the register.');
      if (!request.url?.startsWith('/') || request.url.startsWith('//') || request.url.includes('\\') || request.url.length > 4096) throw fail(400, 'Invalid request target.');
      if (!['GET', 'HEAD', 'POST', 'PATCH'].includes(request.method)) throw fail(405, 'Method not allowed.');
      // URL and CSRF checks use configured origin, NOT attacker-controlled forwarded headers.
      const headers = new Headers();
      for (let i = 0; i < request.rawHeaders.length; i += 2) {
        const name = request.rawHeaders[i].toLowerCase();
        if (['forwarded', 'x-forwarded-host', 'x-forwarded-proto', 'connection', 'transfer-encoding', 'content-length', 'host'].includes(name)) continue;
        headers.append(name, request.rawHeaders[i + 1]);
      }
      const payload = ['GET', 'HEAD'].includes(request.method) ? null : await readBody(request);
      const result = await worker.fetch(new Request(origin + request.url, { method: request.method, headers, ...(payload ? { body: payload } : {}) }), env);
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(request.method === 'HEAD' ? undefined : Buffer.from(await result.arrayBuffer()));
    } catch (error) {
      if (!response.headersSent && !response.destroyed) response.writeHead(error.status || 500, { ...errorHeaders, Connection: 'close' });
      if (!response.destroyed) response.end(JSON.stringify({ error: error.status ? error.message : 'The server could not complete this request.' }));
    }
  });
  server.maxConnections = 64;
  return server;
}

export async function start() {
  process.umask(0o077);
  const config = readConfiguration();
  const database = new RegisterDatabase(config.database);
  let timer, shuttingDown = false, copying = false;
  const backupNow = async () => {
    if (copying || shuttingDown) return;
    copying = true;
    try { await createBackup(database, config.backupDirectory); console.log('Consistent recovery backup verified.'); }
    catch { console.error('Recovery backup failed. Review private server storage; no member data logged.'); }
    finally { copying = false; }
  };
  const server = createApplicationServer({ origin: config.origin, access: config.access, database });
  const shutdown = () => {
    if (shuttingDown) return; shuttingDown = true; clearInterval(timer);
    server.close(async () => {
      // Do not close SQLite beneath an active backup.
      while (copying) await new Promise(r => setTimeout(r, 25));
      database.close(); process.exit(0);
    });
    setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 15000).unref();
  };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.port, config.host, resolve); });
  console.log('Invictus server listening; authenticated ingress is required.');
  await backupNow(); timer = setInterval(backupNow, 6 * 60 * 60 * 1000); timer.unref();
  return { server, database };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  start().catch(() => { console.error('Startup failed. Verify mounted Access configuration, assets and writable data volumes. No secrets logged.'); process.exit(1); });
}
