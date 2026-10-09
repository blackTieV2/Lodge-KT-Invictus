// Runs only against disposable CI containers. Never a user's Docker host/stack.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const image = 'invictus-homelab:test';
const name = `invictus-ci-${process.pid}`, data = `${name}-data`, backups = `${name}-backups`;
const directory = mkdtempSync(join(tmpdir(), 'invictus-container-')), configuration = join(directory, 'access.json');
writeFileSync(configuration, JSON.stringify({ ACCESS_ISSUER: 'https://ci-only.cloudflareaccess.com', ACCESS_AUD: 'synthetic', OFFICER_ROLES: { 'admin@example.invalid': 'admin' } }), { mode: 0o644 });
function docker(args, required = true) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 120000 });
  if (required && result.status !== 0) throw Error(`Disposable container test failed: ${args[0]} (${result.status}) ${result.stderr}`);
  return result.stdout.trim();
}
async function ready() {
  for (let i = 0; i < 30; i++) {
    const result = spawnSync('docker', ['exec', name, 'node', 'homelab/healthcheck.mjs'], { stdio: 'ignore', timeout: 5000 });
    if (result.status === 0) return;
    await new Promise(r => setTimeout(r, 1000));
  }
  throw Error('Disposable container never became healthy.');
}
function run() {
  docker(['run', '-d', '--name', name, '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--tmpfs', '/tmp:size=16m', '--mount', `type=bind,src=${configuration},dst=/run/secrets/invictus_access,readonly`, '-v', data + ':/data', '-v', backups + ':/backups', image]);
}
function exec(code) { return docker(['exec', name, 'node', '--input-type=module', '-e', code]); }
try {
  const inspect = JSON.parse(docker(['image', 'inspect', image]))[0]; assert.equal(inspect.Config.User, 'node');
  // A trap file at repository root and private/ must not enter the image/build context.
  run(); await ready();
  exec("import {existsSync} from 'node:fs'; for (const p of ['/opt/invictus/.git','/opt/invictus/private','/opt/invictus/.env','/opt/invictus/DO-NOT-SHIP.txt','/opt/invictus/tests']) if(existsSync(p))process.exit(1);");
  // Use raw HTTP for explicit virtual-host probes: do not depend on fetch's Host handling.
  exec("import http from 'node:http'; import assert from 'node:assert/strict'; for(const [host,expected] of [['invictus.layer-8-labs.com',401],['unconfigured.example.invalid',421]]) { const status=await new Promise((resolve,reject)=>{const q=http.get({hostname:'127.0.0.1',port:8080,path:'/api/register',headers:{Host:host}},r=>{r.resume();r.on('end',()=>resolve(r.statusCode));});q.on('error',reject);}); assert.equal(status,expected,'Unexpected unauthenticated status for '+host); }");
  // Test-only direct database fixture. No such bypass is exposed by the HTTP app.
  exec("import './app/core.js'; import {RegisterDatabase} from './homelab/storage.mjs'; const db=new RegisterDatabase('/data/register.sqlite'); const d=Invictus.demo(); d.revision=1; await db.prepare('INSERT INTO register_state VALUES (1,1,?,?,?,?,?)').bind(JSON.stringify(d),new Date().toISOString(),'CI','Synthetic restart test','No real data').run(); db.close();");
  docker(['stop', name]); docker(['rm', name]); run(); await ready();
  exec("import {RegisterDatabase} from './homelab/storage.mjs'; const db=new RegisterDatabase('/data/register.sqlite'); const row=await db.prepare('SELECT * FROM register_state').first(); if(row?.version!==1||JSON.parse(row.data).members[0].name!=='Arthur Example')process.exit(1); if((await db.prepare('SELECT COUNT(*) AS n FROM register_audit').first()).n!==1)process.exit(1); db.close();");
  exec("import {readdirSync} from 'node:fs'; import {verifyBackup} from './homelab/storage.mjs'; const files=readdirSync('/backups').filter(n=>n.endsWith('.sqlite')); if(!files.length)process.exit(1); for(const file of files)verifyBackup('/backups/'+file);");
  console.log('PASS: non-root/read-only container, private-file exclusion, no anonymous data, persisted records after container replacement, and standalone verified backups.');
} finally {
  docker(['rm', '-f', name], false); docker(['volume', 'rm', data, backups], false); rmSync(directory, { recursive: true, force: true });
}
