"""Synthetic browser/API integration. No production data or credentials."""
import os, subprocess, pathlib, json, re, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
server=subprocess.Popen(['node','tests/online_harness.mjs'],cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
    if server.stdout.readline().strip()!='TEST_READY':
        raise RuntimeError(server.stderr.read())
    with sync_playwright() as p:
        opts={'headless':True,'args':['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'): opts['executable_path']=os.environ['CHROMIUM_PATH']
        browser=p.chromium.launch(**opts)
        admin=browser.new_context(extra_http_headers={'X-Test-Role':'admin'},viewport={'width':1440,'height':1000})
        inmemory=os.environ.get('INVICTUS_IN_MEMORY')=='1'
        def mount(page,role='admin'):
            if not inmemory:
                page.goto('http://127.0.0.1:8791/')
                return
            def bridge(payload):
                method=payload.get('method','GET')
                headers={'X-Test-Role':role,**payload.get('headers',{})}
                if method!='GET': headers['Origin']='http://127.0.0.1:8791'
                req=urllib.request.Request('http://127.0.0.1:8791'+payload['url'],method=method,headers=headers,data=payload.get('body','').encode() if method!='GET' else None)
                try: response=urllib.request.urlopen(req)
                except urllib.error.HTTPError as error: response=error
                return {'status':response.status,'body':response.read().decode(),'headers':dict(response.headers)}
            if not getattr(page,'bridge_added',False):
                page.expose_function('testHttpBridge',bridge);page.bridge_added=True
            html=(root/'web/index.html').read_text()
            html=re.sub(r'<link[^>]*>|<script.*?</script>','',html,flags=re.S)
            page.set_content(html)
            page.add_style_tag(content=(root/'app/styles.css').read_text()+(root/'web/online.css').read_text())
            page.evaluate("() => { window.fetch=async(url,options={})=>{const r=await window.testHttpBridge({url,method:options.method||'GET',headers:options.headers||{},body:options.body||''});return new Response(r.body,{status:r.status,headers:r.headers});}; }")
            page.add_script_tag(content=(root/'app/core.js').read_text());page.add_script_tag(content=(root/'web/ui.js').read_text())
        page=admin.new_page();errors=[];page.on('pageerror',lambda error: errors.append(str(error)))
        mount(page);page.get_by_role('button',name='Arthur Example',exact=True).wait_for()
        assert page.get_by_role('button',name='Open file',exact=True).count()==0
        page.get_by_role('searchbox').fill('TEST001');assert page.get_by_role('button',name='Arthur Example',exact=True).count()==1
        page.get_by_role('searchbox').fill('');page.get_by_role('button',name='Arthur Example',exact=True).click()
        page.get_by_role('button',name='Edit working record').click();page.locator('[name=notes]').fill('Saved through the online API')
        page.locator('[name=reason]').fill('Synthetic integration test');page.get_by_role('button',name='Save online',exact=True).click()
        page.get_by_role('button',name='Edit working record').wait_for();assert 'Saved through the online API' in page.locator('#member-content').inner_text()
        page.get_by_role('button',name='Close member record').click();mount(page);page.get_by_role('button',name='Arthur Example',exact=True).click()
        assert 'Saved through the online API' in page.locator('#member-content').inner_text()
        second=browser.new_context(extra_http_headers={'X-Test-Role':'viewer'});reader=second.new_page();mount(reader,'viewer')
        reader.get_by_role('button',name='Arthur Example',exact=True).click();assert reader.get_by_role('button',name='Edit working record').count()==0
        assert 'Saved through the online API' in reader.locator('#member-content').inner_text()
        # Concurrent edit: draft stays visible and stale save is rejected.
        page.get_by_role('button',name='Edit working record').click();page.locator('[name=notes]').fill('My preserved draft');page.locator('[name=reason]').fill('Conflict test')
        other=admin.new_page();mount(other);other.get_by_role('button',name='Arthur Example',exact=True).click();other.get_by_role('button',name='Edit working record').click()
        other.locator('[name=notes]').fill('Other officer saved first');other.locator('[name=reason]').fill('Concurrent source');other.get_by_role('button',name='Save online',exact=True).click();other.get_by_role('button',name='Edit working record').wait_for()
        page.get_by_role('button',name='Save online',exact=True).click();page.locator('#edit-error').filter(has_text='Another officer').wait_for();assert page.locator('[name=notes]').input_value()=='My preserved draft'
        assert not errors,errors
        phone=browser.new_context(extra_http_headers={'X-Test-Role':'treasurer'},viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        mobile=phone.new_page();mount(mobile,'treasurer');mobile.get_by_role('button',name='Arthur Example',exact=True).wait_for()
        assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        mobile.get_by_role('button',name='Arthur Example',exact=True).click();mobile.get_by_role('button',name='Edit working record').click()
        assert mobile.locator('[name=memberStatus]').count()==0;assert mobile.locator('[name=financeStatus]').count()==1
        if os.environ.get('SCREENSHOT_DIR'):
            out=pathlib.Path(os.environ['SCREENSHOT_DIR']);out.mkdir(parents=True,exist_ok=True)
            other.get_by_role('button',name='Close member record').click();other.screenshot(path=str(out/'desktop.png'),full_page=True);mobile.screenshot(path=str(out/'mobile.png'),full_page=True)
        browser.close()
    if inmemory: print('TEST MODE: in-memory DOM plus Python HTTP bridge to synthetic server; does not exercise real browser navigation, cookies or CSP.')
    print('PASS: hosted browser load, search, online save/reload, second-user reads, read-only/finance roles, conflict preservation, escaping and mobile layout.')
finally:
    server.terminate();server.wait(timeout=10)
