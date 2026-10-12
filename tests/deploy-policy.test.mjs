import test from 'node:test';
import assert from 'node:assert/strict';
import {officerPolicyUpdate,verifyOfficerPolicyUpdate} from '../scripts/access-policy.mjs';
const policy=()=>({id:'managed-test',name:'Invictus named officers',decision:'allow',include:[{email:{email:'old@example.invalid'}}],require:[{auth_method:{auth_method:'mfa'}}],exclude:[{email:{email:'blocked@example.invalid'}}],mfa_config:{mfa_disabled:false,session_duration:'1h'},approval_required:true,approval_groups:[{approvals_needed:1,email_addresses:['approver@example.invalid']}],precedence:3,session_duration:'8h'});
const roles={'admin@example.invalid':'admin','new@example.invalid':'viewer'};
test('redeployment adds new officers and removes old addresses in the managed policy',()=>{const p=policy(),r=officerPolicyUpdate([p],roles);assert.equal(r.changed,true);assert.deepEqual(r.body.include,[{email:{email:'admin@example.invalid'}},{email:{email:'new@example.invalid'}}]);assert.equal(r.id,p.id);assert.ok(!Object.hasOwn(r.body,'id'));});
test('MFA, exclusions, approvals and ordering survive officer-list changes',()=>{const p=policy(),r=officerPolicyUpdate([p],roles);for(const key of ['require','exclude','mfa_config','approval_required','approval_groups','precedence','session_duration'])assert.deepEqual(r.body[key],p[key]);});
test('unrelated deny and MFA policies and input objects are not changed',()=>{const p=policy(),other={id:'unrelated',name:'Security deny',decision:'deny',include:[{everyone:{}}]},all=[other,p],before=structuredClone(all);const r=officerPolicyUpdate(all,roles);assert.equal(r.id,'managed-test');assert.deepEqual(all,before);});
test('matching officer lists are idempotent regardless of order',()=>{const p=policy();p.include=Object.keys(roles).reverse().map(email=>({email:{email}}));assert.equal(officerPolicyUpdate([p],roles).changed,false);});
test('missing or duplicated managed policy fails closed',()=>{assert.throws(()=>officerPolicyUpdate([],roles));assert.throws(()=>officerPolicyUpdate([policy(),policy()],roles));});
test('shared, changed-decision, broad or unknown policy configuration requires review',()=>{for(const delta of [{reusable:true},{app_count:2},{decision:'bypass'},{include:[{everyone:{}}]},{future_security_setting:true}])assert.throws(()=>officerPolicyUpdate([{...policy(),...delta}],roles));});

// These extension fields are synthetic. The failed production log did not reveal
// the actual extra field names, so no real policy payload is copied into tests.
const matchingPolicy=()=>({...policy(),include:Object.keys(roles).map(email=>({email:{email}}))});
test('unchanged officer list needs no writable payload even with extra response fields',()=>{
  const p={...matchingPolicy(),provider_extension:{enabled:true},provider_metadata:'synthetic'};
  const before=structuredClone(p),result=officerPolicyUpdate([p],roles);
  assert.deepEqual(result,{id:p.id,body:null,changed:false});
  assert.deepEqual(p,before);
});
test('known unchanged policy also emits no update body',()=>{
  const p=matchingPolicy();assert.deepEqual(officerPolicyUpdate([p],roles),{id:p.id,body:null,changed:false});
});
test('all pre-existing restrictions survive an unknown-field no-op unchanged',()=>{
  const p={...matchingPolicy(),future_restriction:{requires_review:true}};
  const before=structuredClone(p);officerPolicyUpdate([p],roles);
  assert.deepEqual(p,before);
  for(const key of ['require','exclude','mfa_config','approval_groups','approval_required','precedence'])assert.deepEqual(p[key],before[key]);
});
test('the deployment caller sends no PUT for an unchanged policy',async()=>{
  const p={...matchingPolicy(),provider_extension:true};const sent=[];
  const update=officerPolicyUpdate([p],roles);
  if(update.changed)sent.push({id:update.id,body:update.body});
  assert.deepEqual(sent,[]);
});
test('changed officer list still rejects unfamiliar settings without exposing their values',()=>{
  const p={...matchingPolicy(),future_restriction:{private_value:'synthetic-do-not-log'}};
  assert.throws(()=>officerPolicyUpdate([p],{...roles,'another@example.invalid':'viewer'}),error=>{
    assert.match(error.message,/Unknown Access policy settings/);
    assert.ok(!error.message.includes('synthetic-do-not-log'));return true;
  });
});
test('matching email addresses never bypass shared or non-allow policy checks',()=>{
  for(const delta of [{reusable:true},{app_count:2},{decision:'bypass'},{decision:'deny'},{id:''}])
    assert.throws(()=>officerPolicyUpdate([{...matchingPolicy(),provider_extension:true,...delta}],roles));
});
test('extra broad include conditions are rejected before accepting a no-op',()=>{
  const p=matchingPolicy();p.include.push({everyone:{}});p.provider_extension=true;
  assert.throws(()=>officerPolicyUpdate([p],roles),/Managed include conditions were changed/);
});
test('missing ambiguous and invalid desired identities remain rejected on no-op path',()=>{
  const p={...matchingPolicy(),provider_extension:true};
  assert.throws(()=>officerPolicyUpdate([p,p],roles),/missing or ambiguous/);
  assert.throws(()=>officerPolicyUpdate([p],{}),/Invalid officer email list/);
  assert.throws(()=>officerPolicyUpdate([p],{' ADMIN@example.invalid':'admin'}),/Invalid officer email list/);
});

// Sanitised shape observed on the real provider: uid aliases id. No real policy
// identifiers, email addresses or setting values are fixtures.
const fourRoles={'admin@example.invalid':'admin','treasurer@example.invalid':'treasurer','reader@example.invalid':'viewer','province@example.invalid':'registrar'};
const legacyPolicy=()=>({...policy(),id:'11111111-1111-4111-8111-111111111111',uid:'11111111-1111-4111-8111-111111111111',reusable:false,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z',include:Object.keys(fourRoles).slice(0,3).map(email=>({email:{email}}))});
test('legacy uid metadata permits the three-to-four officer update without entering PUT',()=>{
  const p=legacyPolicy(),before=structuredClone(p),u=officerPolicyUpdate([p],fourRoles);
  assert.equal(u.changed,true);assert.equal(u.body.include.length,4);
  assert.equal(u.body.include.filter(r=>r.email.email==='province@example.invalid').length,1);
  for(const k of ['id','uid','created_at','updated_at','reusable'])assert.ok(!Object.hasOwn(u.body,k));
  for(const k of ['require','exclude','mfa_config','approval_groups','precedence','decision','session_duration'])assert.deepEqual(u.body[k],p[k]);
  assert.deepEqual(p,before);
});
test('uid cannot conceal a conflicting identifier or a malformed value, even on a no-op',()=>{
  for(const uid of [null,0,'','different-id',{},false])for(const same of [true,false]){
    const p={...legacyPolicy(),uid};if(same)p.include=Object.keys(fourRoles).map(email=>({email:{email}}));
    assert.throws(()=>officerPolicyUpdate([p],fourRoles),/identifiers disagree/);
  }
});
test('an unknown security field still prevents a write when uid is present',()=>{
  assert.throws(()=>officerPolicyUpdate([{...legacyPolicy(),future_restriction:true}],fourRoles),/Unknown Access policy settings/);
});
test('matching legacy uid response remains idempotent',()=>{
  const p=legacyPolicy();p.include=Object.keys(fourRoles).map(email=>({email:{email}}));
  assert.deepEqual(officerPolicyUpdate([p],fourRoles),{id:p.id,body:null,changed:false});
});
test('provider read-back confirms all four officers and the original restrictions',()=>{
  const p=legacyPolicy(),u=officerPolicyUpdate([p],fourRoles),after={...p,...u.body,updated_at:'2026-01-02T00:00:00Z'};
  after.include.reverse();assert.equal(verifyOfficerPolicyUpdate(u,[after],fourRoles),true);
});
test('a successful PUT without the requested officer, or with an extra officer, is not accepted',()=>{
  const p=legacyPolicy(),u=officerPolicyUpdate([p],fourRoles);
  assert.throws(()=>verifyOfficerPolicyUpdate(u,[p],fourRoles),/not confirmed/);
  const after={...p,...u.body,include:[...u.body.include,{email:{email:'unapproved@example.invalid'}}]};
  assert.throws(()=>verifyOfficerPolicyUpdate(u,[after],fourRoles),/not confirmed/);
});
test('changed security restrictions or swapped target identity fail verification',()=>{
  const p=legacyPolicy(),u=officerPolicyUpdate([p],fourRoles),after={...p,...u.body};
  for(const change of [{require:[]},{exclude:[]},{mfa_config:{mfa_disabled:true}},{approval_required:false},{precedence:0}])
    assert.throws(()=>verifyOfficerPolicyUpdate(u,[{...after,...change}],fourRoles),/not preserved/);
  assert.throws(()=>verifyOfficerPolicyUpdate(u,[{...after,id:'other',uid:'other'}],fourRoles),/not confirmed/);
});
test('read-back of a no-op tolerates response metadata without manufacturing changes',()=>{
  const p={...legacyPolicy(),include:Object.keys(fourRoles).map(email=>({email:{email}})),future_restriction:{enabled:true}};
  const u=officerPolicyUpdate([p],fourRoles);assert.equal(verifyOfficerPolicyUpdate(u,[p],fourRoles),true);
});
