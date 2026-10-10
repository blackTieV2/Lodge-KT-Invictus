// Real workerd Request/fetch/Web Crypto APIs. Only the remote JWKS transport is
// synthetic. No real Access cookies, email addresses, keys, or cloud credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

if (!process.env.INVICTUS_WRANGLER_PACKAGE) {
  throw Error('Set INVICTUS_WRANGLER_PACKAGE to the test-installed wrangler/package.json.');
}
const requireRuntime = createRequire(resolve(process.env.INVICTUS_WRANGLER_PACKAGE));
const { Miniflare, Response: RuntimeResponse } = requireRuntime('miniflare');
const Reply = RuntimeResponse || Response;
const authSource = await readFile(new URL('../server/auth.mjs', import.meta.url), 'utf8');
const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const issuer = 'https://synthetic-access.cloudflareaccess.com';
const audience = 'synthetic-invictus-audience';
const roles = Object.fromEntries(['admin', 'registrar', 'treasurer', 'viewer'].map(role => [`${role}@example.invalid`, role]));
const pair = await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'}, true, ['sign','verify']);
const jwk = {...await crypto.subtle.exportKey('jwk', pair.publicKey), kid:'synthetic-signing-key', alg:'RS256', use:'sig'};
const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
async function token(changes={}, header={}) {
  const now = Math.floor(Date.now()/1000);
  const text = b64({alg:'RS256',kid:jwk.kid,...header}) + '.' + b64({sub:'synthetic-subject',iss:issuer,aud:[audience],iat:now,exp:now+600,email:'admin@example.invalid',...changes});
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(text));
  return text + '.' + Buffer.from(signature).toString('base64url');
}
const valid = await token();
const goodReply = () => new Reply(JSON.stringify({keys:[jwk]}), {headers:{'Content-Type':'application/json'}});
const wrapper = `\nexport default { async fetch(request, env) {
  try { return Response.json(await authenticate(request, env)); }
  catch (error) { return Response.json({error:error.message}, {status:error.status || 500}); }
}};\n`;
async function withRuntime(run, {source=authSource, respond=goodReply}={}) {
  const requests=[];
  const mf = new Miniflare({workers:[{
    name:'invictus-auth-test', modules:true, script:source+wrapper, compatibilityDate:config.compatibility_date,
    compatibilityFlags:config.compatibility_flags || [],
    bindings:{ACCESS_ISSUER:issuer,ACCESS_AUD:audience,OFFICER_ROLES:JSON.stringify(roles)},
    outboundService:async request => {
      // This callback is reached AFTER workerd has processed native fetch options.
      requests.push({url:request.url,method:request.method,headers:new Headers(request.headers)});
      assert.equal(request.url, issuer+'/cdn-cgi/access/certs', 'No redirect or arbitrary outbound origin is permitted');
      return respond(request);
    }
  }]});
  const send = (jwt=valid) => mf.dispatchFetch('https://invictus.example.invalid/api/session', {
    headers:jwt ? {'Cf-Access-Jwt-Assertion':jwt,'Cookie':'synthetic-private-cookie','Authorization':'synthetic-private-header'} : {}
  });
  try { await run({send,requests,mf}); } finally { await mf.dispose(); }
}

test('former redirect:error fetch reproduces the sign-in 503 before a JWKS request', async () => {
  const search = "{ redirect: 'manual', signal: AbortSignal.timeout(5000) }";
  assert.equal(authSource.split(search).length,2,'The regression must alter exactly the production JWKS fetch option');
  const previous = authSource.replace(search,"{ redirect: 'error', signal: AbortSignal.timeout(5000) }");
  await withRuntime(async ({send,requests}) => {
    const response=await send(); assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'Sign-in verification is temporarily unavailable.'});
    assert.equal(requests.length,0,'workerd rejects the old option before transport is invoked');
  },{source:previous});
});
test('workerd verifies a genuine synthetic RS256 signature and does not forward credentials', async () => {
  await withRuntime(async ({send,requests}) => {
    const response=await send();assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{email:'admin@example.invalid',role:'admin'});
    assert.equal(requests.length,1);assert.equal(requests[0].method,'GET');
    for(const h of ['Authorization','Cookie','Cf-Access-Jwt-Assertion'])assert.equal(requests[0].headers.has(h),false);
  });
});
for(const role of ['registrar','treasurer','viewer'])test(`signed ${role} keeps its application role in workerd`,async()=>{
  await withRuntime(async({send})=>{const r=await send(await token({email:`${role}@example.invalid`}));assert.equal(r.status,200);assert.equal((await r.json()).role,role);});
});
test('cached keys still verify the signature of every request',async()=>{
  await withRuntime(async({send,requests})=>{
    assert.equal((await send()).status,200);assert.equal((await send()).status,200);assert.equal(requests.length,1);
    const parts=valid.split('.'),bytes=Buffer.from(parts[2],'base64url');bytes[0]^=1;parts[2]=bytes.toString('base64url');
    assert.equal((await send(parts.join('.'))).status,401);assert.equal(requests.length,1);
  });
});
for(const status of [301,302,303,307,308])test(`JWKS HTTP ${status} fails closed without following Location`,async()=>{
  await withRuntime(async({send,requests})=>{const r=await send();assert.equal(r.status,503);assert.equal(requests.length,1);},
    {respond:()=>new Reply(null,{status,headers:{Location:'https://not-trusted.example.invalid/keys'}})});
});
for(const status of [403,500])test(`JWKS HTTP ${status} never authenticates`,async()=>{
  await withRuntime(async({send})=>assert.equal((await send()).status,503),{respond:()=>new Reply('synthetic upstream error',{status})});
});
test('malformed JWKS is rejected and not cached; a later successful fetch can recover',async()=>{
  let attempts=0;
  await withRuntime(async({send,requests})=>{assert.equal((await send()).status,503);assert.equal((await send()).status,200);assert.equal(requests.length,2);},
    {respond:()=>++attempts===1?new Reply('not-json'):goodReply()});
});
test('unknown signing key is not accepted',async()=>{
  await withRuntime(async({send})=>assert.equal((await send(await token({}, {kid:'unknown-key'}))).status,401));
});
test('unlisted identity with a valid signature is denied',async()=>{
  await withRuntime(async({send})=>assert.equal((await send(await token({email:'unlisted@example.invalid'}))).status,403));
});
for(const [name,changes] of [['expired',{exp:1}],['wrong audience',{aud:['another-project']}],['wrong issuer',{iss:'https://another-team.cloudflareaccess.com'}]])test(`${name} is rejected before key retrieval`,async()=>{
  await withRuntime(async({send,requests})=>{assert.equal((await send(await token(changes))).status,401);assert.equal(requests.length,0);});
});
test('missing token is denied before key retrieval',async()=>{
  await withRuntime(async({send,requests})=>{assert.equal((await send('')).status,401);assert.equal(requests.length,0);});
});
