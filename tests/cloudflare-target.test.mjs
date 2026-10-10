import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cloudflareTarget, checkDomainOwnership, acceptedAnonymousProbe, HOSTNAME, ZONE_NAME, WORKER_NAME } from '../scripts/cloudflare-target.mjs';
const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const account = 'a'.repeat(32);
const zone = {id:'b'.repeat(32), name:ZONE_NAME, status:'active', account:{id:account}};
const own = {hostname:HOSTNAME, service:WORKER_NAME, zone_id:zone.id, environment:'production'};
test('one approved custom domain with no local origin or alternate public URL', () => assert.equal(cloudflareTarget(config),HOSTNAME));
test('workers.dev and previews cannot accidentally be re-enabled', () => {
  for (const patch of [{workers_dev:true},{preview_urls:true},{workers_dev:undefined},{route:'*'}]) assert.throws(() => cloudflareTarget({...config,...patch}));
});
test('wildcard, home-lab route and other domain bindings rejected', () => {
  for (const routes of [[],[{pattern:HOSTNAME+'/*'}],[{pattern:'other.example',custom_domain:true}],[...config.routes,...config.routes],[{...config.routes[0],previews_enabled:true}]]) assert.throws(() => cloudflareTarget({...config,routes}));
});
test('assets must pass through authentication and no inherited environment routes', () => {
  assert.throws(()=>cloudflareTarget({...config,assets:{run_worker_first:false}}));
  assert.throws(()=>cloudflareTarget({...config,env:{staging:{}}}));
});
test('vacant hostname and an existing owned binding both permitted', () => {
  assert.equal(checkDomainOwnership(zone,[],[],account),false);
  assert.equal(checkDomainOwnership(zone,[own],[{name:HOSTNAME}],account),true);
});
test('wrong account, inactive or malformed zone fails before any writes', () => {
  for (const z of [{...zone,account:{id:'wrong'}},{...zone,status:'pending'},{...zone,id:'bad'},{...zone,name:'other.example'}]) assert.throws(()=>checkDomainOwnership(z,[],[],account));
});
test('existing DNS records never silently overwritten', () => {
  for (const type of ['A','AAAA','CNAME','TXT']) assert.throws(()=>checkDomainOwnership(zone,[],[{name:HOSTNAME,type}],account));
});
test('another worker, ambiguous binding or staging domain cannot be taken over', () => {
  for (const bindings of [[{...own,service:'other'}],[own,own],[{...own,zone_id:'c'.repeat(32)}],[{...own,environment:'staging'}]]) assert.throws(()=>checkDomainOwnership(zone,bindings,[],account));
});
test('other home-lab DNS records are not modified or treated as this target', () => {
  const records=[{name:'nas.'+ZONE_NAME,type:'A',content:'192.0.2.1'}],before=structuredClone(records);
  assert.equal(checkDomainOwnership(zone,[],records,account),false);assert.deepEqual(records,before);
});
test('anonymous probe accepts denial or the correct Access redirect, never 200/503 or arbitrary redirect', () => {
  const issuer='https://example.cloudflareaccess.com';
  for(const s of [401,403])assert.equal(acceptedAnonymousProbe(s,null,issuer),true);
  assert.equal(acceptedAnonymousProbe(302,issuer+'/cdn-cgi/access/login/'+HOSTNAME,issuer),true);
  for(const [s,l] of [[200,null],[503,null],[302,'https://other.example/'],[302,issuer+'.evil.test/cdn-cgi/access/login'],[302,'/login'],[302,issuer+'/']])assert.equal(acceptedAnonymousProbe(s,l,issuer),false);
});
