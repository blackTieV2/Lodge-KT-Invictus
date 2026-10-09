import '../app/core.js';
import { authenticate, HttpError } from './auth.mjs';
const C = globalThis.Invictus;
const MAX = 1500000; // Below D1's row-size limit; source documents are never embedded.
const common = ['notes'];
const membership = ['name','aliases','mmh','memberStatus','basis','effectiveDate','statusNote','admissionRoute','admissionDate','kolStatus','kolAsOf'];
const finance = ['financeStatus','balance','invoice','financeNote','gpPence','gpBasis'];
const headers = {
  'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Strict-Transport-Security': 'max-age=31536000',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
};
const json = (value, status=200, extra={}) => Response.json(value, { status, headers: { ...headers, ...extra } });
const insist = (ok, status, message) => { if (!ok) throw new HttpError(status, message); };
const text = (v, max=3000) => typeof v === 'string' && v.trim() && v.length <= max;
export function fieldsFor(role) {
  return role === 'viewer' ? [] : [...common, ...(['admin','registrar'].includes(role) ? membership : []), ...(['admin','treasurer'].includes(role) ? finance : [])];
}
async function body(request) {
  insist(request.headers.get('content-type')?.split(';')[0] === 'application/json',415,'JSON is required.');
  const reader = request.body?.getReader(); let size=0, chunks=[];
  insist(reader,400,'A request body is required.');
  while (true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>MAX) { await reader.cancel(); throw new HttpError(413,'Request exceeds the online size limit.'); } chunks.push(value); }
  const joined = new Uint8Array(size); let offset=0; for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  try { const b=JSON.parse(new TextDecoder().decode(joined)); insist(b && typeof b==='object' && !Array.isArray(b),400,'Invalid JSON object.'); return b; }
  catch(err) { if(err instanceof HttpError) throw err; throw new HttpError(400,'Invalid JSON.'); }
}
const validate = data => { try { return C.validate(data); } catch { throw new HttpError(422,'Invalid register fields, dates, money, identifiers or references.'); } };
const envelope = row => ({ register: row ? JSON.parse(row.data) : null, version: row?.version || 0, savedAt: row?.saved_at || null });
async function route(request,env) {
  const user = await authenticate(request,env), url=new URL(request.url), path=url.pathname;
  if (request.method==='GET' && path==='/api/session') return json({...user, editableFields:fieldsFor(user.role)});
  if (!path.startsWith('/api/')) {
    insist(['GET','HEAD'].includes(request.method),405,'Method not allowed.');
    insist(['/', '/index.html','/ui.js','/core.js','/styles.css','/online.css'].includes(path),404,'Not found.');
    insist(env.ASSETS,503,'Application assets are not configured.');
    const asset=await env.ASSETS.fetch(request), res=new Response(asset.body,asset);
    for(const [k,v] of Object.entries(headers))res.headers.set(k,v);
    return res;
  }
  insist(env.DB,503,'The online database is not configured.');
  const row = await env.DB.prepare('SELECT * FROM register_state WHERE id=1').first();
  if(request.method==='GET' && path==='/api/register') return json(envelope(row),200,{ETag:`"${row?.version||0}"`});
  if(request.method==='GET' && path==='/api/audit') {
    const cursor=Number(url.searchParams.get('before')||Number.MAX_SAFE_INTEGER);
    insist(Number.isSafeInteger(cursor)&&cursor>0,400,'Invalid audit cursor.');
    const r=await env.DB.prepare('SELECT * FROM register_audit WHERE version < ? ORDER BY version DESC LIMIT 100').bind(cursor).all();
    return json({events:r.results});
  }
  if(request.method==='GET' && path==='/api/backups') {
    insist(user.role==='admin',403,'Administrator access required.');
    return json({backups:(await env.DB.prepare('SELECT version,saved_at FROM register_backups ORDER BY version DESC').all()).results});
  }
  if(request.method==='GET' && /^\/api\/backups\/\d+$/.test(path)) {
    insist(user.role==='admin',403,'Administrator access required.');
    const backup=await env.DB.prepare('SELECT data FROM register_backups WHERE version=?').bind(Number(path.split('/').pop())).first();
    insist(backup,404,'Backup not found.'); return json(JSON.parse(backup.data));
  }
  insist(['POST','PATCH'].includes(request.method),405,'Method not allowed.');
  insist(user.role!=='viewer',403,'This account is read-only.');
  insist(request.headers.get('origin')===url.origin && request.headers.get('X-Invictus-Request')==='1',403,'A same-origin app request is required.');
  const b=await body(request);
  const initial=request.method==='POST' && path==='/api/register';
  if(initial) {
    insist(user.role==='admin',403,'Only the administrator may initialise the register.');
    insist(!row && request.headers.get('If-None-Match')==='*',409,'The register already exists or the initialisation precondition is missing.');
  } else {
    insist(row,409,'The administrator has not initialised the register.');
    insist(request.headers.has('If-Match'),428,'Refresh the register before saving.');
    insist(request.headers.get('If-Match')===`"${row.version}"`,409,'Another officer saved a change. Your edit was not applied. Refresh and review before saving again.');
  }
  let d=initial ? validate(b.register) : validate(JSON.parse(row.data));
  let summary='', reference='', memberId='';
  if(initial) {
    insist(text(b.reference),422,'An initial source reference is required.');
    reference=b.reference.trim(); summary='Initial working register imported; prior source history is unverified imported history.';
  } else if(request.method==='POST' && path==='/api/members') {
    insist(['admin','registrar'].includes(user.role),403,'Registrar access required.');
    insist(text(b.name,200)&&text(b.reason),422,'Name and reason required.');
    memberId=crypto.randomUUID();
    d.members.push(C.member({id:memberId,name:b.name.trim(),memberStatus:'review',basis:'unresolved',kolStatus:'verify',financeStatus:'unknown'}));
    summary='Created a working person record; no admission implied.';reference=b.reason.trim();
  } else if(request.method==='PATCH' && /^\/api\/members\/[^/]+$/.test(path)) {
    memberId=decodeURIComponent(path.split('/').pop()); const m=d.members.find(x=>x.id===memberId);
    insist(m,404,'Person not found.');
    insist(b.changes&&typeof b.changes==='object'&&!Array.isArray(b.changes)&&text(b.reason),422,'Changes and a reason/reference are required.');
    const keys=Object.keys(b.changes),allowed=fieldsFor(user.role);
    insist(keys.length>0&&keys.every(k=>allowed.includes(k)),403,'This account cannot change one or more fields.');
    const next={...m,...b.changes};d.members[d.members.indexOf(m)]=next;
    summary='Working record updated: '+keys.filter(k=>JSON.stringify(m[k])!==JSON.stringify(next[k])).join(', ');reference=b.reason.trim();
  } else if(request.method==='POST' && path==='/api/actions') {
    insist(text(b.title)&&C.OWNERS.includes(b.owner),422,'Action title and owner required.');
    insist(user.role!=='treasurer'||b.owner==='Treasurer',403,'Treasurer may create Treasurer follow-ups only.');
    memberId=b.memberId;
    d.actions.push({id:crypto.randomUUID(),memberId,title:b.title.trim(),owner:b.owner,state:'open',priority:b.priority||'normal',due:b.due||'',reference:''});
    summary='Follow-up created for '+b.owner; reference='Working follow-up; no external action performed.';
  } else if(request.method==='PATCH' && /^\/api\/actions\/[^/]+$/.test(path)) {
    const a=d.actions.find(x=>x.id===decodeURIComponent(path.split('/').pop()));insist(a,404,'Action not found.');
    insist(user.role==='admin'||(user.role==='registrar'&&a.owner!=='Treasurer')||(user.role==='treasurer'&&a.owner==='Treasurer'),403,'This account cannot update this action.');
    insist(Object.hasOwn(C.TASK,b.state)&&typeof b.reference==='string'&&b.reference.length<=3000,422,'Invalid action state or reference.');
    insist(b.state!=='done'||text(b.reference),422,'Completion reference required.');
    memberId=a.memberId;summary='Follow-up '+a.state+' → '+b.state;reference=b.reference.trim()||'Progress update';a.state=b.state;a.reference=b.reference.trim();
  } else throw new HttpError(404,'Unknown operation.');
  const version=(row?.version||0)+1, at=new Date().toISOString(); d.revision=version;
  // This is a convenience view; the separate server audit never accepts client edits.
  d.history=d.history.slice(-999);
  d.history.push({id:crypto.randomUUID(),at,actor:user.email,memberId,summary,reference});
  d=validate(d);const encoded=JSON.stringify(d);
  insist(new TextEncoder().encode(encoded).length<=MAX,413,'Register is too large; ask the administrator to archive source excerpts.');
  let result;
  if(initial) result=await env.DB.prepare('INSERT INTO register_state (id,version,data,saved_at,actor,summary,reference) VALUES (1,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING RETURNING version').bind(version,encoded,at,user.email,summary,reference).first();
  else result=await env.DB.prepare('UPDATE register_state SET version=?,data=?,saved_at=?,actor=?,summary=?,reference=? WHERE id=1 AND version=? RETURNING version').bind(version,encoded,at,user.email,summary,reference,row.version).first();
  // SQL triggers record audit + snapshots atomically with the conditional write.
  insist(result,409,'Another officer saved first. Your edit was not applied. Refresh and review.');
  return json({register:d,version,savedAt:at},initial?201:200,{ETag:`"${version}"`});
}
export default { async fetch(request,env) {
  try{return await route(request,env);}catch(err){
    return json({error:err instanceof HttpError?err.message:'The online service could not complete this request. Your changes have not been confirmed.'},err instanceof HttpError?err.status:500);
  }
}};
