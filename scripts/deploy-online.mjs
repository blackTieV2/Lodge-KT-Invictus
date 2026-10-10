// GitHub-hosted deployment only; no home-lab connection, SSH or local app.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import '../app/core.js';
import { officerPolicyUpdate } from './access-policy.mjs';
import { cloudflareTarget, checkDomainOwnership, acceptedAnonymousProbe, ZONE_NAME } from './cloudflare-target.mjs';
const C=globalThis.Invictus, WRANGLER='wrangler@4.149.0';
const account=process.env.CLOUDFLARE_ACCOUNT_ID, token=process.env.CLOUDFLARE_API_TOKEN;
if(!/^[a-f0-9]{32}$/.test(account||'')||!token)throw Error('GitHub deployment secrets must be authorised. A PC Wrangler login does not authorise this hosted runner.');
let roles;try{roles=JSON.parse(process.env.OFFICER_ROLES||'');}catch{throw Error('OFFICER_ROLES must be a private email-to-role map.');}
if(!roles||Array.isArray(roles)||typeof roles!=='object'||!Object.values(roles).includes('admin')||
 Object.entries(roles).some(([email,role])=>email!==email.trim().toLowerCase()||!/^\S+@\S+\.\S+$/.test(email)||!['admin','registrar','treasurer','viewer'].includes(role)))throw Error('A valid officer allowlist including an administrator is required.');
async function request(path,method='GET',body){
 const response=await fetch(`https://api.cloudflare.com/client/v4/${path}`,{method,redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const result=await response.json();
 if(!response.ok||!result.success)throw Error(`Cloudflare ${method} request failed (${response.status}); private response details were not logged.`);
 return result;
}
const cf=async(path,method='GET',body)=>(await request(`accounts/${account}/${path}`,method,body)).result;
async function list(path){
 const all=[];for(let page=1;page<=100;page++){
  const data=await request(path+(path.includes('?')?'&':'?')+`page=${page}&per_page=100`);
  if(!Array.isArray(data.result))throw Error('Unexpected Cloudflare list response.');all.push(...data.result);
  if(data.result_info?.total_pages ? page>=data.result_info.total_pages : data.result.length<100)return all;
 }
 throw Error('Cloudflare list pagination exceeded its safety bound.');
}
const config=JSON.parse(await readFile('wrangler.jsonc','utf8')),domain=cloudflareTarget(config);
// Read-only ownership/conflict checks run BEFORE changing anything.
const zones=await list(`zones?name=${ZONE_NAME}&account.id=${account}`);
if(zones.length!==1)throw Error('Expected exactly one accessible zone for the selected account.');
const zone=zones[0];
if(!/^[a-f0-9]{32}$/.test(zone.id||''))throw Error('Invalid zone identifier.');
const bindings=await list(`accounts/${account}/workers/domains?hostname=${domain}`);
const records=await list(`zones/${zone.id}/dns_records?name=${domain}`);
checkDomainOwnership(zone,bindings,records,account);
let source;try{source=await readFile('private/register.json','utf8');}catch(err){if(err.code!=='ENOENT')throw err;}
let seed;
if(source){
 if(!process.env.GITHUB_TOKEN||process.env.GITHUB_REPOSITORY!=='blackTieV2/Lodge-KT-Invictus')throw Error('Private seed requires authentication to this repository.');
 const response=await fetch('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY,{redirect:'error',headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(15000)});
 if(!response.ok||(await response.json()).private!==true)throw Error('Seed blocked: repository is not verified private.');
 seed=C.validate(JSON.parse(source));
 if(Buffer.byteLength(JSON.stringify(seed))>1500000)throw Error('Seed exceeds the online limit.');
}
const organisation=await cf('access/organizations'),issuer='https://'+organisation.auth_domain;
if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer))throw Error('Cloudflare Zero Trust must be enabled for this account.');
const apps=await list(`accounts/${account}/access/apps`),matches=apps.filter(x=>x.domain===domain);
if(matches.length>1)throw Error('Ambiguous Access application; review before proceeding.');
let app=matches[0];
if(app&&(app.name!=='Invictus Online Register'||app.type!=='self_hosted'))throw Error('This hostname has another Access application. Nothing was overwritten.');
if(!app)app=await cf('access/apps','POST',{type:'self_hosted',name:'Invictus Online Register',domain,session_duration:'8h',policies:[{name:'Invictus named officers',decision:'allow',include:Object.keys(roles).map(email=>({email:{email}}))}]});
if(!app.aud||!app.id)throw Error('Access identifiers were not returned.');
const policyPath=`access/apps/${app.id}/policies`,update=officerPolicyUpdate(await cf(policyPath),roles);
if(update.changed)await cf(`${policyPath}/${update.id}`,'PUT',update.body);
const dbs=(await list(`accounts/${account}/d1/database?name=invictus-register`)).filter(x=>x.name==='invictus-register');
if(dbs.length>1)throw Error('Ambiguous database name.');
const db=dbs[0]||await cf('d1/database','POST',{name:'invictus-register',primary_location_hint:'apac'});
if(!/^[a-f0-9-]{36}$/.test(db.uuid||''))throw Error('Invalid D1 database identifier.');
config.d1_databases[0].database_id=db.uuid;config.keep_vars=true;
const generated='.online-wrangler.json',secrets='.online-secrets.json';
const run=args=>{const child=spawnSync('npx',['--yes',WRANGLER,...args],{stdio:'inherit',env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});if(child.status!==0)throw Error('Cloudflare deployment command failed.');};
try{
 await writeFile(generated,JSON.stringify(config));
 await writeFile(secrets,JSON.stringify({ACCESS_ISSUER:issuer,ACCESS_AUD:app.aud,OFFICER_ROLES:JSON.stringify(roles)}),{mode:0o600});
 run(['d1','migrations','apply','invictus-register','--remote','--config',generated]);
 run(['deploy','--config',generated,'--secrets-file',secrets]);
 const after=await list(`accounts/${account}/workers/domains?hostname=${domain}`);
 if(!checkDomainOwnership(zone,after,[],account))throw Error('Custom Domain binding was not verified after deployment.');
 let protectedOrigin=false;
 for(let attempt=0;attempt<12&&!protectedOrigin;attempt++){
  try{const probe=await fetch('https://'+domain+'/api/register',{redirect:'manual',signal:AbortSignal.timeout(10000)});protectedOrigin=acceptedAnonymousProbe(probe.status,probe.headers.get('location'),issuer);}catch{/* DNS/certificate readiness: bounded retry, no seed until protected. */}
  if(!protectedOrigin)await new Promise(resolve=>setTimeout(resolve,5000));
 }
 if(!protectedOrigin)throw Error('Protection/readiness probe failed. No private seed was loaded.');
 if(seed){
  const at=new Date().toISOString();seed.revision=1;seed.history=seed.history.slice(-999);
  seed.history.push({id:crypto.randomUUID(),at,actor:'Authorised initial migration',memberId:'',summary:'Initial working data loaded; source claims are not independently certified.',reference:'Private reviewed register'});
  const data=JSON.stringify(C.validate(seed));if(Buffer.byteLength(data)>1500000)throw Error('Seed exceeds the online limit.');
  await cf(`d1/database/${db.uuid}/query`,'POST',{sql:'INSERT INTO register_state (id,version,data,saved_at,actor,summary,reference) VALUES (1,1,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',params:[data,at,'Authorised initial migration','Initial reviewed working register','Private source migration']});
  console.log('Private seed step completed; any existing online register was retained.');
 }
 const line=`Cloudflare endpoint: https://${domain}\nCustom Domain binding and anonymous denial verified. Real officer login/read/save tests remain required. No home-lab connection.\n`;
 console.log(line);if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,line,{flag:'a'});
}finally{await rm(generated,{force:true});await rm(secrets,{force:true});}
