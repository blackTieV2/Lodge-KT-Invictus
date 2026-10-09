// Runs in hosted CI, not on an officer's computer. Never logs credentials or data.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import '../app/core.js';
import { officerPolicyUpdate } from './access-policy.mjs';
const C=globalThis.Invictus, WRANGLER='wrangler@4.149.0';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if(!/^[a-f0-9]{32}$/.test(account||'')||!token)throw Error('Cloudflare account authorisation is required. Set the deployment secrets; no local commands are needed.');
let roles;try{roles=JSON.parse(process.env.OFFICER_ROLES||'');}catch{throw Error('OFFICER_ROLES must be a private JSON email-to-role map.');}
if(!roles||Array.isArray(roles)||typeof roles!=='object'||!Object.values(roles).includes('admin')||
 Object.entries(roles).some(([email,role])=>email!==email.trim().toLowerCase()||!/^\S+@\S+\.\S+$/.test(email)||!['admin','registrar','treasurer','viewer'].includes(role)))throw Error('A valid officer allowlist including an administrator is required.');
async function cf(path,method='GET',body){
 const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const result=await r.json();if(!r.ok||!result.success)throw Error(`Cloudflare setup failed for ${path.split('/')[0]} (${r.status}). Check account permissions; private response details were not logged.`);return result.result;
}
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
const sub=await cf('workers/subdomain');if(!/^[a-z0-9-]+$/.test(sub.subdomain||''))throw Error('Enable the account workers.dev subdomain in Cloudflare. No purchased domain is required.');
const domain=`${config.name}.${sub.subdomain}.workers.dev`;
const organisation=await cf('access/organizations');
const issuer='https://'+organisation.auth_domain;
if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer))throw Error('Enable Cloudflare Zero Trust for this account first.');
const apps=await cf('access/apps?per_page=100');let app=apps.find(x=>x.domain===domain);
if(app&&app.name!=='Invictus Online Register')throw Error('This hostname has another Access application. Review it before proceeding; nothing was overwritten.');
if(!app)app=await cf('access/apps','POST',{type:'self_hosted',name:'Invictus Online Register',domain,session_duration:'8h',policies:[{name:'Invictus named officers',decision:'allow',include:Object.keys(roles).map(email=>({email:{email}}))}]});
if(!app.aud)throw Error('Access audience was not returned. Deployment stopped.');
// Reconcile only the managed officer include list. Preserve its MFA/exclusion/
// approval conditions and all unrelated policies; never replace the entire app.
const policyPath=`access/apps/${app.id}/policies`;
const update=officerPolicyUpdate(await cf(policyPath),roles);
if(update.changed)await cf(`${policyPath}/${update.id}`,'PUT',update.body);
const dbs=await cf('d1/database?name=invictus-register&per_page=100');let db=dbs.find(x=>x.name==='invictus-register');
if(!db)db=await cf('d1/database','POST',{name:'invictus-register',primary_location_hint:'apac'});
config.d1_databases[0].database_id=db.uuid;
config.keep_vars=true;
const generated='.online-wrangler.json',secrets='.online-secrets.json';
const run=args=>{const p=spawnSync('npx',['--yes',WRANGLER,...args],{stdio:'inherit',env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false'}});if(p.status!==0)throw Error('Cloudflare build/deployment command did not succeed.');};
try{
 await writeFile(generated,JSON.stringify(config));
 await writeFile(secrets,JSON.stringify({ACCESS_ISSUER:issuer,ACCESS_AUD:app.aud,OFFICER_ROLES:JSON.stringify(roles)}),{mode:0o600});
 run(['d1','migrations','apply','invictus-register','--remote','--config',generated]);
 run(['deploy','--config',generated,'--secrets-file',secrets]);
 const probe=await fetch('https://'+domain+'/api/register',{redirect:'manual'});
 if(![302,303,401,403].includes(probe.status))throw Error('Unauthenticated protection probe failed. Do not load or expose private data.');
 // Optional one-time seed: only from a live-verified PRIVATE repository, outside assets.
 let source;try{source=await readFile('private/register.json','utf8');}catch(err){if(err.code!=='ENOENT')throw err;}
 if(source){
  if(!process.env.GITHUB_TOKEN||!/^blackTieV2\/Lodge-KT-Invictus$/.test(process.env.GITHUB_REPOSITORY||''))throw Error('Private seed requires the intended GitHub repository and authentication.');
  const response=await fetch('https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY,{headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json'}});
  if(!response.ok||(await response.json()).private!==true)throw Error('Seed blocked: the repository is not verified private.');
  const r=C.validate(JSON.parse(source)),at=new Date().toISOString();r.revision=1;
  r.history=r.history.slice(-999);r.history.push({id:crypto.randomUUID(),at,actor:'Authorised initial migration',memberId:'',summary:'Initial working data loaded; source claims are not independently certified.',reference:'Private reviewed register'});
  const data=JSON.stringify(C.validate(r));if(Buffer.byteLength(data)>1500000)throw Error('Seed exceeds the online size limit.');
  await cf(`d1/database/${db.uuid}/query`,'POST',{sql:'INSERT INTO register_state (id,version,data,saved_at,actor,summary,reference) VALUES (1,1,?,?,?,?,?) ON CONFLICT(id) DO NOTHING',params:[data,at,'Authorised initial migration','Initial reviewed working register','Private source migration']});
  console.log('Private initial-data step completed; an existing online register is never overwritten.');
 }
 const line=`Hosted endpoint: https://${domain}\nAnonymous access blocked. Authenticated officer and database smoke checks are still required.\n`;
 console.log(line);if(process.env.GITHUB_STEP_SUMMARY)await writeFile(process.env.GITHUB_STEP_SUMMARY,line,{flag:'a'});
}finally{await rm(generated,{force:true});await rm(secrets,{force:true});}
