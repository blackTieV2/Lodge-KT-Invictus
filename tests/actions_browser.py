"""Action-centre acceptance tests against the actual API and a synthetic SQLite store.
No production account, member record, source document or credential is used.
"""
import os, pathlib, subprocess, re, urllib.request, urllib.error
from playwright.sync_api import sync_playwright, expect
ROOT = pathlib.Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:8791'
server = subprocess.Popen(['node','tests/online_harness.mjs'], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
try:
    if server.stdout.readline().strip() != 'TEST_READY':
        raise RuntimeError(server.stderr.read())
    with sync_playwright() as p:
        launch = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'): launch['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**launch)
        errors = []
        inmemory = os.environ.get('INVICTUS_IN_MEMORY') == '1'
        contexts = []
        def make(role='admin', mobile=False):
            ctx = browser.new_context(extra_http_headers={'X-Test-Role':role}, viewport={'width':390 if mobile else 1440,'height':844 if mobile else 1000}, is_mobile=mobile, has_touch=mobile)
            contexts.append(ctx)
            page = ctx.new_page(); page.on('pageerror', lambda error: errors.append(str(error)))
            return page
        def load(page, role='admin'):
            if not inmemory:
                page.goto(BASE)
            else:
                def bridge(payload):
                    method=payload.get('method','GET'); headers={'X-Test-Role':role, **payload.get('headers',{})}
                    if method!='GET': headers['Origin']=BASE
                    req=urllib.request.Request(BASE+payload['url'],method=method,headers=headers,data=payload.get('body','').encode() if method!='GET' else None)
                    try: res=urllib.request.urlopen(req)
                    except urllib.error.HTTPError as error: res=error
                    return {'status':res.status,'body':res.read().decode(),'headers':dict(res.headers)}
                if not getattr(page,'bridge_added',False):page.expose_function('testHttpBridge',bridge);page.bridge_added=True
                html=re.sub(r'<link[^>]*>|<script.*?</script>','',(ROOT/'web/index.html').read_text(),flags=re.S)
                page.set_content(html)
                page.add_style_tag(content=(ROOT/'app/styles.css').read_text()+(ROOT/'web/online.css').read_text())
                page.evaluate("() => {window.fetch=async(url,o={})=>{const r=await window.testHttpBridge({url,method:o.method||'GET',headers:o.headers||{},body:o.body||''});return new Response(r.body,{status:r.status,headers:r.headers});};}")
                page.add_script_tag(content=(ROOT/'app/core.js').read_text());page.add_script_tag(content=(ROOT/'web/ui.js').read_text())
            expect(page.locator('h1')).to_have_text('Action centre')
            expect(page.locator('#identity')).to_contain_text(role+'@example.invalid')
        def card(page, id='TASK1'): return page.locator('#workspace [data-task="'+id+'"]')
        def wait_saved(page): expect(page.locator('#save-state')).to_contain_text('Saved online')
        def close(page): page.get_by_role('button',name='Close member record').click()
        def fetch_data(page): return page.request.get(BASE+'/api/register').json()
        page=make();load(page)
        expect(card(page)).to_be_visible()
        expect(page.locator('#workspace [data-task]')).to_have_count(4)
        assert page.locator('#workspace img').count()==0  # escaped member name fixture
        if os.environ.get('SCREENSHOT_DIR'):
            out=pathlib.Path(os.environ['SCREENSHOT_DIR']);out.mkdir(parents=True,exist_ok=True)
            page.screenshot(path=str(out/'action-centre-desktop.png'),full_page=True)
        # Start from the task card, not from a hidden member form.
        card(page).get_by_role('button',name='Start',exact=True).click();wait_saved(page)
        expect(card(page).locator('.work-meta')).to_contain_text('In progress')
        # Waiting note and due date are persisted together.
        card(page).get_by_role('button',name='Waiting',exact=True).click()
        expect(page.locator('[name=reference]')).to_be_focused()
        page.locator('[name=reference]').fill('Awaiting synthetic MMH reference')
        page.locator('[name=due]').fill('2020-01-01')
        page.get_by_role('button',name='Save waiting status').click();wait_saved(page)
        expect(card(page).locator('.work-meta')).to_contain_text('Waiting')
        expect(card(page)).to_contain_text('Awaiting synthetic MMH reference')
        page.get_by_role('button',name='Show overdue follow-ups',exact=True).click()
        expect(page.locator('#workspace [data-task]')).to_have_count(1)
        page.get_by_role('button',name='Clear filters',exact=True).click()
        # Complete requires a note; no implicit KOL/account/member update.
        before=fetch_data(page)['register']['members']
        card(page).get_by_role('button',name='✓ Complete',exact=True).click()
        page.get_by_role('button',name='✓ Complete and save',exact=True).click()
        expect(page.locator('#member-dialog')).to_be_visible()
        assert page.locator('[name=reference]').evaluate('(el)=>el.validity.valueMissing')
        page.locator('[name=reference]').fill('Verified synthetic return receipt REF-001')
        page.get_by_role('button',name='✓ Complete and save',exact=True).click();wait_saved(page)
        expect(card(page)).to_have_count(0)
        page.locator('[data-task-filter=done]').click()
        expect(card(page)).to_contain_text('Verified synthetic return receipt REF-001')
        assert fetch_data(page)['register']['members']==before
        # A fresh page and separate officer both see the same saved completion.
        load(page);page.locator('[data-task-filter=done]').click();expect(card(page)).to_be_visible()
        viewer=make('viewer');load(viewer,'viewer');viewer.locator('[data-task-filter=done]').click()
        expect(card(viewer)).to_be_visible();assert card(viewer).get_by_role('button',name='Reopen',exact=True).count()==0
        assert viewer.locator('[data-command=new-task]').count()==0
        # Reopen retains completion in change history.
        card(page).get_by_role('button',name='Reopen',exact=True).click();page.locator('[name=reference]').fill('Need to verify corrected certificate')
        page.get_by_role('button',name='Reopen and save').click();wait_saved(page)
        page.locator('[data-task-filter=outstanding]').click();expect(card(page)).to_contain_text('Need to verify corrected certificate')
        # Visible task edit: title, priority and reassignment.
        card(page).get_by_role('button',name='Edit task',exact=True).click()
        page.locator('[name=title]').fill('Reconcile synthetic registration charge')
        page.locator('[name=owner]').select_option('Treasurer');page.locator('[name=priority]').select_option('high')
        page.locator('[name=due]').fill('2030-01-15');page.locator('[name=reason]').fill('Treasurer needs to confirm payment')
        page.get_by_role('button',name='Save task',exact=True).click();wait_saved(page)
        expect(card(page)).to_contain_text('High priority');expect(card(page)).to_contain_text('Reconcile synthetic registration charge')
        page.locator('[data-view=registrar]').click();expect(card(page)).to_have_count(0)
        page.locator('[data-view=treasurer]').click();expect(card(page)).to_be_visible()
        # Creating from Completed must surface the new outstanding task.
        page.locator('[data-task-filter=done]').click()
        page.get_by_role('button',name='+ New follow-up',exact=True).click()
        page.locator('[name=memberId]').select_option('DEMO0');page.locator('[name=title]').fill('Send synthetic invoice confirmation')
        page.locator('[name=owner]').select_option('Treasurer');page.get_by_role('button',name='Create follow-up',exact=True).click();wait_saved(page)
        created=next(a for a in fetch_data(page)['register']['actions'] if a['title']=='Send synthetic invoice confirmation')
        expect(page.locator('[data-task-filter=outstanding]')).to_have_attribute('aria-pressed','true')
        expect(card(page,created['id'])).to_be_visible()
        page.get_by_role('searchbox').fill('invoice confirmation');expect(page.locator('#workspace [data-task]')).to_have_count(1)
        page.get_by_role('searchbox').fill('');load(page)
        # Conflicting changes never silently overwrite a draft or newer data.
        card(page).get_by_role('button',name='Edit task',exact=True).click();page.locator('[name=title]').fill('Draft retained after conflict');page.locator('[name=reason]').fill('Conflict test')
        other=make();load(other);card(other).get_by_role('button',name='Start',exact=True).click();wait_saved(other)
        page.get_by_role('button',name='Save task',exact=True).click()
        expect(page.locator('#edit-error')).to_contain_text('Another officer')
        expect(page.locator('[name=title]')).to_have_value('Draft retained after conflict')
        assert fetch_data(page)['register']['actions'][0]['title']!='Draft retained after conflict'
        page.on('dialog',lambda d:d.accept());page.get_by_role('button',name='Discard draft and reload latest').click();wait_saved(page)
        # Form failure stays visible; it must never report success or tick off work.
        if not inmemory:
            page.route('**/api/actions/'+created['id'],lambda route:route.fulfill(status=503,content_type='application/json',body='{"error":"Synthetic save failure"}') if route.request.method=='PATCH' else route.continue_())
            card(page,created['id']).get_by_role('button',name='✓ Complete',exact=True).click();page.locator('[name=reference]').fill('Must stay pending')
            page.get_by_role('button',name='✓ Complete and save',exact=True).click();expect(page.locator('#edit-error')).to_contain_text('Synthetic save failure')
            assert next(a for a in fetch_data(page)['register']['actions'] if a['id']==created['id'])['state']=='open'
            page.unroute('**/api/actions/'+created['id']);close(page)
        # A delayed old history request must not blank the newly selected view.
        if not inmemory:
            held=[]
            page.route('**/api/audit',lambda route: held.append(route))
            page.locator('[data-view=history]').click()
            expect(page.locator('h1')).to_have_text('Online change history')
            page.wait_for_timeout(100)
            assert held
            page.locator('[data-view=backups]').click()
            expect(page.locator('#history-results .history-entry').first).to_be_visible()
            assert page.locator('#history-results [data-command=backup]').count()>0
            held[0].fulfill(status=200,content_type='application/json',body='{"events":[]}')
            page.wait_for_timeout(100)
            expect(page.locator('#history-results .history-entry').first).to_be_visible()
            page.unroute('**/api/audit')
            page.locator('[data-view=actions]').click()
        # Actual HTTP denies viewer writes and enforces ownership; no browser-only permissions.
        current=fetch_data(viewer)
        denied=viewer.request.patch(BASE+'/api/actions/TASK2',headers={'Origin':BASE,'Content-Type':'application/json','X-Invictus-Request':'1','If-Match':'"'+str(current['version'])+'"'},data={'state':'done','reference':'forged'})
        assert denied.status==403
        # Server audit and recovery snapshot include saved task changes.
        audit=page.request.get(BASE+'/api/audit').json()['events'];assert any('TASK1' in ev['summary'] and 'done' in ev['summary'] for ev in audit)
        assert page.request.get(BASE+'/api/backups').json()['backups']
        # Mobile controls visible, Treasurer role restricted to own tasks.
        mobile=make('treasurer',True);load(mobile,'treasurer')
        assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        expect(mobile.locator('#top-signout')).to_be_visible()
        expect(mobile.locator('#top-signout')).to_have_attribute('href','/cdn-cgi/access/logout')
        expect(mobile.locator('#owner-filter')).to_have_value('Treasurer')
        card(mobile,'TASK2').get_by_role('button',name='Edit task',exact=True).click()
        assert mobile.locator('[name=owner] option').count()==1
        close(mobile)
        if os.environ.get('SCREENSHOT_DIR'):mobile.screenshot(path=str(out/'action-centre-mobile.png'),full_page=True)
        # Existing people and evidence survive all task operations.
        final=fetch_data(page)['register'];assert final['members']==before;assert len(final['actions'])==5
        assert not errors,errors
        browser.close()
    print('PASS: action-first startup; start/wait/complete/reopen; required completion notes; create/edit/reassign; search and overdue filters; refresh and second-user persistence; role enforcement; conflict draft preservation; member data unchanged; audit/recovery; mobile controls.')
    if inmemory:print('Local mode uses in-memory DOM + synthetic HTTP bridge, not browser network/CSP. Full HTTP mode is required in CI.')
finally:
    server.terminate();server.wait(timeout=10)
