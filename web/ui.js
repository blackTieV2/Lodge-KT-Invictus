/* Hosted mode: the database is the master. No local file workspace or browser cache. */
(() => {
  'use strict';
  const C=Invictus,$=s=>document.querySelector(s),e=C.escape;
  const workspace=$('#workspace'),dialog=$('#member-dialog');
  let state=null,user=null,view='register',filter='all',query='',selected='',editing=false,dirty=false,busy=false,refreshing=false,editVersion=0,toastTimer;
  const people=()=>state?.register?.members||[],tasks=()=>state?.register?.actions||[];
  const person=id=>people().find(m=>m.id===id);
  const openTasks=id=>tasks().filter(a=>a.memberId===id&&a.state!=='done').sort((a,b)=>(a.priority==='high'?0:1)-(b.priority==='high'?0:1));
  const badge=(s,tone='')=>`<span class="badge ${tone}">${e(s)}</span>`;
  const membership=m=>badge(C.STATUS[m.memberStatus],C.isCurrent(m)?'green':'amber');
  const kol=m=>badge(C.KOL[m.kolStatus],['missing','correction'].includes(m.kolStatus)?'red':'');
  const fmt=n=>C.fmtMoney(n,'SGD'),date=s=>C.fmtDate(s);
  function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),7000);}
  function lock(message){state=null;user=null;dirty=false;dialog.close();$('#member-content').replaceChildren();$('#identity').textContent='Sign-in required';$('#save-state').textContent='Not connected';workspace.innerHTML=`<section class="session-error"><h1>Sign-in required</h1><p>${e(message)}</p><a class="button primary" href="/">Sign in again</a></section>`;}
  async function api(path,options={}) {
    const r=await fetch(path,{credentials:'same-origin',cache:'no-store',redirect:'manual',...options});
    if(r.type==='opaqueredirect'||r.status===401||!r.headers.get('content-type')?.includes('application/json')) { lock('Your session ended. Changes not confirmed as saved must be reviewed after signing in.');throw Error('Please sign in again.'); }
    const result=await r.json();
    if(r.status===403 && options.method===undefined){lock(result.error||'Access denied.');}
    if(!r.ok){const err=Error(result.error||'Online request failed.');err.status=r.status;throw err;}return result;
  }
  function status(){ if(!user){$('#save-state').textContent='Sign-in required';return;} $('#save-state').textContent=busy?'Saving online…':state?.savedAt?'Saved online · '+new Date(state.savedAt).toLocaleTimeString():'Online · awaiting initial data';$('#save-state').classList.toggle('dirty',dirty||busy);}
  function heading(title,description,buttons=''){return `<div class="page-heading"><div><span class="eyebrow">INVICTUS · ONLINE WORKSPACE</span><h1>${e(title)}</h1><p class="subheading">${e(description)}</p></div><div class="heading-actions">${buttons}</div></div>`;}
  const identity=m=>`<button class="member-link" data-member="${e(m.id)}">${e(m.name)}</button><span class="smallprint">${e(m.mmh?'MMH '+m.mmh:'MMH not recorded')}</span>`;
  function notice(){const d=state.register;return `<div class="notice"><strong>WORKING REGISTER</strong> · Source coverage ${e(date(d.asOf))} · Online revision ${state.version}. ${e(d.notice)}</div>`;}
  function toolbar(){return `<div class="tools"><label class="search-wrap"><input id="search" type="search" value="${e(query)}" placeholder="Search name, alias, MMH or invoice…" aria-label="Search members" autocomplete="off"></label><span id="count" class="count"></span></div>`;}
  const filters={all:'Everyone',current:'Current',missing:'Missing KOL',chase:'Payment follow-up',departures:'Departures',review:'Red flags'};
  function rows(){
    const d=state.register;let list=C.filterMembers(d,query,filter);
    if(view==='registrar'||view==='treasurer'){
      const owner=view==='registrar'?'Registrar':'Treasurer';const aa=tasks().filter(a=>a.owner===owner&&a.state!=='done'&&C.matches(person(a.memberId),query)).sort((a,b)=>(a.priority==='high'?0:1)-(b.priority==='high'?0:1));
      $('#count').textContent=aa.length+' open follow-ups';
      $('#results').innerHTML=`<div class="table-scroll"><table><thead><tr><th>Brother Knight</th><th>Follow-up</th><th>Status</th><th>Due</th></tr></thead><tbody>${aa.map(a=>`<tr><td>${identity(person(a.memberId))}</td><td class="next-action">${e(a.title)}<span class="smallprint">${e(a.reference)}</span></td><td>${badge(C.TASK[a.state],a.priority==='high'?'red':'')}</td><td>${e(date(a.due))}</td></tr>`).join('')}</tbody></table></div>`;return;
    }
    $('#count').textContent=list.length+' of '+people().length+' people';
    $('#results').innerHTML=`<div class="table-scroll"><table><thead><tr><th>Brother Knight</th><th>Membership</th><th>Keystone</th><th>Accounts · SGD</th><th>Next follow-up</th></tr></thead><tbody>${list.map(m=>{const a=openTasks(m.id)[0];return `<tr><td>${identity(m)}</td><td>${membership(m)}<span class="smallprint">${e(C.BASIS[m.basis])}${m.effectiveDate?' · '+e(date(m.effectiveDate)):''}</span></td><td>${kol(m)}<span class="smallprint">${m.kolAsOf?'Snapshot '+e(date(m.kolAsOf)):'External position unverified'}</span></td><td><strong>${e(fmt(m.balance))}</strong><span class="smallprint">${e(C.FINANCE[m.financeStatus])}</span><span class="smallprint">${e(m.invoice)}</span></td><td class="next-action">${a?e(a.title):'No open follow-up'}<span class="smallprint">${e(a?.owner||'')}</span></td></tr>`;}).join('')}</tbody></table>${list.length?'':'<div class="empty">No matching records.</div>'}</div>`;
  }
  function render(){
    if(!user)return;status();$('#identity').textContent=user.email+' · '+user.role;$('#backup-nav').hidden=user.role!=='admin';
    document.querySelectorAll('.nav').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
    if(!state?.register){workspace.innerHTML=heading('Your online workspace is ready','The administrator must load the reviewed register once. Thereafter everyone opens this same online record.')+`<section class="panel"><div class="empty"><h2>No register has been loaded yet</h2><p>No data file is needed for normal daily use.</p>${user.role==='admin'?'<button class="button primary" data-command="seed">Administrator: initialise once</button>':'<p>Ask the administrator to complete the initial data load.</p>'}</div></section>`;return;}
    if(view==='history'||view==='backups'){loadHistory();return;}
    if(view==='gp'){const members=people().filter(m=>m.gpPence>0);workspace.innerHTML=heading('GP cost review','Proposed absorption only. Approval and accounting treatment remain separate.')+notice()+`<section class="panel"><div class="tools"><strong>${e(C.fmtMoney(members.reduce((n,m)=>n+m.gpPence,0),'GBP'))} proposed · pending approval</strong></div><div class="table-scroll"><table><thead><tr><th>Brother Knight</th><th>Proposed GBP</th><th>Basis</th></tr></thead><tbody>${members.map(m=>`<tr><td>${identity(m)}</td><td>${e(C.fmtMoney(m.gpPence,'GBP'))}</td><td class="next-action">${e(m.gpBasis)}</td></tr>`).join('')}</tbody></table></div></section>`;return;}
    const s=C.summary(state.register),title=view==='register'?'The register':view==='registrar'?'Registrar actions':'Treasurer actions';
    workspace.innerHTML=heading(title,'One shared record. Search a Brother Knight and see what needs attention.',view==='register'?`${['admin','registrar'].includes(user.role)?'<button class="button" data-command="add">Add person</button>':''}<button class="button primary" data-command="next">Next red flag →</button>`:'')+notice()+`<div class="stats"><div class="stat"><small>PEOPLE IN REGISTER</small><strong>${s.records}</strong><span>${s.current} marked current · not a certified roll</span></div><div class="stat"><small>REGISTRAR FOLLOW-UPS</small><strong>${s.registrar}</strong></div><div class="stat"><small>TREASURER FOLLOW-UPS</small><strong>${s.treasurer}</strong></div><div class="stat"><small>RED FLAGS</small><strong>${s.redFlags}</strong></div></div><section class="panel">${toolbar()}${view==='register'?`<div class="chips">${Object.entries(filters).map(([k,v])=>`<button class="chip ${filter===k?'selected':''}" data-filter="${k}" aria-pressed="${filter===k}">${v}</button>`).join('')}</div>`:''}<div id="results"></div><div class="table-foot">Online saves update this register only. Payment, posting, membership and KOL remain separate.</div></section>`;rows();
  }
  async function loadHistory(){
    const target=view;workspace.innerHTML=heading(target==='backups'?'Recovery snapshots':'Online change history',target==='backups'?'Latest 60 saved versions. Administrator recovery exports are optional, not part of daily use.':'Server-recorded attribution. Prior imported source history remains inside the individual records.')+'<section class="panel" id="history-results"><div class="empty">Loading…</div></section>';
    try{const response=await api(target==='backups'?'/api/backups':'/api/audit');if(view!==target||!user)return;
      $('#history-results').innerHTML=`<div class="member-body-online">${target==='backups'?response.backups.map(b=>`<div class="history-entry"><strong>Revision ${b.version}</strong> · ${e(b.saved_at)} <button class="button small" data-backup="${b.version}">Export recovery snapshot</button></div>`).join(''):response.events.map(h=>`<div class="history-entry"><strong>Revision ${h.version}</strong> · ${e(h.saved_at)}<p>${e(h.actor)} · ${e(h.summary)}</p><small>${e(h.reference)}</small></div>`).join('')||'No server changes yet.'}</div>`;
    }catch(err){if(user)toast(err.message);}
  }
  function field(k,label,value,type='text',choices=null){const input=choices?`<select name="${k}">${Object.entries(choices).map(([v,t])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(t)}</option>`).join('')}</select>`:type==='textarea'?`<textarea name="${k}" maxlength="10000">${e(value)}</textarea>`:`<input name="${k}" type="${type}" value="${e(value??'')}" ${type==='number'?'step="0.01"':''}>`;return `<label class="field">${e(label)}${input}</label>`;}
  const labels={name:'Name',mmh:'MMH number',aliases:'Aliases (semicolon separated)',memberStatus:'Membership',basis:'Evidence basis',effectiveDate:'Effective / proposed date',statusNote:'Membership qualification',admissionRoute:'Admission route',admissionDate:'Admission date',kolStatus:'KOL position',kolAsOf:'KOL snapshot date',financeStatus:'Account position',balance:'Working balance SGD',invoice:'Invoice reference',financeNote:'Account qualification',gpPence:'Proposed GP cost GBP',gpBasis:'GP cost basis',notes:'Working notes'};
  function showMember(id,edit=false){selected=id;editing=edit;dirty=false;editVersion=state.version;drawMember();if(!dialog.open)dialog.showModal();}
  function drawMember(){
    const m=person(selected);if(!m)return;const choices={memberStatus:C.STATUS,basis:C.BASIS,kolStatus:C.KOL,financeStatus:C.FINANCE};
    const head=`<div class="modal-head"><div><span class="eyebrow">BROTHER KNIGHT · ONLINE RECORD</span><h2 id="member-title">${e(m.name)}</h2><span class="smallprint">${e(m.mmh?'MMH '+m.mmh:'MMH not recorded')} · ${e(m.id)}</span></div><button class="icon-button" data-command="close" aria-label="Close member record">×</button></div>`;
    if(editing){$('#member-content').innerHTML=head+`<form id="edit-form" class="online-form"><div class="record-grid">${user.editableFields.map(k=>{let v=m[k];if(k==='aliases')v=v.join('; ');if(k==='balance'||k==='gpPence')v=v===null?'':(v/100).toFixed(2);return field(k,labels[k],v, /Note|notes|Basis/.test(k)?'textarea': /Date|AsOf/.test(k)?'date':['balance','gpPence'].includes(k)?'number':'text',choices[k]);}).join('')}</div><label class="field">Reason and supporting reference<textarea name="reason" required maxlength="3000"></textarea></label><p id="edit-error" class="error" role="alert"></p><div class="modal-actions"><button type="button" class="button" data-command="cancel-edit">Cancel</button><button type="submit" class="button primary">Save online</button></div></form>`;return;}
    const canTask=a=>user.role==='admin'||(user.role==='registrar'&&a.owner!=='Treasurer')||(user.role==='treasurer'&&a.owner==='Treasurer');
    $('#member-content').innerHTML=head+`<div class="member-body-online"><div class="status-bar">${membership(m)}${badge(C.BASIS[m.basis])}${kol(m)}</div><p>${e(m.statusNote)}</p><div class="record-grid"><section class="record-box"><h3>Membership &amp; KOL</h3><p>Effective/proposed: ${e(date(m.effectiveDate))}</p><p>Admission: ${e(m.admissionRoute)} · ${e(date(m.admissionDate))}</p><p>KOL snapshot: ${e(date(m.kolAsOf))}</p></section><section class="record-box"><h3>Account position</h3><strong>${e(fmt(m.balance))}</strong><p>${e(C.FINANCE[m.financeStatus])} · ${e(m.invoice)}</p><p>Original ledger: ${e(fmt(m.ledgerBalance))}</p><p>${e(m.financeNote)}</p></section></div><p>${e(m.notes)}</p>${user.editableFields.length?'<button class="button primary" data-command="edit">Edit working record</button>':'<p>Read-only access</p>'}<h3>Follow-ups</h3><p id="action-error" class="error" role="alert"></p>${tasks().filter(a=>a.memberId===m.id).map(a=>`<section class="action-card"><strong>${e(a.title)}</strong><p>${e(a.owner)} · ${e(C.TASK[a.state])} · ${e(date(a.due))}</p>${canTask(a)?`<form data-action-form="${e(a.id)}">${field('state','Progress',a.state,'text',C.TASK)}${field('reference','Progress / completion reference',a.reference)}<button class="button small" type="submit">Save progress</button></form>`:`<p>${e(a.reference)}</p>`}</section>`).join('')||'<p>No follow-ups recorded.</p>'}${user.role!=='viewer'?`<form id="add-action" class="action-card"><h3>Add a follow-up</h3>${field('title','Required action','','textarea')}${field('owner','Owner',user.role==='treasurer'?'Treasurer':'Registrar','text',Object.fromEntries((user.role==='treasurer'?['Treasurer']:C.OWNERS).map(x=>[x,x])))}${field('priority','Priority','normal','text',{normal:'Routine',high:'High'})}${field('due','Due date (leave blank if unknown)','','date')}<button class="button" type="submit">Add follow-up</button></form>`:''}<h3>Source references</h3><ul class="source-list">${m.sources.map(s=>`<li>${e(s)}</li>`).join('')}</ul><details><summary>Preserved source snapshot</summary><p>${e(m.original)}</p></details><h3>Record history</h3>${state.register.history.filter(h=>h.memberId===m.id).slice(-15).reverse().map(h=>`<div class="history-entry"><strong>${e(h.actor)}</strong> · ${e(h.at)}<p>${e(h.summary)}</p><small>${e(h.reference)}</small></div>`).join('')||'<p>No changes recorded.</p>'}</div>`;
  }
  async function save(path,method,payload,version=editVersion,initial=false){
    if(busy)return false;busy=true;status();dialog.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=true);
    try{state=await api(path,{method,headers:{'Content-Type':'application/json','X-Invictus-Request':'1',...(initial?{'If-None-Match':'*'}:{'If-Match':`"${version}"`})},body:JSON.stringify(payload)});dirty=false;editing=false;$('#connection').textContent='';render();if(dialog.open){editVersion=state.version;drawMember();}toast('Saved online. Other officers will see this update.');return true;}
    catch(err){if(user){const target=dialog.open?$(editing?'#edit-error':'#action-error'):null;if(target)target.textContent=err.message;else toast(err.message);$('#connection').textContent=err.status===409?'A newer online revision exists. Your draft is still open; copy or review it before closing and refreshing.':'Save was not confirmed. Keep this page open and check the connection before continuing.';}return false;}
    finally{busy=false;status();dialog.querySelectorAll('button[type=submit]').forEach(b=>b.disabled=false);}
  }
  async function refresh(manual=false){
    if(refreshing||busy||!user)return;
    if(manual&&dialog.open){if(dirty&&!confirm('Discard the unsaved form and reload the latest online record?'))return;dirty=false;dialog.close();}
    refreshing=true;
    try{const next=await api('/api/register');if(!user)return;if(dialog.open){if(next.version!==state.version)$('#connection').textContent='Another officer updated the register. Your open form has not been replaced. Close it and refresh before editing the latest version.';return;}
      const changed=!state||next.version!==state.version;state=next;$('#connection').textContent='';if(changed||manual)render();else status();}
    catch(err){if(user)$('#connection').textContent='Connection unavailable. Displaying the last loaded record; saves must be confirmed online.';}
    finally{refreshing=false;}
  }
  document.addEventListener('click',async event=>{
    const b=event.target.closest('button');if(!b||busy)return;
    try{
      if(b.dataset.view){view=b.dataset.view;query='';render();return;}
      if(b.dataset.filter){filter=b.dataset.filter;render();return;}
      if(b.dataset.member){showMember(b.dataset.member);return;}
      if(b.dataset.backup){if(!confirm('Export this private recovery snapshot? It is unencrypted and contains member data.'))return;const d=await api('/api/backups/'+b.dataset.backup);const url=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Invictus-private-recovery-'+b.dataset.backup+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return;}
      switch(b.dataset.command){
        case 'close':if(dirty&&!confirm('Discard unsaved form changes?'))return;dirty=false;dialog.close();await refresh();break;
        case 'edit':showMember(selected,true);break;
        case 'cancel-edit':if(dirty&&!confirm('Discard unsaved form changes?'))return;showMember(selected);break;
        case 'next':{const list=people().filter(C.isRedFlag);if(!list.length){toast('No red flags recorded.');break;}showMember(list[(list.findIndex(m=>m.id===selected)+1)%list.length].id);break;}
        case 'seed':$('#seed-file').click();break;
        case 'add':{const name=prompt('Full name for the new person record:');if(!name?.trim())return;const reason=prompt('Reason/source for adding this working record (does not establish membership):');if(reason?.trim())await save('/api/members','POST',{name,reason},state.version);break;}
      }
    }catch(err){toast(err.message);}
  });
  $('#refresh').addEventListener('click',()=>refresh(true));
  workspace.addEventListener('input',event=>{if(event.target.id==='search'){query=event.target.value;rows();}});
  dialog.addEventListener('input',()=>{dirty=true;status();});
  dialog.addEventListener('cancel',event=>{if(busy||(dirty&&!confirm('Discard unsaved form changes?')))event.preventDefault();else dirty=false;});
  dialog.addEventListener('close',()=>{dirty=false;editing=false;status();});
  dialog.addEventListener('submit',async event=>{
    event.preventDefault();const f=event.target,values=Object.fromEntries(new FormData(f));
    try{if(f.id==='edit-form'){
      const m=person(selected),changes={};for(const k of user.editableFields){let v=values[k];if(k==='aliases')v=v.split(';').map(x=>x.trim()).filter(Boolean);if(k==='balance'||k==='gpPence')v=C.amount(v);if(k==='gpPence'&&v===null)v=0;if(JSON.stringify(v)!==JSON.stringify(m[k]))changes[k]=v;}
      if(!Object.keys(changes).length){toast('No changes to save.');return;}await save('/api/members/'+encodeURIComponent(selected),'PATCH',{changes,reason:values.reason});
    }else if(f.dataset.actionForm)await save('/api/actions/'+encodeURIComponent(f.dataset.actionForm),'PATCH',values);
    else if(f.id==='add-action')await save('/api/actions','POST',{...values,memberId:selected});
    }catch(err){const t=$(editing?'#edit-error':'#action-error');if(t)t.textContent=err.message;}
  });
  $('#seed-file').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>1500000)throw Error('Register exceeds the online limit.');const d=C.validate(JSON.parse(await file.text()));const reference=prompt('Reference for this reviewed initial register:');if(!reference?.trim())return;if(!confirm('Initialise the shared online register once? This does not certify its contents.'))return;await save('/api/register','POST',{register:d,reference},0,true);}catch(err){toast(err.message);}finally{event.target.value='';}});
  window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
  window.addEventListener('pageshow',event=>{if(event.persisted){lock('Rechecking sign-in after restoring this page.');start();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!dialog.open&&$('#search')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
  async function start(){try{user=await api('/api/session');await refresh(true);}catch(err){if(!user)workspace.innerHTML=`<section class="session-error"><h1>Online register unavailable</h1><p>${e(err.message)}</p><a class="button primary" href="/">Retry sign-in</a></section>`;}}
  setInterval(()=>{if(!document.hidden)refresh();},30000);start();
})();
