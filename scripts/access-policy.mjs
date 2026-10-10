// Reconcile only our app-specific officer list, never another application's policy.
const NAME='Invictus named officers';
const writable=['name','decision','include','exclude','require','precedence','session_duration','approval_groups','approval_required','isolation_required','mfa_config','purpose_justification_prompt','purpose_justification_required','connection_rules'];
const metadata=['id','account_id','created_at','updated_at','reusable','app_count'];
export function officerPolicyUpdate(policies,roles){
  if(!Array.isArray(policies))throw Error('Invalid Access policy response.');
  const matches=policies.filter(p=>p.name===NAME);
  if(matches.length!==1)throw Error('The managed officer policy is missing or ambiguous; review Access configuration.');
  const current=matches[0];
  if(typeof current.id!=='string'||!current.id||current.decision!=='allow'||current.reusable===true||current.app_count>1)throw Error('Refusing to rewrite an unmanaged, shared or non-allow Access policy.');
  if(!Array.isArray(current.include)||current.include.some(r=>Object.keys(r).length!==1||!r.email||Object.keys(r.email).length!==1||typeof r.email.email!=='string'))throw Error('Managed include conditions were changed; review before replacing them.');
  const emails=Object.keys(roles).sort();
  if(!emails.length||emails.some(s=>s!==s.trim().toLowerCase()||!/^\S+@\S+\.\S+$/.test(s)))throw Error('Invalid officer email list.');
  const changed=JSON.stringify(current.include.map(r=>r.email.email).sort())!==JSON.stringify(emails);
  // Reading an already-correct policy is not rewriting it. Do not manufacture a
  // PUT body or reject response extensions when no officer change is required.
  // Unknown fields (including restrictions) stay untouched on the provider.
  if(!changed)return {id:current.id,body:null,changed:false};
  // Only real writes need a fully understood schema; never silently discard
  // unfamiliar restrictions when an officer list actually needs changing.
  if(Object.keys(current).some(k=>!writable.includes(k)&&!metadata.includes(k)))throw Error('Unknown Access policy settings require review before an update.');
  const body=Object.fromEntries(writable.filter(k=>Object.hasOwn(current,k)).map(k=>[k,structuredClone(current[k])]));
  body.include=emails.map(email=>({email:{email}}));
  return {id:current.id,body,changed:true};
}
