/* Online action workspace. D1 remains the master; no private browser storage. */
(() => {
  'use strict';
  const C = Invictus, $ = s => document.querySelector(s), e = C.escape;
  const workspace = $('#workspace'), dialog = $('#member-dialog'), content = $('#member-content');
  let state = null, user = null, view = 'actions', query = '', memberFilter = 'all';
  let actionFilter = 'outstanding', ownerFilter = 'all', dueFilter = 'all', sort = 'priority';
  let draft = null, dirty = false, busy = false, refreshing = false, offline = false, saveFailed = false;
  let generation = 0, toastTimer, historyCursor = null, historyLoading = false;
  const people = () => state?.register?.members || [], tasks = () => state?.register?.actions || [];
  const person = id => people().find(m => m.id === id), task = id => tasks().find(a => a.id === id);
  const canManage = a => user?.role === 'admin' || (user?.role === 'registrar' && a.owner !== 'Treasurer') || (user?.role === 'treasurer' && a.owner === 'Treasurer');
  const canCreate = () => user && user.role !== 'viewer';
  const isActionView = () => ['actions', 'registrar', 'treasurer'].includes(view);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const overdue = a => a.state !== 'done' && a.due && a.due < today();
  const date = s => C.fmtDate(s), money = n => C.fmtMoney(n, 'SGD');
  const badge = (text, tone='') => `<span class="badge ${tone}">${e(text)}</span>`;
  const memberBadge = m => badge(C.STATUS[m.memberStatus], C.isCurrent(m) ? 'green' : 'amber');
  const kolBadge = m => badge(C.KOL[m.kolStatus], ['missing','correction'].includes(m.kolStatus) ? 'red' : '');
  const taskNames = { open:'To do', progress:'In progress', waiting:'Waiting', done:'Completed' };
  const taskFilters = { outstanding:'Outstanding', open:'To do', progress:'In progress', waiting:'Waiting', done:'Completed', all:'All' };
  const memberFilters = { all:'Everyone', current:'Current', missing:'Missing KOL', chase:'Payment follow-up', departures:'Departures', review:'Red flags' };
  const normal = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const options = (map, current) => Object.entries(map).map(([value,label]) => `<option value="${e(value)}" ${value===current?'selected':''}>${e(label)}</option>`).join('');
  const button = (label, command, id='', css='button') => `<button type="button" class="${css}" data-command="${command}" data-id="${e(id)}">${label}</button>`;
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 9000); }
  function status() {
    $('#save-state').textContent = !user ? 'Not signed in' : busy ? 'Saving online…' : saveFailed ? 'Last save not confirmed' : dirty ? 'Unsaved changes' : offline ? 'Connection lost · last loaded copy' : state?.savedAt ? `Saved online · revision ${state.version}` : 'Connected';
    $('#save-state').classList.toggle('dirty', dirty || busy || offline || saveFailed);
  }
  function lock(message) {
    generation++; user = null; state = null; draft = null; dirty = false;
    if (dialog.open) dialog.close(); content.replaceChildren();
    $('#identity').textContent = 'Sign-in required'; status();
    workspace.innerHTML = `<section class="empty"><h1>Sign-in required</h1><p>${e(message)}</p><a class="button primary" href="/">Sign in again</a></section>`;
  }
  async function api(path, options={}) {
    const response = await fetch(path, { credentials:'same-origin', cache:'no-store', redirect:'manual', ...options });
    if (response.type === 'opaqueredirect' || response.status === 401 || !response.headers.get('content-type')?.includes('application/json')) {
      lock('Your session ended. Sign in again before continuing.'); throw Error('Please sign in again.');
    }
    const value = await response.json();
    if (response.status === 403 && !options.method) lock(value.error || 'Access denied.');
    if (!response.ok) { const error = Error(value.error || 'The request failed.'); error.status = response.status; throw error; }
    return value;
  }
  function heading(title, description, controls='') {
    return `<div class="page-heading"><div><span class="eyebrow">INVICTUS · ACTION WORKSPACE</span><h1>${e(title)}</h1><p class="subheading">${e(description)}</p></div><div class="heading-actions">${controls}</div></div>`;
  }
  function sourceNotice() {
    const d = state.register;
    return `<details class="source-notice"><summary>Working register · source coverage ${e(date(d.asOf))} · revision ${state.version}</summary><p>${e(d.notice)} Membership, payment and KOL updates are separate from task completion.</p></details>`;
  }
  function effectiveOwner() { return view === 'registrar' ? 'Registrar' : view === 'treasurer' ? 'Treasurer' : ownerFilter; }
  function matchesTask(a) {
    const m = person(a.memberId);
    const hay = normal([a.title,a.reference,a.owner,taskNames[a.state],m?.name,m?.mmh,m?.invoice,...(m?.aliases||[])].join(' '));
    return normal(query).trim().split(/\s+/).every(word => hay.includes(word));
  }
  function ordered(list) {
    return [...list].sort((a,b) => {
      if (sort === 'member') return person(a.memberId).name.localeCompare(person(b.memberId).name) || a.title.localeCompare(b.title);
      if (sort === 'due') return (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title);
      return Number(!!overdue(b))-Number(!!overdue(a)) || Number(b.priority==='high')-Number(a.priority==='high') || (a.due||'9999').localeCompare(b.due||'9999') || person(a.memberId).name.localeCompare(person(b.memberId).name);
    });
  }
  function actionCard(a, compact=false) {
    const m = person(a.memberId), editable = canManage(a);
    const due = overdue(a) ? badge(`Overdue · ${date(a.due)}`, 'red') : a.due ? badge(`Due ${date(a.due)}`) : '<span class="subtle">No due date</span>';
    const transitions = a.state === 'done' ? button('Reopen', 'task-open', a.id) :
      `${button('✓ Complete', 'task-done', a.id, 'button complete')}${a.state!=='progress'?button(a.state==='waiting'?'Resume':'Start','task-progress',a.id):''}${a.state!=='waiting'?button('Waiting','task-waiting',a.id):''}`;
    return `<article class="work-card ${a.state==='done'?'work-done':''} ${overdue(a)?'work-overdue':''}" data-task="${e(a.id)}" aria-label="${e(a.title)}">
      <div class="work-top"><button class="member-link" data-member="${e(m.id)}">${e(m.name)}</button>${a.priority==='high'?badge('High priority','amber'):''}</div>
      <h3>${e(a.title)}</h3>
      <div class="work-meta">${badge(a.owner)}${badge(taskNames[a.state],a.state==='done'?'green':a.state==='progress'?'blue':'')}${due}</div>
      ${compact?'':`<div class="work-context">${memberBadge(m)} ${kolBadge(m)} <span>${e(C.FINANCE[m.financeStatus])}${m.invoice?' · '+e(m.invoice):''}</span></div>`}
      ${a.reference?`<p class="work-note"><strong>${a.state==='done'?'Completion record':'Latest note'}:</strong> ${e(a.reference)}</p>`:''}
      <div class="work-controls">${editable?transitions:'<span class="subtle">Read-only for your role</span>'}${editable?button('Edit task','task-edit',a.id):''}${button('Open record →','member',m.id,'button quiet')}</div>
    </article>`;
  }
  function renderActions() {
    const owner = effectiveOwner(), scoped = tasks().filter(a => owner==='all' || a.owner===owner);
    const counts = { outstanding:scoped.filter(a=>a.state!=='done').length, overdue:scoped.filter(overdue).length, waiting:scoped.filter(a=>a.state==='waiting').length, done:scoped.filter(a=>a.state==='done').length };
    const title = view==='registrar' ? 'Registrar actions' : view==='treasurer' ? 'Treasurer actions' : 'Action centre';
    workspace.innerHTML = heading(title, user.role==='viewer'?'Review progress and open the supporting member record.':'Start a follow-up, record progress, or tick it off when the work is done.', canCreate()?button('+ New follow-up','new-task','','button primary'):'') +
      `<div class="stats action-stats">${[['outstanding','Outstanding'],['overdue','Overdue'],['waiting','Waiting'],['done','Completed']].map(([key,label])=>`<button class="stat" data-count-filter="${key}" aria-label="Show ${label.toLowerCase()} follow-ups"><small>${label.toUpperCase()}</small><strong>${counts[key]}</strong><span>${key==='overdue'?'Past a recorded due date':key==='done'?'View or reopen completed work':'Click to filter'}</span></button>`).join('')}</div>
      <section class="work-toolbar"><label class="search-label">Find a follow-up<input id="search" type="search" value="${e(query)}" placeholder="Search a name, task, invoice or note…" aria-label="Search follow-ups" autocomplete="off"></label>
      ${view==='actions'?`<label>Owner<select id="owner-filter">${options({all:'All officers',Registrar:'Registrar',Treasurer:'Treasurer',Preceptor:'Preceptor'},ownerFilter)}</select></label>`:''}
      <label>Due<select id="due-filter">${options({all:'Any date',overdue:'Overdue',today:'Due today',none:'No due date'},dueFilter)}</select></label>
      <label>Sort<select id="task-sort">${options({priority:'Priority first',due:'Due date',member:'Brother Knight'},sort)}</select></label></section>
      <div class="task-tabs" role="group" aria-label="Follow-up status">${Object.entries(taskFilters).map(([key,label])=>`<button class="chip ${actionFilter===key?'selected':''}" data-task-filter="${key}" aria-pressed="${actionFilter===key}">${label} <span>${key==='all'?scoped.length:key==='outstanding'?counts.outstanding:scoped.filter(a=>a.state===key).length}</span></button>`).join('')}</div>
      <div class="work-results-heading"><p id="count" aria-live="polite"></p>${button('Clear filters','clear-filters','','text-button')}</div><div id="results" class="work-grid"></div>${sourceNotice()}`;
    actionResults();
  }
  function actionResults() {
    const owner=effectiveOwner();
    const list=ordered(tasks().filter(a => (owner==='all'||a.owner===owner) && matchesTask(a) &&
      (actionFilter==='all'||(actionFilter==='outstanding'?a.state!=='done':a.state===actionFilter)) &&
      (dueFilter==='all'||(dueFilter==='overdue'?overdue(a):dueFilter==='today'?a.state!=='done'&&a.due===today():!a.due))));
    $('#count').textContent=`${list.length} follow-up${list.length===1?'':'s'} shown${actionFilter==='done'?' · completed work is retained, not deleted':''}`;
    $('#results').innerHTML=list.length?list.map(a=>actionCard(a)).join(''):'<section class="empty work-empty"><h2>No follow-ups in this view</h2><p>Change the filters, view completed work, or create a new follow-up.</p></section>';
  }
  function memberRows() {
    const list=C.filterMembers(state.register,query,memberFilter);
    $('#count').textContent=`${list.length} of ${people().length} people`;
    $('#results').innerHTML=`<div class="table-scroll member-table"><table><thead><tr><th>Brother Knight</th><th>Membership / KOL</th><th>Account · SGD</th><th>Work remaining</th><th>Update</th></tr></thead><tbody>${list.map(m=>{
      const pending=tasks().filter(a=>a.memberId===m.id&&a.state!=='done');
      return `<tr><td><button class="member-link" data-member="${e(m.id)}">${e(m.name)}</button><span class="smallprint">${e(m.mmh?'MMH '+m.mmh:'MMH not recorded')}</span></td><td>${memberBadge(m)} ${kolBadge(m)}<span class="smallprint">${e(C.BASIS[m.basis])}</span></td><td><strong>${e(money(m.balance))}</strong><span class="smallprint">${e(C.FINANCE[m.financeStatus])} ${e(m.invoice)}</span></td><td>${button(`${pending.length} open follow-up${pending.length===1?'':'s'}`,'member',m.id,'button quiet')}</td><td><div class="row-controls">${button('Open record','member',m.id)}${user.editableFields.length?button('Edit','member-edit',m.id):''}${canCreate()?button('+ Follow-up','new-task',m.id):''}</div></td></tr>`;
    }).join('')}</tbody></table>${list.length?'':'<div class="empty">No matching people.</div>'}</div>`;
  }
  function renderMembers() {
    const s=C.summary(state.register);
    workspace.innerHTML=heading('Members',`${s.records} identities · ${s.current} marked current, not a certified roll. Use Open record or Edit beside a name.`, `${['admin','registrar'].includes(user.role)?button('+ Add person','add-person'):''}${button('Go to actions →','go-actions','','button primary')}`)+
      `<section class="panel"><div class="tools"><label class="search-label">Find a Brother Knight<input id="search" type="search" value="${e(query)}" placeholder="Name, alias, MMH or invoice…" aria-label="Search members"></label><span id="count" class="count"></span></div><div class="chips">${Object.entries(memberFilters).map(([k,v])=>`<button class="chip ${memberFilter===k?'selected':''}" data-member-filter="${k}" aria-pressed="${memberFilter===k}">${v}</button>`).join('')}</div><div id="results"></div></section>${sourceNotice()}`;
    memberRows();
  }
  function renderGP() {
    const list=people().filter(m=>m.gpPence>0);
    workspace.innerHTML=heading('GP cost review','Proposed absorption remains separate from member debts and meeting approval.')+`<section class="panel"><div class="tools"><strong>${e(C.fmtMoney(list.reduce((n,m)=>n+m.gpPence,0),'GBP'))} proposed · pending approval</strong></div><div class="table-scroll member-table"><table><thead><tr><th>Brother Knight</th><th>Proposed GBP</th><th>Basis</th><th>Action</th></tr></thead><tbody>${list.map(m=>`<tr><td><button class="member-link" data-member="${e(m.id)}">${e(m.name)}</button></td><td>${e(C.fmtMoney(m.gpPence,'GBP'))}</td><td>${e(m.gpBasis)}</td><td>${button('Open record','member',m.id)}${canCreate()?button('+ Follow-up','new-task',m.id):''}</td></tr>`).join('')}</tbody></table></div></section>${sourceNotice()}`;
  }
  async function renderHistory(more=false) {
    const target=view;
    if(!more){historyCursor=null;workspace.innerHTML=heading(target==='backups'?'Recovery snapshots':'Online change history',target==='backups'?'Latest saved versions; private recovery exports are not required for normal use.':'Who changed what, when, and with which reference.')+'<section class="panel"><div class="history-list" id="history-results"></div><div id="history-more"></div></section>';}
    if(historyLoading)return;historyLoading=true;
    try {
      const response=await api(target==='backups'?'/api/backups':'/api/audit'+(historyCursor?'?before='+historyCursor:''));
      if(view!==target||!user)return;
      const rows=target==='backups'?response.backups:response.events;
      $('#history-results').insertAdjacentHTML('beforeend',rows.map(h=>`<article class="history-entry"><strong>Revision ${h.version}</strong> · ${e(h.saved_at)}${target==='backups'?button('Export recovery snapshot','backup',String(h.version)):`<p>${e(h.actor)} · ${e(h.summary)}</p><p>${e(h.reference)}</p>`}</article>`).join('')||(!more?'<p class="empty">No entries yet.</p>':''));
      historyCursor=rows.at(-1)?.version;
      $('#history-more').innerHTML=target==='history'&&rows.length===100?button('Load earlier changes','more-history'):'';
    }catch(error){if(user)toast(error.message);}finally{historyLoading=false;}
  }
  function render() {
    if(!user)return;status();$('#identity').textContent=`${user.email} · ${user.role}`;$('#backup-nav').hidden=user.role!=='admin';
    document.querySelectorAll('.nav').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
    if(!state?.register){workspace.innerHTML=heading('Your online workspace is ready','Load the reviewed register once. Daily work then stays online.')+`<section class="empty panel"><h2>No register has been loaded yet</h2>${user.role==='admin'?button('Administrator: initialise once','seed','','button primary'):'<p>Ask the administrator to load the reviewed register.</p>'}</section>`;return;}
    if(isActionView())renderActions();else if(view==='register')renderMembers();else if(view==='gp')renderGP();else renderHistory();
  }
  function field(key,label,value='',type='text',choices=null,attrs='') {
    const control=choices?`<select name="${key}" ${attrs}>${options(choices,value)}</select>`:type==='textarea'?`<textarea name="${key}" ${attrs}>${e(value)}</textarea>`:`<input name="${key}" type="${type}" value="${e(value??'')}" ${type==='number'?'step="0.01"':''} ${attrs}>`;
    return `<label class="field">${e(label)}${control}</label>`;
  }
  function modalHeader(title,subtitle='') { return `<div class="modal-head"><div><h2 id="member-title" tabindex="-1">${e(title)}</h2><p class="subheading">${e(subtitle)}</p></div>${button('×','close','','icon-button close-dialog')}</div>`; }
  function formFooter(label='Save online') { return `<p id="edit-error" class="error" role="alert" tabindex="-1"></p><div class="modal-actions">${button('Cancel','close')}<button class="button primary" type="submit">${e(label)}</button></div>`; }
  function openModal(kind, html, extra={}) {
    if(busy || (dirty&&!confirm('Discard unsaved changes?')))return;
    draft={kind,version:state.version,...extra};dirty=false;content.innerHTML=html;
    content.querySelector('.close-dialog')?.setAttribute('aria-label','Close member record');
    if(!dialog.open)dialog.showModal();
    content.querySelector('[autofocus], #member-title')?.focus();dialog.scrollTop=0;status();
  }
  function memberView(id) {
    const m=person(id);if(!m)return;const pending=tasks().filter(a=>a.memberId===id&&a.state!=='done'),done=tasks().filter(a=>a.memberId===id&&a.state==='done');
    openModal('member',modalHeader(m.name,m.mmh?'MMH '+m.mmh:'MMH not recorded')+`<div class="member-body-online"><div class="member-quick-actions">${user.editableFields.length?button('Edit working record','member-edit',id,'button primary'):badge('Read-only')}${canCreate()?button('+ New follow-up','new-task',id):''}</div>
      <div class="record-grid"><section class="record-box"><h3>Membership &amp; KOL</h3><div class="work-meta">${memberBadge(m)}${badge(C.BASIS[m.basis])}${kolBadge(m)}</div><p>${e(m.statusNote)}</p><p>Effective / proposed: ${e(date(m.effectiveDate))}</p><p>Admission: ${e(m.admissionRoute)} · ${e(date(m.admissionDate))}</p><p>KOL snapshot: ${e(date(m.kolAsOf))}</p></section><section class="record-box"><h3>Account</h3><strong>${e(money(m.balance))}</strong><p>${e(C.FINANCE[m.financeStatus])} · ${e(m.invoice)}</p><p>${e(m.financeNote)}</p><p>Original ledger: ${e(money(m.ledgerBalance))}</p></section></div>
      <h3>Working notes</h3><p class="preserve-lines">${e(m.notes)||'No working note recorded.'}</p><h3>${pending.length} outstanding follow-up${pending.length===1?'':'s'}</h3>${ordered(pending).map(a=>actionCard(a,true)).join('')||'<p>Nothing outstanding for this person.</p>'}
      ${done.length?`<details><summary>${done.length} completed follow-up${done.length===1?'':'s'} · view or reopen</summary>${done.map(a=>actionCard(a,true)).join('')}</details>`:''}
      <details><summary>Evidence and original source</summary><ul class="source-list">${m.sources.map(s=>`<li>${e(s)}</li>`).join('')}</ul><p class="preserve-lines">${e(m.original)}</p></details>
      <details><summary>Record change history</summary>${state.register.history.filter(h=>h.memberId===id).slice(-20).reverse().map(h=>`<article class="history-entry"><strong>${e(h.actor)}</strong> · ${e(h.at)}<p>${e(h.summary)}</p><p>${e(h.reference)}</p></article>`).join('')||'<p>No recorded changes.</p>'}</details></div>`,{memberId:id});
  }
  const labels={name:'Name',mmh:'MMH number',aliases:'Aliases (semicolon separated)',memberStatus:'Membership',basis:'Evidence basis',effectiveDate:'Effective / proposed date',statusNote:'Membership qualification',admissionRoute:'Admission route',admissionDate:'Admission date',kolStatus:'KOL position',kolAsOf:'KOL snapshot date',financeStatus:'Account position',balance:'Working balance SGD',invoice:'Invoice reference',financeNote:'Account qualification',gpPence:'Proposed GP cost GBP',gpBasis:'GP cost basis',notes:'Working notes'};
  function editMember(id) {
    const m=person(id);if(!m||!user.editableFields.length)return;
    const choices={memberStatus:C.STATUS,basis:C.BASIS,kolStatus:C.KOL,financeStatus:C.FINANCE};
    const fields=user.editableFields.map(k=>{
      let value=m[k];if(k==='aliases')value=value.join('; ');if(['balance','gpPence'].includes(k))value=value===null?'':(value/100).toFixed(2);
      return field(k,labels[k],value,['statusNote','financeNote','gpBasis','notes'].includes(k)?'textarea':['effectiveDate','admissionDate','kolAsOf'].includes(k)?'date':['balance','gpPence'].includes(k)?'number':'text',choices[k],k==='name'?'required maxlength="200"':choices[k]?'':'maxlength="10000"');
    }).join('');
    openModal('memberEdit',modalHeader('Edit '+m.name,'Update the working record; original evidence and ledger snapshots are preserved.')+`<form id="edit-form" class="online-form"><div class="record-grid">${fields}</div>${field('reason','Reason and supporting reference','','textarea',null,'required maxlength="3000"')}${formFooter()}</form>`,{memberId:id,original:structuredClone(m)});
  }
  function taskEditor(id='',memberId='') {
    const a=id?task(id):null;if(id&&(!a||!canManage(a)))return;if(!id&&!canCreate())return;
    const owner=a?.owner||(view==='treasurer'||user.role==='treasurer'?'Treasurer':'Registrar');
    const memberChoices=Object.fromEntries([...people()].sort((a,b)=>a.name.localeCompare(b.name)).map(m=>[m.id,m.name]));
    openModal(a?'taskEdit':'taskCreate',modalHeader(a?'Edit follow-up':'New follow-up',a?person(a.memberId).name:'Assign a real next action to a Brother Knight.')+`<form id="task-form" class="online-form">${a?'':field('memberId','Brother Knight',memberId||people()[0]?.id,'text',memberChoices,'required')}${field('title','What needs to be done?',a?.title||'','textarea',null,'required maxlength="3000" autofocus')}<div class="record-grid">${field('owner','Owner',owner,'text',Object.fromEntries((user.role==='treasurer'?['Treasurer']:C.OWNERS).map(o=>[o,o])))}${field('priority','Priority',a?.priority||'normal','text',{normal:'Normal',high:'High'})}${field('due','Due date (optional)',a?.due||'','date')}</div>${a?field('reference',a.state==='done'?'Completion record':'Progress note / reference',a.reference,'textarea',null,'maxlength="3000"'):''}${a?field('reason','Reason for editing this follow-up','','textarea',null,'required maxlength="3000"'):''}${formFooter(a?'Save task':'Create follow-up')}</form>`,{taskId:id,memberId:a?.memberId||memberId,original:a?structuredClone(a):null});
  }
  function transition(id, next) {
    const a=task(id);if(!a||!canManage(a))return;
    if(next==='progress') {
      // One click to start/resume; preserve the existing evidence note.
      mutate('/api/actions/'+encodeURIComponent(id),'PATCH',{state:next,reference:a.reference},state.version,{toast:'Started. The follow-up is now In progress.',memberId:dialog.open&&draft?.kind==='member'?draft.memberId:null});return;
    }
    const title=next==='done'?'Complete follow-up':next==='waiting'?'Mark as waiting':'Reopen follow-up';
    const question=next==='done'?'What was completed? Add a reference.':next==='waiting'?'What are you waiting for, and from whom?':'Why does this need reopening?';
    openModal('transition',modalHeader(title,person(a.memberId).name)+`<form id="transition-form" class="online-form"><p class="task-description">${e(a.title)}</p><p class="hint">${next==='done'?'This records completion of this task only. Update membership, KOL or payment fields separately when supported.':'The previous note stays in change history.'}</p>${field('reference',question,'','textarea',null,'required maxlength="3000" autofocus')}${next==='waiting'?field('due','Follow up on (optional)',a.due,'date'):''}${formFooter(next==='done'?'✓ Complete and save':next==='waiting'?'Save waiting status':'Reopen and save')}</form>`,{taskId:id,next,original:structuredClone(a)});
  }
  async function mutate(path,method,payload,version,after={}) {
    if(busy||!user)return;busy=true;saveFailed=false;status();const epoch=generation;
    document.querySelectorAll('button').forEach(b=>{b.dataset.wasDisabled=b.disabled?'1':'0';b.disabled=true;});
    try {
      const result=await api(path,{method,headers:{'Content-Type':'application/json','X-Invictus-Request':'1',...(after.initial?{'If-None-Match':'*'}:{'If-Match':`"${version}"`})},body:JSON.stringify(payload)});
      if(epoch!==generation||!user)return;
      state=result;offline=false;dirty=false;draft=null;if(dialog.open&&!after.memberId)dialog.close();$('#connection').textContent='';busy=false;render();
      if(after.memberId)memberView(after.memberId);toast(after.toast||'Saved online.');
    } catch(error) {
      saveFailed=true;
      if(user){
        const target=dialog.open?$('#edit-error'):null;
        if(target){target.textContent=error.message;if(error.status===409)target.insertAdjacentHTML('beforeend',`<br>Your draft is still here. ${button('Discard draft and reload latest','discard-reload','','button')}`);target.focus();}
        else toast(error.message);
        $('#connection').textContent=error.status===409?'Another officer has saved a newer revision. No changes from this request were applied.':error.status?'The save was rejected. Review the message and correct the input.':'The save could not be confirmed. Reload before repeating it: the server may have received the request.';
      }
    } finally {
      busy=false;document.querySelectorAll('button').forEach(b=>{b.disabled=b.dataset.wasDisabled==='1';delete b.dataset.wasDisabled;});status();
    }
  }
  async function refresh(manual=false) {
    if(refreshing||busy||!user)return;
    if(manual&&dialog.open){if(dirty&&!confirm('Discard unsaved changes and load the latest online record?'))return;dirty=false;draft=null;dialog.close();}
    refreshing=true;const epoch=generation,version=state?.version;
    try {
      const next=await api('/api/register');if(epoch!==generation||!user||busy||state?.version!==version)return;
      offline=false;
      if(dialog.open){if(next.version!==state.version)$('#connection').textContent='A newer online revision is available. Your open form has not been replaced.';return;}
      const changed=!state||next.version!==state.version;state=next;if(manual)saveFailed=false;$('#connection').textContent='';
      if(changed||manual){const input=$('#search'),focus=input===document.activeElement,start=focus?input.selectionStart:0;render();if(focus&&$('#search')){$('#search').focus();try{$('#search').setSelectionRange(start,start);}catch{}}}else status();
    } catch(error) { if(user){offline=true;$('#connection').textContent='Connection unavailable. This is the last loaded record; no offline changes will be treated as saved.';status();} }
    finally{refreshing=false;}
  }
  function navigate(next) {
    view=next;query='';memberFilter='all';actionFilter='outstanding';dueFilter='all';
    if(next==='actions')ownerFilter=user.role==='registrar'?'Registrar':user.role==='treasurer'?'Treasurer':'all';
    render();
  }
  async function command(name,id) {
    if(name==='member')return memberView(id);
    if(name==='member-edit')return editMember(id);
    if(name==='new-task')return taskEditor('',id);
    if(name==='task-edit')return taskEditor(id);
    if(name.startsWith('task-'))return transition(id,name.slice(5));
    if(name==='go-actions')return navigate('actions');
    if(name==='clear-filters'){query='';actionFilter='outstanding';ownerFilter='all';dueFilter='all';sort='priority';render();return;}
    if(name==='more-history')return renderHistory(true);
    if(name==='close'||name==='discard-reload'){
      if(dirty&&!confirm('Discard unsaved changes?'))return;dirty=false;draft=null;dialog.close();if(name==='discard-reload')await refresh(true);return;
    }
    if(name==='add-person')return openModal('personCreate',modalHeader('Add a person','Creates a record to verify; it does not establish admission.')+`<form class="online-form" id="person-form">${field('name','Full name','','text',null,'required maxlength="200" autofocus')}${field('reason','Reason / source','','textarea',null,'required maxlength="3000"')}${formFooter('Add person')}</form>`);
    if(name==='seed')return $('#seed-file').click();
    if(name==='backup'){
      if(!confirm('Download this private, unencrypted recovery snapshot?'))return;
      const data=await api('/api/backups/'+encodeURIComponent(id));const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='Invictus-private-recovery-'+id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    }
  }
  document.addEventListener('click',async event=>{
    const b=event.target.closest('button');if(!b||busy)return;
    try{
      if(b.dataset.view)return navigate(b.dataset.view);
      if(b.dataset.member)return memberView(b.dataset.member);
      if(b.dataset.taskFilter){actionFilter=b.dataset.taskFilter;if(actionFilter==='done')dueFilter='all';render();return;}
      if(b.dataset.countFilter){actionFilter=b.dataset.countFilter==='overdue'?'outstanding':b.dataset.countFilter;dueFilter=b.dataset.countFilter==='overdue'?'overdue':'all';render();return;}
      if(b.dataset.memberFilter){memberFilter=b.dataset.memberFilter;render();return;}
      if(b.dataset.command)await command(b.dataset.command,b.dataset.id||'');
    }catch(error){toast(error.message);}
  });
  workspace.addEventListener('input',event=>{if(event.target.id==='search'){query=event.target.value;if(isActionView())actionResults();else memberRows();}});
  workspace.addEventListener('change',event=>{const id=event.target.id;if(id==='owner-filter')ownerFilter=event.target.value;if(id==='due-filter')dueFilter=event.target.value;if(id==='task-sort')sort=event.target.value;if(['owner-filter','due-filter','task-sort'].includes(id))render();});
  dialog.addEventListener('input',()=>{dirty=true;status();});dialog.addEventListener('change',()=>{dirty=true;status();});
  dialog.addEventListener('cancel',event=>{if(busy||(dirty&&!confirm('Discard unsaved changes?')))event.preventDefault();else{dirty=false;draft=null;}});
  dialog.addEventListener('close',()=>{dirty=false;draft=null;status();});
  dialog.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!draft)return;
    const value=Object.fromEntries(new FormData(event.target)),ctx=draft;
    try{
      if(ctx.kind==='memberEdit'){
        const changes={};for(const k of user.editableFields){let v=value[k];if(k==='aliases')v=v.split(';').map(s=>s.trim()).filter(Boolean);if(['balance','gpPence'].includes(k))v=C.amount(v);if(k==='gpPence'&&v===null)v=0;if(JSON.stringify(v)!==JSON.stringify(ctx.original[k]))changes[k]=v;}
        if(!Object.keys(changes).length)throw Error('No changes to save.');
        await mutate('/api/members/'+encodeURIComponent(ctx.memberId),'PATCH',{changes,reason:value.reason},ctx.version,{memberId:ctx.memberId});
      }else if(ctx.kind==='taskEdit'){
        const changes={reason:value.reason};for(const k of ['title','owner','priority','due','reference'])if(value[k]!==ctx.original[k])changes[k]=value[k];
        if(Object.keys(changes).length===1)throw Error('No task changes to save.');
        await mutate('/api/actions/'+encodeURIComponent(ctx.taskId),'PATCH',changes,ctx.version,{toast:'Follow-up updated online.'});
      }else if(ctx.kind==='taskCreate')await mutate('/api/actions','POST',value,ctx.version,{toast:'Follow-up created. It is now in the action list.'});
      else if(ctx.kind==='transition'){
        const payload={state:ctx.next,reference:value.reference};
        if(ctx.next==='open')payload.reason=value.reference;
        if(ctx.next==='waiting'&&value.due!==ctx.original.due){payload.due=value.due;payload.reason=value.reference;}
        await mutate('/api/actions/'+encodeURIComponent(ctx.taskId),'PATCH',payload,ctx.version,{toast:ctx.next==='done'?'Completed and saved. Find it under Completed; reopen it there if needed.':ctx.next==='waiting'?'Waiting status saved.':'Follow-up reopened and saved.'});
      }else if(ctx.kind==='personCreate')await mutate('/api/members','POST',value,ctx.version,{toast:'Person added with status to verify.'});
    }catch(error){const box=$('#edit-error');if(box)box.textContent=error.message;}
  });
  $('#refresh').addEventListener('click',()=>refresh(true));
  $('#seed-file').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{if(file.size>1500000)throw Error('Register exceeds the online limit.');const register=C.validate(JSON.parse(await file.text()));const reference=prompt('Reference for this reviewed initial register:');if(!reference?.trim())return;if(!confirm('Initialise the shared online register once? This does not certify its contents.'))return;await mutate('/api/register','POST',{register,reference},0,{initial:true,toast:'Register loaded. Your action centre is ready.'});}catch(error){toast(error.message);}finally{event.target.value='';}
  });
  window.addEventListener('beforeunload',event=>{if(dirty||busy){event.preventDefault();event.returnValue='';}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!dialog.open&&$('#search')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}});
  window.addEventListener('pageshow',event=>{if(event.persisted){lock('Rechecking your sign-in.');start();}});
  async function start(){try{user=await api('/api/session');ownerFilter=user.role==='registrar'?'Registrar':user.role==='treasurer'?'Treasurer':'all';await refresh(true);}catch(error){if(!user)toast(error.message);}}
  setInterval(()=>{if(!document.hidden)refresh();},30000);start();
})();
