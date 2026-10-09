// Synthetic HTTP test adapter only. NOT deployed. Production has no auth bypass.
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import worker from '../server/worker.mjs';
const C=globalThis.Invictus,db=new DatabaseSync(':memory:');db.exec(await readFile(new URL('../migrations/0001_online.sql',import.meta.url),'utf8'));
const kp=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const issuer='https://browser-tests.cloudflareaccess.com',jwk={...await crypto.subtle.exportKey('jwk',kp.publicKey),kid:'test'};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const tokens={};for(const role of ['admin','registrar','treasurer','viewer']){const now=Math.floor(Date.now()/1000),text=b64({alg:'RS256',kid:'test'})+'.'+b64({iss:issuer,aud:['test'],sub:role,email:role+'@example.invalid',iat:now,exp:now+3600});tokens[role]=text+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',kp.privateKey,new TextEncoder().encode(text))).toString('base64url');}
globalThis.fetch=async url=>{if(String(url)!==issuer+'/cdn-cgi/access/certs')throw Error('Unexpected upstream');return Response.json({keys:[jwk]});};
const env={ACCESS_ISSUER:issuer,ACCESS_AUD:'test',OFFICER_ROLES:JSON.stringify(Object.fromEntries(Object.keys(tokens).map(x=>[x+'@example.invalid',x]))),DB:{prepare(sql){const s=(args=[])=>({bind:(...a)=>s(a),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)})});return s();}},ASSETS:{async fetch(request){const p=new URL(request.url).pathname;try{return new Response(await readFile(new URL('../online-dist/'+(p==='/'?'index.html':p.slice(1)),import.meta.url)),{headers:{'Content-Type':p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':'text/html'}});}catch{return new Response('not found',{status:404});}}}};
const d=C.demo();d.members[0].aliases=['Art'];d.members[0].mmh='TEST001';d.members[1].name='<img src=x onerror=alert(1)> Example';d.revision=1;
db.prepare('INSERT INTO register_state VALUES (1,1,?,?,?,?,?)').run(JSON.stringify(d),new Date().toISOString(),'test','Synthetic initial data','test fixture');
const server=http.createServer(async(req,res)=>{try{const body=[];for await(const c of req)body.push(c);const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);const role=headers.get('x-test-role')||'admin';headers.delete('x-test-role');if(tokens[role])headers.set('Cf-Access-Jwt-Assertion',tokens[role]);const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(body)})});const out=await worker.fetch(request,env);res.writeHead(out.status,Object.fromEntries(out.headers));res.end(Buffer.from(await out.arrayBuffer()));}catch{res.writeHead(500);res.end('test adapter failure');}});
server.listen(8791,'127.0.0.1',()=>console.log('TEST_READY'));
